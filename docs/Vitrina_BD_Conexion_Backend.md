# Especificaciones de Base de Datos y Conexión al Backend
## Portafolio Digital · Vitrina

| Campo | Detalle |
|---|---|
| Estado | Base de datos creada y poblada con datos de prueba · **ciclo de revista mensual aplicado** (RPC, `es_admin()`, índice `una_revista_borrador` y job `pg_cron` `revista-mensual` verificados en vivo). Cadencia mensual (día 1 de cada mes, 13:00 UTC-6) |
| Documentos relacionados | `Vitrina_Especificaciones_APIs.md` (contrato de la API), `Vitrina_Pantallas_Componentes.md` (pantallas/UI) |

> Este documento describe la base de datos **tal como fue creada** en Supabase y explica cómo conectarla al backend (Next.js con `supabase-js`).
>
> **Revista automática:** las RPC validan solo `rol = 'administrador'`, y un job `pg_cron` publica la edición activa, descarta sus solicitudes pendientes y crea el siguiente borrador. Cadencia mensual (job `revista-mensual`, función `publicar_revista_mensual`, día 1 de cada mes 13:00 UTC-6). Los pasos SQL están en §3.5 y §9.

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

### Tablas (22, todas con RLS activado)

| Tabla | Propósito | Notas |
|---|---|---|
| `usuario` | Perfil de usuario | Extiende `auth.users` por `id`; `rol` por defecto `usuario` |
| `publicacion` | Creaciones (libro, artículo, etc.) | `tipo` por defecto `investigacion`; `archivo_url` apunta a Storage; `archivo_thumbnail_url text` nullable — miniatura JPEG (página 1) de un PDF, generada client-side, ver §3.20b; `obra_autor_externo`/`url_externa` nullable, solo poblados cuando `tipo = 'recomendacion'`; `bloqueada boolean not null default false` — oculta la publicación a usuarios no-admin cuando es `true` |
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
| `publicacion_chunk` | Chunks embebidos del PDF de cada publicación para el chat RAG | RLS respeta `bloqueada`; solo el autor inserta, autor o admin borra; ver §3.15 |
| `publicacion_rag` | Estado de indexado RAG por publicación (fingerprint) | Ver §3.15 |
| `rag_rate_limit` | Cuota del chat RAG (contador + ventana de tiempo) | Una fila por usuario; el usuario solo lee su propia fila; ver §3.16 |
| `coleccion` | Colecciones de publicaciones guardadas por un usuario | `visibilidad` `publica`/`privada`; RLS por dueño; ver §3.20 |
| `coleccion_publicacion` | Puente colección ↔ publicación | PK compuesta `(coleccion_id, publicacion_id)`; hereda visibilidad de la colección; ver §3.20 |
| `correo_admin` | Historial de envíos masivos de correo hechos por administradores | RLS gateada por `es_admin()`; ver §3.21 |

> El DDL real (columnas, llaves foráneas, índices y las **41 políticas RLS** actuales) se aplicó como migraciones en Supabase (`esquema_inicial`, `logica_negocio`, `rls_politicas`, `almacenamiento` + las aditivas posteriores); consúltalo directamente en el panel o mediante `supabase db dump`.
>
> **CHECK de longitud a nivel BD (verificados en vivo):** además de la validación server-side, la BD impone: `publicacion.titulo ≤ 150`, `publicacion.resumen ≤ 700`, `comentario.contenido ≤ 250`, `revista.titulo ≤ 65`, `revista.volumen < 9999` (o NULL), `usuario.nombre/institucion/carrera ≤ 50` y `usuario.email ≤ 254`.

### Diferencias respecto al plan original

- **Tabla `like`:** `LIKE` es palabra reservada en PostgreSQL, así que la tabla se creó como `"like"` (entre comillas). En **SQL crudo** debes escribirla siempre así; desde `supabase-js` usas `.from('like')` con normalidad (PostgREST lo resuelve).
- **`tipo_publicacion`** sigue la convención ASCII sin acentos del enum (`articulo`, `investigacion`); los valores multi-palabra usan snake_case (`diseno_grafico`, como `contenido_inapropiado`). Las etiquetas acentuadas (`Reseña`, `Diseño gráfico`, etc.) viven en `lib/constants/publicaciones.ts` (`TIPO_META`). Cambio puramente aditivo respecto al esquema base: **sin cambios en columnas, RLS, policies, RPC ni en la vista `feed_publicaciones`.**
- **Recomendaciones:** el valor `recomendacion` permite publicar obras de terceros. `publicacion` tiene dos columnas **nullable** — `obra_autor_externo` (autor real de la obra) y `url_externa` (enlace http/https) — pobladas únicamente para ese tipo. `autor_id` sigue siendo **el recomendador** (de la sesión), no el autor externo. La vista `feed_publicaciones` expone ambas columnas preservando `security_invoker=true`.
- **`rol_usuario`** usa `usuario` como rol base.
- **Revista sin editor:** no existe `revista.editor_id`; cualquier administrador cura cualquier edición. Un índice único parcial garantiza una sola revista en `borrador`. Ver §3.5.

### 3.5 Migración de revista automática — cadencia actual: **mensual**

La revista rota de forma automática (no manual): un job `pg_cron` publica la edición activa, descarta sus solicitudes pendientes y crea el siguiente borrador. Función `publicar_revista_mensual`, job `pg_cron` `revista-mensual` con expresión `0 19 1 * *` (día 1 de cada mes, 13:00 UTC-6 = 19:00 UTC), título del nuevo borrador `'Revista mensual Archicom'`.

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

**b) Políticas de `solicitud_revista` (cualquier administrador)**

```sql
create policy admin_ve_solicitudes on solicitud_revista
  for select to authenticated
  using (public.es_admin());

create policy admin_actualiza_solicitudes on solicitud_revista
  for update to authenticated
  using (public.es_admin());
```

> Estas conviven con las políticas existentes `autor_ve_suyas` (SELECT, el solicitante ve las suyas) y `autor_inserta` (INSERT, el autor postula su obra). Un usuario ve solo sus solicitudes; un administrador ve todas.

**c) Una sola revista activa**

```sql
create unique index una_revista_borrador
  on revista (estado)
  where (estado = 'borrador');
```

Las políticas `admin_gestiona` (FOR ALL) en `revista` y `revista_articulo` verifican `rol = 'administrador'` mediante subquery inline — funcionalmente equivalen a `es_admin()` aunque usen una implementación distinta.

