# Especificaciones de Base de Datos y Conexión al Backend
## Portafolio Digital · Vitrina

| Campo | Detalle |
|---|---|
| Versión | 1.1 — Junio 2026 |
| Fecha | 04/06/2026 |
| Estado | Base de datos creada y poblada con datos de prueba · **ciclo de revista mensual aplicado** (RPC, `es_admin()`, índice `una_revista_borrador` y job `pg_cron` `revista-mensual` verificados en vivo). El ciclo pasó de semanal a **mensual** el 2026-06-24 (día 1 de cada mes, 13:00 UTC-6) |
| Documentos relacionados | `Vitrina_Especificaciones_APIs.md` (contrato de la API), `Vitrina_Pantallas_Componentes.md` (pantallas/UI) |

> Este documento describe la base de datos **tal como fue creada** en Supabase, incluyendo los ajustes hechos respecto al plan, y explica cómo conectarla al backend (Next.js con `supabase-js`).
>
> **Cambio v1.1 (revista automática):** se elimina `revista.editor_id`, se añade un índice único parcial para garantizar una sola revista en `borrador`, las RPC pasan a validar solo `rol = 'administrador'`, y se incorpora un job `pg_cron` que publica la edición activa, descarta sus solicitudes pendientes y crea el siguiente borrador. **Cadencia mensual desde 2026-06-24** (job `revista-mensual`, función `publicar_revista_mensual`, día 1 de cada mes 13:00 UTC-6; antes era semanal). Los pasos SQL están en §3.5 y §9.

---

## 1. Proyecto Supabase

| Atributo | Valor |
|---|---|
| Nombre del proyecto | `archicom` |
| Project ref / ID | `fdfbyhjwnbteccagulxb` |
| URL de la API | `https://fdfbyhjwnbteccagulxb.supabase.co` |
| Región | `us-east-2` (Ohio) |
| Versión de PostgreSQL | 17 |
| Organización | VictorCastillo Org (plan **free**) |
| Estado | `ACTIVE_HEALTHY` |

> **Nota histórica:** este proyecto reemplaza a uno anterior que estuvo pausado más de 90 días y Supabase ya no permitía recuperar. En el plan free, un proyecto inactivo se pausa automáticamente; mantenlo con actividad o respáldalo para no perderlo.

---

## 2. Claves de API y variables de entorno

| Clave | Uso | ¿Exponer en el cliente? |
|---|---|---|
| Publishable key | Recomendada para apps nuevas | **Sí** — es pública por diseño |
| Anon key (legacy JWT) | Compatibilidad | **Sí** — pública por diseño |
| `service_role` (secret) | Solo backend / tareas administrativas | **Nunca** en el frontend |

```bash
# Publishable key (recomendada)
SUPABASE_URL=https://fdfbyhjwnbteccagulxb.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xYnc2tMGelLFZ-tMtw-7cQ_ATtcJzwn

# Anon key legacy (alternativa, también pública)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmJ5aGp3bmJ0ZWNjYWd1bHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTAxMDYsImV4cCI6MjA5NTc2NjEwNn0.4wi9iVtGOaY1tygSwf0JztRwKrC36Q8nZZ9jPHWh4ww
```

En **Next.js** las variables del cliente se prefijan con `NEXT_PUBLIC_` (p. ej. `NEXT_PUBLIC_SUPABASE_URL`). La `service_role` se obtiene en el panel (Settings → API) y vive solo en el servidor; **jamás** se prefija con `NEXT_PUBLIC_` ni se incluye en el bundle del navegador.

---

## 3. Esquema (estado real)

### Tipos enumerados

| Tipo | Valores |
|---|---|
| `rol_usuario` | `usuario`, `administrador` |
| `tipo_publicacion` | `libro`, `articulo`, `investigacion`, `ensayo`, `cuento`, `poema`, `resena`, `tesis`, `ponencia`, `proyecto`, `dibujo`, `ilustracion`, `pintura`, `diseno_grafico`, `diseno_modas`, `fotografia`, `infografia`, `recomendacion`, `otro` |
| `estado_revista` | `borrador`, `publicada` |
| `estado_solicitud` | `pendiente`, `aceptada`, `rechazada`, `retirada` (`retirada` = artículo aceptado y luego retirado por un admin vía `retirar_articulo`) |
| `motivo_reporte` | `contenido_inapropiado`, `plagio`, `spam`, `otro` |
| `estado_reporte` | `pendiente`, `revisado`, `descartado` |

### Tablas (16, todas con RLS activado)

| Tabla | Propósito | Notas |
|---|---|---|
| `usuario` | Perfil de usuario | Extiende `auth.users` por `id`; `rol` por defecto `usuario` |
| `publicacion` | Creaciones (libro, artículo, etc.) | `tipo` por defecto `investigacion`; `archivo_url` apunta a Storage; `obra_autor_externo`/`url_externa` nullable, solo poblados cuando `tipo = 'recomendacion'`; `bloqueada boolean not null default false` — oculta la publicación a usuarios no-admin cuando es `true` |
| `comentario` | Comentarios sobre publicaciones | Columna `responde_a uuid? FK→comentario(id) ON DELETE CASCADE` (auto-referencial). `NULL` = comentario raíz; no-null = respuesta (siempre apunta al raíz — profundidad máxima 2, garantizada por el POST handler). Ver §3.12 |
| `"like"` | Likes (único por usuario/publicación) | **Nombre entre comillas** (palabra reservada) |
| `tag` | Catálogo de etiquetas | Solo administradores las gestionan |
| `publicacion_tag` | Puente publicación ↔ etiqueta | — |
| `revista` | Revistas temáticas mensuales | Sin editor; solo una en `borrador` a la vez (índice único parcial) |
| `revista_articulo` | Artículos curados en revista | Campo `orden` para la secuencia |
| `solicitud_revista` | Solicitudes de inclusión en revista | `revisor_id`/`resuelto_en` nulos hasta resolver |
| `usuario_link` | Enlaces de perfil del usuario | Hasta 10 por usuario; `orden` para la secuencia; ver §3.7 |
| `seguidor` | Grafo de seguimiento dirigido | PK compuesta `(seguidor_id, seguido_id)`; CHECK anti-self-follow; ver §3.8 |
| `reporte` | Reportes de contenido inapropiado | `UNIQUE (publicacion_id, reportante_id)`; `estado` por defecto `pendiente`; ver §3.10 |
| `guardado` | Marcadores **privados** del usuario | `UNIQUE (usuario_id, publicacion_id)`; RLS solo `authenticated` (sin `anon`, sin `using(true)`) — solo el dueño los ve; ver §3.11 |
| `conversacion` | Canal 1-a-1 entre dos usuarios | Par ordenado `(usuario_a, usuario_b)` con `usuario_a < usuario_b`; UNIQUE garantiza un solo canal por par; ver §3.13 |
| `mensaje` | Mensajes dentro de una conversación | `leido boolean default false`; solo el receptor puede marcarlo `true` (policy `mensaje_marca_leido`); ver §3.13 |
| `solicitud_mensaje` | Solicitudes para iniciar una conversación | `UNIQUE (emisor_id, receptor_id) WHERE estado='pendiente'` — una sola pendiente por dirección; CHECK anti-self-request; solo las RPC escriben; ver §3.14 |

> El DDL real (columnas, llaves foráneas, índices y las **41 políticas RLS** actuales) se aplicó como migraciones en Supabase (`esquema_inicial`, `logica_negocio`, `rls_politicas`, `almacenamiento` + las aditivas posteriores); consúltalo directamente en el panel o mediante `supabase db dump`.
>
> **CHECK de longitud a nivel BD (verificados en vivo):** además de la validación server-side, la BD impone: `publicacion.titulo ≤ 150`, `publicacion.resumen ≤ 700`, `comentario.contenido ≤ 250`, `revista.titulo ≤ 65`, `revista.volumen < 9999` (o NULL), `usuario.nombre/institucion/carrera ≤ 50` y `usuario.email ≤ 254` (alineado con el `signup` y con RFC 5321 — migración `widen_usuario_email_check_to_254`, 2026-06-24; antes era ≤ 50, lo que podía romper el trigger `handle_new_user` con emails largos).

### Diferencias respecto al plan original

- **Tabla `like`:** `LIKE` es palabra reservada en PostgreSQL, así que la tabla se creó como `"like"` (entre comillas). En **SQL crudo** debes escribirla siempre así; desde `supabase-js` usas `.from('like')` con normalidad (PostgREST lo resuelve).
- **`tipo_publicacion`** se amplió a los siete tipos de obra de Vitrina (antes era investigación/ensayo/otro).
- **`tipo_publicacion` — extensión aditiva (más tipos de obra):** se añadieron 8 valores con `ALTER TYPE ... ADD VALUE IF NOT EXISTS` — `ensayo`, `cuento`, `tesis`, `resena`, `fotografia`, `infografia`, `ponencia`, `proyecto`. Luego 4 más (migración `add_tipo_publicacion_visuales`) — `ilustracion`, `pintura`, `diseno_grafico`, `diseno_modas`. Siguen la convención ASCII sin acentos del enum (`articulo`, `investigacion`); los valores multi-palabra usan snake_case (`diseno_grafico`, como `contenido_inapropiado`). Las etiquetas acentuadas (`Reseña`, `Diseño gráfico`, etc.) viven en `lib/constants/publicaciones.ts` (`TIPO_META`). Cambio puramente aditivo: **sin cambios en columnas, RLS, policies, RPC ni en la vista `feed_publicaciones`.**
- **Recomendaciones (extensión aditiva):** el valor `recomendacion` permite publicar obras de terceros. Se añadieron dos columnas **nullable** a `publicacion` — `obra_autor_externo` (autor real de la obra) y `url_externa` (enlace http/https) — pobladas únicamente para ese tipo. `autor_id` sigue siendo **el recomendador** (de la sesión), no el autor externo. La vista `feed_publicaciones` se recreó preservando `security_invoker=true` y exponiendo ambas columnas. **Sin cambios en RLS, policies ni RPC.**
- **`rol_usuario`** usa `usuario` como rol base (antes `estudiante`).
- **Revista sin editor (v1.1):** se eliminó `revista.editor_id`; ahora cualquier administrador cura cualquier edición. Se añadió un índice único parcial que garantiza una sola revista en `borrador`. Ver §3.5. (La cadencia es **mensual** desde 2026-06-24 — ver §3.5 y §9.)

### 3.5 Migración de revista automática (v1.1) — cadencia actual: **mensual**

Esta migración convirtió la revista manual en un ciclo automático. Se aplicó como migración `revista_semanal`.

> **Actualización 2026-06-24 (migración `revista_mensual_en_lugar_de_semanal`):** la cadencia pasó de **semanal** a **mensual**. La función se renombró a `publicar_revista_mensual`, el job `pg_cron` a `revista-mensual` con expresión `0 19 1 * *` (día 1 de cada mes, 13:00 UTC-6 = 19:00 UTC) y el título del nuevo borrador a `'Revista mensual Archicom'`. Lo de abajo refleja el estado actual.

**a) Función auxiliar `es_admin()`**

Helper reutilizable que usan las nuevas políticas de `solicitud_revista` y las RPC.

```sql
create or replace function public.es_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.usuario
    where id = auth.uid() and rol = 'administrador'
  );
$$;
```

**b) Reemplazar las RPC (quitar verificación de `editor_id`)**

Las funciones `aceptar_solicitud` y `rechazar_solicitud` referenciaban `revista.editor_id` en su cuerpo. Hay que reemplazarlas **antes** de soltar la columna. Los nuevos cuerpos están en §3.6.

**c) Eliminar las políticas de `solicitud_revista` que dependían de `editor_id`**

Las políticas `admin_ve_sus_revistas` (SELECT) y `admin_actualiza` (UPDATE) en `solicitud_revista` filtraban con un join a `revista.editor_id`. Las políticas `admin_gestiona` de `revista` y `revista_articulo` **no** dependían de `editor_id` (verifican el rol con subquery inline) y se dejaron intactas.

```sql
drop policy if exists admin_ve_sus_revistas on solicitud_revista;
drop policy if exists admin_actualiza       on solicitud_revista;
```

**d) Eliminar la columna de editor**

```sql
alter table revista drop column editor_id;
```

**e) Recrear las políticas de `solicitud_revista` (cualquier administrador)**

```sql
create policy admin_ve_solicitudes on solicitud_revista
  for select to authenticated
  using (public.es_admin());

create policy admin_actualiza_solicitudes on solicitud_revista
  for update to authenticated
  using (public.es_admin());
```

> Estas conviven con las políticas existentes `autor_ve_suyas` (SELECT, el solicitante ve las suyas) y `autor_inserta` (INSERT, el autor postula su obra). Un usuario ve solo sus solicitudes; un administrador ve todas.

**f) Garantizar una sola revista activa**

```sql
create unique index una_revista_borrador
  on revista (estado)
  where (estado = 'borrador');
```

> Si actualmente hay más de una revista en `borrador`, este índice fallará al crearse. Deja una sola en borrador (publica o elimina las demás) antes de aplicarlo.

**Nota sobre las políticas de `revista` y `revista_articulo`:** las políticas `admin_gestiona` (FOR ALL) en ambas tablas ya verificaban `rol = 'administrador'` mediante subquery inline y nunca referenciaron `editor_id`, por lo que **no fue necesario modificarlas**. Funcionalmente equivalen a `es_admin()` aunque usen una implementación distinta.

### 3.6 Funciones (cuerpos para la v1.1)

**d) RPC: validar solo administrador (ya no editor)**

Reemplaza la verificación interna de las dos RPC. La firma y el comportamiento transaccional no cambian; solo la autorización.

```sql
create or replace function public.aceptar_solicitud(p_solicitud_id uuid, p_respuesta text default null)
returns void language plpgsql security definer as $$
declare s record;
begin
  if not public.es_admin() then
    raise exception 'No autorizado';
  end if;

  select * into s from public.solicitud_revista where id = p_solicitud_id;
  if not found then raise exception 'Solicitud no encontrada'; end if;
  if s.estado <> 'pendiente' then raise exception 'La solicitud ya fue resuelta'; end if;

  update public.solicitud_revista
     set estado = 'aceptada', revisor_id = auth.uid(),
         resuelto_en = now(), respuesta = p_respuesta
   where id = p_solicitud_id;

  insert into public.revista_articulo (revista_id, publicacion_id, orden)
  values (
    s.revista_id, s.publicacion_id,
    coalesce((select max(orden) + 1 from public.revista_articulo
              where revista_id = s.revista_id), 1)
  );
end $$;

create or replace function public.rechazar_solicitud(p_solicitud_id uuid, p_respuesta text default null)
returns void language plpgsql security definer as $$
declare s record;
begin
  if not public.es_admin() then
    raise exception 'No autorizado';
  end if;

  select * into s from public.solicitud_revista where id = p_solicitud_id;
  if not found then raise exception 'Solicitud no encontrada'; end if;
  if s.estado <> 'pendiente' then raise exception 'La solicitud ya fue resuelta'; end if;

  update public.solicitud_revista
     set estado = 'rechazada', revisor_id = auth.uid(),
         resuelto_en = now(), respuesta = p_respuesta
   where id = p_solicitud_id;
end $$;
```

**e) Función de rotación mensual**

Publica la edición activa, descarta sus pendientes y abre la siguiente. Idempotente y transaccional (una función PL/pgSQL corre en una sola transacción: si algo falla, no rota a medias).

