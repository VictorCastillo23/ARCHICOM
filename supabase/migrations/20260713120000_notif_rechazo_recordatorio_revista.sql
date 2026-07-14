-- Migration: notif_rechazo_recordatorio_revista
--
-- Two independent additions to the `notificaciones_app` rail
-- (migration `20260712024112` + its 2 follow-up hardening migrations):
--
-- 1. Rejection notification (`obra_rechazada_revista`): fires for BOTH
--    origins that set `solicitud_revista.estado = 'rechazada'` — human
--    rejection via `rechazar_solicitud()` (`revisor_id` set) and automatic
--    discard via `publicar_revista_mensual()` (`revisor_id` NULL). Same
--    "one function per concern" pattern as `notif_obra_aceptada()`, in
--    parallel via a second AFTER UPDATE trigger on the same table.
--
-- 2. Monthly closing-window reminder (`recordatorio_cierre_revista`): a new
--    `pg_cron` job (day 22, mirrors `revista-mensual`'s UTC-6 mapping)
--    inserts one `notificacion` per usuario with a `pendiente` solicitud in
--    the active (`borrador`) revista. Idempotency is keyed by
--    `(usuario_id, date_trunc('month', creada_en, 'UTC'))` — the 3-argument
--    `date_trunc` overload, which is `IMMUTABLE` (verified against
--    `pg_proc.provolatile`); the 2-argument `timestamptz` overload is only
--    `STABLE` and Postgres rejects it in an index expression. Deduping by
--    calendar month (not by read-state, unlike the `nuevo_seguidor` pattern)
--    avoids silently blocking every future month's reminder for a usuario
--    who never reads the current one.
--
-- Applied live via the `supabase` MCP (project fdfbyhjwnbteccagulxb). See
-- docs/Vitrina_BD_Conexion_Backend.md §3.23 for the full narrative and the
-- asymmetric email-gating rationale (rechazo: `notif_email_habilitado`
-- only, decoupled from `notif_app_revista`; recordatorio: `notif_app_revista`
-- also gates the email as a mechanism side effect, since its only rail is
-- this INSERT).

-- ============================================================
-- 1. CHECK constraint: +2 tipos
-- ============================================================

alter table public.notificacion drop constraint notificacion_tipo_check;
alter table public.notificacion add constraint notificacion_tipo_check
  check (tipo in ('comentario_nueva','comentario_respuesta','obra_aceptada_revista',
    'nuevo_seguidor','solicitud_mensaje','obra_likeada',
    'obra_rechazada_revista','recordatorio_cierre_revista'));

-- ============================================================
-- 2. Rechazo: trigger + función (unaggregated, contador siempre 1)
-- ============================================================

create or replace function public.notif_obra_rechazada() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if NEW.estado='rechazada' and OLD.estado is distinct from NEW.estado
     and (select notif_app_revista from public.usuario where id = NEW.solicitante_id) then
    insert into public.notificacion (usuario_id, tipo, publicacion_relacionada_id, descripcion, enlace)
    values (NEW.solicitante_id,'obra_rechazada_revista',NEW.publicacion_id,
      coalesce(NEW.respuesta, 'Tu obra no fue aceptada en la revista'),'/publicacion/'||NEW.publicacion_id);
  end if;
  return NEW;
end; $$;
create trigger trg_notif_obra_rechazada after update on public.solicitud_revista
  for each row execute function public.notif_obra_rechazada();

-- Hardening en dos pasos (mismo patrón que 20260712024312_notificaciones_app_harden_trigger_fn_execute.sql):
-- "revoke ... from public" NO alcanza porque ALTER DEFAULT PRIVILEGES ya le dio EXECUTE
-- directo a anon/authenticated; hay que revocárselo explícitamente a esos 2 roles también.
revoke execute on function public.notif_obra_rechazada() from public;
revoke execute on function public.notif_obra_rechazada() from anon, authenticated;

-- ============================================================
-- 3. Recordatorio: índice de idempotencia + función + cron
-- ============================================================

-- Dedup por (usuario_id, mes calendario en UTC), NO por estado de lectura: ver
-- comentario de cabecera para el porqué del cambio vs. el patrón nuevo_seguidor.
-- date_trunc de 3 argumentos (con zona explícita) es obligatorio: la variante de
-- 2 argumentos es STABLE, no IMMUTABLE, y Postgres rechaza crear el índice con ella.
create unique index notificacion_recordatorio_uniq on public.notificacion (usuario_id, date_trunc('month', creada_en, 'UTC'))
  where tipo='recordatorio_cierre_revista';

create or replace function public.recordar_cierre_revista() returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_revista_id uuid;
begin
  select id into v_revista_id from public.revista where estado='borrador' limit 1;
  if v_revista_id is null then return; end if;              -- idempotente si no hay borrador
  insert into public.notificacion (usuario_id, tipo, descripcion, enlace)
  select distinct s.solicitante_id,'recordatorio_cierre_revista',
    'La ventana de postulación cierra pronto','/perfil'
  from public.solicitud_revista s
  join public.usuario u on u.id = s.solicitante_id
  where s.revista_id = v_revista_id and s.estado='pendiente' and u.notif_app_revista = true
  on conflict (usuario_id, date_trunc('month', creada_en, 'UTC')) where tipo='recordatorio_cierre_revista' do nothing;
end $$;

-- Mismo hardening en dos pasos que la función de rechazo (ver arriba):
revoke execute on function public.recordar_cierre_revista() from public;
revoke execute on function public.recordar_cierre_revista() from anon, authenticated;

select cron.schedule('revista-recordatorio-cierre', '0 19 22 * *',  -- día 22, 13:00 UTC-6 = 19:00 UTC
  $$ select public.recordar_cierre_revista(); $$);