### 3.6 Funciones

**RPC `aceptar_solicitud` / `rechazar_solicitud`**

Validan internamente solo `es_admin()`.

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

Policy aditiva, aprobada explícitamente. Permite que un administrador elimine **cualquier** publicación, no solo las propias.

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

### 3.7 Tabla `usuario_link` (Feature 1 — enlaces de perfil)

Puramente aditiva: no modifica ninguna tabla, RLS, RPC, vista ni policy existente.

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

Puramente aditiva. Representa un grafo dirigido: si A sigue a B existe la fila `(A, B)`.

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

### 3.10 Moderación de reportes

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

> **Estado real:** `bloquear_publicacion` y `descartar_reporte` tienen grants `authenticated, postgres, service_role` (no `anon`/`public`). Validan `es_admin()` internamente. Como el admin las llama con su propio JWT y no hay `service_role`, **no** se puede revocar de `authenticated` sin romper el flujo de admin. Tratadas como excepción documentada — ver §7.1 principal y `SECURITY_AUDIT.md` (F-002).

#### Política RESTRICTIVE `publicacion_oculta_bloqueadas`

```sql
create policy publicacion_oculta_bloqueadas on publicacion
  as restrictive for select
  using (bloqueada = false or public.es_admin() or autor_id = auth.uid());
```

Es RESTRICTIVE: se ANDea con el OR-union de las políticas PERMISSIVE. Efecto: `lectura_publica` (USING true) permite todo, pero este RESTRICTIVE lo restringe a `bloqueada=false OR es_admin() OR es_el_autor`. Autores pueden seguir viendo sus propias publicaciones bloqueadas.

> ⚠️ **Esta policy llama a `es_admin()` en cada SELECT de `publicacion`.** Por eso **todo rol que lea `publicacion` (incluido `anon`) necesita `EXECUTE` sobre `public.es_admin()`**; las policies RLS se evalúan en contexto del rol que llama. Sin ese grant, un visitante anónimo recibe `permission denied for function es_admin (42501)` y el feed le devuelve **cero filas**. Ver §7.1.

#### Vista `feed_publicaciones` (recreada)

La vista se recreó con `WHERE p.bloqueada = false` para excluir publicaciones bloqueadas del feed. Se preservan: `security_invoker=true`, todas las columnas previas (`id, autor_id, autor_nombre, titulo, resumen, archivo_url, tipo, creado_en, likes, comentarios, obra_autor_externo, url_externa`). El FeedPublicacion DTO no expone `bloqueada` (la vista no la incluye).

### 3.11 Guardados privados

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

### 3.12 Hilos de comentarios

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

### 3.13 Mensajería directa

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

> **Regla: RLS restringe filas, no columnas.** La policy `mensaje_marca_leido` restringe *filas* (solo las del otro participante) pero **no columnas**; con el grant de UPDATE a nivel de tabla, un participante podría alterar vía PostgREST directo campos como `contenido`, `emisor_id` o `creado_en` de mensajes ajenos. Por eso: `REVOKE UPDATE ON public.mensaje FROM anon, authenticated` + `GRANT UPDATE (leido) ON public.mensaje TO authenticated`. `authenticated` solo puede actualizar la columna `leido`; el resto de columnas queda denegado a nivel de grant. El endpoint `leer` y los recibos de lectura en tiempo real siguen funcionando (solo escriben `leido`). La RPC `enviar_mensaje` es SECURITY DEFINER y no se ve afectada.

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

#### Realtime

```sql
alter publication supabase_realtime add table public.mensaje;
```

Solo `mensaje` se publica en la publicación Realtime (no `conversacion`). La bandeja no necesita actualizaciones en tiempo real en v1; solo el hilo abierto las requiere. La policy `mensaje_lectura` (SELECT) filtra lo que cada suscriptor puede recibir — un no-participante no recibe eventos aunque esté conectado.

**`mensaje` → `REPLICA IDENTITY FULL`:** por defecto Postgres solo incluye la PK en el registro WAL del "viejo" de un UPDATE. La suscripción Realtime filtra eventos por `conversacion_id=eq.<id>` (columna no-PK); cuando la identidad de réplica es solo PK, el registro WAL antiguo no lleva `conversacion_id` y Supabase Realtime **no puede hacer match del filtro**, por lo que **los eventos UPDATE no llegan al cliente**. Esto afecta directamente a los recibos de lectura en tiempo real (el campo `leido` pasando a `true`).

```sql
alter table public.mensaje replica identity full;
```

Cambio puramente operativo (no modifica RLS, policies, RPC ni vista); aumenta el tamaño del WAL solo para filas de `mensaje` que reciban UPDATE. Requerido para que `HiloMensajes` reciba eventos UPDATE filtrados por `conversacion_id` y actualice el tick ✓✓ en tiempo real.

> **Footgun — JWT del socket Realtime:** el cliente browser **debe** llamar `supabase.realtime.setAuth(session.access_token)` antes de `.subscribe()`. Sin eso, el socket se autentica con la publishable (anon) key y la policy RLS `mensaje_lectura` deniega la entrega de eventos — el canal llega al estado `SUBSCRIBED` pero **no recibe ningún evento**. `HiloMensajes` y `NavClient` ambos obtienen la sesión con `supabase.auth.getSession()` y llaman `setAuth` antes de suscribirse. Ver `components/mensajes/HiloMensajes.tsx` y `components/layout/NavClient.tsx`.

---

### 3.14 Solicitudes de mensaje

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

**Guards anti-spam:** antes de ejecutar la lógica principal, la RPC evalúa dos controles adicionales; ambos lanzan `RAISE EXCEPTION` (P0001 → 400) con los mensajes exactos indicados:

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

### 3.15 RAG por publicación — chat sobre el PDF

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

### 3.16 Rate limit del chat RAG

15 preguntas por hora **por cuenta** en `POST /api/publicaciones/[id]/chat`, para acotar costo/abuso.

#### Tabla `rag_rate_limit`

Una fila por usuario: `usuario_id uuid PK → usuario(id) ON DELETE CASCADE`, `ventana_inicio timestamptz`, `conteo int`. Ventana **fija** de 1h anclada en la primera pregunta. RLS: solo `SELECT` de la propia fila (`usuario_id = auth.uid()`); **sin** INSERT/UPDATE/DELETE para el usuario → no puede resetear su contador.

#### RPC `consumir_cuota_rag()`