```sql
create or replace function public.publicar_revista_mensual()
returns void language plpgsql security definer as $$
declare v_revista record;
begin
  -- 1. Tomar la revista activa (única en borrador). Si no hay, salir.
  select * into v_revista from public.revista where estado = 'borrador' limit 1;
  if not found then return; end if;

  -- 2. Descartar automáticamente las solicitudes que sigan pendientes
  update public.solicitud_revista
     set estado = 'rechazada',
         resuelto_en = now(),
         respuesta = 'Rechazada automáticamente: la edición cerró sin resolverse.'
   where revista_id = v_revista.id
     and estado = 'pendiente';

  -- 3. Publicar la edición (las obras ya aceptadas están en revista_articulo)
  update public.revista
     set estado = 'publicada', publicada_en = now()
   where id = v_revista.id;

  -- 4. Crear el borrador del mes siguiente
  insert into public.revista (titulo, volumen, estado)
  values ('Revista mensual Archicom', v_revista.volumen + 1, 'borrador');
end $$;
```

> `revisor_id` queda `NULL` en las solicitudes descartadas automáticamente: eso permite distinguir en auditoría un rechazo humano (con `revisor_id`) de un cierre del sistema (sin él).

### 3.6b Borrado por administrador (`admin_elimina`)

Migración aditiva `publicacion_admin_delete_policy` (cambio de esquema con aprobación explícita). Permite que un administrador elimine **cualquier** publicación, no solo las propias.

```sql
create policy "admin_elimina" on public.publicacion
  for delete
  to public
  using (public.es_admin());
```

- Es **aditiva**: convive con `eliminar_propio` (`auth.uid() = autor_id`). Las policies permissive se combinan con **OR**, así que `publicacion` queda como *autor **o** admin* puede borrar. No se modificó `eliminar_propio`.
- **Revistas:** no requirió migración. La policy `admin_gestiona` (FOR ALL) de `revista` ya cubría DELETE para el rol administrador.
- Todas las FK hacia `publicacion` y `revista` son `ON DELETE CASCADE`: borrar una publicación arrastra sus `comentario`, `like`, `publicacion_tag`, `revista_articulo` y `solicitud_revista`; borrar una revista arrastra sus `revista_articulo` y `solicitud_revista`. El cascade lo ejecuta el sistema (no pasa por RLS), por lo que limpia también filas de otros usuarios.
- **Storage:** cuando el **autor** borra su propia publicación, el handler `DELETE /api/publicaciones/[id]` limpia el archivo del bucket (best-effort, con el JWT del autor, vía `removeOwnStorageObject`). Cuando el **admin** borra una publicación ajena, su JWT no puede tocar la carpeta `{user_id}/...` del autor (y no se usa `service_role`), por lo que **el archivo queda huérfano** — limitación conocida y aceptada (ver F-004). Los huérfanos por reemplazo de archivo al editar y por fallo de guardado se limpian desde el cliente vía `DELETE /api/storage`.

### 3.10 Moderación de reportes (migración `reportes_moderacion`)

Esta sección describe los cambios de esquema para la funcionalidad de moderación de reportes. Todos los cambios son **aditivos**: no se modifica ninguna tabla, política, RPC ni vista existente.

#### Enums nuevos

`motivo_reporte` y `estado_reporte` — ver tabla de tipos enumerados.

#### Tabla `reporte`

```sql
create table reporte (
  id             uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references publicacion(id) on delete cascade,
  reportante_id  uuid not null references usuario(id),
  motivo         motivo_reporte not null,
  detalle        text,
  estado         estado_reporte not null default 'pendiente',
  revisor_id     uuid references usuario(id),
  resuelto_en    timestamptz,
  creado_en      timestamptz not null default now(),
  unique (publicacion_id, reportante_id)
);
alter table reporte enable row level security;
```

FK constraint names (verificados): `reporte_publicacion_id_fkey`, `reporte_reportante_id_fkey`, `reporte_revisor_id_fkey`.

**Políticas RLS:**

| Política | Tipo | Condición |
|---|---|---|
| `reporte_inserta` | INSERT (authenticated) | `reportante_id = auth.uid()` |
| `reporte_ve_propio` | SELECT (authenticated) | `reportante_id = auth.uid() OR es_admin()` |
| `reporte_admin_actualiza` | UPDATE (authenticated) | `es_admin()` |

#### Columna `publicacion.bloqueada`

```sql
alter table publicacion add column bloqueada boolean not null default false;
```

Indica si la publicación fue bloqueada por moderación. Oculta la publicación a usuarios no-admin.

#### RPC `bloquear_publicacion`

Firma: `bloquear_publicacion(p_reporte_id uuid, p_respuesta text default null) returns void`

SECURITY DEFINER, `set search_path = public`. Valida `es_admin()`, el reporte existe, y que `estado = 'pendiente'`. En una sola transacción: actualiza `reporte.estado = 'revisado'` + `publicacion.bloqueada = true`. `p_respuesta` es aceptado por la firma pero no persiste (no hay columna `respuesta` en `reporte`).

#### RPC `descartar_reporte`

Firma: `descartar_reporte(p_reporte_id uuid) returns void`

SECURITY DEFINER, `set search_path = public`. Mismas validaciones que `bloquear_publicacion`. Actualiza `reporte.estado = 'descartado'` sin tocar `publicacion.bloqueada`.

#### §7.1 — Hardening de las nuevas RPCs

> **Estado verificado (2026-06-18):** `bloquear_publicacion` y `descartar_reporte` ya tienen grants `authenticated, postgres, service_role` (no `anon`/`public`). Validan `es_admin()` internamente. Como el admin las llama con su propio JWT y no hay `service_role`, **no** se puede revocar de `authenticated` sin romper el flujo de admin. Tratadas como excepción documentada — ver §7.1 principal y `SECURITY_AUDIT.md` (F-002).

#### Política RESTRICTIVE `publicacion_oculta_bloqueadas` (migración `reportes_moderacion_ocultar`)

```sql
create policy publicacion_oculta_bloqueadas on publicacion
  as restrictive for select
  using (bloqueada = false or public.es_admin() or autor_id = auth.uid());
```

Es RESTRICTIVE: se ANDea con el OR-union de las políticas PERMISSIVE. Efecto: `lectura_publica` (USING true) permite todo, pero este RESTRICTIVE lo restringe a `bloqueada=false OR es_admin() OR es_el_autor`. Autores pueden seguir viendo sus propias publicaciones bloqueadas.

> ⚠️ **Esta policy llama a `es_admin()` en cada SELECT de `publicacion`.** Por eso **todo rol que lea `publicacion` (incluido `anon`) necesita `EXECUTE` sobre `public.es_admin()`**; las policies RLS se evalúan en contexto del rol que llama. Sin ese grant, un visitante anónimo recibe `permission denied for function es_admin (42501)` y el feed le devuelve **cero filas**. Grant aplicado en migración `grant_execute_es_admin_to_anon`. Ver §7.1.

#### Vista `feed_publicaciones` (recreada)

La vista se recreó con `WHERE p.bloqueada = false` para excluir publicaciones bloqueadas del feed. Se preservan: `security_invoker=true`, todas las columnas previas (`id, autor_id, autor_nombre, titulo, resumen, archivo_url, tipo, creado_en, likes, comentarios, obra_autor_externo, url_externa`). El FeedPublicacion DTO no expone `bloqueada` (la vista no la incluye).

### 3.11 Guardados privados (migración `guardados`)

Marcadores personales: un usuario logueado guarda publicaciones para verlas luego en `/perfil/guardados`. Es el contraste con `"like"` (público): los guardados son **PRIVADOS** — solo el dueño los lee. Cambio **puramente aditivo** (aprobado explícitamente): no toca ninguna tabla, RLS, RPC ni vista existente.

```sql
create table guardado (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     uuid not null references usuario(id) on delete cascade,
  publicacion_id uuid not null references publicacion(id) on delete cascade,
  creado_en      timestamptz not null default now(),
  unique (usuario_id, publicacion_id)
);
alter table guardado enable row level security;
```

FK constraint names (verificados): `guardado_usuario_id_fkey`, `guardado_publicacion_id_fkey`.

**Políticas RLS — solo `authenticated`, nunca `anon` ni `using(true)`:**

| Política | Tipo | Condición |
|---|---|---|
| `guardado_ve_propio` | SELECT (authenticated) | `usuario_id = auth.uid()` |
| `guardado_inserta` | INSERT (authenticated) | `usuario_id = auth.uid()` (with check) |
| `guardado_borra_propio` | DELETE (authenticated) | `usuario_id = auth.uid()` |

> ⚠️ **La privacidad es por diseño.** No hay policy para `anon` ni `using (true)`: un visitante anónimo NUNCA puede leer los guardados de nadie. El `UNIQUE (usuario_id, publicacion_id)` evita duplicados (violarlo devuelve `23505` → 409). Las FK son `ON DELETE CASCADE`: borrar un usuario o una publicación limpia sus guardados.

### 3.12 Hilos de comentarios (migración `comentarios_hilos`)

Extensión **aditiva** para soporte de respuestas a comentarios (profundidad máxima 2). Aprobada explícitamente. No modifica ninguna política RLS, RPC, ni vista existente.

```sql
alter table public.comentario
  add column responde_a uuid references public.comentario(id) on delete cascade;
```

- La columna es **nullable** (`NULL` = comentario raíz; no-null = respuesta directa al raíz).
- **FK auto-referencial**: `comentario.responde_a → comentario.id ON DELETE CASCADE`. Borrar un comentario raíz elimina automáticamente todas sus respuestas (cascade ejecutado por Postgres, sin pasar por RLS).
- La **profundidad máxima de 2** es un invariante de dominio aplicado por el POST handler (`app/api/comentarios/route.ts`): si `responde_a` apunta a una respuesta existente, el handler re-ancla al raíz de esa respuesta antes de insertar. El esquema no impone la restricción a nivel de DB (no hay trigger).
- No se agregó índice en `responde_a` (volúmenes MVP; la lectura filtra por `publicacion_id` y agrupa en memoria).
- No hay cambio en RLS, RPC ni vista `feed_publicaciones`.

---

### 3.13 Mensajería directa (migraciones `mensajeria_directa`, `mensajeria_directa_revoke_anon`, `mensajeria_directa_fix_no_leidos`)

Extensión **aditiva** aprobada explícitamente. Añade mensajería 1-a-1 privada entre usuarios que se siguen mutuamente. No modifica ninguna tabla, RLS, RPC, vista ni policy existentes.

#### Tabla `conversacion`

Canal entre exactamente dos participantes. El par `(usuario_a, usuario_b)` se almacena siempre ordenado (`usuario_a < usuario_b`) para garantizar exactamente una fila por par, de forma race-free.

**Columnas:**

| Columna | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | `uuid` | `primary key default gen_random_uuid()` | — |
| `usuario_a` | `uuid not null` | `references usuario(id) on delete cascade` | Siempre el UUID menor del par |
| `usuario_b` | `uuid not null` | `references usuario(id) on delete cascade` | Siempre el UUID mayor del par |
| `creado_en` | `timestamptz not null` | `default now()` | — |
| `actualizado_en` | `timestamptz not null` | `default now()` | Clave de orden en la bandeja; se actualiza en cada envío |

**Restricciones:**
- `conversacion_par_ordenado` CHECK (`usuario_a < usuario_b`) — garantiza orden canónico del par.
- `conversacion_par_unico` UNIQUE (`usuario_a, usuario_b`) — exactamente una conversación por par.

**FK constraint names:** `conversacion_usuario_a_fkey` · `conversacion_usuario_b_fkey`. **ON DELETE CASCADE** en ambas FK: borrar un usuario elimina sus conversaciones y, en cascada, sus mensajes.

**Índices:** `conversacion_usuario_a_idx` (`usuario_a`) · `conversacion_usuario_b_idx` (`usuario_b`) — para las consultas de bandeja.

**RLS habilitado.** Una política de lectura; no hay política de INSERT/UPDATE directa (todos los writes pasan por la RPC `enviar_mensaje`):

| Policy | FOR | TO | USING |
|---|---|---|---|
| `conversacion_lectura` | `SELECT` | `authenticated` | `auth.uid() in (usuario_a, usuario_b)` |

> No hay política INSERT ni UPDATE directa: el único camino para crear o actualizar una conversación es la RPC `enviar_mensaje` (SECURITY DEFINER), que hace el `INSERT … ON CONFLICT DO UPDATE` de forma atómica.

#### Tabla `mensaje`

Mensajes dentro de una conversación. Solo el receptor puede marcar mensajes como leídos.

**Columnas:**

| Columna | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | `uuid` | `primary key default gen_random_uuid()` | — |
| `conversacion_id` | `uuid not null` | `references conversacion(id) on delete cascade` | Conversación padre |
| `emisor_id` | `uuid not null` | `references usuario(id) on delete cascade` | Quien envió |
| `contenido` | `text not null` | `check (char_length(contenido) between 1 and 2000)` | Defensa en profundidad (la RPC también valida) |
| `leido` | `boolean not null` | `default false` | Solo el receptor puede pasarlo a `true` (policy `mensaje_marca_leido`) |
| `creado_en` | `timestamptz not null` | `default now()` | — |

**FK constraint names:** `mensaje_conversacion_id_fkey` · `mensaje_emisor_id_fkey`. **ON DELETE CASCADE** en ambas FK.

**Índices:**
- `mensaje_conversacion_creado_idx` (`conversacion_id, creado_en`) — lectura del hilo en orden cronológico.
- `mensaje_no_leidos_idx` (`conversacion_id, emisor_id`) WHERE `leido = false` — índice parcial para el conteo de no leídos en la bandeja.

**RLS habilitado.** Dos políticas; no hay política de INSERT (solo vía RPC):

| Policy | FOR | TO | Condición |
|---|---|---|---|
| `mensaje_lectura` | `SELECT` | `authenticated` | `EXISTS (SELECT 1 FROM conversacion c WHERE c.id = mensaje.conversacion_id AND auth.uid() IN (c.usuario_a, c.usuario_b))` |
| `mensaje_marca_leido` | `UPDATE` | `authenticated` | `USING` y `WITH CHECK`: `emisor_id <> auth.uid()` AND participante de la conversación |

> **`mensaje_lectura` también protege el canal Realtime.** `postgres_changes` respeta la policy SELECT del llamante, por lo que un no-participante no recibe eventos aunque se suscriba al canal.

> **`mensaje_marca_leido`:** el receptor solo puede poner `leido = true` en mensajes que NO envió él. No hay política INSERT: todo insert es vía `enviar_mensaje`.

> **Grant de columna restringido a `leido` (migración `mensaje_update_column_grant_leido`, 2026-06-28):** la policy RLS `mensaje_marca_leido` restringe *filas* (solo las del otro participante) pero **no columnas**; con el grant de UPDATE a nivel de tabla, un participante podía alterar vía PostgREST directo campos como `contenido`, `emisor_id` o `creado_en` de mensajes ajenos. Fix: `REVOKE UPDATE ON public.mensaje FROM anon, authenticated` + `GRANT UPDATE (leido) ON public.mensaje TO authenticated`. Ahora `authenticated` solo puede actualizar la columna `leido`; el resto de columnas queda denegado a nivel de grant. El endpoint `leer` y los recibos de lectura en tiempo real siguen funcionando (solo escriben `leido`). La RPC `enviar_mensaje` es SECURITY DEFINER y no se ve afectada.

#### Helper `se_siguen(a uuid, b uuid) returns boolean` — SECURITY INVOKER

```sql
create or replace function public.se_siguen(a uuid, b uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.seguidor where seguidor_id = a and seguido_id = b)
     and exists (select 1 from public.seguidor where seguidor_id = b and seguido_id = a);
$$;
```

**Decisión: SECURITY INVOKER, no DEFINER.** `seguidor` tiene `seguidor_lectura using(true)` (lectura pública, §3.8), así que una consulta en contexto del invocador ya ve todas las filas necesarias. Usar DEFINER añadiría autoridad ambiente sin beneficio y sería marcada por el advisor de seguridad. Se añade `set search_path` por higiene/cumplimiento del advisor incluso en funciones INVOKER.

