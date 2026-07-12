-- Migration: notificaciones-app (PR1 of 4 — schema only)
--
-- In-app notification system: `notificacion` table written EXCLUSIVELY by
-- SECURITY DEFINER triggers (RLS bypassed by owner `postgres`, mirroring
-- `handle_new_user` / `bloquear_cambio_rol`), zero `service_role`.
--
-- 6 notification types: comentario_nueva, comentario_respuesta,
-- obra_aceptada_revista, nuevo_seguidor, solicitud_mensaje, obra_likeada.
-- 4 of them (obra_likeada, comentario_nueva, comentario_respuesta,
-- nuevo_seguidor) AGGREGATE via partial-unique-index + INSERT ... ON
-- CONFLICT DO UPDATE (contador += 1) while an unread row exists for the
-- aggregation key, and symmetrically DECREMENT-OR-REMOVE on the matching
-- undo action (unlike / delete comment / unfollow). solicitud_mensaje and
-- obra_aceptada_revista stay unaggregated (contador always 1, no undo).
--
-- Additive-only change. See docs/Vitrina_BD_Conexion_Backend.md §3.23
-- (added in a follow-up PR of this change) for the full narrative and the
-- §7.1b citation for the column-scoped UPDATE grant pattern (Decision 6).
--
-- Applied live via the `supabase` MCP (project fdfbyhjwnbteccagulxb,
-- version 20260712024112) — see the two follow-up hardening migrations in
-- this same directory for the get_advisors fixes applied immediately after.

-- ============================================================
-- Phase 1.1: notificacion table + indexes
-- ============================================================

create table public.notificacion (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuario(id) on delete cascade,       -- recipient
  tipo text not null check (tipo in ('comentario_nueva','comentario_respuesta',
    'obra_aceptada_revista','nuevo_seguidor','solicitud_mensaje','obra_likeada')),
  usuario_relacionado_id uuid references public.usuario(id) on delete set null,    -- actor
  publicacion_relacionada_id uuid references public.publicacion(id) on delete cascade,
  comentario_relacionado_id uuid references public.comentario(id) on delete cascade,
  descripcion text not null,
  enlace text,
  contador int not null default 1,
  leida boolean not null default false,
  leida_en timestamptz,
  creada_en timestamptz not null default now()
);

create index notificacion_usuario_idx on public.notificacion (usuario_id);
create index notificacion_usuario_leida_idx on public.notificacion (usuario_id, leida);
create index notificacion_creada_idx on public.notificacion (creada_en desc);

-- 4 partial-unique aggregation indexes (one per aggregating type) — Decision 3, novel code.
create unique index notificacion_like_agg_uniq on public.notificacion (usuario_id, publicacion_relacionada_id)
  where tipo='obra_likeada' and leida=false;
create unique index notificacion_comnueva_agg_uniq on public.notificacion (usuario_id, publicacion_relacionada_id)
  where tipo='comentario_nueva' and leida=false;
create unique index notificacion_comresp_agg_uniq on public.notificacion (usuario_id, comentario_relacionado_id)
  where tipo='comentario_respuesta' and leida=false;
create unique index notificacion_seguidor_agg_uniq on public.notificacion (usuario_id)
  where tipo='nuevo_seguidor' and leida=false;

-- ============================================================
-- Phase 1.2: RLS + policies + column-scoped grants (Decision 6, BLOCKER FIX)
-- ============================================================

alter table public.notificacion enable row level security;

-- Column-scoped UPDATE grant, mirrors mensaje/§7.1b: RLS restricts ROWS, not COLUMNS.
grant select, delete on public.notificacion to authenticated;   -- NO insert grant
revoke update on public.notificacion from anon, authenticated;   -- defensive
grant update (leida, leida_en) on public.notificacion to authenticated;  -- mark-read is the ONLY client mutation

create policy notif_select on public.notificacion for select to authenticated using (usuario_id = auth.uid());
create policy notif_update on public.notificacion for update to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy notif_delete on public.notificacion for delete to authenticated using (usuario_id = auth.uid());
-- NO INSERT policy + NO insert grant: SECURITY DEFINER triggers (owner) bypass RLS; clients cannot insert (double lock).

-- ============================================================
-- Phase 1.3: usuario notif_app_* preference columns (Decision 1)
-- ============================================================