`SECURITY DEFINER` (mismo modelo que `es_admin`/`aceptar_solicitud`; **no** es `service_role`), `search_path` fijo. Único camino de mutación del contador. Atómica (row lock): si la ventana venció reinicia y permite; si `conteo >= 15` deniega; si no, incrementa y permite. Identifica al llamante con `auth.uid()` (null → `P0001 'No autorizado'`). Retorna `(permitido boolean, restantes int, reinicia_en timestamptz)`. `EXECUTE` revocado de `anon`, otorgado a `authenticated`. La ruta `/chat` la llama tras validar y antes del trabajo caro; `!permitido` → 429 `rate_limited`.

---

### 3.17 Búsqueda del buscador — FTS + trigram

Mejora del buscador: publicaciones pasan de `ilike` sobre **solo `titulo`** a **full-text search en español** sobre `titulo` + `resumen` (ranking, stemming, prefijo, multi-palabra, **accent-insensitive**); usuarios pasan de `ilike` sobre `nombre` a **búsqueda trigram typo-tolerante y accent-insensitive**. **Sin capa semántica/RAG** (elegido explícitamente; el híbrido queda como mejora futura). Cambio ADITIVO, aprobado explícitamente; sin tocar tablas/columnas/RLS/RPC existentes.

#### Extensiones + `f_unaccent`

`unaccent` y `pg_trgm` instaladas en el schema `extensions` (como `vector`). Wrapper `public.f_unaccent(text)` **IMMUTABLE** (envuelve `extensions.unaccent('extensions.unaccent'::regdictionary, $1)`, dict fijo) para poder usarlo en columna generada e índice de expresión (el `unaccent` de 1 argumento es solo STABLE). Nota: el `unaccent` por defecto mapea `ñ→n`.

#### Publicaciones — columna `publicacion.busqueda_tsv` + índice GIN + RPC `buscar_publicaciones`

Columna generada **STORED**: `setweight(to_tsvector('spanish', f_unaccent(coalesce(titulo,''))),'A') || setweight(to_tsvector('spanish', f_unaccent(coalesce(resumen,''))),'B')`. Peso A (título) > B (resumen). Índice `publicacion_busqueda_idx` GIN. RPC `buscar_publicaciones(p_q, p_limit=6, p_offset=0)` `language sql stable` **SECURITY INVOKER** (RLS del llamante aplica; la restrictiva `publicacion_oculta_bloqueadas` oculta `bloqueada`), `set search_path=''`. Tokeniza `f_unaccent(lower(p_q))`, sufija `:*` por término, une con `&` → `to_tsquery('spanish', …)` (prefijo; multi-palabra = AND). Ordena `ts_rank DESC, creado_en DESC`, join a `usuario` por `autor_id`. Devuelve `(id, titulo, resumen, tipo, autor_id, creado_en, nombre_autor, total bigint)`; `total = count(*) over()` para paginar.

#### Usuarios — índice trigram + RPC `buscar_usuarios`

Índice GIN de expresión `usuario_nombre_trgm_idx` sobre `f_unaccent(lower(nombre))` con `extensions.gin_trgm_ops` (soporta `LIKE` y `%`/`<%`). RPC `buscar_usuarios(p_q, p_limit=6, p_offset=0)` `language sql stable` **SECURITY INVOKER** (`usuario` es públicamente legible vía `lectura_publica`), `set search_path=''`. Normaliza `f_unaccent(lower(trim(p_q)))`; filtra `nombre_norm LIKE '%q%'` **OR** `q <% nombre_norm` (word_similarity, matchea una palabra del nombre → typo-tolerante); ordena por `word_similarity DESC, nombre ASC`. Solo expone `(id, nombre, institucion, carrera, total bigint)` — nunca `rol`/`email`.

Ambas con `EXECUTE` a `anon`+`authenticated` (búsqueda pública; **no** depende de la edge `embed` ni de JWT). Las consume `lib/data/buscar.ts` (`buscarPublicaciones`/`buscarUsuarios` → dropdown, página `/buscar`, "Ver más"). El typo tiene el límite del umbral `word_similarity` (0.6): una sustitución en palabra corta (`garzia`→"Garcia") puede no matchear.

---

### 3.18 Búsqueda semántica híbrida

Capa **semántica** encima del FTS del §3.17: embebe la consulta (edge `embed`, gte-small 384) y recupera publicaciones por similitud coseno sobre `publicacion_chunk` (los chunks del chat RAG, HNSW `vector_cosine_ops`), **fusionando** con el FTS vía **RRF**. Es **retrieval, sin generación LLM**. Solo en la página `/buscar` (SSR) y **solo para logueados** (la edge tiene `verify_jwt`); anónimo → FTS. Cambio ADITIVO, aprobado; sin tocar tablas/columnas/RLS/RPC existentes.

#### RPC `match_publicacion_chunks_global(p_query_embedding vector, p_match_count int default 20)`

`language sql stable` **SECURITY INVOKER** (RLS de `publicacion_chunk` aplica → respeta `bloqueada`), `set search_path to 'public','extensions'`. Over-fetch de los N×5 chunks más cercanos vía HNSW, luego `group by publicacion_id` con `max(1 - (embedding <=> q))` (mejor chunk por publicación), ordena por similitud, `limit N`. Devuelve `(publicacion_id uuid, similaridad double precision)`. `EXECUTE` solo a `authenticated`. La consume `lib/data/buscar.ts::buscarPublicacionesHibrido` (embebe la query con `embedTexts`, arma la lista y hace RRF con el FTS; degrada a FTS si el embed/RPC fallan).

#### Cobertura de indexado — auto-index + backfill admin

Para que la búsqueda semántica tenga qué buscar: **auto-index** de todo PDF al publicar (sin checkbox opt-in; corre bajo el JWT del autor, RLS `chunk_insert`/`rag_write`). **Backfill** de PDFs existentes vía `POST /api/admin/rag/backfill` (secuencial, idempotente por sha256), habilitado por policies admin ADITIVAS `chunk_admin_write` (publicacion_chunk) y `rag_admin_write` (publicacion_rag) — `FOR ALL to authenticated using es_admin() with check es_admin()`, espejo de `admin_elimina`; el admin indexa PDFs ajenos bajo **su JWT** (RLS, no `service_role`). Pipeline compartido en `lib/rag/indexer.ts`.

---

### 3.19 Columna `ciudad` en `usuario`