#### RPC `enviar_mensaje(p_receptor_id uuid, p_contenido text) returns mensaje` — SECURITY DEFINER

```sql
create or replace function public.enviar_mensaje(p_receptor_id uuid, p_contenido text)
returns public.mensaje
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_emisor  uuid := auth.uid();
  v_a       uuid;
  v_b       uuid;
  v_conv_id uuid;
  v_msg     public.mensaje;
begin
  if v_emisor is null then
    raise exception 'No autenticado';
  end if;
  if p_receptor_id = v_emisor then
    raise exception 'No podés enviarte un mensaje a vos mismo';
  end if;
  if p_contenido is null or char_length(p_contenido) < 1 or char_length(p_contenido) > 2000 then
    raise exception 'El mensaje debe tener entre 1 y 2000 caracteres';
  end if;
  if not public.se_siguen(v_emisor, p_receptor_id) then
    raise exception 'Solo podés enviar mensajes a usuarios que te siguen y a quienes seguís';
  end if;

  v_a := least(v_emisor, p_receptor_id);
  v_b := greatest(v_emisor, p_receptor_id);

  insert into public.conversacion (usuario_a, usuario_b)
  values (v_a, v_b)
  on conflict (usuario_a, usuario_b)
    do update set actualizado_en = now()
  returning id into v_conv_id;

  insert into public.mensaje (conversacion_id, emisor_id, contenido)
  values (v_conv_id, v_emisor, p_contenido)
  returning * into v_msg;

  return v_msg;
end $$;
```

- Todos los `raise exception` → SQLSTATE `P0001` → `handleError` los mapea a **400 preservando el `message`** (comportamiento heredado del contrato §7.1 existente).
- El `ON CONFLICT DO UPDATE SET actualizado_en = now()` es race-free gracias al UNIQUE, y garantiza que la conversación siempre se retorna y que `actualizado_en` refleja el último envío.
- La mutualidad se re-verifica en cada envío: si alguno de los dos deja de seguir al otro, el envío se bloquea mientras el historial previo sigue accesible vía `mensaje_lectura`.

**Grant:** `EXECUTE` revocado de `public` y `anon`; otorgado exclusivamente a `authenticated` (misma postura que las RPC de negocio existentes — ver §7.1). El advisor `authenticated_security_definer_function_executable` (WARN) es la excepción documentada e intencional: el control real está en la validación interna.

**Mensajes P0001 posibles:**

| Mensaje | Causa |
|---|---|
| `No autenticado` | `auth.uid()` es null — sin sesión válida |
| `No podés enviarte un mensaje a vos mismo` | `p_receptor_id = auth.uid()` |
| `El mensaje debe tener entre 1 y 2000 caracteres` | `contenido` vacío o > 2000 chars |
| `Solo podés enviar mensajes a usuarios que te siguen y a quienes seguís` | `se_siguen()` devolvió false |

#### Vista `bandeja_conversaciones` — `security_invoker = true`

Vista que agrega la bandeja del usuario en una sola consulta: última mensaje por conversación y conteo de no leídos **del receptor** (viewer-scoped gracias a `security_invoker`). Análoga a `perfil_contadores` (§3.9).

```sql
create view public.bandeja_conversaciones
with (security_invoker = true) as
select
  c.id              as conversacion_id,
  c.usuario_a,
  c.usuario_b,
  c.actualizado_en,
  um.id             as ultimo_mensaje_id,
  um.emisor_id      as ultimo_emisor_id,
  um.contenido      as ultimo_contenido,
  um.creado_en      as ultimo_creado_en,
  coalesce(nl.total, 0) as no_leidos
from public.conversacion c
left join lateral (
  select m.id, m.emisor_id, m.contenido, m.creado_en
  from public.mensaje m
  where m.conversacion_id = c.id
  order by m.creado_en desc
  limit 1
) um on true
left join (
  select conversacion_id, count(*) total
  from public.mensaje
  where leido = false
    and emisor_id <> auth.uid()
  group by conversacion_id
) nl on nl.conversacion_id = c.id;
```

- `security_invoker = true` → corre bajo el JWT del llamante → `conversacion_lectura` y `mensaje_lectura` aplican → solo las conversaciones propias son visibles.
- `no_leidos` cuenta mensajes `leido = false` cuyo `emisor_id <> auth.uid()` — excluye los propios enviados, dejando solo los mensajes pendientes de leer **del receptor**. Esto es posible porque la vista es `security_invoker` y `auth.uid()` resuelve al llamante.
- `ultimo_mensaje_id/emisor_id/contenido/creado_en` son nullable (las conversaciones nuevas sin mensajes devuelven NULL en esas columnas).
- Sin policies propias: hereda RLS de `conversacion` y `mensaje` via `security_invoker`.
- Consumida por `getConversaciones(viewerId)` y `getTotalNoLeidos(viewerId)` en `lib/data/mensajes.ts`.

**Corrección aplicada (migración `mensajeria_directa_fix_no_leidos`):** la primera versión de la vista no filtraba `emisor_id <> auth.uid()` en la subquery `nl`, lo que hacía que los propios mensajes no leídos del emisor se contaran en `no_leidos`. La migración recreó la vista con esa condición.

#### Realtime

```sql
alter publication supabase_realtime add table public.mensaje;
```

Solo `mensaje` se publica en la publicación Realtime (no `conversacion`). La bandeja no necesita actualizaciones en tiempo real en v1; solo el hilo abierto las requiere. La policy `mensaje_lectura` (SELECT) filtra lo que cada suscriptor puede recibir — un no-participante no recibe eventos aunque esté conectado.

**`mensaje` → `REPLICA IDENTITY FULL` (migración `mensaje_replica_identity_full`):** por defecto Postgres solo incluye la PK en el registro WAL del "viejo" de un UPDATE. La suscripción Realtime filtra eventos por `conversacion_id=eq.<id>` (columna no-PK); cuando la identidad de réplica es solo PK, el registro WAL antiguo no lleva `conversacion_id` y Supabase Realtime **no puede hacer match del filtro**, por lo que **los eventos UPDATE no llegan al cliente**. Esto afecta directamente a los recibos de lectura en tiempo real (el campo `leido` pasando a `true`). La migración aplica:

```sql
alter table public.mensaje replica identity full;
```

Cambio puramente operativo (no modifica RLS, policies, RPC ni vista); aumenta el tamaño del WAL solo para filas de `mensaje` que reciban UPDATE. Requerido para que `HiloMensajes` reciba eventos UPDATE filtrados por `conversacion_id` y actualice el tick ✓✓ en tiempo real.

> **Footgun — JWT del socket Realtime:** el cliente browser **debe** llamar `supabase.realtime.setAuth(session.access_token)` antes de `.subscribe()`. Sin eso, el socket se autentica con la publishable (anon) key y la policy RLS `mensaje_lectura` deniega la entrega de eventos — el canal llega al estado `SUBSCRIBED` pero **no recibe ningún evento**. `HiloMensajes` y `NavClient` ambos obtienen la sesión con `supabase.auth.getSession()` y llaman `setAuth` antes de suscribirse. Ver `components/mensajes/HiloMensajes.tsx` y `components/layout/NavClient.tsx`.

---

### 3.14 Solicitudes de mensaje (migración `solicitudes_mensaje`)

Extensión **aditiva** aprobada explícitamente. Permite que un usuario sin seguimiento mutuo solicite iniciar una conversación. No modifica ninguna tabla, RLS, RPC, vista ni policy existentes.

#### Tabla `solicitud_mensaje`

**Columnas:**

| Columna | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | `uuid` | `primary key default gen_random_uuid()` | — |
| `emisor_id` | `uuid not null` | `references usuario(id) on delete cascade` | Quien envía la solicitud |
| `receptor_id` | `uuid not null` | `references usuario(id) on delete cascade` | Quien la recibe |
| `estado` | `text not null` | `default 'pendiente' CHECK in ('pendiente','aceptada','rechazada')` | — |
| `creado_en` | `timestamptz` | `default now()` | — |
| `resuelto_en` | `timestamptz` | nullable | Nulo hasta que el receptor acepta o rechaza |

**Restricciones:**
- `solicitud_mensaje_no_self` CHECK (`emisor_id <> receptor_id`) — defensa en profundidad.
- `solicitud_mensaje_pendiente_uniq` UNIQUE (`emisor_id, receptor_id`) WHERE `estado = 'pendiente'` — una sola solicitud pendiente por dirección; permite re-pedir tras rechazo.

**Índices:**
- `solicitud_mensaje_pendiente_uniq` (también sirve de índice parcial para consultas filtradas por `estado`).
- `solicitud_mensaje_receptor_idx` (`receptor_id, estado`) — lectura eficiente de la bandeja de solicitudes entrantes.

**RLS habilitado.** Una política de lectura; no hay INSERT/UPDATE policy — solo las RPC escriben:

| Policy | FOR | TO | USING |
|---|---|---|---|
| `solicitud_mensaje_lectura` | `SELECT` | `authenticated` | `auth.uid() in (emisor_id, receptor_id)` |

> Solo las RPC SECURITY DEFINER modifican la tabla (sin INSERT policy expuesta). La RLS de lectura garantiza que cada usuario vea únicamente sus solicitudes propias (enviadas o recibidas).

#### RPC `enviar_solicitud_mensaje(p_receptor_id uuid) returns jsonb`

SECURITY DEFINER, `set search_path = public, pg_temp`. Revocado de `public`/`anon`; otorgado a `authenticated`.

**Lógica:**
1. Valida `auth.uid()` not null y `p_receptor_id <> auth.uid()` (P0001 si falla).
2. Auto-follow emisor→receptor (`INSERT INTO seguidor … ON CONFLICT DO NOTHING`).
3. Verifica `se_siguen(auth.uid(), p_receptor_id)`. Si quedó `true`: acepta cualquier solicitud `pendiente` entre ambos (en cualquier dirección) y devuelve `{"resultado":"mutuo"}`.
4. Si no: INSERT/UPSERT solicitud `pendiente` y devuelve `{"resultado":"solicitud","solicitud_id":...}`.

**Guards anti-spam (migraciones `solicitud_mensaje_anti_spam` y `solicitud_mensaje_cooldown_2_dias`, 2026-06-28):** antes de ejecutar la lógica principal, la RPC evalúa dos controles adicionales; ambos lanzan `RAISE EXCEPTION` (P0001 → 400) con los mensajes exactos indicados:

| Guard | Condición | Mensaje P0001 |
|---|---|---|
| **Cooldown post-rechazo (2 días)** | Existe una solicitud `rechazada` del mismo emisor al mismo receptor con `resuelto_en > now() - interval '48 hours'` | `Esta persona rechazó tu solicitud; podés volver a intentar en un par de días.` |
| **Rate limit (20/hora)** | El emisor tiene ≥ 20 entradas en `solicitud_mensaje` con `creado_en > now() - interval '1 hour'` | `Enviaste demasiadas solicitudes en poco tiempo; esperá un rato e intentá de nuevo.` |

Estos controles mitigan el nagging post-rechazo y el auto-follow masivo / spam de solicitudes. Son los únicos dos guards nuevos; el resto de la lógica de la RPC no cambia.

**Retorno `jsonb`:**
- `{"resultado": "mutuo"}` — se consiguió follow mutuo (el caller puede abrir el compositor directamente).
- `{"resultado": "solicitud", "solicitud_id": "<uuid>"}` — solicitud enviada, pendiente de aceptación.

#### RPC `aceptar_solicitud_mensaje(p_solicitud_id uuid) returns jsonb`

SECURITY DEFINER, `set search_path = public, pg_temp`. Misma postura de grants.

**Guards (P0001):**
- `'Solicitud no encontrada'` — si el `id` no existe.
- `'No autorizado'` — si `receptor_id <> auth.uid()`.
- `'La solicitud ya fue resuelta'` — si `estado <> 'pendiente'`.

**Lógica tras los guards:** follow-back receptor→emisor (`INSERT INTO seguidor … ON CONFLICT DO NOTHING`); actualiza `estado = 'aceptada'`, `resuelto_en = now()`. No crea conversación ni mensaje (la conversación nace con el primer `enviar_mensaje`).

**Retorno:** `{"emisor_id": "<uuid>"}` — el caller redirige a `/mensajes/nuevo?u=<emisor_id>`.

#### RPC `rechazar_solicitud_mensaje(p_solicitud_id uuid) returns void`

SECURITY DEFINER, `set search_path = public, pg_temp`. Misma postura de grants.

**Guards:** idénticos a `aceptar_solicitud_mensaje`. Actualiza `estado = 'rechazada'`, `resuelto_en = now()`. NO toca los follows. Retorna void (`null` desde supabase-js).

---

### 3.15 RAG por publicación — chat sobre el PDF (migraciones `rag_publicacion_pgvector`, `rag_publicacion_harden_advisors`)

Extensión **aditiva** aprobada explícitamente. Habilita indexar el PDF de una publicación en chunks con embeddings y responder preguntas grounded (título + resumen + fragmentos recuperados). No modifica ninguna tabla, RLS, RPC, vista ni policy existentes.

**Extensión `vector` (pgvector)** — instalada en el schema `extensions` (no `public`), vía `rag_publicacion_harden_advisors`.

#### Tabla `publicacion_chunk`

| Columna | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | `uuid` | `primary key default gen_random_uuid()` | — |
| `publicacion_id` | `uuid not null` | `references publicacion(id) on delete cascade` | — |
| `indice` | `int not null` | — | Orden del chunk dentro del documento |
| `contenido` | `text not null` | — | Texto del fragmento (~2000 caracteres, 200 de solapamiento) |
| `embedding` | `vector(384)` | nullable | gte-small (Edge Function `embed`) |
| `creado_en` | `timestamptz` | `default now()` | — |

**Restricciones:** UNIQUE (`publicacion_id, indice`).
**Índices:** `publicacion_chunk_embedding_idx` (`hnsw`, `vector_cosine_ops`); `publicacion_chunk_pub_idx` (`publicacion_id`).

**RLS habilitado:**

| Policy | FOR | USING / WITH CHECK |
|---|---|---|
| `chunk_select` | `SELECT` | `publicacion.bloqueada = false OR autor_id = auth.uid() OR es_admin()` — espeja la visibilidad de `publicacion` |
| `chunk_insert` | `INSERT` | `WITH CHECK publicacion.autor_id = auth.uid()` — solo el autor |
| `chunk_delete` | `DELETE` | `publicacion.autor_id = auth.uid() OR es_admin()` — espeja `admin_elimina` |

#### Tabla `publicacion_rag`

Estado de indexado + fingerprint idempotente (evita reprocesar el mismo PDF).

| Columna | Tipo | Restricciones | Notas |
|---|---|---|---|
| `publicacion_id` | `uuid` | `primary key references publicacion(id) on delete cascade` | — |
| `archivo_hash` | `text` | nullable | sha256 hex de los bytes del PDF ya indexado |
| `chunks` | `int not null default 0` | — | `0` = sin capa de texto extraíble (PDF escaneado); el chat cae a título+resumen |
| `indexado_en` | `timestamptz not null default now()` | — | — |

**RLS habilitado:** `rag_select` (`SELECT` público, `true`); `rag_write` (`ALL`, autor-only).

#### RPC `match_publicacion_chunks(p_publicacion_id uuid, p_query_embedding vector(384), p_match_count int default 3)`

`language sql stable`, **NO `SECURITY DEFINER`** — corre bajo el JWT del llamante, RLS filtra los resultados (misma postura de seguridad que el resto de la capa Next: RLS es el guard real). `search_path` fijado en la migración de hardening. Retorna `(id, contenido, similaridad)` ordenado por coseno, top-K.

#### Edge Function `embed` (Deno, `supabase/functions/embed`)