alter table public.usuario
  add column notif_app_comentarios boolean not null default true,
  add column notif_app_seguidores  boolean not null default true,
  add column notif_app_revista     boolean not null default true,
  add column notif_app_mensajes    boolean not null default true,
  add column notif_app_likes       boolean not null default true;

grant update (notif_app_comentarios) on public.usuario to authenticated;
grant update (notif_app_seguidores)  on public.usuario to authenticated;
grant update (notif_app_revista)     on public.usuario to authenticated;
grant update (notif_app_mensajes)    on public.usuario to authenticated;
grant update (notif_app_likes)       on public.usuario to authenticated;
-- NO GRANT SELECT (Decision 1) — prefs are private; read via SECURITY DEFINER RPC below.

-- ============================================================
-- Phase 2.1: notif_desc_agg() pluralization helper (immutable, shared by all triggers)
-- ============================================================

create or replace function public.notif_desc_agg(p_tipo text, p_n int) returns text
language sql immutable as $$
  select case p_tipo
    when 'obra_likeada' then case when p_n=1 then 'A alguien le gustó tu obra'
      else 'A '||p_n||' personas les gustó tu obra' end
    when 'comentario_nueva' then case when p_n=1 then 'Comentaron tu obra'
      else p_n||' comentarios nuevos en tu obra' end
    when 'comentario_respuesta' then case when p_n=1 then 'Respondieron tu comentario'
      else p_n||' respuestas nuevas a tu comentario' end
    when 'nuevo_seguidor' then case when p_n=1 then 'Tienes un nuevo seguidor'
      else p_n||' personas nuevas te siguen' end
  end;
$$;

-- ============================================================
-- Phase 2.2: mis_preferencias_notif_app() RPC (SECURITY DEFINER, self-scoped read)
-- ============================================================