Campo de texto libre y opcional: `ciudad text NULL, CHECK (char_length(ciudad) <= 50)` — mismo patrón que `institucion`/`carrera`. Sin RLS nueva (cubierta por las políticas existentes de `usuario`: lectura pública, escritura solo del propio dueño). Se edita en `/perfil/ajustes` (mismo formulario que institución/carrera, sin pantalla nueva) vía `PATCH /api/perfil`. Expuesta en `GET /api/auth/me`, `lib/data/perfil.ts::getPerfil` y renderizada en `PerfilView` cuando está presente. Cambio ADITIVO, aprobado explícitamente. Ver `Vitrina_Especificaciones_APIs.md` §4.1.

> **Regla para toda columna nueva en `usuario` — footgun de grants por columna.** Esta tabla usa grants **por columna**, no por tabla completa (ver el patrón de `harden_usuario_rol_email`/`restrict_usuario_update_grants`): `institucion`/`carrera`/`ciudad` tienen `GRANT SELECT (columna) ... TO anon, authenticated` + `GRANT UPDATE (columna) ... TO authenticated` explícitos. Agregar una columna con `ALTER TABLE ADD COLUMN` **no** le da SELECT/UPDATE automáticamente a `anon`/`authenticated` — falta un `GRANT` explícito. Sin ese grant, cualquier `select(...)` que incluya la columna falla completo con `permission denied for column <col>` (el privilegio de columna bloquea el `SELECT` entero, no solo esa columna). **Regla:** agregar el `GRANT` de columna en la misma migración que el `ALTER TABLE`, y verificar contra `information_schema.column_privileges` antes de dar el cambio por terminado.

---

### 3.20 Colecciones

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

---

### 3.20b Columna `archivo_thumbnail_url` en `publicacion` — miniatura de PDF en el feed

`archivo_thumbnail_url text NULL`, aditiva. `publicacion` usa GRANT de tabla completo (no grants por columna como `usuario` — ver footgun §3.19), así que no hizo falta un `GRANT` adicional. Guarda la URL pública (Storage, bucket `publicaciones`) de una miniatura JPEG de la página 1 de un PDF, generada **client-side** (`pdfjs-dist`, ver `lib/pdf/generateThumbnail.ts`) en el momento de publicar/editar y subida junto al archivo principal. `NULL` para publicaciones cuyo archivo es una imagen (JPG/PNG — la propia imagen es la miniatura, no hace falta esta columna) o para PDFs publicados antes de este cambio y aún no re-guardados (limitación aceptada, sin backfill server-side). Las vistas `feed_publicaciones` y `feed_trending` se recrearon (`security_invoker=true` preservado) agregando esta columna al final de su lista de columnas (restricción de Postgres: no se puede reordenar columnas con `CREATE OR REPLACE VIEW`). Ver `Vitrina_Especificaciones_APIs.md` (payloads de `POST/PATCH /api/publicaciones`) y `Vitrina_Pantallas_Componentes.md` (miniatura en `PublicacionCard`).

---

### 3.21 Notificaciones por correo (Resend) — columna `notif_email_habilitado`, RPC resolutora transaccional y backend del panel admin de envío masivo (migraciones `add_notif_email_habilitado_to_usuario`, `create_resolver_destinatario_notificacion_rpc`, `fix_resolver_destinatario_notificacion_secret_store`, `create_correo_admin_table`, `create_resolver_destinatarios_correo_rpc`)

Sistema completo de notificaciones por correo: notificaciones transaccionales (webhooks) y panel admin de envío masivo. Cambio ADITIVO, aprobado explícitamente; sin tocar tablas/columnas/RLS/RPC existentes fuera de lo documentado acá.

#### Columna `usuario.notif_email_habilitado`

`boolean NOT NULL DEFAULT true` — preferencia de notificaciones por correo, modelo opt-out (todo usuario empieza suscrito). `UPDATE` está otorgado a `authenticated` (`grant update (notif_email_habilitado) on usuario to authenticated;`) — seguro porque la policy `editar_propio` (`USING`/`WITH CHECK auth.uid() = id`) es **row-scoped**, así que un usuario solo puede escribir su propia fila. Sin embargo, `usuario` no tiene `SELECT` de columna para ningún rol (ni `anon` ni `authenticated`) sobre `notif_email_habilitado`.

> **Regla: un `GRANT SELECT` de columna a un rol NO hereda el row-scoping de otras policies de esa tabla.** Si la tabla tiene una policy de lectura pública (`USING (true)`) — como `usuario.lectura_publica`, que permite ver perfiles de otros usuarios en `/usuario/[id]` — un `GRANT SELECT` de columna liso expone esa columna a **todas** las filas visibles por esa policy, no solo a la fila del llamante (RLS filtra filas, el grant de columna es *role-wide*). La única forma de exponer una columna privada "propia únicamente" en esas condiciones es una RPC `SECURITY DEFINER` self-scoped que derive el id de `auth.uid()` internamente (patrón de `mi_notif_email_habilitado()` abajo), nunca un `GRANT SELECT` de columna directo.

#### RPC `mi_notif_email_habilitado()` — lectura self-scoped, sin parámetros

```sql
create or replace function public.mi_notif_email_habilitado()
returns boolean
language sql security definer set search_path = '' as $$
  select notif_email_habilitado from public.usuario where id = auth.uid();
$$;
```

`SECURITY DEFINER`, **sin parámetros** — deriva el `id` de `auth.uid()` dentro del cuerpo, así que estructuralmente **no puede** leer la preferencia de otro usuario (a diferencia de recibir un `p_usuario_id` y confiar en que el llamante no lo falsifique). `revoke all ... from public; grant execute ... to authenticated;` (NO `anon` — requiere sesión). Es el único camino de lectura de la preferencia propia: la usan `lib/data/perfil.ts` (`getPreferenciasNotificacion`), `app/api/auth/me/route.ts` y `app/api/perfil/route.ts` (el `RETURNING` de la fila tras el `PATCH` también requiere `SELECT` sobre la columna devuelta, así que también pasa por esta RPC).

#### RPC `resolver_destinatario_notificacion(p_secret text, p_usuario_id uuid)`