Modelo built-in `gte-small` (384 dims), invocado con `functions.invoke('embed', { body: { input } })` portando el JWT del usuario. Contrato: `{ input: string | string[] }` → `{ embeddings: number[][] }`.

#### Consumo desde Next (capa aplicación)

`lib/rag/{config,pdf,embed}.ts` (extracción/troceo de PDF con `unpdf`, llamada a la Edge Function) + route handlers `POST /api/publicaciones/[id]/index` (autor-only, idempotente por hash) y `POST /api/publicaciones/[id]/chat` (logueado, `generateText` con `claude-haiku-4-5` vía `@ai-sdk/anthropic`). Ver `Vitrina_Especificaciones_APIs.md` para el contrato completo. Serialización pgvector: los embeddings se envían a PostgREST como texto (`JSON.stringify(vector)`, ej. `"[0.1,0.2,...]"`), nunca como array JS crudo (PostgREST lo serializaría como literal de array de Postgres `{...}` e invalidaría el cast a `vector(384)`).

Post-migración: `get_advisors(type:security)` sin RLS-disabled en las 2 tablas nuevas; verificado.

### 3.16 Rate limit del chat RAG (migraciones `rag_rate_limit`, `rag_rate_limit_revoke_anon`)

15 preguntas por hora **por cuenta** en `POST /api/publicaciones/[id]/chat`, para acotar costo/abuso.

#### Tabla `rag_rate_limit`

Una fila por usuario: `usuario_id uuid PK → usuario(id) ON DELETE CASCADE`, `ventana_inicio timestamptz`, `conteo int`. Ventana **fija** de 1h anclada en la primera pregunta. RLS: solo `SELECT` de la propia fila (`usuario_id = auth.uid()`); **sin** INSERT/UPDATE/DELETE para el usuario → no puede resetear su contador.

#### RPC `consumir_cuota_rag()`

`SECURITY DEFINER` (mismo modelo que `es_admin`/`aceptar_solicitud`; **no** es `service_role`), `search_path` fijo. Único camino de mutación del contador. Atómica (row lock): si la ventana venció reinicia y permite; si `conteo >= 15` deniega; si no, incrementa y permite. Identifica al llamante con `auth.uid()` (null → `P0001 'No autorizado'`). Retorna `(permitido boolean, restantes int, reinicia_en timestamptz)`. `EXECUTE` revocado de `anon`, otorgado a `authenticated`. La ruta `/chat` la llama tras validar y antes del trabajo caro; `!permitido` → 429 `rate_limited`. Verificado: 15 permitidas + la 16 denegada; anon auto-bloqueado.

---

### 3.17 Búsqueda del buscador — FTS + trigram (migraciones `search_fts_publicacion`, `search_unaccent_trigram`, `search_usuarios_word_similarity`)

Mejora del buscador: publicaciones pasan de `ilike` sobre **solo `titulo`** a **full-text search en español** sobre `titulo` + `resumen` (ranking, stemming, prefijo, multi-palabra, **accent-insensitive**); usuarios pasan de `ilike` sobre `nombre` a **búsqueda trigram typo-tolerante y accent-insensitive**. **Sin capa semántica/RAG** (elegido explícitamente; el híbrido queda como mejora futura). Cambio ADITIVO, aprobado explícitamente; sin tocar tablas/columnas/RLS/RPC existentes.

#### Extensiones + `f_unaccent`

`unaccent` y `pg_trgm` instaladas en el schema `extensions` (como `vector`). Wrapper `public.f_unaccent(text)` **IMMUTABLE** (envuelve `extensions.unaccent('extensions.unaccent'::regdictionary, $1)`, dict fijo) para poder usarlo en columna generada e índice de expresión (el `unaccent` de 1 argumento es solo STABLE). Nota: el `unaccent` por defecto mapea `ñ→n`.

#### Publicaciones — columna `publicacion.busqueda_tsv` + índice GIN + RPC `buscar_publicaciones`

Columna generada **STORED**: `setweight(to_tsvector('spanish', f_unaccent(coalesce(titulo,''))),'A') || setweight(to_tsvector('spanish', f_unaccent(coalesce(resumen,''))),'B')`. Peso A (título) > B (resumen). Índice `publicacion_busqueda_idx` GIN. RPC `buscar_publicaciones(p_q, p_limit=6, p_offset=0)` `language sql stable` **SECURITY INVOKER** (RLS del llamante aplica; la restrictiva `publicacion_oculta_bloqueadas` oculta `bloqueada`), `set search_path=''`. Tokeniza `f_unaccent(lower(p_q))`, sufija `:*` por término, une con `&` → `to_tsquery('spanish', …)` (prefijo; multi-palabra = AND). Ordena `ts_rank DESC, creado_en DESC`, join a `usuario` por `autor_id`. Devuelve `(id, titulo, resumen, tipo, autor_id, creado_en, nombre_autor, total bigint)`; `total = count(*) over()` para paginar.

#### Usuarios — índice trigram + RPC `buscar_usuarios`

Índice GIN de expresión `usuario_nombre_trgm_idx` sobre `f_unaccent(lower(nombre))` con `extensions.gin_trgm_ops` (soporta `LIKE` y `%`/`<%`). RPC `buscar_usuarios(p_q, p_limit=6, p_offset=0)` `language sql stable` **SECURITY INVOKER** (`usuario` es públicamente legible vía `lectura_publica`), `set search_path=''`. Normaliza `f_unaccent(lower(trim(p_q)))`; filtra `nombre_norm LIKE '%q%'` **OR** `q <% nombre_norm` (word_similarity, matchea una palabra del nombre → typo-tolerante); ordena por `word_similarity DESC, nombre ASC`. Solo expone `(id, nombre, institucion, carrera, total bigint)` — nunca `rol`/`email`.

Ambas con `EXECUTE` a `anon`+`authenticated` (búsqueda pública; **no** depende de la edge `embed` ni de JWT). Las consume `lib/data/buscar.ts` (`buscarPublicaciones`/`buscarUsuarios` → dropdown, página `/buscar`, "Ver más"). Verificado: publicaciones match solo-en-resumen + prefijo (`tribut`→"tributaria") + acento (`tradicion`→"tradición") + bloqueada oculta a `anon`; usuarios acento (`perez`→"Pérez") + typo (`cristofer`→"Cristopher"). Cero advisors nuevos. Nota: el typo tiene el límite del umbral `word_similarity` (0.6): una sustitución en palabra corta (`garzia`→"Garcia") puede no matchear.

---

### 3.18 Búsqueda semántica híbrida (migración `rag_busqueda_hibrida`)

Capa **semántica** encima del FTS del §3.17: embebe la consulta (edge `embed`, gte-small 384) y recupera publicaciones por similitud coseno sobre `publicacion_chunk` (los chunks del chat RAG, HNSW `vector_cosine_ops`), **fusionando** con el FTS vía **RRF**. Es **retrieval, sin generación LLM**. Solo en la página `/buscar` (SSR) y **solo para logueados** (la edge tiene `verify_jwt`); anónimo → FTS. Cambio ADITIVO, aprobado; sin tocar tablas/columnas/RLS/RPC existentes.

#### RPC `match_publicacion_chunks_global(p_query_embedding vector, p_match_count int default 20)`

`language sql stable` **SECURITY INVOKER** (RLS de `publicacion_chunk` aplica → respeta `bloqueada`), `set search_path to 'public','extensions'`. Over-fetch de los N×5 chunks más cercanos vía HNSW, luego `group by publicacion_id` con `max(1 - (embedding <=> q))` (mejor chunk por publicación), ordena por similitud, `limit N`. Devuelve `(publicacion_id uuid, similaridad double precision)`. `EXECUTE` solo a `authenticated`. La consume `lib/data/buscar.ts::buscarPublicacionesHibrido` (embebe la query con `embedTexts`, arma la lista y hace RRF con el FTS; degrada a FTS si el embed/RPC fallan).

#### Cobertura de indexado — auto-index + backfill admin

Para que la búsqueda semántica tenga qué buscar: **auto-index** de todo PDF al publicar (`PublicarForm` ya no tiene el checkbox opt-in; corre bajo el JWT del autor, RLS `chunk_insert`/`rag_write`). **Backfill** de PDFs existentes vía `POST /api/admin/rag/backfill` (secuencial, idempotente por sha256), habilitado por policies admin ADITIVAS `chunk_admin_write` (publicacion_chunk) y `rag_admin_write` (publicacion_rag) — `FOR ALL to authenticated using es_admin() with check es_admin()`, espejo de `admin_elimina`; el admin indexa PDFs ajenos bajo **su JWT** (RLS, no `service_role`). Pipeline compartido en `lib/rag/indexer.ts`. Verificado: backfill llevó la cobertura de 1 → 14 publicaciones (198 chunks); E2E `pruebas de software móvil` → el PDF "MAIA App" aparece para el usuario logueado (semántico) y **no** para el anónimo (FTS). Cero advisors nuevos.

---

### 3.19 Columna `ciudad` en `usuario` (migraciones `add_ciudad_to_usuario`, `grant_usuario_ciudad_column_privileges`)

Campo de texto libre y opcional: `ciudad text NULL, CHECK (char_length(ciudad) <= 50)` — mismo patrón que `institucion`/`carrera`. Sin RLS nueva (cubierta por las políticas existentes de `usuario`: lectura pública, escritura solo del propio dueño). Se edita en `/perfil/ajustes` (mismo formulario que institución/carrera, sin pantalla nueva) vía `PATCH /api/perfil`. Expuesta en `GET /api/auth/me`, `lib/data/perfil.ts::getPerfil` y renderizada en `PerfilView` cuando está presente. Cambio ADITIVO, aprobado explícitamente. Ver `Vitrina_Especificaciones_APIs.md` §4.1.

> **Incidente corregido (2026-07-09) — footgun de grants por columna.** `add_ciudad_to_usuario` agregó la columna pero **no** otorgó privilegios a nivel de columna (`GRANT SELECT/UPDATE (ciudad) ...`), a diferencia de `institucion`/`carrera` que sí los tienen. Esta tabla usa grants **por columna**, no por tabla completa (ver el patrón de `harden_usuario_rol_email`/`restrict_usuario_update_grants`), así que agregar una columna con `ALTER TABLE ADD COLUMN` **no** le da SELECT/UPDATE automáticamente a `anon`/`authenticated` — falta un `GRANT` explícito en la misma migración. Sin ese grant, cualquier `select(...)` que incluya la columna falla completo con `permission denied for column ciudad` (el privilegio de columna bloquea el `SELECT` entero, no solo esa columna). Síntoma real observado: `getPerfil()` seleccionaba `ciudad` → la query fallaba → `app/(main)/perfil/page.tsx` hacía `if (!perfil) redirect('/login')` **sin mirar `error`**, disfrazando el permission-denied de "sesión expirada" para cualquier usuario, sin relación con si tenía sesión válida o no. Corregido con la migración `grant_usuario_ciudad_column_privileges`: `grant select (ciudad) on usuario to anon, authenticated; grant update (ciudad) on usuario to authenticated;`. **Regla para toda columna nueva en `usuario`:** agregar el `GRANT` de columna en la misma migración que el `ALTER TABLE`, y verificar contra `information_schema.column_privileges` antes de dar el cambio por terminado.

---

### 3.20 Colecciones (migración `create_colecciones_tables`)

Permiten a cualquier usuario agrupar publicaciones (propias o ajenas) en listas curadas con visibilidad configurable — análogo a `guardado` (§3.11) pero con metadata (título/descripción) y agrupación en vez de un flag por publicación. Cambio ADITIVO, aprobado explícitamente; sin tocar tablas/columnas/RLS/RPC existentes.

#### Tabla `coleccion`

`id uuid PK default gen_random_uuid()`, `usuario_id uuid NOT NULL → usuario(id) ON DELETE CASCADE` (dueño), `titulo text NOT NULL` (`check char_length(titulo) <= 100`), `descripcion text` nullable (`check char_length(descripcion) <= 500`), `visibilidad text NOT NULL DEFAULT 'privada'` (`check visibilidad IN ('publica','privada')`), `creado_en timestamptz NOT NULL DEFAULT now()`.

#### Tabla `coleccion_publicacion`

PK compuesta `(coleccion_id, publicacion_id)`, ambas FK `ON DELETE CASCADE` hacia `coleccion`/`publicacion`. `orden int NOT NULL DEFAULT 0`, `agregado_en timestamptz NOT NULL DEFAULT now()`. **Nota:** el endpoint de alta no asigna `orden` (todo insert entra en 0) — no hay UI de reordenamiento en esta iteración; el orden de lectura en `getColeccion` (`lib/data/colecciones.ts`) se pide `ORDER BY orden ASC` pero, al ser todos 0, el desempate real depende del orden físico de Postgres, no de `agregado_en`. Si se agrega reordenamiento a futuro, revisar este punto.

#### RLS

| Policy | Tabla | FOR | Roles | Regla |
|---|---|---|---|---|
| `coleccion_select` | `coleccion` | SELECT | anon, authenticated | `using (visibilidad = 'publica' or usuario_id = auth.uid())` |
| `coleccion_insert` | `coleccion` | INSERT | authenticated | `with check (usuario_id = auth.uid())` |
| `coleccion_update` | `coleccion` | UPDATE | authenticated | `using/with check (usuario_id = auth.uid())` |
| `coleccion_delete` | `coleccion` | DELETE | authenticated | `using (usuario_id = auth.uid())` |
| `coleccion_publicacion_select` | `coleccion_publicacion` | SELECT | anon, authenticated | hereda visibilidad de la colección: `exists (select 1 from coleccion c where c.id = coleccion_id and (c.visibilidad = 'publica' or c.usuario_id = auth.uid()))` |
| `coleccion_publicacion_write` | `coleccion_publicacion` | ALL | authenticated | solo el dueño de la colección (mismo `exists`, sin la rama de `visibilidad = 'publica'`) — cubre INSERT/DELETE, no hay UPDATE en el flujo actual |

Sin RPC nuevas: todo el CRUD pasa por operaciones directas protegidas por estas policies (mismo patrón que `guardado`/`usuario_link`), no por `SECURITY DEFINER`.

#### Endpoints y UI

Endpoints en `Vitrina_Especificaciones_APIs.md` §19. UI: `/perfil/colecciones` (gestión propia: crear/editar/borrar, componente `ColeccionCard`), `/coleccion/[id]` (vista pública — `getColeccion` usa `.maybeSingle()` así que una colección privada ajena resuelve a `null` → `notFound()`, nunca un 403 que confirme su existencia), botón "Agregar a colección" en `/publicacion/[id]` (componente `AgregarAColeccionButton`, permite crear una colección nueva inline).

Verificado contra el proyecto real vía MCP `supabase`: tablas y políticas desplegadas coinciden con lo anterior (1 fila de prueba en cada tabla). Cero advisors nuevos.

---

### 3.21 Notificaciones por correo (Resend) — columna `notif_email_habilitado`, RPC resolutora transaccional y backend del panel admin de envío masivo (migraciones `add_notif_email_habilitado_to_usuario`, `create_resolver_destinatario_notificacion_rpc`, `fix_resolver_destinatario_notificacion_secret_store`, `create_correo_admin_table`, `create_resolver_destinatarios_correo_rpc`)

**PR1+PR2+PR4a de una cadena de PRs** (base de esquema + Edge Function transaccional + esquema/RLS/RPC/Edge Function del panel admin). Cambio ADITIVO, aprobado explícitamente; sin tocar tablas/columnas/RLS/RPC existentes. Con esta fase (4a) el esquema y las RPC quedan **completos**; solo falta la fase 4b (rutas Next.js + UI del panel admin, sin cambios de esquema).