create or replace function public.mis_preferencias_notif_app()
returns table (notif_app_comentarios boolean, notif_app_seguidores boolean,
  notif_app_revista boolean, notif_app_mensajes boolean, notif_app_likes boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  select notif_app_comentarios, notif_app_seguidores, notif_app_revista,
         notif_app_mensajes, notif_app_likes from public.usuario where id = auth.uid();
$$;

revoke execute on function public.mis_preferencias_notif_app() from anon;
grant execute on function public.mis_preferencias_notif_app() to authenticated;

-- ============================================================
-- Phase 2.3 / 2.4: INSERT-side trigger functions + triggers
-- ============================================================

-- 1+2: comentario_nueva / comentario_respuesta (AGGREGATING)
create or replace function public.notif_comentario() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_dest uuid;
begin
  if NEW.responde_a is null then
    select autor_id into v_dest from public.publicacion where id = NEW.publicacion_id;
    if v_dest is null or v_dest = NEW.autor_id then return NEW; end if;
    if not (select notif_app_comentarios from public.usuario where id = v_dest) then return NEW; end if;
    insert into public.notificacion (usuario_id, tipo, usuario_relacionado_id,
      publicacion_relacionada_id, comentario_relacionado_id, descripcion, enlace, contador)
    values (v_dest,'comentario_nueva',NEW.autor_id,NEW.publicacion_id, null,   -- NULL anchor (cascade-safe)
      public.notif_desc_agg('comentario_nueva',1),'/publicacion/'||NEW.publicacion_id,1)
    on conflict (usuario_id, publicacion_relacionada_id) where tipo='comentario_nueva' and leida=false
    do update set contador = notificacion.contador + 1,
      usuario_relacionado_id = excluded.usuario_relacionado_id,
      descripcion = public.notif_desc_agg('comentario_nueva', notificacion.contador + 1);
  else
    select autor_id into v_dest from public.comentario where id = NEW.responde_a;
    if v_dest is null or v_dest = NEW.autor_id then return NEW; end if;
    if not (select notif_app_comentarios from public.usuario where id = v_dest) then return NEW; end if;
    insert into public.notificacion (usuario_id, tipo, usuario_relacionado_id,
      publicacion_relacionada_id, comentario_relacionado_id, descripcion, enlace, contador)
    values (v_dest,'comentario_respuesta',NEW.autor_id,NEW.publicacion_id, NEW.responde_a,  -- parent = anchor
      public.notif_desc_agg('comentario_respuesta',1),'/publicacion/'||NEW.publicacion_id,1)
    on conflict (usuario_id, comentario_relacionado_id) where tipo='comentario_respuesta' and leida=false
    do update set contador = notificacion.contador + 1,
      usuario_relacionado_id = excluded.usuario_relacionado_id,
      descripcion = public.notif_desc_agg('comentario_respuesta', notificacion.contador + 1);
  end if;
  return NEW;
end; $$;
create trigger trg_notif_comentario after insert on public.comentario
  for each row execute function public.notif_comentario();

-- 3: obra_aceptada_revista (UNAGGREGATED, contador always 1)
create or replace function public.notif_obra_aceptada() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if NEW.estado='aceptada' and OLD.estado is distinct from NEW.estado
     and (select notif_app_revista from public.usuario where id = NEW.solicitante_id) then
    insert into public.notificacion (usuario_id, tipo, publicacion_relacionada_id, descripcion, enlace)
    values (NEW.solicitante_id,'obra_aceptada_revista',NEW.publicacion_id,
      'Tu obra fue aceptada en una revista','/publicacion/'||NEW.publicacion_id);
  end if;
  return NEW;
end; $$;
create trigger trg_notif_obra_aceptada after update on public.solicitud_revista
  for each row execute function public.notif_obra_aceptada();

-- 4: nuevo_seguidor (AGGREGATING on usuario_id)
create or replace function public.notif_nuevo_seguidor() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not (select notif_app_seguidores from public.usuario where id = NEW.seguido_id) then return NEW; end if;
  insert into public.notificacion (usuario_id, tipo, usuario_relacionado_id, descripcion, enlace, contador)
  values (NEW.seguido_id,'nuevo_seguidor',NEW.seguidor_id,
    public.notif_desc_agg('nuevo_seguidor',1),'/usuario/'||NEW.seguidor_id,1)
  on conflict (usuario_id) where tipo='nuevo_seguidor' and leida=false
  do update set contador = notificacion.contador + 1,
    usuario_relacionado_id = excluded.usuario_relacionado_id,
    descripcion = public.notif_desc_agg('nuevo_seguidor', notificacion.contador + 1);
    -- enlace NOT updated on conflict: aggregated row keeps its initial follower link (minor cosmetic).
  return NEW;
end; $$;
create trigger trg_notif_nuevo_seguidor after insert on public.seguidor
  for each row execute function public.notif_nuevo_seguidor();

-- 5: solicitud_mensaje (UNAGGREGATED, contador always 1)
create or replace function public.notif_solicitud_mensaje() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if (select notif_app_mensajes from public.usuario where id = NEW.receptor_id) then
    insert into public.notificacion (usuario_id, tipo, usuario_relacionado_id, descripcion, enlace)
    values (NEW.receptor_id,'solicitud_mensaje',NEW.emisor_id,
      'Tienes una nueva solicitud de mensaje','/mensajes');
  end if;
  return NEW;
end; $$;
create trigger trg_notif_solicitud_mensaje after insert on public.solicitud_mensaje
  for each row execute function public.notif_solicitud_mensaje();

-- 6: obra_likeada (AGGREGATING)
create or replace function public.notif_obra_likeada() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_autor uuid;
begin
  select autor_id into v_autor from public.publicacion where id = NEW.publicacion_id;
  if v_autor is null or v_autor = NEW.usuario_id then return NEW; end if;        -- no self-notify
  if not (select notif_app_likes from public.usuario where id = v_autor) then return NEW; end if;
  insert into public.notificacion (usuario_id, tipo, usuario_relacionado_id,
    publicacion_relacionada_id, descripcion, enlace, contador)
  values (v_autor,'obra_likeada',NEW.usuario_id,NEW.publicacion_id,
    public.notif_desc_agg('obra_likeada',1),'/publicacion/'||NEW.publicacion_id,1)
  on conflict (usuario_id, publicacion_relacionada_id) where tipo='obra_likeada' and leida=false
  do update set contador = notificacion.contador + 1,
    usuario_relacionado_id = excluded.usuario_relacionado_id,
    descripcion = public.notif_desc_agg('obra_likeada', notificacion.contador + 1);
  return NEW;
end; $$;
create trigger trg_notif_obra_likeada after insert on public."like"
  for each row execute function public.notif_obra_likeada();

-- ============================================================
-- Phase 2.5: DELETE-side decrement-or-remove trigger functions + triggers (Decisions A & B)
-- Pattern: lock the matching unread aggregate FOR UPDATE (serializes concurrent undos);
--   contador>1 → decrement + refresh copy; contador<=1 → delete row; not found → no-op.
--   usuario_relacionado_id NOT rewound (accepted cosmetic imprecision). No notif_app_* re-check.
-- ============================================================

-- 7: unlike decrement (Decision A)
create or replace function public.notif_obra_likeada_del() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_autor uuid; v_id uuid; v_cont int;
begin
  select autor_id into v_autor from public.publicacion where id = OLD.publicacion_id;
  if v_autor is null or v_autor = OLD.usuario_id then return OLD; end if;        -- same self guard as insert
  select id, contador into v_id, v_cont from public.notificacion
    where usuario_id=v_autor and tipo='obra_likeada' and leida=false
      and publicacion_relacionada_id = OLD.publicacion_id
    for update;
  if not found then return OLD; end if;                                          -- already read / predates feature
  if v_cont <= 1 then
    delete from public.notificacion where id = v_id;
  else
    update public.notificacion
      set contador = v_cont - 1, descripcion = public.notif_desc_agg('obra_likeada', v_cont - 1)
      where id = v_id;
  end if;
  return OLD;
end; $$;
create trigger trg_notif_obra_likeada_del after delete on public."like"
  for each row execute function public.notif_obra_likeada_del();

-- 8: comment-delete decrement (Decision B) — branches on OLD.responde_a like the insert trigger
create or replace function public.notif_comentario_del() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_dest uuid; v_id uuid; v_cont int; v_tipo text;
begin
  if OLD.responde_a is null then
    v_tipo := 'comentario_nueva';
    select autor_id into v_dest from public.publicacion where id = OLD.publicacion_id;
    if v_dest is null or v_dest = OLD.autor_id then return OLD; end if;
    select id, contador into v_id, v_cont from public.notificacion
      where usuario_id=v_dest and tipo='comentario_nueva' and leida=false
        and publicacion_relacionada_id = OLD.publicacion_id
      for update;
  else
    v_tipo := 'comentario_respuesta';
    select autor_id into v_dest from public.comentario where id = OLD.responde_a;
    if v_dest is null or v_dest = OLD.autor_id then return OLD; end if;          -- parent gone (cascade) → no-op
    select id, contador into v_id, v_cont from public.notificacion
      where usuario_id=v_dest and tipo='comentario_respuesta' and leida=false
        and comentario_relacionado_id = OLD.responde_a
      for update;
  end if;
  if not found then return OLD; end if;
  if v_cont <= 1 then
    delete from public.notificacion where id = v_id;
  else
    update public.notificacion
      set contador = v_cont - 1, descripcion = public.notif_desc_agg(v_tipo, v_cont - 1)
      where id = v_id;
  end if;
  return OLD;
end; $$;
create trigger trg_notif_comentario_del after delete on public.comentario
  for each row execute function public.notif_comentario_del();

-- 9: unfollow decrement (Decision B)
create or replace function public.notif_nuevo_seguidor_del() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid; v_cont int;
begin
  select id, contador into v_id, v_cont from public.notificacion
    where usuario_id = OLD.seguido_id and tipo='nuevo_seguidor' and leida=false
    for update;
  if not found then return OLD; end if;
  if v_cont <= 1 then
    delete from public.notificacion where id = v_id;
  else
    update public.notificacion
      set contador = v_cont - 1, descripcion = public.notif_desc_agg('nuevo_seguidor', v_cont - 1)
      where id = v_id;
  end if;
  return OLD;
end; $$;
create trigger trg_notif_nuevo_seguidor_del after delete on public.seguidor
  for each row execute function public.notif_nuevo_seguidor_del();

-- ============================================================
-- Phase 2.6: Realtime publication
-- ============================================================

alter publication supabase_realtime add table public.notificacion;

-- ============================================================
-- Phase 3.1: pg_cron retention cleanup (mirrors §9 revista-mensual pattern)
-- ============================================================

select cron.schedule('notificaciones-cleanup', '30 8 * * *',  -- daily 02:30 UTC-6
  $$ delete from public.notificacion where leida = true and creada_en < now() - interval '90 days'; $$);