`SECURITY DEFINER`, `set search_path = ''`. Igual que `consumir_cuota_rag`/`aceptar_solicitud`, usa el bypass de owner para leer `usuario.email` — columna sin `SELECT` para ningún rol vía PostgREST (§7.3). Se invoca desde el Edge Function del webhook transaccional (sin JWT de usuario, solo la `anon key`), así que el control de acceso **no** es `es_admin()` sino un secreto compartido: si `p_secret` no coincide con el valor almacenado, `RAISE EXCEPTION 'No autorizado'` (P0001 → 400 vía `handleError`). Si coincide, retorna `(email text, notif_email_habilitado boolean)` para el `usuario_id` pedido. `revoke all ... from public; grant execute ... to anon, authenticated;` (el webhook llama sin sesión, de ahí el grant a `anon`).

> **El secreto vive en una tabla de un schema `private`, nunca en `ALTER DATABASE SET` / `current_setting('app.settings.*')`.** En Supabase hosted el rol `postgres` no tiene superusuario real: `ALTER DATABASE ... SET` falla con `permission denied to set parameter`, así que el patrón estándar de Postgres self-hosted (guardar config con `alter database ... set app.settings.*` y leerla con `current_setting(...)`) no es viable ahí. El schema `private` (sin grants a `public`/`anon`/`authenticated`) tiene la tabla `private.notif_config(key text primary key, value text)`, y la RPC compara `p_secret <> (select value from private.notif_config where key = 'webhook_secret')` en vez de `current_setting(...)`. **Regla para cualquier secreto futuro a nivel de base de datos en este proyecto:** guardarlo en una tabla de un schema privado sin grants a roles de PostgREST — **nunca** `ALTER DATABASE SET` / `current_setting('app.settings.*')`, no disponible en este entorno hosted.

#### Edge Function `enviar-notificacion-email`

`verify_jwt:false` — el llamante es un DB Webhook de Supabase, sin JWT de usuario; la autorización es un secreto compartido, no `es_admin()`. Fuente en `supabase/functions/enviar-notificacion-email/index.ts` (committed en el repo, a diferencia del precedente `embed` que vive solo desplegado). La lógica pura/ramificada vive en dos siblings planos (sin APIs de Deno) para poder cubrirlos con Vitest directamente: `route-predicate.ts` (`resolveRecipient(payload)`, decide destinatario + plantilla) y `../_shared/email-template.ts` (`renderEmail({titulo, cuerpoHtml, nombre?})`, wrapper HTML compartido con `enviar-correo-masivo`, sin footer de "darse de baja" — decisión MVP fija). El wrapper incluye un botón fijo "Visitar Vitrina" → `https://esvitrina.com` (hardcodeado en `email-template.ts`, no viene de `NEXT_PUBLIC_SITE_URL` — las Edge Functions corren en Deno, fuera de la app Next.js, así que esa env var no es alcanzable ahí).

Variables de entorno: `NOTIF_WEBHOOK_SECRET`, `RESEND_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NOTIF_FROM_EMAIL`.

Flujo:
1. Header `x-webhook-secret` ≠ `NOTIF_WEBHOOK_SECRET` (o ausente) → **401**, antes de parsear el body.
2. Parsea el payload nativo del webhook `{type, table, record, old_record?, schema}`.
3. Enruta vía `resolveRecipient`: `solicitud_mensaje` INSERT → destinatario `record.receptor_id`, plantilla "nueva solicitud de mensaje"; `solicitud_revista` UPDATE con `record.estado==='aceptada'` **y** `old_record?.estado !== 'aceptada'` → destinatario `record.solicitante_id`, plantilla "tu obra fue aceptada en la revista" (el guard de `old_record` evita reenvíos si se vuelve a guardar una fila ya aceptada); cualquier otro caso → **204** (ignorado, no es error).
4. Cliente Supabase **anon** (`createClient(SUPABASE_URL, SUPABASE_ANON_KEY)`) — no `service_role` — llama `rpc('resolver_destinatario_notificacion', {p_secret: NOTIF_WEBHOOK_SECRET, p_usuario_id})`.
5. Sin fila, o `notif_email_habilitado=false`, o sin `email` → **204** (omitido: usuario no encontrado / opt-out / sin correo, no es un error). Error real de la RPC → **500**.
6. Arma el HTML vía `renderEmail(...)` y envía con Resend (`npm:resend`, import Deno) `emails.send({from: NOTIF_FROM_EMAIL, to: email, subject, html})`. Error de Resend → **500** con su mensaje; éxito → **200**.

**Footgun de build:** el entrypoint Deno (`index.ts`) usa globals (`Deno.serve`, `Deno.env`) y specifiers `npm:`/imports con extensión `.ts` que `tsc` (targeted a Node) no puede resolver. Se excluyó explícitamente en `tsconfig.json` (`exclude: ["supabase/functions/**/index.ts"]`) — los siblings planos (`route-predicate.ts`, `email-template.ts`) **no** están excluidos y sí se type-checan/lintean normalmente. ESLint (`eslint-config-next/typescript`) no requiere una exclusión equivalente: no lanza error de "parserOptions.project" sobre `index.ts` aun estando fuera del programa de `tsc`.

#### Webhooks del dashboard (runbook operativo — NO es DDL de migración)

Se configuran manualmente en el dashboard de Supabase (Database → Webhooks), no vía `apply_migration` — evita incrustar el valor del secreto en una definición de trigger versionada y usa la UI soportada con reintentos/observabilidad. Dos webhooks:

| Webhook | Tabla | Evento | Header | Destino |
|---|---|---|---|---|
| Nueva solicitud de mensaje | `solicitud_mensaje` | INSERT | `x-webhook-secret: <mismo valor que NOTIF_WEBHOOK_SECRET>` | Edge Function `enviar-notificacion-email` |
| Solicitud de revista aceptada | `solicitud_revista` | UPDATE | `x-webhook-secret: <mismo valor que NOTIF_WEBHOOK_SECRET>` | Edge Function `enviar-notificacion-email` |

El mismo secreto compartido vive en tres lugares: (a) el secreto de la Edge Function `NOTIF_WEBHOOK_SECRET`, (b) el header `x-webhook-secret` de cada webhook, (c) `private.notif_config` (leído por la RPC).

#### Tabla `correo_admin`

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
| `estado` | `text not null default 'pendiente'` | `check (estado in ('pendiente','completado','fallido'))` | Lo actualiza el Route Handler tras invocar `enviar-correo-masivo` |
| `enviado_en` | `timestamptz not null default now()` | — | Orden del historial (`ORDER BY enviado_en DESC`) |

**RLS habilitado**, tres policies `es_admin()`-gateadas:

| Policy | FOR | TO | Condición |
|---|---|---|---|
| `correo_admin_select` | `SELECT` | `authenticated` | `USING (es_admin())` |
| `correo_admin_insert` | `INSERT` | `authenticated` | `WITH CHECK (es_admin() and admin_id = auth.uid())` — `admin_id` desde sesión, nunca del body |
| `correo_admin_update` | `UPDATE` | `authenticated` | `USING/WITH CHECK (es_admin() and admin_id = auth.uid())` — el Route Handler actualiza `cantidad_enviados/cantidad_fallidos/estado` tras invocar la Edge Function, corriendo bajo el JWT del MISMO admin que hizo el INSERT; sin `admin_id = auth.uid()` cualquier admin podría reescribir el historial de envío de otro admin, rompiendo la integridad del audit trail |

Grant de tabla separado de RLS (RLS filtra filas; el GRANT habilita visibilidad en PostgREST — mismo principio del footgun de §3.19): `grant select, insert, update on correo_admin to authenticated;`.

**SQL completo:**

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

#### RPC `resolver_destinatarios_correo(p_tipo text, p_ciudad text default null, p_ids uuid[] default null)`

`SECURITY DEFINER`, `set search_path = ''`. Mismo bypass de owner que `resolver_destinatario_notificacion` para leer `usuario.email` (columna sin `SELECT` para ningún rol vía PostgREST, §7.3), pero gateada por **rol**, no por secreto: `if not es_admin() then raise exception 'No autorizado'`. Retorna `(id uuid, email text, nombre text)` filtrando SIEMPRE `notif_email_habilitado = true` y `email is not null` — el filtro de opt-out se evalúa **fuera** de la rama de `p_tipo` (`case p_tipo when 'todos' then true when 'ciudad' then u.ciudad = p_ciudad when 'ids' then u.id = any(p_ids) else false end`), así que un admin no puede saltarse el opt-out de un usuario ni eligiéndolo a mano vía `p_ids`.

`revoke all on function ... from public; revoke execute on function ... from anon; grant execute on function ... to authenticated;` — a diferencia de `resolver_destinatario_notificacion` (que sí necesita `anon` porque el webhook llama sin sesión), esta RPC es de uso exclusivo de administradores autenticados: `anon` se revoca **explícitamente**, además del `revoke all from public` (Supabase auto-otorga `EXECUTE` a `anon`/`authenticated`/`service_role` en funciones nuevas; `revoke all from public` por sí solo no retira el grant directo a `anon` — mismo aprendizaje ya aplicado en `rag_rate_limit_revoke_anon`/`mensajeria_directa_revoke_anon`, §7.1).

**SQL completo:**

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

Es también la puerta de entrada exclusiva de `enviar-correo-masivo` (ver esa subsección abajo) — la Edge Function llama a esta RPC directamente en vez de recibir destinatarios pre-resueltos, así que un solo `if not es_admin()` sirve como autorización y resolución a la vez. Esta RPC lee `usuario.email`/`notif_email_habilitado` para MÚLTIPLES filas dentro de un cuerpo `SECURITY DEFINER` gateado por `es_admin()` — patrón seguro (admin-gateado, no un `GRANT SELECT` de columna plano expuesto a PostgREST). No agrega ningún grant de columna nuevo: el owner bypassea los grants de columna solo *dentro* del cuerpo de la función, y el único camino de entrada está gateado por `es_admin()`.

#### Edge Function `enviar-correo-masivo`

`verify_jwt:true` — a diferencia del webhook transaccional, el llamante es el Route Handler de admin (`app/api/admin/correos/route.ts`) vía `admin.functions.invoke('enviar-correo-masivo', {...})`, que reenvía el JWT del admin automáticamente (mismo patrón que `lib/rag/embed.ts`). `verify_jwt:true` solo prueba "hay un usuario autenticado", no "es admin".

La función recibe `{asunto, cuerpo, destinatarios_criterio}` (shape de `DestinatariosCriterio`) — **no** una lista de destinatarios pre-resuelta — y ella misma llama internamente a `resolver_destinatarios_correo` con el JWT admin reenviado. Es standalone, alcanzable por `functions.invoke` desde cualquier cuenta admin: si recibiera una lista pre-resuelta, nada forzaría que viniera realmente de `resolver_destinatarios_correo`, así que un admin podría construir `destinatarios` a mano para saltarse el opt-out o enviar a direcciones arbitrarias usando el dominio verificado del proyecto como relay abierto. Al resolver siempre internamente, no existe camino donde la lista venga de fuera de esa RPC, así que el opt-out se aplica siempre; tampoco hace falta un `rpc('es_admin')` separado, la RPC ya gatea internamente.

Fuente en `supabase/functions/enviar-correo-masivo/index.ts` (misma naturaleza committed que `enviar-notificacion-email`). Lógica pura en tres siblings Vitest: `validate-payload.ts`, `chunk.ts`, `plain-text-to-html.ts` (ver nota de `cuerpo` abajo).

> **`cuerpo` es texto plano, nunca HTML de confianza.** El `<textarea>` de admin no tiene editor de formato. `renderEmail` no escapa `cuerpoHtml` por diseño (correcto para plantillas hardcoded, equivocado para input de admin sin sanitizar — habilitaría XSS en el correo enviado). Por eso `plain-text-to-html.ts` escapa los 5 caracteres HTML-significativos y convierte saltos de línea a `<br>` antes de llegar a `renderEmail`, dentro de esta misma función — no depende de que el Route Handler lo haga bien. Su lógica de escape está duplicada (no importada) desde `_shared/email-template.ts` por un conflicto real entre `tsc` (rechaza imports relativos con extensión `.ts` explícita) y Deno (la exige en runtime) — ver el header de ese archivo.

Variables de entorno: `RESEND_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NOTIF_FROM_EMAIL` (compartidas con `enviar-notificacion-email`; no hace falta `NOTIF_WEBHOOK_SECRET` aquí).