> **Nota de rama (2026-07-10):** esta sección se extendió en `feat/notif-email-admin-backend` (base `feat/notif-email-edge-fn`, que trae PR1+PR2), que **no** incluye el fix de privacidad R1 aplicado en la rama independiente `feat/notif-email-perfil-ui` (PR3: revocación de `SELECT (notif_email_habilitado)` para `authenticated` + RPC `mi_notif_email_habilitado()`) — ver el historial de commits/PR de esa rama para el detalle completo. Al integrar la pila de PRs (`stacked-to-main`), esta sección tendrá un conflicto de merge con la versión de PR3 sobre el mismo §3.21; se debe reconciliar a mano conservando **ambas** correcciones (la de PR3 sobre la columna + las subsecciones nuevas de PR4a abajo).
### 3.21 Notificaciones por correo (Resend) — columna `notif_email_habilitado` + RPC resolutora transaccional (migraciones `add_notif_email_habilitado_to_usuario`, `create_resolver_destinatario_notificacion_rpc`, `fix_resolver_destinatario_notificacion_secret_store`, `revoke_select_notif_email_habilitado_add_self_rpc`)

**PR1+PR3 de una cadena de PRs** (base de esquema + toggle de perfil). Cambio ADITIVO, aprobado explícitamente; sin tocar tablas/columnas/RLS/RPC existentes fuera de lo documentado acá. Sección **en construcción**: se extiende en fases siguientes con el Edge Function transaccional + webhooks (`enviar-notificacion-email`, Fase 2) y el panel admin de envío masivo (`correo_admin` + `resolver_destinatarios_correo` + `enviar-correo-masivo`, Fases 4a/4b).

#### Columna `usuario.notif_email_habilitado`

`boolean NOT NULL DEFAULT true` — preferencia de notificaciones por correo, modelo opt-out (todo usuario empieza suscrito). `UPDATE` sigue otorgado a `authenticated` (`grant update (notif_email_habilitado) on usuario to authenticated;`) — seguro porque la policy `editar_propio` (`USING`/`WITH CHECK auth.uid() = id`) es **row-scoped**, así que un usuario solo puede escribir su propia fila.

> **Corrección (2026-07-10, hallazgo de `review-risk` verificado en vivo) — `GRANT SELECT` sobre esta columna a `authenticated` era una fuga de privacidad, NO estaba protegido por RLS.** El diseño original de PR1 (`grant select, update (notif_email_habilitado) on usuario to authenticated;`) asumía que RLS acotaba la lectura a la fila propia, igual que la protección de escritura. **Falso**: la policy de SELECT de `usuario` es `lectura_publica USING (true)` — pública para **todas** las filas y **todos** los roles (es la policy que permite ver perfiles de otros usuarios en `/usuario/[id]`). RLS filtra **filas**, no columnas; el `GRANT SELECT` de columna es *role-wide*, no *row-scoped*. Resultado real: cualquier usuario `authenticated` podía leer `notif_email_habilitado` de **cualquier otro usuario** vía `.from('usuario').select('notif_email_habilitado').eq('id', '<uuid-ajeno>')` — verificado en vivo contra la BD. Esta es la clase de error inversa al footgun de `ciudad` (§3.19: ahí faltaba el grant y todo el SELECT fallaba; acá el grant estaba de más y exponía datos privados de terceros).
>
> **Fix (migración `revoke_select_notif_email_habilitado_add_self_rpc`):** `revoke select (notif_email_habilitado) on usuario from authenticated;` (columna ya no legible por PostgREST directo, ni siquiera de la fila propia) + nueva RPC self-scoped `mi_notif_email_habilitado()` (ver abajo) como único camino de lectura. `UPDATE` no se tocó — sigue siendo seguro por ser row-scoped vía RLS.
>
> **Regla para cualquier futura columna "privada" de `usuario` (o de cualquier tabla con policy de SELECT pública/no row-scoped):** un `GRANT SELECT` de columna a un rol NO hereda automáticamente el row-scoping de otras policies de esa tabla. Si la tabla tiene una policy de lectura pública (`USING (true)`) como `usuario.lectura_publica`, la única forma de exponer una columna privada "propia únicamente" es (a) una RPC `SECURITY DEFINER` self-scoped que derive el id de `auth.uid()` internamente (patrón de `mi_notif_email_habilitado()`), nunca (b) un `GRANT SELECT` de columna liso — ese último expone la columna a todas las filas visibles por la policy existente, no solo a la fila del llamante.

Verificado contra `information_schema.column_privileges` tras el fix: `authenticated` conserva `UPDATE`, ya no aparece `SELECT` para esa columna en ningún rol.

#### RPC `mi_notif_email_habilitado()` — lectura self-scoped, sin parámetros

```sql
create or replace function public.mi_notif_email_habilitado()
returns boolean
language sql security definer set search_path = '' as $$
  select notif_email_habilitado from public.usuario where id = auth.uid();
$$;
```

`SECURITY DEFINER`, **sin parámetros** — deriva el `id` de `auth.uid()` dentro del cuerpo, así que estructuralmente **no puede** leer la preferencia de otro usuario (a diferencia de recibir un `p_usuario_id` y confiar en que el llamante no lo falsifique). `revoke all ... from public; grant execute ... to authenticated;` (NO `anon` — requiere sesión). Reemplaza el `.select('notif_email_habilitado')` directo en `lib/data/perfil.ts` (`getPreferenciasNotificacion`), `app/api/auth/me/route.ts` y `app/api/perfil/route.ts` (el `RETURNING` de la fila tras el `PATCH` también requiere `SELECT` sobre la columna devuelta, así que también se movió a esta RPC).

#### RPC `resolver_destinatario_notificacion(p_secret text, p_usuario_id uuid)`

`SECURITY DEFINER`, `set search_path = ''`. Igual que `consumir_cuota_rag`/`aceptar_solicitud`, usa el bypass de owner para leer `usuario.email` — columna sin `SELECT` para ningún rol vía PostgREST (§7.3). Se invoca desde el Edge Function del webhook transaccional (sin JWT de usuario, solo la `anon key`), así que el control de acceso **no** es `es_admin()` sino un secreto compartido: si `p_secret` no coincide con el valor almacenado, `RAISE EXCEPTION 'No autorizado'` (P0001 → 400 vía `handleError`). Si coincide, retorna `(email text, notif_email_habilitado boolean)` para el `usuario_id` pedido. `revoke all ... from public; grant execute ... to anon, authenticated;` (el webhook llama sin sesión, de ahí el grant a `anon`).

> **Nota (2026-07-10) — `ALTER DATABASE ... SET` / `current_setting('app.settings.*')` NO es viable en Supabase hosted.** El diseño original de esta RPC planeaba guardar el secreto con `alter database postgres set app.settings.notif_webhook_secret = '<valor>'` y leerlo con `current_setting('app.settings.notif_webhook_secret', true)` — patrón estándar en Postgres self-hosted. En Supabase hosted el rol `postgres` **no tiene superusuario real**; ese `ALTER DATABASE` falla con `permission denied to set parameter`. Corregido en la migración `fix_resolver_destinatario_notificacion_secret_store`: se creó un schema `private` (sin grants a `public`/`anon`/`authenticated`) con la tabla `private.notif_config(key text primary key, value text)`, y la RPC compara `p_secret <> (select value from private.notif_config where key = 'webhook_secret')` en vez de `current_setting(...)`. **Regla para cualquier secreto futuro a nivel de base de datos en este proyecto:** guardarlo en una tabla de un schema privado sin grants a roles de PostgREST — **nunca** `ALTER DATABASE SET` / `current_setting('app.settings.*')`, no disponible en este entorno hosted.

Verificado vía MCP `supabase`: secreto correcto → retorna la fila `{email, notif_email_habilitado}` de un usuario real; secreto incorrecto/ausente → `P0001 No autorizado`. Advisors: solo el WARN `security_definer_function_executable` esperado para esta clase de RPC (mismo que `aceptar_solicitud`/`consumir_cuota_rag`), nada nuevo.

#### Edge Function `enviar-notificacion-email` (Fase 2, PR2)

`verify_jwt:false` — el llamante es un DB Webhook de Supabase, sin JWT de usuario; la autorización es un secreto compartido, no `es_admin()`. Fuente en `supabase/functions/enviar-notificacion-email/index.ts` (committed en el repo, desviación deliberada D9 respecto al precedente `embed` que vive solo desplegado). La lógica pura/ramificada vive en dos siblings planos (sin APIs de Deno) para poder cubrirlos con Vitest directamente: `route-predicate.ts` (`resolveRecipient(payload)`, decide destinatario + plantilla) y `../_shared/email-template.ts` (`renderEmail({titulo, cuerpoHtml, nombre?})`, wrapper HTML compartido con `enviar-correo-masivo`, sin footer de "darse de baja" — decisión MVP fija).

Variables de entorno: `NOTIF_WEBHOOK_SECRET`, `RESEND_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NOTIF_FROM_EMAIL`.

Flujo:
1. Header `x-webhook-secret` ≠ `NOTIF_WEBHOOK_SECRET` (o ausente) → **401**, antes de parsear el body.
2. Parsea el payload nativo del webhook `{type, table, record, old_record?, schema}`.
3. Enruta vía `resolveRecipient`: `solicitud_mensaje` INSERT → destinatario `record.receptor_id`, plantilla "nueva solicitud de mensaje"; `solicitud_revista` UPDATE con `record.estado==='aceptada'` **y** `old_record?.estado !== 'aceptada'` → destinatario `record.solicitante_id`, plantilla "tu obra fue aceptada en la revista" (el guard de `old_record` evita reenvíos si se vuelve a guardar una fila ya aceptada); cualquier otro caso → **204** (ignorado, no es error).
4. Cliente Supabase **anon** (`createClient(SUPABASE_URL, SUPABASE_ANON_KEY)`) — no `service_role` — llama `rpc('resolver_destinatario_notificacion', {p_secret: NOTIF_WEBHOOK_SECRET, p_usuario_id})`.
5. Sin fila, o `notif_email_habilitado=false`, o sin `email` → **204** (omitido: usuario no encontrado / opt-out / sin correo, no es un error). Error real de la RPC → **500**.
6. Arma el HTML vía `renderEmail(...)` y envía con Resend (`npm:resend`, import Deno) `emails.send({from: NOTIF_FROM_EMAIL, to: email, subject, html})`. Error de Resend → **500** con su mensaje; éxito → **200**.

**Footgun de build:** el entrypoint Deno (`index.ts`) usa globals (`Deno.serve`, `Deno.env`) y specifiers `npm:`/imports con extensión `.ts` que `tsc` (targeted a Node) no puede resolver. Se excluyó explícitamente en `tsconfig.json` (`exclude: ["supabase/functions/**/index.ts"]`) — los siblings planos (`route-predicate.ts`, `email-template.ts`) **no** están excluidos y sí se type-checan/lintean normalmente. ESLint (`eslint-config-next/typescript`) no requirió una exclusión equivalente: no lanza error de "parserOptions.project" sobre `index.ts` aun estando fuera del programa de `tsc` — verificado explícitamente antes de decidir no tocar `eslint.config.mjs`.

#### Webhooks del dashboard (runbook operativo, Fase 2 — NO es DDL de migración, decisión D7)

Se configuran manualmente en el dashboard de Supabase (Database → Webhooks), no vía `apply_migration` — evita incrustar el valor del secreto en una definición de trigger versionada y usa la UI soportada con reintentos/observabilidad. Dos webhooks:

| Webhook | Tabla | Evento | Header | Destino |
|---|---|---|---|---|
| Nueva solicitud de mensaje | `solicitud_mensaje` | INSERT | `x-webhook-secret: <mismo valor que NOTIF_WEBHOOK_SECRET>` | Edge Function `enviar-notificacion-email` |
| Solicitud de revista aceptada | `solicitud_revista` | UPDATE | `x-webhook-secret: <mismo valor que NOTIF_WEBHOOK_SECRET>` | Edge Function `enviar-notificacion-email` |

El mismo secreto compartido vive en tres lugares (ver nota de §3.21 arriba sobre `private.notif_config`): (a) el secreto de la Edge Function `NOTIF_WEBHOOK_SECRET`, (b) el header `x-webhook-secret` de cada webhook, (c) `private.notif_config` (leído por la RPC). **Pendiente de ejecución** — creación de los 2 webhooks y despliegue de la función (`mcp__supabase__deploy_edge_function` + secretos) quedan fuera del alcance de este `sdd-apply` (sin acceso a herramientas MCP de Supabase en esta sesión); código listo y commiteado, runbook documentado para quien despliegue.

#### Tabla `correo_admin` (Fase 4a, PR4a)

Historial de envíos masivos de correo hechos por administradores. RLS gateada por `es_admin()`, mismo patrón que `chunk_admin_write`/`rag_admin_write` (§3.18):

| Columna | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | `uuid` | `primary key default gen_random_uuid()` | — |
| `admin_id` | `uuid` | `references usuario(id) on delete set null` | Quien envió; nullable (se conserva el historial si se borra la cuenta admin) |
| `asunto` | `text not null` | `check (char_length(asunto) between 1 and 200)` | — |
| `cuerpo` | `text not null` | `check (char_length(cuerpo) between 10 and 5000)` | Texto plano tal cual lo escribió el admin; la conversión a HTML seguro ocurre DENTRO de `enviar-correo-masivo` (`plain-text-to-html.ts`), no en el Route Handler — ver esa subsección |
| `destinatarios_criterio` | `jsonb not null` | — | `{tipo:'todos'}` \| `{tipo:'ciudad',valor}` \| `{tipo:'ids',valor}` — snapshot del criterio usado, no de los ids resueltos |
| `cantidad_destinatarios` | `int not null default 0` | — | Cuántos resolvió la RPC |
| `cantidad_enviados` | `int not null default 0` | — | Cuántos confirmó Resend |
| `cantidad_fallidos` | `int not null default 0` | — | Cuántos fallaron en Resend |
| `estado` | `text not null default 'pendiente'` | `check (estado in ('pendiente','completado','fallido'))` | Lo actualiza el Route Handler tras invocar `enviar-correo-masivo` (Fase 4b) |
| `enviado_en` | `timestamptz not null default now()` | — | Orden del historial (`ORDER BY enviado_en DESC`) |

**RLS habilitado**, tres policies `es_admin()`-gateadas:

| Policy | FOR | TO | Condición |
|---|---|---|---|
| `correo_admin_select` | `SELECT` | `authenticated` | `USING (es_admin())` |
| `correo_admin_insert` | `INSERT` | `authenticated` | `WITH CHECK (es_admin() and admin_id = auth.uid())` — `admin_id` desde sesión, nunca del body |
| `correo_admin_update` | `UPDATE` | `authenticated` | `USING/WITH CHECK (es_admin() and admin_id = auth.uid())` — el Route Handler actualiza `cantidad_enviados/cantidad_fallidos/estado` tras invocar la Edge Function, corriendo bajo el JWT del MISMO admin que hizo el INSERT |

> **Corrección (2026-07-10, hallazgo de risk sobre el diff staged de PR4a):** la primera versión de `correo_admin_update` solo exigía `es_admin()`, sin `admin_id = auth.uid()`. Cualquier admin podía reescribir el historial de envío de OTRO admin (asunto, cuerpo, `destinatarios_criterio`, incluso reasignar `admin_id`) — rompía la integridad del audit trail (a diferencia de `correo_admin_insert`, que sí exigía ownership desde el inicio). Corregido antes de aplicar la migración — el SQL de abajo ya incluye el fix, no hizo falta una migración separada porque **ninguna de las migraciones de esta sección se ha aplicado todavía**.

Grant de tabla separado de RLS (RLS filtra filas; el GRANT habilita visibilidad en PostgREST — mismo principio del footgun de §3.19): `grant select, insert, update on correo_admin to authenticated;`.

**SQL completo (migración `create_correo_admin_table`, pendiente de aplicar):**

```sql
create table public.correo_admin (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.usuario(id) on delete set null,
  asunto text not null check (char_length(asunto) between 1 and 200),
  cuerpo text not null check (char_length(cuerpo) between 10 and 5000),
  destinatarios_criterio jsonb not null,
  cantidad_destinatarios int not null default 0,
  cantidad_enviados int not null default 0,
  cantidad_fallidos int not null default 0,
  estado text not null default 'pendiente' check (estado in ('pendiente','completado','fallido')),
  enviado_en timestamptz not null default now()
);

alter table public.correo_admin enable row level security;

create policy correo_admin_select on public.correo_admin
  for select to authenticated using (public.es_admin());

create policy correo_admin_insert on public.correo_admin
  for insert to authenticated with check (public.es_admin() and admin_id = auth.uid());

create policy correo_admin_update on public.correo_admin
  for update to authenticated
  using (public.es_admin() and admin_id = auth.uid())
  with check (public.es_admin() and admin_id = auth.uid());

grant select, insert, update on public.correo_admin to authenticated;
```

#### RPC `resolver_destinatarios_correo(p_tipo text, p_ciudad text default null, p_ids uuid[] default null)` (Fase 4a)

`SECURITY DEFINER`, `set search_path = ''`. Mismo bypass de owner que `resolver_destinatario_notificacion` para leer `usuario.email` (columna sin `SELECT` para ningún rol vía PostgREST, §7.3), pero gateada por **rol**, no por secreto: `if not es_admin() then raise exception 'No autorizado'`. Retorna `(id uuid, email text, nombre text)` filtrando SIEMPRE `notif_email_habilitado = true` y `email is not null` — el filtro de opt-out se evalúa **fuera** de la rama de `p_tipo` (`case p_tipo when 'todos' then true when 'ciudad' then u.ciudad = p_ciudad when 'ids' then u.id = any(p_ids) else false end`), así que un admin no puede saltarse el opt-out de un usuario ni eligiéndolo a mano vía `p_ids`.

`revoke all on function ... from public; revoke execute on function ... from anon; grant execute on function ... to authenticated;` — a diferencia de `resolver_destinatario_notificacion` (que sí necesita `anon` porque el webhook llama sin sesión), esta RPC es de uso exclusivo de administradores autenticados: `anon` se revoca **explícitamente**, además del `revoke all from public` (Supabase auto-otorga `EXECUTE` a `anon`/`authenticated`/`service_role` en funciones nuevas; `revoke all from public` por sí solo no retira el grant directo a `anon` — mismo aprendizaje ya aplicado en `rag_rate_limit_revoke_anon`/`mensajeria_directa_revoke_anon`, §7.1).

**SQL completo (migración `create_resolver_destinatarios_correo_rpc`, pendiente de aplicar):**

```sql
create or replace function public.resolver_destinatarios_correo(
  p_tipo text, p_ciudad text default null, p_ids uuid[] default null
) returns table(id uuid, email text, nombre text)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'No autorizado'; end if;
  return query
    select u.id, u.email, u.nombre
    from public.usuario u
    where u.notif_email_habilitado = true      -- opt-out enforced in ALL branches
      and u.email is not null
      and case p_tipo
            when 'todos'  then true
            when 'ciudad' then u.ciudad = p_ciudad
            when 'ids'    then u.id = any(p_ids)
            else false
          end;
end $$;

revoke all on function public.resolver_destinatarios_correo(text, text, uuid[]) from public;
revoke execute on function public.resolver_destinatarios_correo(text, text, uuid[]) from anon;
grant execute on function public.resolver_destinatarios_correo(text, text, uuid[]) to authenticated;
```

Es también la puerta de entrada exclusiva de `enviar-correo-masivo` (ver esa subsección abajo) — la Edge Function llama a esta RPC directamente en vez de recibir destinatarios pre-resueltos, así que un solo `if not es_admin()` sirve como autorización y resolución a la vez.

**Nota de diseño (no confundir con el bug de PR3):** esta RPC lee `usuario.email`/`notif_email_habilitado` para MÚLTIPLES filas dentro de un cuerpo `SECURITY DEFINER` gateado por `es_admin()` — patrón seguro (admin-gateado, no un `GRANT SELECT` de columna plano expuesto a PostgREST). El bug corregido en PR3 (R1) era un `grant select (columna) ... to authenticated` sobre `usuario` — tabla con RLS de SELECT pública (`lectura_publica USING (true)`) — que dejaba la columna legible por CUALQUIER usuario autenticado vía PostgREST directo. Esta RPC no agrega ningún grant de columna nuevo: el owner bypassea los grants de columna solo *dentro* del cuerpo de la función, y el único camino de entrada está gateado por `es_admin()`.

#### Edge Function `enviar-correo-masivo` (Fase 4a, PR4a)

`verify_jwt:true` — a diferencia del webhook transaccional, el llamante es el Route Handler de admin (`app/api/admin/correos/route.ts`, Fase 4b) vía `admin.functions.invoke('enviar-correo-masivo', {...})`, que reenvía el JWT del admin automáticamente (mismo patrón que `lib/rag/embed.ts`). `verify_jwt:true` solo prueba "hay un usuario autenticado", no "es admin".

> **Corrección de contrato (2026-07-10, BLOCKER de risk sobre el diff staged de PR4a):** el diseño original recibía `{asunto, cuerpo, destinatarios: [{id,email,nombre}]}` — una lista **pre-resuelta por el caller** — asumiendo que solo el futuro Route Handler la invocaría. Pero esta función es standalone, alcanzable por `functions.invoke` desde CUALQUIER cuenta admin: nada en ese contrato forzaba que la lista viniera realmente de `resolver_destinatarios_correo`, así que un admin podía construir `destinatarios` a mano para saltarse el opt-out o enviar a direcciones arbitrarias usando el dominio verificado del proyecto como relay abierto. **Fix**: la función ya NO recibe `destinatarios`; recibe `{asunto, cuerpo, destinatarios_criterio}` (shape de `DestinatariosCriterio`) y ELLA MISMA llama a `resolver_destinatarios_correo` con el JWT admin reenviado — no existe camino donde la lista venga de fuera de esa RPC, así que el opt-out se aplica siempre. Consecuencia: ya no hace falta un `rpc('es_admin')` separado, la RPC ya gatea internamente.

Fuente en `supabase/functions/enviar-correo-masivo/index.ts` (misma desviación D9 que `enviar-notificacion-email`). Lógica pura en tres siblings Vitest: `validate-payload.ts`, `chunk.ts`, `plain-text-to-html.ts` (ver nota de `cuerpo` abajo).

> **`cuerpo` es texto plano, nunca HTML de confianza (CRITICAL de risk, corregido).** El prompt del producto especifica `cuerpo` como `<textarea>` sin editor de formato. `renderEmail` no escapa `cuerpoHtml` por diseño (correcto para plantillas hardcoded, equivocado para input de admin sin sanitizar — habilitaría XSS en el correo enviado). Fix: `plain-text-to-html.ts` escapa los 5 caracteres HTML-significativos y convierte saltos de línea a `<br>` antes de llegar a `renderEmail`, dentro de esta misma función — no depende de que un futuro Route Handler lo haga bien. Su lógica de escape está duplicada (no importada) desde `_shared/email-template.ts` por un conflicto real entre `tsc` (rechaza imports relativos con extensión `.ts` explícita) y Deno (la exige en runtime) — ver el header de ese archivo.

Variables de entorno: `RESEND_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NOTIF_FROM_EMAIL` (compartidas con `enviar-notificacion-email`; no hace falta `NOTIF_WEBHOOK_SECRET` aquí).

Flujo (revisado): 
1. Cliente Supabase con el header `Authorization` reenviado. Sin header → **401**.
2. Body `{asunto, cuerpo, destinatarios_criterio}` validado por `validate-payload.ts`; inválido → **400**.
3. `rpc('resolver_destinatarios_correo', {p_tipo, p_ciudad, p_ids})`. `P0001` (no-admin) → **403**; otro error → **500** (log server-side, sin detalle en la respuesta).
4. Cero destinatarios resueltos → **200** `{enviados:0, fallidos:0, detalles:[]}` — no es error.
5. Más de `LIMITE_DESTINATARIOS = 500` resueltos → **400**, sin enviar nada (mitigación MVP de resilience — un `tipo:'todos'` sin cota podría dejar `correo_admin.estado` atascado en `'pendiente'` si el runtime mata la función a mitad de un envío; no resuelve el problema de fondo, solo acota el peor caso sin construir colas/checkpointing).
6. Convierte `cuerpo` a HTML seguro UNA vez (`plain-text-to-html.ts`), divide en lotes de ≤50 (`chunk.ts`) y envía con Resend en paralelo por lote vía `renderEmail({titulo: asunto, cuerpoHtml: cuerpoHtmlSeguro, nombre})`.
7. Responde **200** `{enviados, fallidos, detalles: {email, error?}[]}`. El Route Handler (Fase 4b) escribe el UPDATE de `correo_admin` con los conteos/`estado` final — `cantidad_destinatarios = enviados + fallidos`, ya no necesita resolver destinatarios por separado antes de invocar (puede seguir llamando a `resolver_destinatarios_correo` aparte solo para el conteo de preview/dry-run, sin enviar nada).

**Nota de superficie de error:** gateada por `verify_jwt:true` + el `es_admin()` interno de la RPC — solo un admin autenticado ve la respuesta, por eso `detalles[].error` incluye el mensaje de Resend por destinatario (diagnóstico); excepciones no estructuradas devuelven un mensaje genérico, detalle real solo en `console.error`. Válido tras el fix de contrato: con la lista de destinatarios ahora imposible de manipular desde fuera de la RPC, este passthrough ya no habilita saltarse el opt-out.

#### Pendiente (fase siguiente)

Rutas Next.js y UI del panel admin (`/api/admin/correos`, `/api/admin/correos/[id]`, `/api/admin/correos/contar`, `/admin/correos`) — Fase 4b, base de esta rama (`feat/notif-email-admin-backend`), sin cambios de esquema adicionales. El toggle de `/perfil/ajustes` (Fase 3) se implementó en la rama independiente `feat/notif-email-perfil-ui` — ver esa rama para el detalle, incluido el fix de privacidad R1 que esta sección **todavía no refleja** por no formar parte del árbol de commits de PR4a (ver nota de rama al inicio de §3.21).
#### Toggle en `/perfil/ajustes` (Fase 3, PR3)

`PATCH /api/perfil` acepta `notif_email_habilitado: boolean` y lo persiste con el `UPDATE` normal (row-scoped por `editar_propio`); la respuesta y `GET /api/auth/me` obtienen el valor actual vía `mi_notif_email_habilitado()`, no vía `.select()` directo (ver arriba). UI: `components/ui/Toggle.tsx` (`role="switch"`) + `components/perfil/NotificacionesForm.tsx`.

#### Pendiente (fases siguientes)

Edge Function `enviar-notificacion-email` + 2 webhooks del dashboard (`solicitud_mensaje` INSERT, `solicitud_revista` UPDATE→aceptada) — Fase 2. Panel admin de envío masivo (`correo_admin`, `resolver_destinatarios_correo`, `enviar-correo-masivo`) — Fases 4a/4b.

---

## 4. Objetos adicionales (no son tablas)

| Objeto | Tipo | Función |
|---|---|---|
| `on_auth_user_created` → `handle_new_user()` | Trigger | Crea el perfil en `usuario` al registrarse alguien; toma el nombre de `raw_user_meta_data->>'nombre'` |
| `aceptar_solicitud(p_solicitud_id, p_respuesta)` | RPC (SECURITY DEFINER) | Acepta una solicitud de forma transaccional: actualiza la solicitud **e** inserta el artículo en `revista_articulo`. Verifica internamente que el llamante sea **administrador** (ya no exige ser editor de la revista) |
| `rechazar_solicitud(p_solicitud_id, p_respuesta)` | RPC (SECURITY DEFINER) | Marca la solicitud como rechazada con respuesta opcional. Verifica internamente `rol = 'administrador'` |
| `publicar_revista_mensual()` | Función (SECURITY DEFINER) | **Rotación mensual.** Publica la revista en `borrador`, descarta sus solicitudes pendientes (las marca `rechazada`) y crea el borrador del mes siguiente. La invoca `pg_cron` el día 1 de cada mes a las 13:00 UTC-6 (ver §9). Idempotente: si no hay borrador, no hace nada |
| `es_admin()` | Función (SECURITY DEFINER) | Auxiliar booleana: indica si `auth.uid()` tiene `rol = 'administrador'`. Usada por las políticas de `solicitud_revista` y por las RPC |
| `feed_publicaciones` | Vista (`security_invoker`) | Feed con conteos de likes y comentarios resueltos en una sola consulta; respeta las RLS de las tablas base. Recreada para exponer `obra_autor_externo`/`url_externa` (atribución de recomendaciones), preservando `security_invoker=true`. Recreada nuevamente con `WHERE bloqueada=false` para excluir publicaciones bloqueadas (sin cambiar columnas) |
| `bloquear_publicacion(p_reporte_id, p_respuesta?)` | RPC (SECURITY DEFINER) | Marca reporte `revisado` + `publicacion.bloqueada=true` atómicamente. Verifica `es_admin()`. Ver §3.10 |
| `descartar_reporte(p_reporte_id)` | RPC (SECURITY DEFINER) | Marca reporte `descartado`; no toca `publicacion.bloqueada`. Verifica `es_admin()`. Ver §3.10 |
| `retirar_articulo(p_revista_id, p_publicacion_id, p_motivo?)` | RPC (SECURITY DEFINER) | **Atómico:** borra el `revista_articulo` **y** marca su `solicitud_revista` como `retirada` (solo si estaba `aceptada`), con `respuesta` derivada del `p_motivo`. Verifica `es_admin()`. La invoca `DELETE /api/revistas/[id]/articulos` |
| `bloquear_cambio_rol()` | Trigger (SECURITY DEFINER) | Impide que un usuario altere su propio `rol`/`email`; exige `es_admin()`. Defensa anti-escalada de privilegios (ver §7.3) |
| `perfil_contadores` | Vista (`security_invoker`) | Conteos por usuario: `n_seguidores`, `n_seguidos`, `n_publicaciones`. LEFT JOIN + COALESCE 0; hereda RLS de tablas base. Ver §3.9 |
| `se_siguen(a, b)` | Función (SECURITY INVOKER) | Booleana: true si existe seguidor(a→b) Y seguidor(b→a). INVOKER porque `seguidor` es públicamente legible (§3.8). Llamada internamente por `enviar_mensaje`. Ver §3.13 |
| `f_unaccent(text)` | Función (IMMUTABLE) | Wrapper inmutable de `extensions.unaccent` (dict fijo) para columna generada e índice de expresión. Usado por `buscar_publicaciones`/`buscar_usuarios`. Ver §3.17 |
| `buscar_publicaciones(p_q, p_limit?, p_offset?)` | RPC (SECURITY INVOKER) | **Búsqueda full-text** del buscador (español, prefijo, accent-insensitive, ranking `ts_rank`) sobre `busqueda_tsv` (título A + resumen B); RLS del llamante aplica (respeta `bloqueada`). Devuelve filas de card + `total` para paginar. Pública (`anon`+`authenticated`). Ver §3.17 |
| `buscar_usuarios(p_q, p_limit?, p_offset?)` | RPC (SECURITY INVOKER) | **Búsqueda de personas** typo-tolerante (trigram `word_similarity`) y accent-insensitive sobre `f_unaccent(lower(nombre))`; expone solo `id/nombre/institucion/carrera` + `total`. Pública (`anon`+`authenticated`). Ver §3.17 |
| `match_publicacion_chunks_global(p_query_embedding, p_match_count?)` | RPC (SECURITY INVOKER) | **Retrieval semántico global** para el buscador híbrido: mejor chunk por publicación por similitud coseno (HNSW), respeta `bloqueada`. Solo `authenticated`. Ver §3.18 |
| `enviar_mensaje(p_receptor_id, p_contenido)` | RPC (SECURITY DEFINER) | **Mensajería directa.** Valida sesión, mutualidad y contenido; crea o reutiliza la conversación de forma atómica (INSERT ON CONFLICT DO UPDATE) e inserta el mensaje. Todos los errores → P0001 → 400. Ver §3.13 |
| `bandeja_conversaciones` | Vista (`security_invoker`) | Bandeja por usuario: última mensaje (lateral join) y `no_leidos` (mensajes no leídos del receptor, `emisor_id <> auth.uid()`). Hereda RLS de tablas base. Ver §3.13 |
| `enviar_solicitud_mensaje(p_receptor_id)` | RPC (SECURITY DEFINER) | **Solicitudes de mensaje.** Valida sesión y anti-self; auto-follow emisor→receptor; si quedó follow mutuo → acepta cualquier pendiente y devuelve `{"resultado":"mutuo"}`; si no → INSERT/UPSERT solicitud pendiente y devuelve `{"resultado":"solicitud","solicitud_id":...}`. Ver §3.14 |
| `aceptar_solicitud_mensaje(p_solicitud_id)` | RPC (SECURITY DEFINER) | Valida que el receptor sea el llamante y que la solicitud esté `pendiente`; follow-back receptor→emisor; marca `aceptada`; devuelve `{"emisor_id":...}`. Ver §3.14 |
| `rechazar_solicitud_mensaje(p_solicitud_id)` | RPC (SECURITY DEFINER) | Mismas validaciones que la anterior; marca `rechazada`; NO toca los follows; retorna void. Ver §3.14 |
| `resolver_destinatario_notificacion(p_secret, p_usuario_id)` | RPC (SECURITY DEFINER) | **Notificaciones transaccionales.** Resuelve `email` + `notif_email_habilitado` de un usuario para el Edge Function del webhook (sin JWT); gateada por un secreto comparado contra `private.notif_config` (no `current_setting`, ver nota en §3.21). `EXECUTE` a `anon`+`authenticated` (el webhook llama sin sesión). Ver §3.21 |
| `resolver_destinatarios_correo(p_tipo, p_ciudad?, p_ids?)` | RPC (SECURITY DEFINER) | **Panel admin de envío masivo.** Resuelve `id`+`email`+`nombre` de múltiples usuarios según `p_tipo` (`todos`/`ciudad`/`ids`), filtrando SIEMPRE `notif_email_habilitado=true` (incluso en `ids`, hand-picked). Gateada por `es_admin()` (P0001 `No autorizado` si no). `EXECUTE` solo `authenticated` (`anon` revocado explícitamente). Ver §3.21 |
| `mi_notif_email_habilitado()` | RPC (SECURITY DEFINER) | **Lectura self-scoped de la preferencia propia.** Sin parámetros — deriva `auth.uid()` internamente, único camino de lectura tras revocarse `SELECT` de columna a `authenticated` (fue una fuga de privacidad entre usuarios, no protegida por RLS — ver §3.21). `EXECUTE` solo a `authenticated`. Ver §3.21 |
| Bucket `publicaciones` | Storage | Lectura pública; subir/editar/borrar restringido a la carpeta `{user_id}/...` de cada usuario |