Flujo:
1. Cliente Supabase con el header `Authorization` reenviado. Sin header → **401**.
2. Body `{asunto, cuerpo, destinatarios_criterio}` validado por `validate-payload.ts`; inválido → **400**.
3. `rpc('resolver_destinatarios_correo', {p_tipo, p_ciudad, p_ids})`. `P0001` (no-admin) → **403**; otro error → **500** (log server-side, sin detalle en la respuesta).
4. Cero destinatarios resueltos → **200** `{enviados:0, fallidos:0, detalles:[]}` — no es error.
5. Más de `LIMITE_DESTINATARIOS = 500` resueltos → **400**, sin enviar nada — mitiga que un `tipo:'todos'` sin cota deje `correo_admin.estado` atascado en `'pendiente'` si el runtime mata la función a mitad de un envío; no resuelve el problema de fondo, solo acota el peor caso sin construir colas/checkpointing.
6. Convierte `cuerpo` a HTML seguro UNA vez (`plain-text-to-html.ts`), divide en lotes de ≤50 (`chunk.ts`) y envía con Resend en paralelo por lote vía `renderEmail({titulo: asunto, cuerpoHtml: cuerpoHtmlSeguro, nombre})`.
7. Responde **200** `{enviados, fallidos, detalles: {email, error?}[]}`. El Route Handler escribe el UPDATE de `correo_admin` con los conteos/`estado` final — `cantidad_destinatarios = enviados + fallidos` (puede seguir llamando a `resolver_destinatarios_correo` aparte solo para el conteo de preview/dry-run, sin enviar nada).

**Nota de superficie de error:** gateada por `verify_jwt:true` + el `es_admin()` interno de la RPC — solo un admin autenticado ve la respuesta, por eso `detalles[].error` incluye el mensaje de Resend por destinatario (diagnóstico); excepciones no estructuradas devuelven un mensaje genérico, detalle real solo en `console.error`. Con la lista de destinatarios imposible de manipular desde fuera de la RPC, este passthrough no habilita saltarse el opt-out.

#### Rutas Next.js y UI del panel admin

`GET/POST /api/admin/correos`, `GET /api/admin/correos/[id]`, `POST /api/admin/correos/contar`, pantalla `/admin/correos` — sin cambios de esquema adicionales, puro consumo de lo documentado arriba (tabla `correo_admin`, RPC `resolver_destinatarios_correo`, Edge Function `enviar-correo-masivo`). Detalle de endpoints en `Vitrina_Especificaciones_APIs.md` §21; detalle de pantalla/componentes en `Vitrina_Pantallas_Componentes.md` (feature "Panel admin de correos masivos"). El envío es **síncrono** dentro del propio Route Handler (la Edge Function ya responde con el resultado final) — no hay job async ni `tracking_id`.

La UI del form expone destinatarios `todos` / `ids` / `sin_publicacion` (no `ciudad` — decisión explícita); el tipo `DestinatariosCriterio` y la RPC siguen soportando `ciudad` a nivel de contrato para uso directo de la API.

**`{tipo:'sin_publicacion'}` — extensión sin cambio de esquema.** Es una variante de `DestinatariosCriterio` que la RPC `resolver_destinatarios_correo` **no conoce**: el Route Handler (`app/api/admin/correos/route.ts` y `.../contar/route.ts`) la resuelve ANTES de tocar la RPC/Edge Function, vía `resolverIdsSinPublicacion` (`lib/data/correos.ts`) — un `SELECT usuario.id` + `SELECT publicacion.autor_id` bajo el JWT del admin (ambas columnas públicas por RLS, sin RPC nueva ni `service_role`) y una diferencia en JS. La lista resultante se envía como `{tipo:'ids', valor}` solo a la RPC/Edge Function; `correo_admin.destinatarios_criterio` guarda el criterio original `sin_publicacion` (columna `jsonb`, esquema sin cambios — acepta cualquier forma). El opt-out `notif_email_habilitado` lo sigue aplicando `resolver_destinatarios_correo` sobre esos ids, igual que con un `ids` armado a mano.

#### Toggle en `/perfil/ajustes`

`PATCH /api/perfil` acepta `notif_email_habilitado: boolean` y lo persiste con el `UPDATE` normal (row-scoped por `editar_propio`); la respuesta y `GET /api/auth/me` obtienen el valor actual vía `mi_notif_email_habilitado()`, no vía `.select()` directo (ver arriba). UI: `components/ui/Toggle.tsx` (`role="switch"`) + `components/perfil/NotificacionesForm.tsx`.

---

### 3.22 Vista de tendencias y conteo por área

> Estos objetos son **estrictamente aditivos**: no modifican tablas, RLS, policies, ni RPC existentes. Solo agregan una vista y una función nuevas.

#### Vista `feed_trending` (ADDITIVE)

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

#### RPC `get_area_counts()` (ADDITIVE)

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

## 4. Objetos adicionales (no son tablas)

| Objeto | Tipo | Función |
|---|---|---|
| `on_auth_user_created` → `handle_new_user()` | Trigger | Crea el perfil en `usuario` al registrarse alguien; toma el nombre de `raw_user_meta_data->>'nombre'` |
| `aceptar_solicitud(p_solicitud_id, p_respuesta)` | RPC (SECURITY DEFINER) | Acepta una solicitud de forma transaccional: actualiza la solicitud **e** inserta el artículo en `revista_articulo`. Verifica internamente que el llamante sea **administrador** (ya no exige ser editor de la revista) |
| `rechazar_solicitud(p_solicitud_id, p_respuesta)` | RPC (SECURITY DEFINER) | Marca la solicitud como rechazada con respuesta opcional. Verifica internamente `rol = 'administrador'` |
| `publicar_revista_mensual()` | Función (SECURITY DEFINER) | **Rotación mensual.** Publica la revista en `borrador`, descarta sus solicitudes pendientes (las marca `rechazada`) y crea el borrador del mes siguiente. La invoca `pg_cron` el día 1 de cada mes a las 13:00 UTC-6 (ver §9). Idempotente: si no hay borrador, no hace nada |
| `es_admin()` | Función (SECURITY DEFINER) | Auxiliar booleana: indica si `auth.uid()` tiene `rol = 'administrador'`. Usada por las políticas de `solicitud_revista` y por las RPC |
| `feed_publicaciones` | Vista (`security_invoker`) | Feed con conteos de likes y comentarios resueltos en una sola consulta; respeta las RLS de las tablas base. Recreada para exponer `obra_autor_externo`/`url_externa` (atribución de recomendaciones), preservando `security_invoker=true`. Recreada nuevamente con `WHERE bloqueada=false` para excluir publicaciones bloqueadas (sin cambiar columnas). Recreada de nuevo (junto con `feed_trending`) para exponer `archivo_thumbnail_url` — ver §3.20b |
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