---

## 5. Conexión al backend

### 5.1 Instalación

```bash
npm install @supabase/supabase-js
# En Next.js (App Router), además:
npm install @supabase/ssr
```

### 5.2 Clientes con `@supabase/ssr` (estado real)

El proyecto usa **`@supabase/ssr`**, no el `createClient` plano de `supabase-js`. Hay dos clientes y **ninguno** usa `service_role`.

```ts
// lib/supabase/client.ts — navegador
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}
```

```ts
// lib/supabase/server.ts — Server Components / Route Handlers (cookies de sesión)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies() // Next 16: async
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (...) => {/* set en la respuesta */} } },
  )
}
```

> ⚠️ **CERO `service_role` / `admin.ts` (invariante del proyecto).** No existe `lib/supabaseAdmin.ts` ni `SUPABASE_SERVICE_ROLE_KEY` en el bundle. **Todo** corre con el JWT del usuario vía cookies; la RLS aplica como ese usuario, incluido el admin (que es un `usuario` con `rol = administrador`). Las operaciones de admin no bypassean RLS: las RPC `SECURITY DEFINER` validan `es_admin()` internamente. Si creés necesitar `service_role`, **algo está mal**.

### 5.3 Operaciones comunes

> Estos son los **primitivos de `supabase-js`** para referencia. En la app **no** se llaman así desde el cliente: las mutaciones y lecturas paginadas pasan por Route Handlers `/api/*` y las lecturas SSR por `lib/data/*` (ver `Vitrina_Especificaciones_APIs.md` §4–§5). Para autorizar, usá siempre `getUser()` (valida contra el servidor de Auth), **nunca** `getSession()`.

```ts
// Registro — el trigger crea el perfil con el nombre enviado en metadata
await supabase.auth.signUp({
  email, password,
  options: { data: { nombre: 'María García' } }
});

// Inicio / cierre de sesión y usuario actual
await supabase.auth.signInWithPassword({ email, password });
await supabase.auth.signOut();
const { data: { user } } = await supabase.auth.getUser(); // valida contra el server; NO uses getSession para autorizar

// Leer el feed con paginación (10 por página)
const { data } = await supabase
  .from('feed_publicaciones')
  .select('*')
  .order('creado_en', { ascending: false })
  .range(0, 9);

// Crear una publicación (autor_id = usuario actual; la RLS lo exige)
const { data: { user } } = await supabase.auth.getUser();
await supabase.from('publicacion').insert({
  autor_id: user!.id,
  titulo: 'Mi investigación',
  resumen: 'Resumen...',
  tipo: 'investigacion'
});

// Dar like / quitar like
await supabase.from('like').insert({ publicacion_id, usuario_id: user!.id });
await supabase.from('like').delete()
  .match({ publicacion_id, usuario_id: user!.id });

// Comentar
await supabase.from('comentario').insert({
  publicacion_id, autor_id: user!.id, contenido: 'Excelente trabajo'
});

// Subir archivo a Storage y guardar su URL en la publicación
const path = `${user!.id}/${crypto.randomUUID()}-${file.name}`;
await supabase.storage.from('publicaciones').upload(path, file);
const { data: pub } = supabase.storage.from('publicaciones').getPublicUrl(path);
// pub.publicUrl -> guardar en publicacion.archivo_url

// Aceptar / rechazar una solicitud (solo administrador)
await supabase.rpc('aceptar_solicitud', {
  p_solicitud_id: solicitudId, p_respuesta: 'Aprobado'
});
await supabase.rpc('rechazar_solicitud', {
  p_solicitud_id: solicitudId, p_respuesta: 'No aplica esta edición'
});
```

### 5.4 Cómo funciona la autorización

`supabase-js` adjunta automáticamente el JWT del usuario autenticado a cada petición. PostgreSQL evalúa las políticas RLS usando `auth.uid()` (el ID del usuario actual). Esto significa:

- La **publishable/anon key combinada con RLS** es el modelo de seguridad: aunque la clave sea pública, un usuario solo puede leer/escribir lo que sus políticas permiten.
- **No hace falta revalidar la propiedad en el cliente.** Si María intenta editar una publicación de Carlos, la política `editar_propio` la bloquea en la base de datos.
- La `service_role` **ignora la RLS** por completo. **Este proyecto NO la usa** (ver §5.2): las tareas de admin corren con el JWT del admin y se apoyan en RPC `SECURITY DEFINER` que validan el rol. La clave existe en el panel de Supabase pero no se carga en la app.

---

## 6. Datos de prueba cargados

### Usuarios seed

3 cuentas sembradas (2 `usuario`, 1 `administrador`), con institución/carrera representativas de cada tipo. **Baneadas en Auth** (`banned_until`) — correo/contraseña no se documentan aquí; pedir acceso al dueño del proyecto para reactivarlas si hacen falta para pruebas.

> Además de los tres usuarios seed, pueden existir usuarios adicionales creados durante pruebas manuales. El seed solo cubre los tres anteriores.

### Contenido (seed original + actividad de pruebas)

- **7 publicaciones** (5 del seed original que cubren los tipos investigación, artículo, poema, dibujo y libro; 2 adicionales creadas en pruebas), con etiquetas, 4 comentarios y 7 likes.
- **2 revistas:** "Ciencia y Territorio" (vol. 1, `publicada`) y una edición de prueba (vol. 99, `borrador`). La edición en borrador es la **única** revista activa, garantizado por el índice único parcial.
- **5 solicitudes** en distintos estados (pendiente, aceptada, rechazada).

> Los conteos crecen con las pruebas manuales — los números de arriba son el **seed original**, no el estado actual. Snapshot en vivo (2026-06-24): **32 publicaciones, 3 revistas (1 en `borrador`), 6 solicitudes, 19 usuarios**. Lo relevante para la integridad del esquema es que exista **exactamente una revista en `borrador`** en todo momento (verificado: 1).

### Promover a un administrador

El primer usuario que se registra entra como `usuario`. Para darle rol de administrador:

```sql
update usuario set rol = 'administrador' where email = 'correo@ejemplo.com';
```

### Limpiar los datos de prueba

Borrar los tres usuarios de autenticación arrastra en cascada todo su contenido:

```sql
delete from auth.users
where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);
```

---

## 7. Postura de seguridad y endurecimiento recomendado

> 📋 **Auditoría de seguridad standalone:** ver `auditorias/SECURITY_AUDIT.md` (foto puntual; no es un spec vivo de este doc).

> **Estado verificado contra la BD viva el 2026-06-18** (auditoría read-only vía MCP `supabase`; ver `SECURITY_AUDIT.md` en la raíz para el informe completo con evidencia). Esta sección reemplaza la redacción anterior, que describía un estado que **ya no coincide** con la realidad de los grants. La postura general es **sólida**: sin hallazgos Críticos ni Altos.

### 7.1 Funciones `SECURITY DEFINER` expuestas en la API

Estado real de los `EXECUTE` (de `information_schema.role_routine_grants`):

| Función | Grants reales | Nota |
|---|---|---|
| `handle_new_user()` | `postgres, service_role` | ✅ Ya fuera de la API. Solo la invoca el trigger. **Sin acción.** |
| `publicar_revista_mensual()` | `postgres, service_role` | ✅ Ya fuera de la API. Solo la invoca `pg_cron`. **Sin acción.** |
| `aceptar_solicitud(uuid, text)` | `authenticated, postgres, service_role` | Flagueada por el advisor; ver más abajo |
| `rechazar_solicitud(uuid, text)` | `authenticated, postgres, service_role` | Flagueada |
| `bloquear_publicacion(uuid, text)` | `authenticated, postgres, service_role` | Flagueada |
| `descartar_reporte(uuid)` | `authenticated, postgres, service_role` | Flagueada |
| `retirar_articulo(uuid, uuid, text)` | `authenticated, postgres, service_role` | Flagueada |
| `es_admin()` | `anon, authenticated, postgres, service_role` | EXECUTE para `anon` **requerido** — ver abajo. **NO revocar de `anon`/`authenticated`.** |
| `enviar_mensaje(uuid, text)` | `authenticated, postgres, service_role` | Flagueada (WARN); excepción documentada e intencional — el control real es la validación interna (sesión + mutualidad). `EXECUTE` revocado de `public` y `anon` (migración `mensajeria_directa_revoke_anon`). Ver §3.13 |
| `se_siguen(uuid, uuid)` | `authenticated, postgres, service_role` (INVOKER) | SECURITY INVOKER — sin ambient authority. Solo la invoca `enviar_mensaje` internamente. El advisor no la marca como DEFINER porque no lo es. Ver §3.13 |
| `enviar_solicitud_mensaje(uuid)` | `authenticated, postgres, service_role` | Flagueada (WARN); excepción documentada e intencional — el control real es la validación interna (sesión + anti-self). `EXECUTE` revocado de `public` y `anon` (misma postura §7.1). Ver §3.14 |
| `aceptar_solicitud_mensaje(uuid)` | `authenticated, postgres, service_role` | Flagueada (WARN); valida internamente que el llamante sea el receptor. Ver §3.14 |
| `rechazar_solicitud_mensaje(uuid)` | `authenticated, postgres, service_role` | Flagueada (WARN); valida internamente que el llamante sea el receptor. Ver §3.14 |
| `resolver_destinatario_notificacion(text, uuid)` | `anon, authenticated, postgres, service_role` | Flagueada (WARN); misma clase, pero el control real **no** es `es_admin()` — es un secreto compartido comparado contra `private.notif_config` (el webhook llama sin JWT, solo `anon key`). `EXECUTE` a `anon` es intencional. Ver §3.21 |
| `resolver_destinatarios_correo(text, text, uuid[])` | `authenticated, postgres, service_role` | Flagueada (WARN); misma clase que las RPC de negocio — el control real es `es_admin()` internamente. `EXECUTE` revocado de `public` **y** `anon` explícitamente (funciones nuevas auto-otorgan a `anon` además de `public`; el `revoke all from public` solo no basta). Ver §3.21 |
| `mi_notif_email_habilitado()` | `authenticated, postgres, service_role` | Flagueada (WARN); mismo patrón, pero sin parámetros — deriva el `usuario_id` de `auth.uid()` internamente, así que estructuralmente no puede leer la fila de otro usuario (a diferencia de `resolver_destinatario_notificacion`, que recibe `p_usuario_id` explícito pero está gateada por secreto). `EXECUTE` a `anon` deliberadamente NO otorgado — requiere sesión. Ver §3.21 |

El advisor `authenticated_security_definer_function_executable` (WARN) marca las cinco RPC de negocio porque un usuario autenticado puede llamarlas vía `/rest/v1/rpc/…`. **No es un bypass:** cada RPC de negocio valida `IF NOT public.es_admin() THEN RAISE EXCEPTION 'No autorizado'` internamente, así que un autenticado no-admin recibe `No autorizado` (P0001 → 400).

**Trampa importante (no la ignores):** el admin **es** un usuario `authenticated` y, como este proyecto NO usa `service_role`, las rutas de admin invocan estas RPC con el **JWT del propio admin**. Revocar `EXECUTE … from authenticated` sobre las cinco RPC de negocio **rompería los endpoints de admin**.

> **Corrección (2026-06-18) — la afirmación previa de que revocar `es_admin()` de `authenticated` era "seguro y sin regresión" es FALSA.** Las expresiones de policy RLS se evalúan en contexto del **rol que llama**, no del owner; el ACL de `EXECUTE` se chequea contra ese rol (`SECURITY DEFINER` solo cambia los privilegios *dentro* del cuerpo, no quién puede invocarla). Como la policy RESTRICTIVE `publicacion_oculta_bloqueadas` y las policies de `solicitud_revista` llaman a `es_admin()` en cada operación, **todo rol cubierto por esas policies necesita `EXECUTE` sobre `es_admin()`**:
> - `anon` lo necesita para leer `publicacion`/`feed_publicaciones`. Sin el grant, un visitante sin sesión recibe `permission denied for function es_admin (42501)` y **el feed devuelve cero filas**. Aplicado en migración `grant_execute_es_admin_to_anon` (2026-06-18).
> - `authenticated` lo necesita por la misma razón. **El `revoke execute on function public.es_admin() from authenticated` del borrador de hardening NO debe aplicarse** — reintroduciría exactamente este bug para los usuarios logueados.

Las cinco RPC de negocio (`aceptar_solicitud`, `rechazar_solicitud`, `bloquear_publicacion`, `descartar_reporte`, `retirar_articulo`) **conservan** el grant a `authenticated`: excepción documentada e intencional (el control real es el `es_admin()` interno). Sacarlas de `authenticated` exigiría un rol Postgres `admin` dedicado + claim JWT — fuera del alcance actual.

### 7.1b Aprendizaje de hardening — grants de columna para UPDATE

> **Una policy RLS de UPDATE no limita qué columnas se pueden modificar.** La policy restringe las *filas* que el rol puede actualizar (vía `USING`/`WITH CHECK`), pero si el rol conserva el grant de UPDATE sobre la tabla completa, puede alterar cualquier columna de esas filas vía PostgREST. Para permitir editar únicamente un campo (p. ej. un flag como `leido`) es necesario, además de la policy de fila, **revocar el UPDATE de tabla y hacer `GRANT UPDATE (columna)` al rol**. Sin ese paso, la protección de filas no protege columnas.
>
> **Aplicado a `mensaje` (migración `mensaje_update_column_grant_leido`, 2026-06-28):** `REVOKE UPDATE ON public.mensaje FROM anon, authenticated` + `GRANT UPDATE (leido) ON public.mensaje TO authenticated`. El grant de columna prevalece sobre el revoke de tabla para esa columna específica; `enviar_mensaje` (SECURITY DEFINER, owner) no se ve afectado.

### 7.2 Protección de contraseñas filtradas (Auth) — **pendiente real**

Sigue desactivada la verificación contra HaveIBeenPwned (advisor `auth_leaked_password_protection`, WARN). El `signup` solo valida longitud (8–72). Actívala en el panel: **Authentication → Policies → Leaked password protection**. Es el único hallazgo de severidad **Media** y se arregla con un clic.

### 7.3 Controles ya verificados como correctos (no requieren acción)

- **PII protegida por GRANTs de columna:** ni `anon` ni `authenticated` tienen `SELECT` sobre `usuario.email`; `anon` tampoco sobre `usuario.rol`. PostgREST respeta los privilegios de columna, así que `/rest/v1/usuario?select=email` se deniega para todos. (La app lee su propio email de `auth.getUser()`, no de esta tabla.)
- **Triple defensa anti-escalada de rol/email:** grant de columna (sin `UPDATE` en `rol`/`email` para `authenticated`) + trigger `bloquear_cambio_rol` (exige `es_admin()`) + policy `editar_propio` (solo `auth.uid() = id`).
- **`publicacion_oculta_bloqueadas` es RESTRICTIVE** (`pg_policy.polpermissive = false`) → el bloqueo de moderación realmente oculta las filas pese al `lectura_publica` permissive.
- **`search_path` fijado** (`public, pg_temp`) en todas las funciones `SECURITY DEFINER` → sin vector de search-path hijack.
- **`security_invoker = true`** en `feed_publicaciones` y `perfil_contadores`.
- **Aislamiento de Storage por carpeta:** escritura limitada a `{auth.uid()}/…` en `storage.objects`.

### 7.4 Buenas prácticas de claves

- La `service_role` es secreta: solo en variables de entorno del servidor, nunca en el repositorio ni en el bundle del cliente. **Este proyecto no la usa** (todo corre con el JWT del usuario).
- Las claves se pueden rotar desde **Settings → API** si se filtran.

---

## 8. Notas operativas

- **Límites del plan free:** 500 MB de base de datos, 1 GB de Storage, 50 000 usuarios activos al mes. Suficiente para el MVP.
- **Pausa por inactividad:** en el plan free el proyecto se pausa tras un período sin uso; más de 90 días pausado lo vuelve irrecuperable. ⚠️ El job de `pg_cron` ahora corre **una vez al mes** (antes semanal), por lo que aporta mucha menos actividad para mantener el proyecto vivo; conviene asegurar actividad adicional y realizar respaldos.
- **Migraciones:** el esquema se aplicó como migraciones (`esquema_inicial`, `logica_negocio`, `rls_politicas`, `almacenamiento`); el ciclo de revista como `revista_semanal` y luego `revista_mensual_en_lugar_de_semanal` (cadencia mensual, ver §3.5–§3.6 y §9); la mensajería directa como `mensajeria_directa` (tablas + RLS + RPC + vista + Realtime), `mensajeria_directa_revoke_anon` (revoca EXECUTE de `enviar_mensaje` para public/anon) y `mensajeria_directa_fix_no_leidos` (recrea `bandeja_conversaciones` con el filtro `emisor_id <> auth.uid()` en el conteo de no leídos); las solicitudes de mensaje como `solicitudes_mensaje` (tabla `solicitud_mensaje` + RLS `solicitud_mensaje_lectura` + 3 RPC SECURITY DEFINER: `enviar_solicitud_mensaje`, `aceptar_solicitud_mensaje`, `rechazar_solicitud_mensaje` — puramente aditiva, ver §3.14); `mensaje_replica_identity_full` (`ALTER TABLE mensaje REPLICA IDENTITY FULL` — requerido para que Realtime entregue eventos UPDATE filtrados por `conversacion_id`, ver §3.13 Realtime); **`mensaje_update_column_grant_leido`** (2026-06-28 — revoca UPDATE de tabla en `mensaje` para `anon`/`authenticated` y otorga `GRANT UPDATE (leido)` a `authenticated` para limitar la surface de UPDATE a la única columna que los participantes deben poder modificar, ver §3.13 y §7.1b); **`solicitud_mensaje_anti_spam`** (2026-06-28 — añade guard de rate limit ≤ 20 solicitudes/hora dentro de `enviar_solicitud_mensaje`, ver §3.14); **`solicitud_mensaje_cooldown_2_dias`** (2026-06-28 — añade guard de cooldown 48 h tras rechazo dentro de `enviar_solicitud_mensaje`, ver §3.14). Los datos de prueba se cargaron con SQL directo (no como migración).

---

## 9. Programación de la revista mensual (`pg_cron`)

La rotación la dispara la extensión `pg_cron`, disponible en Supabase.

### 9.1 Habilitar la extensión

En el panel: **Database → Extensions → `pg_cron`** (o por SQL). Vive en el esquema `cron`.

```sql
create extension if not exists pg_cron;
```

### 9.2 Zona horaria: UTC-6

`pg_cron` evalúa sus expresiones en la zona horaria del servidor. El proyecto corre en `us-east-2`, cuyo servidor está en **UTC**. Como la edición debe cerrar el **día 1 de cada mes a las 13:00 hora de México (UTC-6)**, ese instante corresponde a las **19:00 UTC**. Por tanto el job se programa así:

```sql
-- Día 1 de cada mes, 13:00 UTC-6  ==  19:00 UTC
select cron.schedule(
  'revista-mensual',          -- nombre del job
  '0 19 1 * *',               -- min hora día-del-mes mes *, en UTC
  $$ select public.publicar_revista_mensual(); $$
);
```

> El `1` en la 3ª posición es el día del mes; el `19` es la hora en UTC. Recordá sumar 6 horas para pasar de hora de México a UTC (13:00 → 19:00). México ya no aplica horario de verano, así que el offset −6 es estable todo el año.

### 9.3 Verificar y operar el job

```sql
-- Ver los jobs programados
select * from cron.job;

-- Ver el historial de ejecuciones (éxitos/fallos)
select * from cron.job_run_details order by start_time desc limit 10;

-- Disparo manual de respaldo (si una ejecución falló)
select public.publicar_revista_mensual();

-- Reprogramar o eliminar
select cron.unschedule('revista-mensual');
```

> Como `publicar_revista_mensual()` es idempotente respecto a "hay borrador o no", un disparo manual de recuperación no genera ediciones duplicadas: si el job ya rotó, simplemente publicaría el borrador recién creado. Ejecútalo manualmente solo si confirmas en `cron.job_run_details` que la corrida automática falló.

---

### 3.7 Tabla `usuario_link` (Feature 1 — enlaces de perfil)

Migración aplicada como `links_perfil` vía Supabase MCP. Puramente aditiva: no modifica ninguna tabla, RLS, RPC, vista ni policy existente.

**Columnas:**

| Columna | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | `uuid` | `primary key default gen_random_uuid()` | — |
| `usuario_id` | `uuid not null` | `references usuario(id) on delete cascade` | Propietario del enlace |
| `etiqueta` | `text not null` | — | Texto visible del enlace; máx. 50 chars (validado en servidor) |
| `url` | `text not null` | — | URL https-only (validado en servidor) |
| `orden` | `int not null` | `default 0` | Posición de visualización (0-indexed) |
| `creado_en` | `timestamptz not null` | `default now()` | — |

**RLS habilitado.** Dos políticas:

| Policy | FOR | TO | USING | WITH CHECK |
|---|---|---|---|---|
| `links_lectura_publica` | `SELECT` | all roles (incl. anon) | `true` | — |
| `links_gestiona_propio` | `ALL` | `authenticated` | `usuario_id = auth.uid()` | `usuario_id = auth.uid()` |

- La política de lectura permite a visitantes anónimos ver los enlaces en `/usuario/[id]` (vía SSR usando el cliente anon).
- La política `FOR ALL` a `authenticated` cubre INSERT, UPDATE y DELETE. Los handlers nunca leen `usuario_id` del body — siempre de `supabase.auth.getUser()`.
- Sin RPC, sin §7.1 revoke/grant (no hay funciones SECURITY DEFINER en esta feature).
- Los cascades de `usuario(id) on delete cascade` limpian los enlaces cuando se borra el usuario.

**Orden de visualización:** `order('orden').order('creado_en')` — sin empates incluso si dos filas tienen el mismo `orden`.

**Límite:** máx. 10 por usuario. Aplicado server-side en `POST /api/perfil/links` con un count previo al insert; no hay constraint de BD (soft cap, race condition aceptado en MVP).

---

### 3.8 Tabla `seguidor` (Feature 3 — grafo social)

Migración aplicada como `seguidores` vía Supabase MCP (ref `fdfbyhjwnbteccagulxb`). Puramente aditiva. Representa un grafo dirigido: si A sigue a B existe la fila `(A, B)`.

**Columnas:**

| Columna | Tipo | Restricciones | Notas |
|---|---|---|---|
| `seguidor_id` | `uuid not null` | `references usuario(id) on delete cascade` | El que sigue |
| `seguido_id` | `uuid not null` | `references usuario(id) on delete cascade` | El que es seguido |
| `creado_en` | `timestamptz not null` | `default now()` | — |

**Restricciones:** `primary key (seguidor_id, seguido_id)` (unicidad + índice) · `check (seguidor_id <> seguido_id)` (error 23514 si se intenta auto-follow por BD, aunque la capa Next lo previene antes).

**FK constraint names (verificados):** `seguidor_seguidor_id_fkey` (sobre `seguidor_id`) · `seguidor_seguido_id_fkey` (sobre `seguido_id`). Estos nombres son necesarios para los hints de PostgREST en `lib/data/seguidores.ts` porque la tabla tiene dos FK a `usuario`.

**ON DELETE CASCADE** en ambas FK: borrar un usuario elimina todos sus edges como seguidor y como seguido.

**RLS habilitado.** Tres políticas:

| Policy | FOR | TO | USING / WITH CHECK |
|---|---|---|---|
| `seguidor_lectura` | `SELECT` | todos (incl. anon) | `using (true)` — counts son públicos |
| `seguidor_sigue` | `INSERT` | `authenticated` | `with check (seguidor_id = auth.uid())` |
| `seguidor_deja_de_seguir` | `DELETE` | `authenticated` | `using (seguidor_id = auth.uid())` |

**handleError:** el error 23514 (check_violation — auto-follow a nivel BD) se mapea a **400** `validation_error`. La capa Next pre-chequea `seguido_id !== user.id` antes del insert, por lo que 23514 es défense en profundidad.

### 3.9 Vista `perfil_contadores` (Feature 3)

Vista con `security_invoker = true` que devuelve conteos por usuario en una sola consulta. Diseño análogo a `feed_publicaciones`.

```sql
create view perfil_contadores
with (security_invoker = true) as
select
  u.id                       as usuario_id,
  coalesce(sg.total, 0)      as n_seguidores,
  coalesce(sd.total, 0)      as n_seguidos,
  coalesce(p.total, 0)       as n_publicaciones
from usuario u
left join (select seguido_id,  count(*) total from seguidor   group by seguido_id)  sg on sg.seguido_id  = u.id
left join (select seguidor_id, count(*) total from seguidor   group by seguidor_id) sd on sd.seguidor_id = u.id
left join (select autor_id,    count(*) total from publicacion group by autor_id)   p  on p.autor_id     = u.id;
```

- `n_seguidores` = usuarios que siguen a u (agrupado por `seguido_id`).
- `n_seguidos` = usuarios a quienes u sigue (agrupado por `seguidor_id`).
- `n_publicaciones` respeta la RLS de `publicacion` (security_invoker → corre con el JWT del llamante).
- COALESCE garantiza 0 para usuarios sin actividad.
- Sin policies propias (hereda RLS de las tablas base via `security_invoker`).
- Consultada en `lib/data/seguidores.ts` → `getConteos(usuarioId)` con `.maybeSingle()`.

---

## Objetos ADITIVOS — tendencias-areas-ctas (Junio 2026)

> Estos objetos son **estrictamente aditivos**: no modifican tablas, RLS, policies, ni RPC existentes. Solo agregan una vista y una función nuevas.

### Vista `feed_trending` (ADDITIVE)

Vista con `security_invoker = true` construida sobre `feed_publicaciones` (que ya filtra `bloqueada = false` y hereda RLS). Añade una columna `score` de tiempo-decaimiento estilo Hacker News.

```sql
create or replace view public.feed_trending
with (security_invoker = true) as
select
  fp.*,
  (fp.likes + fp.comentarios)::numeric
    / power(
        (extract(epoch from (now() - fp.creado_en)) / 3600.0) + 2.0,
        1.6
      ) as score
from public.feed_publicaciones fp;

grant select on public.feed_trending to anon, authenticated;
```

- `security_invoker = true` → hereda la visibilidad de `feed_publicaciones`; publicaciones bloqueadas no aparecen.
- Fórmula: `(likes + comentarios) / (horas_desde_creacion + 2)^1.6`. El `+2` evita spikes de publicaciones nuevas con 0 horas.
- El `GRANT SELECT` es obligatorio y separado de RLS: sin él la Data API no expone la vista a `anon`/`authenticated`.
- La columna `score` es interna. El data layer (`lib/data/trending.ts`) selecciona columnas explícitas y **nunca expone `score` al cliente**.
- A alto volumen: considerar vista materializada refrescada por `pg_cron` — no implementado en MVP.

### RPC `get_area_counts()` (ADDITIVE)

Cuenta publicaciones distintas (no bloqueadas) por área de conocimiento de tag.

```sql
create or replace function public.get_area_counts()
returns table(area text, count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select t.area, count(distinct pt.publicacion_id) as count
  from public.tag t
  join public.publicacion_tag pt on pt.tag_id = t.id
  join public.publicacion p on p.id = pt.publicacion_id
  where p.bloqueada = false
  group by t.area;
$$;

revoke all on function public.get_area_counts() from public;
grant execute on function public.get_area_counts() to anon, authenticated;
```

- `SECURITY INVOKER` (nunca DEFINER para omitir RLS — regla invariante del proyecto).
- `set search_path = ''` y calificación completa de objetos — hardening Supabase.
- `revoke all from public` + `grant execute to anon, authenticated` — explicit tight grant.
- `count(distinct pt.publicacion_id)` → una publicación con varios tags en el mismo área cuenta una sola vez.
- Consumida por `lib/data/areas.ts` → `getAreaCounts()`, `getAreasConMinimo(min)`, `countForArea(area)`.

---

*Vitrina · Especificaciones de BD y Conexión al Backend v1.1 · Junio 2026*