> Los conteos crecen con las pruebas manuales — los números de arriba son el **seed original**, no el estado actual. Lo relevante para la integridad del esquema es que exista **exactamente una revista en `borrador`** en todo momento.

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

> Postura general **sólida**: sin hallazgos Críticos ni Altos (auditoría read-only vía MCP `supabase`; ver `SECURITY_AUDIT.md` en la raíz para el informe completo con evidencia).

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
| `enviar_mensaje(uuid, text)` | `authenticated, postgres, service_role` | Flagueada (WARN); excepción documentada e intencional — el control real es la validación interna (sesión + mutualidad). `EXECUTE` revocado de `public` y `anon`. Ver §3.13 |
| `se_siguen(uuid, uuid)` | `authenticated, postgres, service_role` (INVOKER) | SECURITY INVOKER — sin ambient authority. Solo la invoca `enviar_mensaje` internamente. El advisor no la marca como DEFINER porque no lo es. Ver §3.13 |
| `enviar_solicitud_mensaje(uuid)` | `authenticated, postgres, service_role` | Flagueada (WARN); excepción documentada e intencional — el control real es la validación interna (sesión + anti-self). `EXECUTE` revocado de `public` y `anon` (misma postura §7.1). Ver §3.14 |
| `aceptar_solicitud_mensaje(uuid)` | `authenticated, postgres, service_role` | Flagueada (WARN); valida internamente que el llamante sea el receptor. Ver §3.14 |
| `rechazar_solicitud_mensaje(uuid)` | `authenticated, postgres, service_role` | Flagueada (WARN); valida internamente que el llamante sea el receptor. Ver §3.14 |
| `resolver_destinatario_notificacion(text, uuid)` | `anon, authenticated, postgres, service_role` | Flagueada (WARN); misma clase, pero el control real **no** es `es_admin()` — es un secreto compartido comparado contra `private.notif_config` (el webhook llama sin JWT, solo `anon key`). `EXECUTE` a `anon` es intencional. Ver §3.21 |
| `resolver_destinatarios_correo(text, text, uuid[])` | `authenticated, postgres, service_role` | Flagueada (WARN); misma clase que las RPC de negocio — el control real es `es_admin()` internamente. `EXECUTE` revocado de `public` **y** `anon` explícitamente (funciones nuevas auto-otorgan a `anon` además de `public`; el `revoke all from public` solo no basta). Ver §3.21 |
| `mi_notif_email_habilitado()` | `authenticated, postgres, service_role` | Flagueada (WARN); mismo patrón, pero sin parámetros — deriva el `usuario_id` de `auth.uid()` internamente, así que estructuralmente no puede leer la fila de otro usuario (a diferencia de `resolver_destinatario_notificacion`, que recibe `p_usuario_id` explícito pero está gateada por secreto). `EXECUTE` a `anon` deliberadamente NO otorgado — requiere sesión. Ver §3.21 |

El advisor `authenticated_security_definer_function_executable` (WARN) marca las cinco RPC de negocio porque un usuario autenticado puede llamarlas vía `/rest/v1/rpc/…`. **No es un bypass:** cada RPC de negocio valida `IF NOT public.es_admin() THEN RAISE EXCEPTION 'No autorizado'` internamente, así que un autenticado no-admin recibe `No autorizado` (P0001 → 400).

**Trampa importante (no la ignores):** el admin **es** un usuario `authenticated` y, como este proyecto NO usa `service_role`, las rutas de admin invocan estas RPC con el **JWT del propio admin**. Revocar `EXECUTE … from authenticated` sobre las cinco RPC de negocio **rompería los endpoints de admin**.

> **Revocar `EXECUTE` de `es_admin()` sobre `anon` o `authenticated` rompería el feed.** Las expresiones de policy RLS se evalúan en contexto del **rol que llama**, no del owner; el ACL de `EXECUTE` se chequea contra ese rol (`SECURITY DEFINER` solo cambia los privilegios *dentro* del cuerpo, no quién puede invocarla). Como la policy RESTRICTIVE `publicacion_oculta_bloqueadas` y las policies de `solicitud_revista` llaman a `es_admin()` en cada operación, **todo rol cubierto por esas policies necesita `EXECUTE` sobre `es_admin()`**:
> - `anon` lo necesita para leer `publicacion`/`feed_publicaciones`. Sin el grant, un visitante sin sesión recibe `permission denied for function es_admin (42501)` y **el feed devuelve cero filas**.
> - `authenticated` lo necesita por la misma razón. **No revocar `execute on function public.es_admin() from authenticated`** — reintroduciría exactamente este bug para los usuarios logueados.

Las cinco RPC de negocio (`aceptar_solicitud`, `rechazar_solicitud`, `bloquear_publicacion`, `descartar_reporte`, `retirar_articulo`) **conservan** el grant a `authenticated`: excepción documentada e intencional (el control real es el `es_admin()` interno). Sacarlas de `authenticated` exigiría un rol Postgres `admin` dedicado + claim JWT — fuera del alcance actual.

### 7.1b Aprendizaje de hardening — grants de columna para UPDATE

> **Una policy RLS de UPDATE no limita qué columnas se pueden modificar.** La policy restringe las *filas* que el rol puede actualizar (vía `USING`/`WITH CHECK`), pero si el rol conserva el grant de UPDATE sobre la tabla completa, puede alterar cualquier columna de esas filas vía PostgREST. Para permitir editar únicamente un campo (p. ej. un flag como `leido`) es necesario, además de la policy de fila, **revocar el UPDATE de tabla y hacer `GRANT UPDATE (columna)` al rol**. Sin ese paso, la protección de filas no protege columnas.
>
> **Aplicado a `mensaje`:** `REVOKE UPDATE ON public.mensaje FROM anon, authenticated` + `GRANT UPDATE (leido) ON public.mensaje TO authenticated`. El grant de columna prevalece sobre el revoke de tabla para esa columna específica; `enviar_mensaje` (SECURITY DEFINER, owner) no se ve afectado.

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
- **Pausa por inactividad:** en el plan free el proyecto se pausa tras un período sin uso; más de 90 días pausado lo vuelve irrecuperable. El job de `pg_cron` corre **una vez al mes**, por lo que aporta poca actividad para mantener el proyecto vivo; conviene asegurar actividad adicional y realizar respaldos.
- Los datos de prueba se cargaron con SQL directo (no como migración).

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

*Vitrina · Especificaciones de BD y Conexión al Backend*