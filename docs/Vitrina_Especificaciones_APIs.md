# Especificaciones de la API
## Portafolio Digital · Vitrina

| Campo | Detalle |
|---|---|
| Base de datos | Supabase (proyecto `archicom`, ref `fdfbyhjwnbteccagulxb`) |
| Documentos relacionados | `Vitrina_BD_Conexion_Backend.md` (esquema + conexión), `Vitrina_Pantallas_Componentes.md` (pantallas/UI) |

> Este documento es el **contrato de la API**: rutas, métodos, parámetros, cuerpos, respuestas, permisos y errores de cada endpoint. La API es la que Supabase (PostgREST) expone automáticamente a partir del esquema, más las funciones RPC y la API de Storage. La autorización la aplican las políticas RLS ya desplegadas.
>
> Las revistas se crean y publican únicamente vía el job `pg_cron` (ver `Vitrina_BD_Conexion_Backend.md` §9); no hay endpoint de API para eso. Las solicitudes se postulan siempre a la edición activa (la única en `borrador`). Las RPC de curación las puede llamar **cualquier administrador**. La tabla `revista` no tiene `editor_id`.

---

## 1. Información general

| Aspecto | Valor |
|---|---|
| Base REST | `https://fdfbyhjwnbteccagulxb.supabase.co/rest/v1` |
| Base Auth | `https://fdfbyhjwnbteccagulxb.supabase.co/auth/v1` |
| Base Storage | `https://fdfbyhjwnbteccagulxb.supabase.co/storage/v1` |
| Base RPC | `https://fdfbyhjwnbteccagulxb.supabase.co/rest/v1/rpc` |
| Formato | JSON (`Content-Type: application/json`) |

### Cabeceras requeridas

```http
apikey: <publishable_key>
Authorization: Bearer <access_token | publishable_key>
Content-Type: application/json
```

- `apikey` siempre presente (la clave pública del proyecto).
- `Authorization`: con sesión activa, el JWT del usuario (`access_token`); sin sesión, se repite la clave pública (rol `anon`).
- El JWT es lo que permite a la base de datos resolver `auth.uid()` y aplicar las políticas RLS.

---

## 2. Convenciones (PostgREST)

| Operación | Sintaxis | Ejemplo |
|---|---|---|
| Seleccionar columnas | `?select=` | `?select=id,titulo,tipo` |
| Filtrar (igualdad) | `col=eq.valor` | `?tipo=eq.poema` |
| Filtrar (texto) | `col=ilike.*texto*` | `?titulo=ilike.*río*` |
| Filtrar (en lista) | `col=in.(a,b)` | `?tipo=in.(poema,dibujo)` |
| Ordenar | `?order=col.dir` | `?order=creado_en.desc` |
| Paginar (parámetros) | `?limit=&offset=` | `?limit=10&offset=20` |
| Paginar (cabecera) | `Range: desde-hasta` | `Range: 0-9` |
| Incluir conteo total | `Prefer: count=exact` | (devuelve `Content-Range`) |
| Devolver fila creada | `Prefer: return=representation` | (en POST/PATCH) |
| Insertar evitando duplicados | `Prefer: resolution=merge-duplicates` | (upsert) |
| Recursos anidados | `?select=*,relacion(campos)` | ver detalle de publicación |

### Códigos de estado

| Código | Significado |
|---|---|
| `200 OK` | Lectura correcta, o escritura con `return=representation` |
| `201 Created` | Inserción correcta |
| `204 No Content` | Escritura correcta sin cuerpo de respuesta |
| `400 Bad Request` | Cuerpo inválido o excepción lanzada por una función (`raise exception`) |
| `401 Unauthorized` | Falta el JWT o es inválido |
| `403 Forbidden` | La RLS deniega la escritura (código `42501`) |
| `409 Conflict` | Violación de restricción única (código `23505`) |

> En **lecturas**, la RLS no devuelve `403`: simplemente filtra las filas no visibles y responde `200` con lo permitido.

### Formato de error

```json
{
  "code": "23505",
  "details": "Key (publicacion_id, revista_id)=(...) already exists.",
  "hint": null,
  "message": "duplicate key value violates unique constraint \"solicitud_revista_publicacion_id_revista_id_key\""
}
```

Las excepciones de las funciones RPC llegan con `code` `P0001` y el `message` definido (p. ej. `No autorizado`).

---

## 3. Autenticación (Auth API)

La capa Next **NO expone los endpoints crudos de GoTrue** (`/auth/v1/*`) al cliente. Toda la autenticación pasa por **Route Handlers propios** bajo `/api/auth/*` que envuelven `supabase.auth.*` con `@supabase/ssr`. Esto es obligatorio: el `signInWithPassword`/`signOut` ejecutado en el servidor es lo que **escribe y limpia las cookies de sesión** en la respuesta (footgun #1 de `@supabase/ssr`). El cliente nunca maneja `access_token`/`refresh_token` directamente; viven en cookies HttpOnly.

Todos responden con el envelope uniforme: éxito `{ "data": ... }`, error `{ "error": { "code", "message" } }`. Los errores de Supabase Auth se mapean en `handleError`: `400 → auth_error/400`, `422 → validation_error/400`, `429 → rate_limit/429`, resto → `internal_error/500`.

| Operación | Método | Ruta | Cuerpo |
|---|---|---|---|
| Registro | `POST` | `/api/auth/signup` | `{ "email", "password", "nombre" }` |
| Reenviar confirmación | `POST` | `/api/auth/resend` | `{ "email" }` |
| Iniciar sesión | `POST` | `/api/auth/login` | `{ "email", "password" }` |
| Cerrar sesión | `POST` | `/api/auth/logout` | — |
| Usuario actual + perfil | `GET` | `/api/auth/me` | — |
| Cambiar contraseña | `POST` | `/api/auth/change-password` | `{ "currentPassword", "newPassword" }` |

> El refresco de sesión se hace de forma transparente en `proxy.ts` (patrón `updateSession` de `@supabase/ssr`), no por un endpoint. No hay endpoint de "recuperar contraseña" expuesto en esta capa.

### 3.1 `POST /api/auth/signup` — registro

**Autenticación:** ninguna (endpoint público).

**Cuerpo de la solicitud:**

```json
{ "email": "ana@uni.mx", "password": "Secreta123!", "nombre": "Ana Ruiz" }
```

- `email`: string, requerido, ≤ 254 caracteres.
- `password`: string, requerido, 8–72 caracteres.
- `nombre`: string, requerido, ≤ 50 caracteres. Se guarda en `raw_user_meta_data`; el trigger `handle_new_user` lo usa para crear el perfil en `usuario`. El rol inicial siempre es `usuario`.

**Respuesta 201 Created:**

```json
{ "data": { "user": { "id": "uuid", "email": "ana@uni.mx" }, "needsConfirmation": true } }
```

> Con la confirmación de email activada, `signUp` **nunca** devuelve sesión: ni para una cuenta nueva ni para un email ya registrado (este último es un señuelo anti-enumeración). `needsConfirmation: true` (`session === null`) es la señal de que el usuario debe confirmar por email, y **no filtra** si el email ya existía. El correo de confirmación apunta a `${SITE_URL}/auth/callback`.

**Errores:** faltan campos o exceden longitud → `400 validation_error`; errores de Auth → mapeados por `handleError`.

### 3.2 `POST /api/auth/resend` — reenviar email de confirmación

**Autenticación:** ninguna (endpoint público).

**Cuerpo:** `{ "email": "ana@uni.mx" }` (requerido).

**Respuesta 200 OK:** `{ "data": { "sent": true } }`

> Reenvía el correo de confirmación de registro (`type: "signup"`). Supabase Auth aplica **rate-limit** (`429 → rate_limit`) y no revela si la dirección ya está registrada/confirmada, así que es seguro exponerlo. Falta `email` → `400 validation_error`.

### 3.3 `POST /api/auth/login` — iniciar sesión

**Autenticación:** ninguna (endpoint público). **Escribe las cookies de sesión** en la respuesta.

**Cuerpo:** `{ "email", "password" }` (ambos requeridos).

**Respuesta 200 OK:**

```json
{ "data": { "user": { "id": "uuid", "email": "ana@uni.mx" } } }
```

**Errores:** faltan campos → `400 validation_error`; credenciales inválidas → `400 auth_error`; demasiados intentos → `429 rate_limit`.

### 3.4 `POST /api/auth/logout` — cerrar sesión

**Autenticación:** sesión válida. **Limpia las cookies de sesión** en la respuesta.

**Cuerpo:** ninguno.

**Respuesta 200 OK:** `{ "data": null }`

### 3.5 `GET /api/auth/me` — usuario actual + perfil

**Autenticación:** sesión válida (cookie `@supabase/ssr`). Sin sesión → 401.

**Respuesta 200 OK:**

```json
{ "data": {
  "user": { "id": "uuid", "email": "ana@uni.mx" },
  "perfil": { "id": "uuid", "nombre": "Ana Ruiz", "rol": "usuario",
              "institucion": null, "carrera": null, "ciudad": null,
              "notif_email_habilitado": true, "creado_en": "2026-01-01T00:00:00Z" }
} }
```

- `user`: objeto de `auth.getUser()` (validado contra el servidor de Auth).
- `perfil`: fila de `usuario` (`id, nombre, rol, institucion, carrera, ciudad, notif_email_habilitado, creado_en`). `ciudad` es texto libre y opcional (ver `Vitrina_BD_Conexion_Backend.md` §3.19). `notif_email_habilitado` es la preferencia de notificaciones por correo (booleano, default `true`, campo privado — solo visible en el perfil propio; ver §3.21).

**Errores:** sin sesión → `401 unauthorized`.

### 3.6 `POST /api/auth/change-password` — cambiar la contraseña propia

Endpoint de la capa Next (no es REST crudo de Supabase). Permite al usuario autenticado cambiar su contraseña **verificando la actual**.

**Autenticación:** sesión válida (cookie `@supabase/ssr`). Sin sesión → 401.

**Cuerpo de la solicitud:**

```json
{ "currentPassword": "ClaveActual123!", "newPassword": "NuevaClave123!" }
```

- `currentPassword`: string, requerido. Se re-valida con `signInWithPassword` antes de actualizar — `updateUser({ password })` por sí solo NO verifica la clave anterior.
- `newPassword`: string, requerido, 8–72 caracteres, debe ser distinta de `currentPassword`.

**Respuesta 200 OK:**

```json
{ "data": { "success": true } }
```

**Errores:**

| Caso | Código | Cuerpo |
|---|---|---|
| Falta `currentPassword`/`newPassword`, `newPassword` < 8 o > 72, o igual a la actual | `400` | `{ "error": { "code": "validation_error", "message": "…" } }` |
| Contraseña actual incorrecta | `400` | `{ "error": { "code": "validation_error", "message": "La contraseña actual es incorrecta." } }` |
| Sin sesión | `401` | `{ "error": { "code": "unauthorized", "message": "No autenticado" } }` |

> La confirmación de la nueva contraseña (campo "confirmar") se valida en el cliente; el backend solo recibe `currentPassword` y `newPassword`.

---

## 4. Recursos REST

> **Importante (transporte real):** el cliente **NO** llama a PostgREST crudo (`/publicacion`, `/like`, `/rpc/...`). Toda mutación y toda lectura que el cliente pagina/refresca pasa por **Route Handlers propios** bajo `/api/*` (JWT del usuario vía `@supabase/ssr`, envelope uniforme `{ data }` / `{ error }`). Las lecturas públicas de página se sirven por **SSR** desde `lib/data/*` (Server Components), sin endpoint REST. Las rutas de esta sección son las reales de la app, no las de PostgREST.

Las operaciones disponibles y quién puede ejecutarlas se derivan de las políticas RLS. La columna "Permiso" resume ese efecto.

### 4.1 `usuario` — perfiles

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| `GET` | (SSR) `lib/data/perfil.ts` | Público | Leer un perfil público desde un Server Component; **no hay endpoint REST** |
| `GET` | `/api/auth/me` | Sesión propia | Perfil propio + datos de auth (ver §3.5) |
| `GET` | `/api/buscar?tipo=usuario` | Público | Buscar perfiles (ver §9) |
| `PATCH` | `/api/perfil` | Solo el propio | Editar `nombre`, `institucion`, `carrera`, `ciudad` (cada uno ≤ 50 chars) y/o `notif_email_habilitado` (booleano). El `id` sale de la sesión |

**Editar el perfil propio**

```http
PATCH /api/perfil
{ "nombre": "Ana Ruiz", "institucion": "UNAM", "carrera": "Biología", "ciudad": "León",
  "notif_email_habilitado": false }
```

Responde `{ data: <fila usuario con id, nombre, rol, institucion, carrera, ciudad, notif_email_habilitado, creado_en> }`. Campos opcionales; se actualizan solo los presentes (atómico si se envían varios a la vez). `notif_email_habilitado` que no sea booleano (p. ej. el string `"true"`) → `400 validation_error` (`"notif_email_habilitado debe ser verdadero o falso"`).

> La fila se crea automáticamente al registrarse (trigger `handle_new_user`); no hay `POST`. El `id` coincide con `auth.users.id`.

### 4.2 `publicacion` — creaciones

Endpoints: [/api/publicaciones](app/api/publicaciones/route.ts) y `/api/publicaciones/[id]`. Las etiquetas se gestionan en `/api/publicaciones/[id]/tags` (§4.6).

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/api/publicaciones` | Público | Feed paginado. Query: `tipo`, `area`, `limit` (1–50, def. 10), `offset` (≥0). Sin `area` lee la vista `feed_publicaciones`; con `area` hace join a `tag` con `!inner`. Responde `{ data: { publicaciones } }` |
| `GET` | `/api/publicaciones/[id]` | Público | Ver una publicación con relaciones (autor, comentarios, tags) |
| `POST` | `/api/publicaciones` | Autor autenticado | Crear (`autor_id` = sesión). Responde `{ data: { publicacion } }` (201) |
| `PATCH` | `/api/publicaciones/[id]` | Solo el autor (RLS) | Editar; **404** si no existe o no es visible |
| `DELETE` | `/api/publicaciones/[id]` | Autor **o** administrador | Eliminar (RLS: `eliminar_propio` OR `admin_elimina`; cascade limpia comentarios/likes/tags/artículos/solicitudes; limpia el archivo en Storage best-effort) |

**Crear**

```http
POST /api/publicaciones
{ "titulo": "Mi investigación", "resumen": "Resumen...", "tipo": "investigacion",
  "archivo_url": "https://.../archivo.pdf",
  "archivo_thumbnail_url": "https://.../archivo-thumb.jpg",
  "chat_habilitado": false }
```

> **`autor_id` siempre sale de la sesión** (`auth.getUser()`), nunca del body. La capa Next lo ignora si viene en el payload.

> **`archivo_thumbnail_url` (string, opcional)** — URL pública (Storage) de una miniatura JPEG generada **client-side** (`pdfjs-dist`, página 1 del PDF) antes del submit. Solo aplica cuando `archivo_url` es un PDF; se omite para imágenes (JPG/PNG, donde `archivo_url` ya es la miniatura) y para publicaciones sin archivo. Sin validación de formato en el servidor (mismo trato que `archivo_url`: se confía en la respuesta de `POST /api/storage/upload`, no es input arbitrario del cliente). En `PATCH /api/publicaciones/{id}` se acepta el mismo campo (string o `null` para limpiarlo) — el formulario de edición lo envía explícitamente a `null` cuando el archivo se reemplaza por uno sin miniatura (imagen, o PDF cuyo render client-side falló), para no dejar una miniatura obsoleta.

> **`chat_habilitado` (boolean, opcional, default `false`)** — controla si el chat RAG está disponible para esta publicación. Independiente del indexado: los embeddings de un PDF se generan siempre (incondicional), este flag solo decide si `POST /api/publicaciones/{id}/chat` acepta preguntas. En `PATCH /api/publicaciones/{id}` se acepta el mismo campo; el formulario de edición lo envía siempre de forma explícita (nunca omitido) para poder apagarlo, no solo encenderlo. Valor no booleano → `400 validation_error` (`"chat_habilitado debe ser boolean"`).

**Recomendar una obra de terceros** (`tipo: "recomendacion"`)

```http
POST /api/publicaciones
{ "titulo": "Cien años de soledad", "resumen": "Por qué la recomiendo...",
  "tipo": "recomendacion",
  "obra_autor_externo": "Gabriel García Márquez",
  "url_externa": "https://ejemplo.com/obra" }
```

Validación de la capa Next (`400 validation_error` si falla):

- `tipo` debe pertenecer al enum; un `tipo` inválido devuelve **400**.
- Para `recomendacion`: `obra_autor_externo` es **requerido** (no vacío) y `url_externa` debe ser una **URL http(s) válida**.
- Para cualquier **otro** tipo: `url_externa` es **opcional**, pero si se envía debe ser una **URL http(s) válida**; y se requiere **al menos uno** de `archivo_url` o `url_externa` (si faltan ambos → 400 `Agrega un archivo o un enlace`).
- `obra_autor_externo` solo se persiste para `recomendacion`. `url_externa` se persiste para cualquier tipo cuando se envía.
- Límites: `titulo` ≤ 150 caracteres, `resumen` ≤ 700.

**Detalle con autor, comentarios y etiquetas** (recursos anidados)

```http
GET /api/publicaciones/{id}
```

> El handler resuelve internamente el join anidado (`getPublicacion`): autor (`usuario`), `comentario` y `publicacion_tag → tag`. La relación con `tag` pasa por la tabla puente `publicacion_tag` (muchos-a-muchos).

### 4.3 `feed_publicaciones` — vista del feed (solo lectura)

La vista `feed_publicaciones` (conteos de likes y comentarios) **no se consume directo**: se lee por SSR (`lib/data/feed.ts`) en Server Components, y el cliente la pagina vía `GET /api/publicaciones` (§4.2).

```http
GET /api/publicaciones?limit=10&offset=0
GET /api/publicaciones?tipo=recomendacion
```

> La vista expone `obra_autor_externo` y `url_externa` para las recomendaciones (la atribución de la obra de terceros). Para el resto de tipos vienen `null`.

> **Filtro por área de conocimiento:** la vista no expone los tags. El filtro por disciplina se hace con `GET /api/publicaciones?area=Biología`, que internamente hace join a `tag` con `!inner` (`getPublicacionPorArea`). Ver §4.2 y §4.6.

Respuesta (cada elemento):

```json
{ "id": "uuid", "autor_id": "uuid", "autor_nombre": "María García",
  "titulo": "...", "resumen": "...", "archivo_url": "...", "archivo_thumbnail_url": null, "tipo": "investigacion",
  "creado_en": "2026-06-03T...", "likes": 2, "comentarios": 2 }
```

### 4.4 `comentario`

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/api/comentarios?publicacion_id={id}` | Público | Listar comentarios de una publicación (flat) |
| `POST` | `/api/comentarios` | Usuario autenticado | Comentar o responder (`autor_id` = sesión) |
| `DELETE` | `/api/comentarios/{id}` | Solo el autor | Eliminar comentario propio (cascade elimina sus respuestas) |

**POST `/api/comentarios` — payload**

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `publicacion_id` | `uuid` | Sí | FK hacia `publicacion.id` |
| `contenido` | `string` | Sí | Máximo 250 caracteres |
| `responde_a` | `uuid` | No | UUID del comentario al que se responde. Omitir para comentario raíz |

`autor_id` NUNCA se acepta en el body; se deriva siempre de `supabase.auth.getUser()`.

**Validaciones y códigos de respuesta para `responde_a`:**

| Condición | Status | Code |
|---|---|---|
| `responde_a` no encontrado en la BD | 400 | `validation_error` |
| `responde_a` pertenece a otra publicación | 400 | `validation_error` |
| Éxito (raíz o respuesta) | 201 | — |

**Re-anclaje a raíz (depth-2 invariant):** si `responde_a` apunta a un comentario que ya es respuesta (su propio `responde_a` no es null), el handler re-ancora automáticamente al comentario raíz de ese hilo antes de insertar. El campo `responde_a` almacenado en la fila nueva siempre apunta al raíz.

### 4.5 `like`

> En SQL crudo la tabla es `"like"` (palabra reservada); el handler usa `.from('like')` con normalidad.

Endpoint: [/api/likes](app/api/likes/route.ts).

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/api/likes?publicacion_id={id}` | Público (like es lectura pública) | Lista quién dio like, ordenada por `nombre` asc (la tabla `like` no tiene timestamp). Responde `{ data: Liker[] }` |
| `POST` | `/api/likes` | Usuario autenticado | Dar like. Body `{ publicacion_id }`; `usuario_id` = sesión. Responde `{ data: null }` (201) |
| `DELETE` | `/api/likes?publicacion_id={id}` | Solo el propio | Quitar like; `usuario_id` = sesión. Responde `{ data: null }` |

`Liker` DTO: `{ id, nombre, institucion?: string | null }` — campos públicos del perfil (join `like → usuario`, sin `email`/`rol`). La tabla `like` solo tiene `id, publicacion_id, usuario_id` (sin `creado_en`). Alimenta el modal flotante "Le gustó a" del detalle de publicación (ver Pantallas). Restricción `UNIQUE (publicacion_id, usuario_id)`: un segundo like del mismo usuario devuelve `409`. El conteo agregado sigue viajando en la vista `feed_publicaciones` (campo `likes`) y en el detalle.

### 4.6 `tag` y `publicacion_tag`

Catálogo de tags: [/api/tags](app/api/tags/route.ts) y `/api/tags/[id]`. Puente publicación↔tag: `/api/publicaciones/[id]/tags`.

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/api/tags` | Público | Listar etiquetas. Responde `{ data: { tags } }` |
| `POST` | `/api/tags` | Solo administrador | Crear tag. Body `{ nombre, area }` (ambos requeridos). `{ data: { tag } }` (201) |
| `PATCH` | `/api/tags/[id]` | Solo administrador | Editar `nombre` y/o `area` (al menos uno) |
| `DELETE` | `/api/tags/[id]` | Solo administrador | Eliminar tag (204) |
| `POST` | `/api/publicaciones/[id]/tags` | Autor de la publicación | Asignar etiqueta. Body `{ tag_id }` (201) |
| `DELETE` | `/api/publicaciones/[id]/tags?tag_id={tid}` | Autor de la publicación | Quitar etiqueta |

### 4.7 `revista` y `revista_articulo`

> Las revistas **no se crean ni se publican** vía API: el job `pg_cron` `publicar_revista_mensual` crea el borrador y publica la edición el día 1 de cada mes (13:00 UTC-6; ver `Vitrina_BD_Conexion_Backend.md` §9). La API solo lee revistas, ajusta metadatos de la edición activa y permite la curación manual de artículos.

Endpoints: [/api/revistas](app/api/revistas/route.ts), `/api/revistas/[id]` y `/api/revistas/[id]/articulos`.

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/api/revistas` | Público | Listar revistas. Query `estado` opcional (p. ej. `borrador` = edición activa). `{ data: { revistas } }` |
| `GET` | `/api/revistas/[id]` | Público | Leer una revista con sus artículos y autores |
| `PATCH` | `/api/revistas/[id]` | Solo administrador | Editar metadatos: `titulo` (≤ 65 chars), `volumen` (< 9999). **No** se usa para publicar |
| `DELETE` | `/api/revistas/[id]` | Solo administrador | Eliminar la revista (RLS `admin_gestiona`; cascade limpia `revista_articulo` y `solicitud_revista`). `{ data: null }` |
| `POST` | `/api/revistas/[id]/articulos` | Solo administrador | Añadir artículo. Body `{ publicacion_id, orden? }` (201) |
| `PATCH` | `/api/revistas/[id]/articulos` | Solo administrador | **Reordenar en lote**. Body `{ articulos: [{ publicacion_id, orden }] }`; devuelve `{ data: { articulos } }` en el nuevo orden |
| `DELETE` | `/api/revistas/[id]/articulos?publicacion_id={pid}` | Solo administrador | Quitar artículo vía RPC `retirar_articulo` — **atómico**: borra el `revista_articulo` **y** marca la solicitud asociada como `retirada`. Body opcional `{ motivo }`. Responde 204 |

> El campo `estado` lo gestiona el sistema: pasa de `borrador` a `publicada` solo en el job mensual. Un `PATCH` que intente fijar `estado = publicada` manualmente no forma parte del flujo previsto.

**Obtener la edición activa**

```http
GET /api/revistas?estado=borrador
```

**Leer una revista con sus artículos y autores**

```http
GET /api/revistas/{id}
```

### 4.8 `solicitud_revista`

> El cambio de estado (aceptar/rechazar) **no** se hace por `PATCH` directo: usa las funciones RPC de §5, que garantizan la atomicidad. El cierre mensual (día 1) rechaza automáticamente las que sigan `pendiente`.

Endpoints: [/api/solicitudes](app/api/solicitudes/route.ts) y `/api/solicitudes/mias`.

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| `POST` | `/api/solicitudes` | Autor de la publicación | Postular su obra a la edición activa (estado `pendiente`). `{ data: { solicitud } }` (201) |
| `GET` | `/api/solicitudes/mias` | Solicitante | Ver mis solicitudes y su estado |
| `GET` | `/api/solicitudes?revista_id={id}&estado=pendiente` | Cualquier administrador | Ver solicitudes (con joins a `revista` y `publicacion`); filtros `revista_id`/`estado` opcionales |

**Postular una obra a la revista del mes**

El body lleva **solo** `publicacion_id` y `mensaje` opcional. El `revista_id` lo resuelve el servidor (la edición activa, vía `getRevistaActiva`) y `solicitante_id` sale de la sesión.

```http
POST /api/solicitudes
{ "publicacion_id": "{pid}", "mensaje": "Me gustaría aportar este trabajo." }
```

> El autor solo puede postular **su propia** publicación (lo exige la RLS). Si no hay revista abierta ese mes → **404** `{ code: "no_active_revista" }`. Restricción `UNIQUE (publicacion_id, revista_id)`: reenviar la misma obra a la misma edición devuelve `409`. Como cada mes es una revista distinta, la obra puede postularse de nuevo en ediciones futuras.

---

## 5. Funciones RPC (curación de solicitudes)

Las RPC `SECURITY DEFINER` no se llaman por `/rpc/*` desde el cliente: la app las invoca server-side desde route handlers que validan admin con `requireAdmin`. El `id` de la solicitud va en la **ruta**; el body lleva solo `respuesta` (opcional).

| Acción | Método | Ruta (app) | RPC interna | Permiso |
|---|---|---|---|---|
| Aceptar | `POST` | `/api/solicitudes/[id]/aceptar` | `aceptar_solicitud` | Cualquier administrador |
| Rechazar | `POST` | `/api/solicitudes/[id]/rechazar` | `rechazar_solicitud` | Cualquier administrador |

> Otras RPC `SECURITY DEFINER` se invocan igual desde sus handlers: `retirar_articulo` (§4.7), `bloquear_publicacion` y `descartar_reporte` (§5b).

### Aceptar — `POST /api/solicitudes/[id]/aceptar`

Acepta una solicitud de forma transaccional: actualiza la solicitud (`estado`, `revisor_id`, `resuelto_en`) **e** inserta la publicación en `revista_articulo`.

```http
POST /api/solicitudes/{id}/aceptar
{ "respuesta": "Aprobado, encaja con la edición." }
```

- **Respuesta:** `204 No Content` (la RPC retorna `void`).
- **Errores:** `400` (P0001) con `message` = `No autorizado`, `Solicitud no encontrada` o `La solicitud ya fue resuelta`.

### Rechazar — `POST /api/solicitudes/[id]/rechazar`

```http
POST /api/solicitudes/{id}/rechazar
{ "respuesta": "Gracias, no aplica esta edición." }
```

- **Respuesta:** `204 No Content`.
- **Error:** `400` (P0001) con `message` = `No autorizado`.

> `respuesta` es opcional en ambas (default `null`).

---

## 5b. Endpoints de Moderación (`/api/reportes`)

Todos siguen el envelope uniforme: éxito `{ data: ... }`, error `{ error: { code, message } }`.

### `POST /api/reportes` — Crear reporte

**Permiso:** usuario autenticado.

**Body:**
```json
{ "publicacion_id": "uuid", "motivo": "spam", "detalle": "Texto opcional..." }
```

| Campo | Tipo | Requerido | Validación |
|---|---|---|---|
| `publicacion_id` | uuid | sí | presente |
| `motivo` | MotivoReporte | sí | uno de los 4 valores del enum |
| `detalle` | string | no | máx. 500 caracteres |

> `reportante_id` SIEMPRE viene de la sesión (`auth.uid()`), NUNCA del body.

**Respuestas:**

| Código | Condición | Body |
|---|---|---|
| `201 Created` | OK | `{ data: { reporte: Reporte } }` |
| `400 Bad Request` | `motivo` inválido o ausencia de `publicacion_id` | `{ error: { code: "validation_error", message: "..." } }` |
| `401 Unauthorized` | Sin sesión | `{ error: { code: "unauthorized", ... } }` |
| `409 Conflict` | El mismo usuario ya reportó esta publicación | `{ error: { code: "23505", ... } }` |

---

### `GET /api/reportes` — Listar reportes (admin)

**Permiso:** administrador.

**Query params:** `?estado=pendiente|revisado|descartado` (opcional).

**Respuesta 200:**
```json
{ "data": { "reportes": [ /* ReporteConDetalle[] */ ] } }
```

---

### `POST /api/reportes/[id]/bloquear` — Bloquear publicación (admin)

**Permiso:** administrador.

**Body (opcional):** `{ "respuesta": "Texto..." }` — aceptado pero no persiste (sin columna en reporte).

**Respuestas:**

| Código | Condición |
|---|---|
| `204 No Content` | OK — reporte `revisado`, `publicacion.bloqueada = true` |
| `400 Bad Request` | RPC P0001 (No autorizado / Reporte no encontrado / El reporte ya fue resuelto) |
| `401/403` | Sin sesión o no es administrador |

---

### `POST /api/reportes/[id]/descartar` — Descartar reporte (admin)

**Permiso:** administrador.

**Respuestas:**

| Código | Condición |
|---|---|
| `204 No Content` | OK — reporte `descartado`, `publicacion.bloqueada` sin cambios |
| `400 Bad Request` | RPC P0001 |
| `401/403` | Sin sesión o no es administrador |

---

## 6. API de Storage (bucket `publicaciones`)

Lectura pública; escritura restringida a la carpeta `{user_id}/...` de cada usuario.

| Operación | Método | Ruta |
|---|---|---|
| Subir archivo | `POST` | `/storage/v1/object/publicaciones/{user_id}/{archivo}` |
| URL pública | `GET` | `/storage/v1/object/public/publicaciones/{ruta}` |
| Descargar (autenticado) | `GET` | `/storage/v1/object/authenticated/publicaciones/{ruta}` |
| Eliminar | `DELETE` | `/storage/v1/object/publicaciones/{ruta}` |

**Flujo recomendado**

1. Subir el archivo a `{user_id}/{uuid}-{nombre}`.
2. Obtener su URL pública.
3. Guardar esa URL en `publicacion.archivo_url`.
4. **Si el archivo es un PDF:** generar client-side una miniatura JPEG de su página 1 (`pdfjs-dist`, ver `lib/pdf/generateThumbnail.ts`), subirla igual que el archivo principal (mismo endpoint, segunda llamada) y guardar su URL en `publicacion.archivo_thumbnail_url`. Falla de generación/subida → no bloquea el paso 3, la publicación queda sin miniatura (fallback: ícono genérico en el feed).

> Validar en cliente y servidor: solo PDF e imágenes (JPG, PNG), máximo 10 MB. El nombre de carpeta debe ser el `id` del usuario para cumplir la política de Storage.

**Endpoints propios de la capa Next (envelope uniforme):**

| Método | Ruta | Body | Notas |
|---|---|---|---|
| `POST` | `/api/storage/upload` | `multipart/form-data` (`file`) | Valida MIME (PDF/JPG/PNG) + 10 MB. Sube a `{user.id}/{uuid}.{ext}`. Responde `{ data: { url } }` (201). |
| `DELETE` | `/api/storage` | `{ url }` | Borra un archivo propio del bucket (limpieza de huérfanos: reemplazo al editar / rollback). `401` sin sesión; `400` si la url es inválida; **`403`** si el path no pertenece a la carpeta `{user.id}/` del que llama. Best-effort (RLS por carpeta refuerza). |

> Limpieza de Storage: ver F-004 en `SECURITY_AUDIT.md`. El borrado de una publicación propia limpia su archivo en el handler `DELETE /api/publicaciones/[id]`; el borrado por un admin de obra ajena deja el archivo huérfano (sin `service_role`).

---

## 7. Matriz de permisos (resumen)

| Recurso | Anónimo | Usuario | Administrador |
|---|---|---|---|
| Leer feed / publicaciones / perfiles / revistas | Lectura | Lectura | Lectura |
| Crear / editar publicación propia | — | ✓ | ✓ |
| Comentar / dar like | — | ✓ | ✓ |
| Editar perfil propio | — | ✓ | ✓ |
| Postular obra propia a la revista del mes | — | ✓ | ✓ |
| Ver solicitudes propias | — | ✓ | ✓ |
| Gestionar etiquetas | — | — | ✓ |
| Editar metadatos de la revista activa | — | — | ✓ |
| Curar `revista_articulo` | — | — | ✓ |
| Aceptar / rechazar solicitudes (RPC) | — | — | ✓ (cualquiera) |
| Crear / publicar revistas | — | — | — (automático, `pg_cron`) |
| Reportar una publicación | — | ✓ (1 por pub) | ✓ |
| Leer propios reportes | — | ✓ (solo propios) | ✓ (todos) |
| Bloquear / descartar reportes (RPC) | — | — | ✓ |
| Enviar solicitud de mensaje | — | ✓ | ✓ |
| Aceptar / rechazar solicitud de mensaje | — | ✓ (solo el receptor) | ✓ |

---

## 8. Modelos de datos (DTOs)

| Entidad | Campos |
|---|---|
| `usuario` | `id` uuid · `nombre` text · `email` text · `institucion` text? · `carrera` text? · `rol` `usuario\|administrador` · `creado_en` timestamptz |
| `publicacion` | `id` uuid · `autor_id` uuid · `titulo` text · `resumen` text? · `archivo_url` text? · `archivo_thumbnail_url` text? (miniatura JPEG de PDF, client-side; null para imágenes o PDFs sin re-guardar) · `tipo` `libro\|articulo\|investigacion\|ensayo\|cuento\|poema\|resena\|tesis\|ponencia\|proyecto\|dibujo\|ilustracion\|pintura\|diseno_grafico\|diseno_modas\|fotografia\|infografia\|recomendacion\|otro` · `obra_autor_externo` text? (solo `recomendacion`) · `url_externa` text? (recomendación: requerido; otros tipos: opcional) · `bloqueada` boolean (default false) · `creado_en` timestamptz |
| `comentario` | `id` uuid · `publicacion_id` uuid · `autor_id` uuid · `contenido` text · `creado_en` timestamptz · `responde_a` uuid? (FK self → `comentario.id`, null = raíz) |
| `ComentarioConUsuario` (DTO join) | `Comentario` + `usuario: { id, nombre } \| null` |
| `ComentarioArbol` (DTO árbol) | `ComentarioConUsuario` + `respuestas: ComentarioConUsuario[]` (respuestas directas, siempre presente, puede estar vacío) |
| `like` | `id` uuid · `publicacion_id` uuid · `usuario_id` uuid |
| `tag` | `id` uuid · `nombre` text · `area` text |
| `publicacion_tag` | `publicacion_id` uuid · `tag_id` uuid |
| `revista` | `id` uuid · `titulo` text · `volumen` int · `estado` `borrador\|publicada` · `publicada_en` timestamptz? |
| `revista_articulo` | `revista_id` uuid · `publicacion_id` uuid · `orden` int |
| `solicitud_revista` | `id` uuid · `publicacion_id` uuid · `revista_id` uuid · `solicitante_id` uuid · `revisor_id` uuid? · `estado` `pendiente\|aceptada\|rechazada\|retirada` · `mensaje` text? · `respuesta` text? · `solicitado_en` timestamptz · `resuelto_en` timestamptz? |
| `feed_publicaciones` (vista) | `id` · `autor_id` · `autor_nombre` · `titulo` · `resumen` · `archivo_url` · `archivo_thumbnail_url` · `tipo` · `creado_en` · `likes` int · `comentarios` int |
| `PublicacionCardData` (DTO) | `id` · `titulo` · `resumen` · `tipo` · `nombre_autor` · `autor_id`? · `creado_en`? · `archivo_url`? · `archivo_thumbnail_url`? |
| `UsuarioCardData` (DTO) | `id` · `nombre` · `institucion`? · `carrera`? — never includes `rol`, `email`, `avatar_url` |
| `seguidor` | `seguidor_id` uuid · `seguido_id` uuid · `creado_en` timestamptz |
| `perfil_contadores` (vista) | `usuario_id` uuid · `n_seguidores` int · `n_seguidos` int · `n_publicaciones` int |
| `EstadoSolicitudMensaje` (tipo) | `'pendiente' \| 'aceptada' \| 'rechazada'` |
| `SolicitudMensaje` | `id` uuid · `emisor_id` uuid · `receptor_id` uuid · `estado` EstadoSolicitudMensaje · `creado_en` timestamptz · `resuelto_en` timestamptz? |
| `SolicitudMensajeRecibida` | `id` uuid · `emisor` UsuarioCardData · `creado_en` timestamptz |
| `Seguidor` (DTO) | `seguidor_id` string · `seguido_id` string · `creado_en` string |
| `PerfilConteos` (DTO) | `usuario_id` string · `n_seguidores` number · `n_seguidos` number · `n_publicaciones` number |
| `MotivoReporte` (tipo) | `'contenido_inapropiado' \| 'plagio' \| 'spam' \| 'otro'` |
| `EstadoReporte` (tipo) | `'pendiente' \| 'revisado' \| 'descartado'` |
| `Reporte` (DTO) | `id` uuid · `publicacion_id` uuid · `reportante_id` uuid · `motivo` MotivoReporte · `detalle` text? · `estado` EstadoReporte · `revisor_id` uuid? · `resuelto_en` timestamptz? · `creado_en` timestamptz |
| `ReporteConDetalle` (DTO) | `Reporte` + `publicacion: { id, titulo } \| null` + `reportante: { id, nombre } \| null` |

> `?` indica campo opcional / nulo. Las columnas con valor por defecto (`id`, `creado_en`, `tipo`, `rol`, `estado`, `volumen`) pueden omitirse al insertar.

---

## 9. Buscador global — `GET /api/buscar`

Endpoint público (sin autenticación). Sirve tanto el widget de autocompletado del navbar como la carga incremental de la página `/buscar`.

### Parámetros de consulta

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `q` | string | sí | Término de búsqueda (mínimo 2 caracteres después de trim) |
| `tipo` | `"publicacion"` \| `"usuario"` | no | Ausente → modo autocomplete; presente → modo paginado |
| `offset` | integer ≥ 0 | no | Posición de inicio (solo en modo paginado; ignorado en autocomplete). Default: 0 |

### Motor de búsqueda

- **Publicaciones → full-text search (español).** Vía la RPC `buscar_publicaciones` (BD §3.17): `to_tsvector('spanish', f_unaccent(…))` sobre `busqueda_tsv` (título peso A + **resumen** peso B), con **stemming**, **prefijo** (`término:*`), **multi-palabra** (AND), **accent-insensitive** (`biologia` ≡ `biología`) y **ranking por relevancia** (`ts_rank DESC, creado_en DESC`).
- **Usuarios → trigram (`pg_trgm`).** Vía la RPC `buscar_usuarios` (BD §3.17): substring `LIKE` **OR** `word_similarity`/`<%` sobre `f_unaccent(lower(nombre))` → **typo-tolerante** (`cristofer`→"Cristopher") y **accent-insensitive** (`perez`→"Pérez"), ordenado por similitud.

Ambas RPC son `SECURITY INVOKER` (respetan la RLS del llamante; publicaciones oculta `bloqueada`) y normalizan/sanitizan `q` internamente (query vacía → 0 resultados sin tocar la BD). El **contrato del endpoint no cambia** (mismos parámetros, formas de respuesta y DTOs); solo mejora el motor.

- **Capa semántica (híbrida) — solo página `/buscar` (SSR) y solo logueados.** La sección Publicaciones de `/buscar` usa `buscarPublicacionesHibrido` (BD §3.18): embebe la query (edge `embed`) y fusiona el ranking FTS con el semántico (RPC `match_publicacion_chunks_global`) vía **RRF**, cubriendo recall de contenido de PDFs indexados. Anónimo (o si el embed falla) → FTS. **El endpoint `GET /api/buscar` NO cambia** (sigue FTS/trigram); lo híbrido vive en el data layer SSR. `VerMas` (paginación "Ver más") sigue con FTS y deduplica contra la primera página híbrida.

### Modo A — Autocomplete (sin `tipo`)

Devuelve hasta 6 publicaciones y hasta 6 usuarios en paralelo. No pagina.

**Respuesta 200 OK:**
```json
{
  "data": {
    "publicaciones": [
      { "id": "...", "titulo": "...", "resumen": "...", "tipo": "articulo",
        "nombre_autor": "...", "autor_id": "...", "creado_en": "..." }
    ],
    "usuarios": [
      { "id": "...", "nombre": "...", "institucion": "...", "carrera": "..." }
    ]
  }
}
```

- `publicaciones`: orden por **relevancia** (`ts_rank`, desempate `creado_en desc`), máximo 6 ítems.
- `usuarios`: orden por **similitud** (`word_similarity`, desempate `nombre asc`), máximo 6 ítems.
- Columnas de `usuario` restringidas a `id, nombre, institucion, carrera`. **Nunca** incluye `rol`, `email` ni `avatar_url`.

### Modo B — Paginado (con `tipo`)

Devuelve la siguiente página de 6 ítems para la sección indicada.

**Respuesta 200 OK:**
```json
{
  "data": {
    "items": [ /* mismas formas que en Modo A */ ],
    "hasMore": true
  }
}
```

- `items.length` ≤ 6.
- `hasMore = totalCount > offset + items.length`.

### Errores

| Condición | Status | `code` |
|---|---|---|
| `q` ausente o vacío | 400 | `validation_error` |
| `q` tiene menos de 2 chars (tras trim) | 400 | `validation_error` |
| `tipo` con valor inválido | 400 | `validation_error` |
| Error de Supabase / BD | 500 | `supabase_error` o similar |

---

## 10. Endpoints — Links de perfil

### DTO `UsuarioLink`

```ts
type UsuarioLink = {
  id: string           // uuid
  usuario_id: string   // uuid — owner (equals session uid; never from body)
  etiqueta: string     // display label, max 50 chars
  url: string          // https:// URL
  orden: number        // display position (0-indexed)
  creado_en: string    // ISO 8601 timestamp
}
```

### Reglas de validación (server-side, authoritative)

| Campo | Regla |
|---|---|
| `etiqueta` | Requerida; no vacía después de trim; máx. 50 caracteres |
| `url` | Requerida; debe comenzar con `https://` — rechaza `http:`, `javascript:`, `data:`, rutas relativas y vacío |
| Límite por usuario | Máx. 10 enlaces. El intento número 11 es rechazado antes del INSERT |
| `usuario_id` | Siempre de `supabase.auth.getUser()`; cualquier `usuario_id` en el body es ignorado |

---

### POST /api/perfil/links

Crea un nuevo enlace para el usuario autenticado.

**Autenticación:** sesión válida (cookie `@supabase/ssr`). Sin sesión → 401.

**Cuerpo de la solicitud:**

```json
{
  "etiqueta": "Mi GitHub",
  "url": "https://github.com/usuario",
  "orden": 0
}
```

- `etiqueta`: string, requerido.
- `url`: string, requerido, https-only.
- `orden`: number, opcional, default 0.

**Respuesta 201 Created:**

```json
{
  "data": {
    "id": "<uuid>",
    "usuario_id": "<session-uid>",
    "etiqueta": "Mi GitHub",
    "url": "https://github.com/usuario",
    "orden": 0,
    "creado_en": "<iso>"
  }
}
```

**Errores:**

| Condición | Status | `code` |
|---|---|---|
| Sin sesión | 401 | `unauthorized` |
| `etiqueta` vacía o ausente | 400 | `validation_error` |
| `etiqueta` > 50 chars | 400 | `validation_error` |
| `url` no comienza con `https://` | 400 | `validation_error` |
| Ya tiene 10 enlaces | 400 | `validation_error` |
| Violación de constraint única (23505) | 409 | `23505` |
| RLS deniega escritura (42501) | 403 | `42501` |
| Error interno | 500 | `internal_error` |

---

### PATCH /api/perfil/links  _(reorder)_

Reordena todos los enlaces del usuario autenticado en un solo round-trip.

**Autenticación:** sesión válida. Sin sesión → 401.

**Cuerpo de la solicitud:**

```json
{
  "orden": ["<id-link-3>", "<id-link-1>", "<id-link-2>"]
}
```

- `orden`: array de strings (UUIDs de los enlaces del usuario, en el nuevo orden deseado).
- El servidor recomputa `orden = i` (0-indexed) para cada id en la posición `i`.
- Solo afecta filas propiedad del usuario (RLS).

**Respuesta 200 OK:**

```json
{
  "data": {
    "links": [ /* array de UsuarioLink en el nuevo orden */ ]
  }
}
```

**Errores:**

| Condición | Status | `code` |
|---|---|---|
| Sin sesión | 401 | `unauthorized` |
| `orden` no es array | 400 | `validation_error` |
| `orden.length` > 10 | 400 | `validation_error` |
| Error de BD en algún UPDATE | 500 | `internal_error` |

---

### PATCH /api/perfil/links/[id]

Edita un enlace existente. Solo el propietario puede modificarlo (RLS).

**Autenticación:** sesión válida. Sin sesión → 401.

**Parámetros de ruta:** `id` — UUID del enlace.

**Cuerpo de la solicitud** (todos opcionales; al menos uno recomendado):

```json
{
  "etiqueta": "Nuevo nombre",
  "url": "https://nuevo.ejemplo.com",
  "orden": 2
}
```

**Respuesta 200 OK:**

```json
{
  "data": { /* UsuarioLink actualizado */ }
}
```

**Errores:**

| Condición | Status | `code` |
|---|---|---|
| Sin sesión | 401 | `unauthorized` |
| `etiqueta` vacía (si está presente) | 400 | `validation_error` |
| `etiqueta` > 50 chars (si está presente) | 400 | `validation_error` |
| `url` no https (si está presente) | 400 | `validation_error` |
| Fila no encontrada o RLS bloquea (no es propietario) | 403 | `forbidden` |
| Error interno | 500 | `internal_error` |

---

### DELETE /api/perfil/links/[id]

Elimina un enlace. Solo el propietario puede borrarlo (RLS).

**Autenticación:** sesión válida. Sin sesión → 401.

**Parámetros de ruta:** `id` — UUID del enlace.

**Respuesta 200 OK:**

```json
{ "data": null }
```

**Errores:**

| Condición | Status | `code` |
|---|---|---|
| Sin sesión | 401 | `unauthorized` |
| Fila no encontrada o RLS bloquea (no es propietario) | 403 | `forbidden` |
| Error interno | 500 | `internal_error` |

---

---

## 11. API de Seguidores

### POST /api/seguidores — Seguir a un usuario

**Autenticación:** sesión válida. Sin sesión → 401.

**Body:**
```json
{ "seguido_id": "<uuid>" }
```

**Reglas de validación (400 `validation_error` si falla):**
- `seguido_id` debe estar presente.
- `seguido_id !== session.uid` — el servidor rechaza el auto-follow ANTES del insert. El `check (seguidor_id <> seguido_id)` de la BD es solo defensa en profundidad (error 23514 → 400 `validation_error`).

`seguidor_id` siempre sale de `supabase.auth.getUser()`, nunca del body.

**Respuesta 201 Created:**
```json
{ "data": null }
```

**Errores:**

| Condición | Status | `code` |
|---|---|---|
| Sin sesión | 401 | `unauthorized` |
| Falta `seguido_id` | 400 | `validation_error` |
| Auto-follow (`seguido_id === user.id`) | 400 | `validation_error` |
| Ya sigue a ese usuario (PK duplicada 23505) | 409 | `23505` |
| RLS deniega insert (42501) | 403 | `42501` |
| Error interno | 500 | `internal_error` |

---

### GET /api/seguidores — Listar seguidores o seguidos

Endpoint público (sin sesión).

**Query params:**

| Param | Tipo | Requerido | Descripción |
|---|---|---|---|
| `usuario_id` | uuid | sí | Usuario cuya lista se consulta |
| `tipo` | `"seguidores"` \| `"seguidos"` | no | Default: `"seguidores"` |
| `limit` | int 1–50 | no | Default: 10 |
| `offset` | int ≥ 0 | no | Default: 0 |

- `tipo=seguidores` → usuarios que siguen a `usuario_id`.
- `tipo=seguidos` → usuarios a quienes `usuario_id` sigue.

**Respuesta 200 OK:**
```json
{
  "data": {
    "usuarios": [
      { "id": "...", "nombre": "...", "institucion": "...", "carrera": "..." }
    ]
  }
}
```

**Errores:**

| Condición | Status | `code` |
|---|---|---|
| Falta `usuario_id` | 400 | `validation_error` |
| `tipo` inválido | 400 | `validation_error` |
| Error interno | 500 | `internal_error` |

---

### DELETE /api/seguidores/[id] — Dejar de seguir

`[id]` = `seguido_id` (UUID del usuario a dejar de seguir). `seguidor_id` siempre de la sesión.

**Autenticación:** sesión válida. Sin sesión → 401.

**Respuesta 200 OK:**
```json
{ "data": null }
```

**Errores:**

| Condición | Status | `code` |
|---|---|---|
| Sin sesión | 401 | `unauthorized` |
| Falta `id` en la ruta | 400 | `validation_error` |
| No sigue a ese usuario (edge no existe) | 404 | `not_found` |
| Error interno | 500 | `internal_error` |

---

## 11b. Endpoints de Guardados (`/api/guardados`)

Marcadores **privados** del usuario (contraste con `like`, que es público). `usuario_id` siempre de `auth.getUser()`, nunca del body. La privacidad la garantiza la RLS (ver BD §3.11) — un anónimo no puede leer guardados de nadie. La lista propia se sirve por SSR (`lib/data/guardados.ts → getMisGuardados`), no por un endpoint REST.

### POST /api/guardados — Guardar una publicación

**Autenticación:** sesión válida. Sin sesión → 401.

**Body:**
```json
{ "publicacion_id": "<uuid>" }
```

`usuario_id` siempre sale de `supabase.auth.getUser()`, nunca del body.

**Respuesta 201 Created:**
```json
{ "data": null }
```

**Errores:**

| Condición | Status | `code` |
|---|---|---|
| Sin sesión | 401 | `unauthorized` |
| Falta `publicacion_id` | 400 | `validation_error` |
| Ya está guardada (UNIQUE 23505) | 409 | `23505` |
| RLS deniega insert (42501) | 403 | `42501` |
| Error interno | 500 | `internal_error` |

---

### DELETE /api/guardados/[id] — Quitar de guardados

`[id]` = `publicacion_id` de la publicación guardada. `usuario_id` siempre de la sesión.

**Autenticación:** sesión válida. Sin sesión → 401.

**Respuesta 200 OK:**
```json
{ "data": null }
```

**Errores:**

| Condición | Status | `code` |
|---|---|---|
| Sin sesión | 401 | `unauthorized` |
| Falta `id` en la ruta | 400 | `validation_error` |
| El guardado no existe | 404 | `not_found` |
| Error interno | 500 | `internal_error` |

---

## 12. DTOs adicionales

Añadidos a `lib/types/database.ts`:

| DTO | Campos |
|---|---|
| `Seguidor` | `seguidor_id` uuid · `seguido_id` uuid · `creado_en` string |
| `PerfilConteos` | `usuario_id` uuid · `n_seguidores` number · `n_seguidos` number · `n_publicaciones` number |
| `Guardado` | `id` uuid · `publicacion_id` uuid · `usuario_id` uuid · `creado_en` string |

`PerfilConteos` se obtiene de la vista `perfil_contadores` via `getConteos(usuarioId)` en `lib/data/seguidores.ts`.

`Guardado` es marcador privado; la lista propia (mapeada a `PublicacionCardData`) se obtiene con `getMisGuardados(usuarioId)` y el estado por publicación con `getIsGuardado(publicacionId, usuarioId?)`, ambos en `lib/data/guardados.ts`.

---

## 13. Trending, contador de vistas y CTAs

### 13.1 Trending (`feed_trending`)

La sección "Tendencias" en la home lee la vista `feed_trending` (no un endpoint REST: es una lectura SSR desde `lib/data/trending.ts` vía Server Component).

| Atributo | Detalle |
|---|---|
| Función | `getTrendingFeed({ limit?, offset? })` en `lib/data/trending.ts` |
| Fuente | Vista `feed_trending` (Supabase), order by `score` desc |
| DTO | `FeedPublicacion[]` — MISMO tipo que el feed normal |
| `score` | Columna interna del view; **nunca** se incluye en el DTO ni se envía al cliente |
| Acceso | `anon` y `authenticated` (GRANT SELECT en la vista) |
| Aparece en UI | Solo en la home sin filtros activos (`!area && !tipo`) |

### 13.2 `POST /api/view-count`

Trackea visitas anónimas a publicaciones. Incrementa un contador en cookie HttpOnly del servidor. No requiere autenticación.

| Atributo | Detalle |
|---|---|
| Ruta | `/api/view-count` |
| Método | `POST` (único aceptado) |
| Cuerpo | No requerido |
| Auth | Sin requerimiento — `anon` puede llamarlo |
| Método no permitido | `GET`, `PUT`, `PATCH`, `DELETE` → **405** |

**Comportamiento:**

- Si el visitante está autenticado (JWT válido): responde `{ data: { showBanner: false } }` — sin incremento, sin Set-Cookie.
- Si el visitante es anon: lee cookie `vitrina_views` (default 0), incrementa, escribe `Set-Cookie: vitrina_views={n}; HttpOnly; Path=/; SameSite=Lax`. Responde `{ data: { showBanner: n >= 2 } }`.
- `vitrina_views` es una **cookie de sesión** (sin `Max-Age`/`Expires`).
- El endpoint NUNCA lee owner/auth IDs del body — auth solo desde `supabase.auth.getUser()`.

**Respuesta 200 OK:**
```json
{ "data": { "showBanner": false } }
```
o
```json
{ "data": { "showBanner": true } }
```

**Respuesta 405 (método no permitido):**
Next.js devuelve 405 automáticamente para métodos no definidos en el route handler.

**Error interno 500:**
```json
{ "error": { "code": "internal_error", "message": "Error interno" } }
```

**Cookies:**

| Cookie | HttpOnly | Scope | Descripción |
|---|---|---|---|
| `vitrina_views` | Sí (servidor) | Sesión | Contador de visitas a publicaciones para anon |
| `vitrina_banner_dismissed` | No (cliente) | Sesión | Flag UX: banner ya fue descartado; escrito por JS en dismiss |

---

## 14. Endpoints de Mensajería Directa

Mensajería 1-a-1 privada entre usuarios que se siguen **mutuamente**. `emisor_id`/`autor_id` siempre provienen de `supabase.auth.getUser()`, nunca del body. La seguridad real es la RPC `enviar_mensaje` (SECURITY DEFINER) en la BD; la capa Next realiza pre-validaciones para evitar llamadas innecesarias a la base.

Para el esquema de BD (tablas `conversacion`/`mensaje`, RLS, helper `se_siguen`, vista `bandeja_conversaciones`, Realtime) ver `Vitrina_BD_Conexion_Backend.md` §3.13.

### POST /api/mensajes — Enviar un mensaje

**Autenticación:** sesión válida. Sin sesión → 401.

**Body:**
```json
{ "receptor_id": "<uuid>", "contenido": "Texto del mensaje" }
```

- `receptor_id`: uuid, requerido. No puede ser igual al `user.id` de la sesión.
- `contenido`: string, requerido, 1–2000 caracteres.

`emisor_id` siempre sale de `auth.getUser()`, nunca del body.

**Flujo:** pre-validaciones en la capa Next → llama `supabase.rpc('enviar_mensaje', { p_receptor_id, p_contenido })` → la RPC crea o reutiliza la conversación atómicamente e inserta el mensaje.

**Respuesta 201 Created:**
```json
{ "data": { "mensaje": { "id": "...", "conversacion_id": "...", "emisor_id": "...", "contenido": "...", "leido": false, "creado_en": "..." } } }
```

**Errores:**

| Condición | Status | `code` / `message` |
|---|---|---|
| Sin sesión | 401 | `unauthorized` |
| Falta `receptor_id` | 400 | `validation_error` — "Se requiere receptor_id" |
| `receptor_id` igual al propio usuario | 400 | `validation_error` — "No podés enviarte un mensaje a vos mismo" |
| `contenido` ausente o vacío | 400 | `validation_error` — "Se requiere contenido" |
| `contenido` fuera de rango 1–2000 | 400 | `validation_error` — "El mensaje debe tener entre 1 y 2000 caracteres" |
| RPC P0001 (sin seguimiento mutuo) | 400 | mensaje original de la RPC ("Solo podés enviar mensajes a usuarios que te siguen y a quienes seguís") |
| Otros errores de BD | 500 | `internal_error` |

---

### GET /api/mensajes — Leer mensajes de una conversación

**Autenticación:** sesión válida. Sin sesión → 401.

**Query params:**

| Param | Tipo | Requerido | Descripción |
|---|---|---|---|
| `conversacion_id` | uuid | sí | ID de la conversación |
| `limit` | int 1–50 | no | Default: 20; máximo: 50 |
| `offset` | int ≥ 0 | no | Default: 0 |

**Respuesta 200 OK:**
```json
{ "data": { "mensajes": [ { "id": "...", "conversacion_id": "...", "emisor_id": "...", "contenido": "...", "leido": false, "creado_en": "..." } ] } }
```

Los mensajes se ordenan por `creado_en asc`. La RLS (`mensaje_lectura`) garantiza que un no-participante reciba un array vacío (no 403).

**Errores:**

| Condición | Status | `code` |
|---|---|---|
| Sin sesión | 401 | `unauthorized` |
| Falta `conversacion_id` | 400 | `validation_error` |
| Error interno | 500 | `internal_error` |

---

### POST /api/mensajes/leer — Marcar mensajes como leídos

Marca como `leido = true` todos los mensajes de la conversación que **no** son del usuario de sesión. La policy `mensaje_marca_leido` en la BD garantiza que el emisor no pueda marcar sus propios mensajes (devuelve 0 filas afectadas si se intenta).

**Autenticación:** sesión válida. Sin sesión → 401.

**Body:**
```json
{ "conversacion_id": "<uuid>" }
```

**Respuesta 200 OK:**
```json
{ "data": { "updated": 3 } }
```

`updated` = número de mensajes que pasaron de `leido = false` a `true`. Es 0 si no hay mensajes pendientes o si el usuario es el emisor de todos.

**Errores:**

| Condición | Status | `code` |
|---|---|---|
| Sin sesión | 401 | `unauthorized` |
| Falta `conversacion_id` | 400 | `validation_error` |
| Error interno | 500 | `internal_error` |

---

### GET /api/conversaciones — Listar conversaciones (bandeja)

Devuelve todas las conversaciones del usuario de sesión, ordenadas por actividad más reciente. Resuelve el perfil del otro participante.

**Autenticación:** sesión válida. Sin sesión → 401.

**Query params:** ninguno.

**Respuesta 200 OK:**
```json
{
  "data": {
    "conversaciones": [
      {
        "conversacion_id": "...",
        "otro": { "id": "...", "nombre": "...", "institucion": "...", "carrera": "..." },
        "ultimo_contenido": "Hola, ¿cómo estás?",
        "ultimo_emisor_id": "...",
        "ultimo_creado_en": "2026-06-27T10:00:00Z",
        "actualizado_en": "2026-06-27T10:00:00Z",
        "no_leidos": 2
      }
    ]
  }
}
```

- `otro`: perfil del otro participante (`UsuarioCardData`).
- `ultimo_contenido`/`ultimo_emisor_id`/`ultimo_creado_en`: nullable para conversaciones sin mensajes aún.
- `no_leidos`: mensajes del otro participante con `leido = false` (viewer-scoped vía `bandeja_conversaciones`, ver BD §3.13).

**Errores:**

| Condición | Status | `code` |
|---|---|---|
| Sin sesión | 401 | `unauthorized` |
| Error interno | 500 | `internal_error` |

---

### GET /api/mensajes/no-leidos — Total de no leídos (badge de nav)

Devuelve el total combinado de mensajes no leídos más solicitudes de mensaje pendientes recibidas. Diseñado para el badge de la nav: es liviano (dos conteos, sin paginación) y el cliente lo re-fetcha en cada cambio de ruta y en eventos Realtime.

**Autenticación:** sesión válida. Sin sesión → 401.

**Query params:** ninguno.

**Respuesta 200 OK:**
```json
{ "data": { "total": 3 } }
```

- `total` = `getTotalNoLeidos()` (suma de `no_leidos` en `bandeja_conversaciones`) + `getTotalSolicitudesPendientes(user.id)` (solicitudes `pendiente` recibidas). Ambas consultas corren en paralelo con `Promise.all`.

**Errores:**

| Condición | Status | `code` |
|---|---|---|
| Sin sesión | 401 | `unauthorized` |
| Error interno | 500 | `internal_error` |

**Archivos:** `app/api/mensajes/no-leidos/route.ts`.

---

## 14b. Endpoints de Solicitudes de Mensaje (`/api/mensajes/solicitudes`)

Permiten iniciar una conversación cuando los dos usuarios aún no se siguen mutuamente. `emisor_id` siempre proviene de `supabase.auth.getUser()`, nunca del body. La seguridad real es la RPC `enviar_solicitud_mensaje` (SECURITY DEFINER); la capa Next realiza pre-validaciones para evitar llamadas innecesarias. Para el esquema de BD (tabla `solicitud_mensaje`, RLS, 3 RPCs) ver `Vitrina_BD_Conexion_Backend.md` §3.14.

---

### POST /api/mensajes/solicitudes — Enviar solicitud de mensaje

**Autenticación:** sesión válida. Sin sesión → 401.

**Body:**
```json
{ "receptor_id": "<uuid>" }
```

- `receptor_id`: uuid, requerido. No puede ser igual al `user.id` de la sesión.

`emisor_id` siempre sale de `auth.getUser()`, nunca del body.

**Flujo:** pre-validaciones en la capa Next → llama `supabase.rpc('enviar_solicitud_mensaje', { p_receptor_id })` → la RPC auto-sigue al emisor y decide si hubo follow mutuo o si queda pendiente.

**Respuesta 201 Created:**

- Si se logró follow mutuo:
```json
{ "data": { "resultado": "mutuo" } }
```

- Si quedó solicitud pendiente:
```json
{ "data": { "resultado": "solicitud", "solicitud_id": "<uuid>" } }
```

El caller redirige a `/mensajes/nuevo?u=<receptor_id>` cuando `resultado === 'mutuo'`, o actualiza el estado del botón a "Solicitud enviada" cuando `resultado === 'solicitud'`.

**Errores:**

| Condición | Status | `code` / `message` |
|---|---|---|
| Sin sesión | 401 | `unauthorized` |
| Falta `receptor_id` | 400 | `validation_error` — "Se requiere receptor_id" |
| `receptor_id` igual al propio usuario | 400 | `validation_error` — "No podés enviarte una solicitud a vos mismo" |
| RPC P0001 — cooldown post-rechazo (2 días) | 400 | `Esta persona rechazó tu solicitud; podés volver a intentar en un par de días.` |
| RPC P0001 — rate limit (20 solicitudes/hora) | 400 | `Enviaste demasiadas solicitudes en poco tiempo; esperá un rato e intentá de nuevo.` |
| RPC P0001 (otros) | 400 | mensaje original de la RPC |
| Error interno | 500 | `internal_error` |

> Ver `Vitrina_BD_Conexion_Backend.md` §3.14 para el detalle de los guards de cooldown y rate limit.

---

### POST /api/mensajes/solicitudes/[id]/aceptar — Aceptar solicitud

**Autenticación:** sesión válida. Sin sesión → 401.

**Parámetros de ruta:** `id` — UUID de la solicitud.

**Body:** ninguno.

**Flujo:** llama `supabase.rpc('aceptar_solicitud_mensaje', { p_solicitud_id: id })` → la RPC hace el follow-back y marca `aceptada`.

**Respuesta 200 OK:**
```json
{ "data": { "emisor_id": "<uuid>" } }
```

El caller redirige a `/mensajes/nuevo?u=<emisor_id>` para abrir el compositor.

**Errores:**

| Condición | Status | `code` / `message` |
|---|---|---|
| Sin sesión | 401 | `unauthorized` |
| RPC P0001 (`No autorizado` / `Solicitud no encontrada` / `La solicitud ya fue resuelta`) | 400 | mensaje original de la RPC |
| Error interno | 500 | `internal_error` |

---

### POST /api/mensajes/solicitudes/[id]/rechazar — Rechazar solicitud

**Autenticación:** sesión válida. Sin sesión → 401.

**Parámetros de ruta:** `id` — UUID de la solicitud.

**Body:** ninguno.

**Flujo:** llama `supabase.rpc('rechazar_solicitud_mensaje', { p_solicitud_id: id })` → la RPC marca `rechazada`, no toca los follows.

**Respuesta 204 No Content.**

**Errores:**

| Condición | Status | `code` / `message` |
|---|---|---|
| Sin sesión | 401 | `unauthorized` |
| RPC P0001 (`No autorizado` / `Solicitud no encontrada` / `La solicitud ya fue resuelta`) | 400 | mensaje original de la RPC |
| Error interno | 500 | `internal_error` |

---

## 15. DTOs de Mensajería Directa

Añadidos a `lib/types/database.ts` (extensión aditiva):

| DTO | Campos |
|---|---|
| `Conversacion` | `id` string · `usuario_a` string · `usuario_b` string · `creado_en` string · `actualizado_en` string |
| `Mensaje` | `id` string · `conversacion_id` string · `emisor_id` string · `contenido` string · `leido` boolean · `creado_en` string |
| `ConversacionResumen` | `conversacion_id` string · `otro` `UsuarioCardData` · `ultimo_contenido` string\|null · `ultimo_emisor_id` string\|null · `ultimo_creado_en` string\|null · `actualizado_en` string · `no_leidos` number |

`UsuarioCardData` ya existía: `{ id, nombre, institucion?, carrera? }`.

`ConversacionResumen` se obtiene de la vista `bandeja_conversaciones` via `getConversaciones(viewerId)` en `lib/data/mensajes.ts`. La resolución del perfil `otro` se hace con una consulta batched (sin N+1) a `usuario` en la misma función.

---

## 16. DTOs de Solicitudes de Mensaje

Añadidos a `lib/types/database.ts` (extensión aditiva):

| DTO | Campos |
|---|---|
| `EstadoSolicitudMensaje` (tipo) | `'pendiente' \| 'aceptada' \| 'rechazada'` |
| `SolicitudMensaje` | `id` string · `emisor_id` string · `receptor_id` string · `estado` EstadoSolicitudMensaje · `creado_en` string · `resuelto_en` string\|null |
| `SolicitudMensajeRecibida` | `id` string · `emisor` UsuarioCardData · `creado_en` string |

`SolicitudMensajeRecibida` es la proyección usada en la bandeja `/mensajes` para renderizar cada solicitud entrante. El perfil `emisor` se resuelve con una consulta batched (sin N+1) en `getSolicitudesMensajeRecibidas(viewerId)` — `lib/data/mensajes.ts`.

`UsuarioCardData` ya existía: `{ id, nombre, institucion?, carrera? }`.

---

## 17. RAG por publicación (chat sobre el PDF)

### POST /api/publicaciones/[id]/index — Indexar el PDF (solo autor)

**Autenticación:** sesión válida. Sin sesión → 401.

**Parámetros de ruta:** `id` — UUID de la publicación.

**Body:** ninguno.

**Flujo:** descarga el PDF de `archivo_url` (Storage), calcula sha256 de los bytes (fingerprint de idempotencia), extrae texto (`unpdf`) y lo trocea, genera embeddings (Edge Function `embed`, gte-small 384 dims), reemplaza los chunks previos de la publicación y actualiza `publicacion_rag`.

**Respuesta 200 OK:**
```json
{ "data": { "chunks": 12, "reindexado": true } }
```
Si el PDF ya estaba indexado con el mismo hash: `{ "data": { "chunks": 12, "reindexado": false } }` (no se reprocesa). Si el PDF no tiene capa de texto extraíble (escaneado): `{ "data": { "chunks": 0, "reindexado": true } }` — el chat cae a título+resumen.

**Errores:**

| Condición | Status | `code` / `message` |
|---|---|---|
| Sin sesión | 401 | `unauthorized` |
| Publicación no encontrada | 404 | `not_found` |
| El usuario no es el autor | 403 | `forbidden` — "Solo el autor puede indexar esta publicación" (defensa en profundidad; RLS `chunk_insert`/`rag_write` es el guard real) |
| `archivo_url` ausente o no termina en `.pdf` | 400 | `validation_error` |
| No se pudo resolver la ruta en Storage | 400 | `validation_error` |
| Error interno (descarga, extracción, embeddings, insert) | 500 | `internal_error` |

> **Auto-index:** `PublicarForm` llama a esta ruta automáticamente en **cada guardado** con PDF (crear o editar título/resumen/PDF). Es **best-effort y silencioso**: reintenta hasta **3 veces** (1,5 s entre intentos) y, si falla, **no surfacea error**. Ya no hay checkbox opt-in ni botón manual (`IndexarButton` fue eliminado). La idempotencia por sha256 hace que una edición de solo metadatos sea un no-op (no reprocesa si los bytes no cambiaron), y un PDF reemplazado se reindexa. Deja la publicación indexada para el chat **y** la búsqueda semántica.

### POST /api/admin/rag/backfill — Indexar en lote los PDFs pendientes (solo admin)

**Autenticación:** sesión válida + `es_admin()`. Sin sesión → 401; no admin → 403.

**Body:** ninguno.

**Flujo:** lista las publicaciones con `archivo_url` `.pdf` **sin** fila en `publicacion_rag` y corre el pipeline de indexado (`lib/rag/indexer.ts`, el mismo de `/index`) **secuencial** (evita `WORKER_RESOURCE_LIMIT` de la edge). Corre bajo el JWT del admin; las policies `chunk_admin_write`/`rag_admin_write` (BD §3.18) autorizan la escritura de chunks de otros autores (RLS, sin `service_role`). Idempotente (sha256) → re-ejecutable para reintentar fallos transitorios de la edge.

**Respuesta 200 OK:**
```json
{ "data": { "total": 17, "indexadas": 14, "fallidas": 3,
  "resultados": [ { "id": "...", "chunks": 12 }, { "id": "...", "error": "..." } ] } }
```

**Errores:** 401 `unauthorized` (sin sesión) · 403 `forbidden` (no admin) · 500 `internal_error`.

### POST /api/publicaciones/[id]/chat — Preguntar sobre el documento (logueado)

**Autenticación:** sesión válida. Sin sesión → 401.

**Rate limit:** 15 preguntas por hora **por cuenta** (account-wide, sin importar la publicación). Se cuenta con el RPC `SECURITY DEFINER` `consumir_cuota_rag()` sobre la tabla `rag_rate_limit` (una fila por usuario, ventana fija de 1h; RLS impide que el usuario resetee su contador). Al pasarse → **429** `rate_limited`. Se consume una unidad por pregunta válida sobre una publicación existente **con el chat habilitado** (no se consume en 401/400/403/404) — el chequeo de `chat_habilitado` corre antes que `consumir_cuota_rag()`, así que una publicación con el chat apagado nunca gasta cuota.

**Parámetros de ruta:** `id` — UUID de la publicación.

**Body:**
```json
{
  "pregunta": "string, no vacía, máx. 500 caracteres",
  "historial": "opcional — array de { rol: 'user' | 'assistant', contenido: string }"
}
```
`historial` es la memoria conversacional (los últimos 5 turnos). Se valida el tipo; se recortan a los últimos `MAX_HISTORIAL` (5) y cada `contenido` se capa a 2000 caracteres. Es efímero: lo envía el cliente, no se persiste.

**Flujo:** valida `pregunta` e `historial` → **condense** (solo si hay historial): una llamada a `generateText` con `CONDENSE_PROMPT` reescribe el follow-up en una pregunta autónoma para el retrieval; si falla, cae a la pregunta cruda (no fatal) → carga `titulo, resumen` → embed de la pregunta autónoma (Edge Function `embed`) → `supabase.rpc('match_publicacion_chunks', { p_publicacion_id, p_query_embedding, p_match_count: SIMILARITY_TOP_K = 8 })` (RLS aplica bajo el JWT del llamante, la RPC no es `SECURITY DEFINER`) → arma el contexto (título + resumen + top-K fragmentos + conversación previa) → `generateText` (`@ai-sdk/anthropic`, modelo `claude-haiku-4-5`, `system` = prompt de grounding estricto) → responde solo con lo que está en el contexto. Con historial son 2 llamadas al modelo (condense + generación); sin historial, 1.

**Respuesta 200 OK:**
```json
{ "data": { "respuesta": "string" } }
```

**Errores:**

| Condición | Status | `code` / `message` |
|---|---|---|
| Sin sesión | 401 | `unauthorized` |
| `pregunta` vacía o ausente | 400 | `validation_error` |
| `pregunta` supera 500 caracteres | 400 | `validation_error` |
| `historial` no es array, o algún item no es `{ rol, contenido }` válido | 400 | `validation_error` |
| Body no es JSON válido | 400 | `validation_error` |
| Publicación no encontrada | 404 | `not_found` |
| `chat_habilitado = false` para esta publicación | 403 | `forbidden` |
| Límite de 15 preguntas/hora alcanzado | 429 | `rate_limited` |
| Error interno (embeddings, RPC, o el proveedor de IA) | 500 | `internal_error` |

**Nota de serialización pgvector:** en ambos endpoints, el embedding se pasa a PostgREST como texto (`JSON.stringify(vector)`), no como array JS crudo — ver `Vitrina_BD_Conexion_Backend.md` §3.15.

---

## 18. DTOs de RAG

Añadidos a `lib/types/database.ts` (extensión aditiva):

| DTO | Campos |
|---|---|
| `PublicacionChunk` | `id` string · `publicacion_id` string · `indice` number · `contenido` string · `creado_en` string |
| `RagMensaje` | `rol` `'user' \| 'assistant'` · `contenido` string |

---

## 19. Endpoints de Colecciones (`/api/colecciones`)

Listas curadas de publicaciones, propias o ajenas, con visibilidad `publica`/`privada`. Ownership vía `usuario_id` de sesión; la seguridad real es la RLS de `coleccion`/`coleccion_publicacion` (sin RPC `SECURITY DEFINER`). Para el esquema de BD ver `Vitrina_BD_Conexion_Backend.md` §3.20.

### POST /api/colecciones — Crear colección

**Autenticación:** sesión válida. Sin sesión → 401.

**Body:**
```json
{ "titulo": "Lecturas de biología", "descripcion": "Opcional", "visibilidad": "privada" }
```

- `titulo`: string, requerido, 1–100 caracteres.
- `descripcion`: string, opcional, ≤500 caracteres.
- `visibilidad`: `'publica' | 'privada'`, opcional, default `'privada'`.

`usuario_id` siempre sale de `auth.getUser()`, nunca del body.

**Respuesta 201 Created:**
```json
{ "data": { "id": "...", "usuario_id": "...", "titulo": "...", "descripcion": null, "visibilidad": "privada", "creado_en": "..." } }
```

**Errores:**

| Condición | Status | `code` / `message` |
|---|---|---|
| Sin sesión | 401 | `unauthorized` |
| `titulo` ausente, vacío, o > 100 caracteres | 400 | `validation_error` |
| `descripcion` no es texto, o > 500 caracteres | 400 | `validation_error` |
| `visibilidad` fuera de `('publica','privada')` | 400 | `validation_error` |
| Otros errores de BD | 500 | `internal_error` |

---

### GET /api/colecciones — Listar las colecciones propias

**Autenticación:** sesión válida. Sin sesión → 401. Devuelve **todas** las colecciones del usuario de sesión (cualquier `visibilidad`), no las públicas de terceros — para eso ver `GET /api/colecciones/[id]` o la página `/coleccion/[id]`.

**Query params:**

| Param | Tipo | Requerido | Descripción |
|---|---|---|---|
| `publicacion_id` | uuid | no | Si viene, cada colección incluye `agregada: boolean` (si ya contiene esa publicación) |

**Respuesta 200 OK (sin `publicacion_id`):**
```json
{ "data": [ { "id": "...", "usuario_id": "...", "titulo": "...", "descripcion": null, "visibilidad": "privada", "creado_en": "..." } ] }
```

**Respuesta 200 OK (con `publicacion_id`):**
```json
{ "data": [ { "id": "...", "usuario_id": "...", "titulo": "...", "descripcion": null, "visibilidad": "privada", "creado_en": "...", "agregada": true } ] }
```

Ordenadas por `creado_en desc`. Con `publicacion_id`, hace una segunda consulta a `coleccion_publicacion` (`eq('publicacion_id', ...)`, `in('coleccion_id', <ids del usuario>)`) y arma un `Set` de coincidencias — no un join anidado. Usado por `AgregarAColeccionButton` (`components/publicacion/AgregarAColeccionButton.tsx`) para precargar qué colecciones ya tienen la publicación **al abrir el modal**.

---

### GET /api/colecciones/[id] — Ver una colección

**Autenticación:** opcional. RLS (`coleccion_select`) restringe el resultado a pública-o-dueño; `.maybeSingle()` en `lib/data/colecciones.ts::getColeccion` convierte un resultado de 0 filas (privada, no-dueño) en `null` en vez de lanzar.

**Respuesta 200 OK:**
```json
{ "data": { "id": "...", "titulo": "...", "descripcion": null, "visibilidad": "publica", "creado_en": "...",
            "coleccion_publicacion": [ { "coleccion_id": "...", "publicacion_id": "...", "orden": 0, "agregado_en": "...",
                                          "publicacion": { "id": "...", "titulo": "...", "resumen": "...", "tipo": "articulo",
                                                            "usuario": { "id": "...", "nombre": "..." } } } ] } }
```

**Errores:**

| Condición | Status | `code` |
|---|---|---|
| No existe, o existe pero es privada y no sos el dueño | 404 | `not_found` |

---

### PATCH /api/colecciones/[id] — Editar metadatos (solo dueño)

**Autenticación:** sesión válida. Sin sesión → 401.

**Body** (todos opcionales, se actualiza solo lo presente):
```json
{ "titulo": "Nuevo título", "descripcion": "Nueva descripción", "visibilidad": "publica" }
```

Mismas reglas de validación que `POST /api/colecciones`. `.eq('usuario_id', user.id)` en el `UPDATE` — un `id` ajeno o inexistente resuelve 0 filas → **404**, no 403 (evita confirmar la existencia de una colección ajena).

**Respuesta 200 OK:** fila actualizada, mismo shape que `POST`.

**Errores:**

| Condición | Status | `code` |
|---|---|---|
| Sin sesión | 401 | `unauthorized` |
| Body sin ningún campo válido | 400 | `validation_error` |
| `titulo`/`descripcion`/`visibilidad` inválidos | 400 | `validation_error` |
| No existe o no sos el dueño | 404 | `not_found` |

---

### DELETE /api/colecciones/[id] — Borrar (solo dueño)

**Autenticación:** sesión válida. Sin sesión → 401. `.eq('usuario_id', user.id)` en el `DELETE`; 0 filas afectadas → 404. Cascade borra los `coleccion_publicacion` asociados; las publicaciones en sí **no** se tocan.

**Respuesta 200 OK:** `{ "data": null }`.

**Errores:** igual patrón que el `PATCH` (401 sin sesión, 404 si no existe o no sos el dueño).

---

### POST /api/colecciones/[id]/publicaciones — Agregar una publicación a la colección

**Autenticación:** sesión válida. Sin sesión → 401. El ownership de la colección lo aplica la RLS `coleccion_publicacion_write` (no se duplica el check en la capa Next); un intento de un no-dueño es denegado por RLS → `42501` → `handleError` → 403.

**Body:**
```json
{ "publicacion_id": "<uuid>" }
```

**Respuesta 201 Created:** `{ "data": null }`.

**Errores:**

| Condición | Status | `code` |
|---|---|---|
| Sin sesión | 401 | `unauthorized` |
| `publicacion_id` ausente o vacío | 400 | `validation_error` |
| La publicación ya está en la colección (PK duplicada, `23505`) | 409 | `conflict` |
| No sos el dueño de la colección (RLS `42501`) | 403 | `forbidden` |

---

### DELETE /api/colecciones/[id]/publicaciones/[pubId] — Quitar una publicación de la colección

**Autenticación:** sesión válida. Sin sesión → 401. El `DELETE` filtra por `(coleccion_id, publicacion_id)`; como el par puede no existir por dos motivos (no está en la colección, o la colección no es tuya y RLS ya lo bloqueó) sin que la query distinga cuál, el endpoint convierte "0 filas borradas" en un **404** explícito.

**Respuesta 200 OK:** `{ "data": null }`.

**Errores:**

| Condición | Status | `code` |
|---|---|---|
| Sin sesión | 401 | `unauthorized` |
| El par `(coleccion_id, publicacion_id)` no existe (o no sos el dueño) | 404 | `not_found` |

---

## 20. DTOs de Colecciones

Añadidos a `lib/types/database.ts` (extensión aditiva):

| DTO | Campos |
|---|---|
| `VisibilidadColeccion` (tipo) | `'publica' \| 'privada'` |
| `Coleccion` | `id` string · `usuario_id` string · `titulo` string · `descripcion` string\|null · `visibilidad` VisibilidadColeccion · `creado_en` string |
| `ColeccionPublicacion` | `coleccion_id` string · `publicacion_id` string · `orden` number · `agregado_en` string · `publicacion?` `Pick<Publicacion,'id'\|'titulo'\|'resumen'\|'tipo'> & { usuario?: Pick<Usuario,'id'\|'nombre'> }` |
| `ColeccionDetalle` | `Coleccion & { coleccion_publicacion?: ColeccionPublicacion[] }` |
| `ColeccionConMembership` | `Coleccion & { agregada: boolean }` — respuesta de `GET /api/colecciones?publicacion_id=` (§19) |
| `ColeccionCardData` | `id` string · `titulo` string · `visibilidad` VisibilidadColeccion · `total_publicaciones` number — declarado, sin consumidor actual (`ColeccionCard` usa `Coleccion` directo) |

---

## 21. Endpoints de Correos Admin — envío masivo (`/api/admin/correos`)

Endpoints de notificaciones por correo (Resend) — consumen el esquema/RPC/Edge Function ya documentados en `Vitrina_BD_Conexion_Backend.md` §3.21 (tabla `correo_admin`, RPC `resolver_destinatarios_correo`, Edge Function `enviar-correo-masivo`). Ninguno de estos 3 endpoints toca esquema.

### GET /api/admin/correos — Historial de envíos (solo admin)

**Autenticación:** sesión válida + `es_admin()` (`requireAdmin()`). Sin sesión → 401; no admin → 403.

**Query params:** `limit` (default 10, máx 50) · `offset` (default 0) — mismo clamp que `GET /api/publicaciones`.

**Respuesta 200 OK:**
```json
{ "data": { "correos": [ <CorreoAdminDetalle>, ... ], "hasMore": false } }
```
`hasMore` es `correos.length === limit` (mismo patrón que `/area/[slug]`), no un `count(*)` separado.

### POST /api/admin/correos — Enviar un correo masivo (solo admin)

**Autenticación:** sesión válida + `es_admin()`. Sin sesión → 401; no admin → 403.

**Body:**
```json
{ "asunto": "string, 1-200 chars", "cuerpo": "string, 10-5000 chars",
  "destinatarios_criterio": { "tipo": "todos" } }
```
`destinatarios_criterio` es `{tipo:'todos'}` \| `{tipo:'ciudad', valor}` \| `{tipo:'ids', valor: string[]}` \| `{tipo:'sin_publicacion'}` (tipo `DestinatariosCriterio`, ver BD §3.21). La UI de `/admin/correos` expone `todos`, `ids` y `sin_publicacion` — **no** `ciudad` (sigue siendo válido a nivel de contrato/RPC pero sin selector en el form; no existe una lista de municipios en el proyecto, decisión explícita).

`sin_publicacion` ("Usuarios sin publicaciones") es **resuelto por el Route Handler antes de tocar la RPC/Edge Function**, no por ellas: `resolverIdsSinPublicacion` (`lib/data/correos.ts`) consulta `usuario.id` y `publicacion.autor_id` (ambas columnas públicas vía RLS, sin RPC ni `service_role`) y arma la lista de ids que nunca publicaron; esa lista se convierte en un `{tipo:'ids', valor}` **solo para la llamada a `resolver_destinatarios_correo`/`enviar-correo-masivo`** — el opt-out `notif_email_habilitado` lo sigue aplicando la RPC sobre esos ids, igual que con cualquier `ids` armado a mano. `correo_admin.destinatarios_criterio` guarda el criterio **original** (`sin_publicacion`), no el resuelto, para que el historial refleje la intención real del envío. Si la lista resuelta queda vacía (todos publicaron algo), el Route Handler no invoca la Edge Function — la validación de payload de `enviar-correo-masivo` rechaza un `ids` vacío — y cierra la fila directo como `estado:'completado'` con los 3 contadores en 0 (mismo criterio de "no es error" que ya usa la Edge Function para destinatarios resueltos en cero).

**Flujo (síncrono, sin job async ni `tracking_id`):** valida el body (`lib/validation/correoAdmin.ts`, misma forma que `validate-payload.ts` de la Edge Function) → **inserta** en `correo_admin` (`admin_id` de sesión, `estado:'pendiente'`, criterio **original**) → resuelve `sin_publicacion` si aplica → `functions.invoke('enviar-correo-masivo', {...})` con el criterio **resuelto** (JWT del admin reenviado implícito) → la Edge Function resuelve destinatarios ELLA MISMA vía `resolver_destinatarios_correo` (aplica el opt-out `notif_email_habilitado`, cap `LIMITE_DESTINATARIOS = 500`) y envía por Resend en lotes de 50 → el Route Handler **actualiza** la fila con `cantidad_destinatarios/cantidad_enviados/cantidad_fallidos` y `estado` final (`'completado'`, o `'fallido'` si todos los envíos fallaron).

**Respuesta 201 Created:**
```json
{ "data": { "correo": <CorreoAdminDetalle>, "detalles": [ { "email": "...", "error": "opcional" } ] } }
```

**Errores:**

| Condición | Status | `code` / `message` |
|---|---|---|
| Sin sesión | 401 | `unauthorized` |
| No admin | 403 | `forbidden` |
| `asunto`/`cuerpo`/`destinatarios_criterio` inválidos | 400 | `validation_error` |
| Falla el `insert` en `correo_admin` | según `handleError` | — |
| Falla la invocación de la Edge Function (red) | 500 | `internal_error` — la fila queda en `estado:'fallido'` |

### GET /api/admin/correos/[id] — Detalle de un envío (solo admin)

**Autenticación:** igual que arriba. **Parámetros de ruta:** `id` — UUID de `correo_admin`.

**Respuesta 200 OK:** `{ "data": { "correo": <CorreoAdminDetalle> } }` · No encontrado → 404 `not_found`.

> No lo usa la UI del historial (la lista ya trae todas las columnas necesarias y expande la fila in-place sin segundo fetch) — queda disponible para uso directo de la API o un futuro deep-link.

### POST /api/admin/correos/contar — Preview del conteo y la lista de destinatarios (solo admin)

**Autenticación:** igual que arriba.

**Body:** `{ "destinatarios_criterio": <DestinatariosCriterio> }` — incluye `{tipo:'sin_publicacion'}` (ver DTO abajo).

**Flujo:** llama a `resolver_destinatarios_correo` (misma RPC que la Edge Function) y devuelve las filas resueltas — **no envía nada ni escribe en `correo_admin`**. Respalda el botón "Ver vista previa" del form, incluida la lista desplegable de destinatarios de `AdminCorreoPreview`.

**Respuesta 200 OK:**
```json
{ "data": { "cantidad": 42, "destinatarios": [ { "id": "...", "email": "...", "nombre": "..." } ] } }
```
`destinatarios` es `DestinatarioResuelto[]` (mismo shape que retorna `resolver_destinatarios_correo`: `id/email/nombre`) — el admin ya ve estos mismos pares email/nombre en `detalles` tras un envío completado (arriba, `POST /api/admin/correos`), así que mostrarlos acá no es una exposición nueva.

---

## 22. Endpoints de Notificaciones In-App (`/api/notificaciones`, `/api/usuario/preferencias-notificaciones`)

Consumen el esquema/RLS/triggers ya documentados en `Vitrina_BD_Conexion_Backend.md` §3.23 (tabla `notificacion`, RPC `mis_preferencias_notif_app`, 5 columnas `notif_app_*` en `usuario`). Ninguno de estos 6 endpoints toca esquema. Todos requieren **sesión válida** (`supabase.auth.getUser()`); sin sesión → 401 `unauthorized` en los 6.

### GET /api/notificaciones — Lista paginada

**Query params:** `filtro=no-leidas` (opcional; cualquier otro valor u omitido → todas las filas visibles por RLS) · `limit` (default 20, **máx 50**, clamp igual que `/area/[slug]`) · `offset` (default 0).

**Datos:** `getNotificaciones({filtro, limit, offset})` (`lib/data/notificaciones.ts`) — RLS (`notif_select`) ya restringe a `auth.uid()`, no hace falta filtrar por `usuario_id` en el query. El `select` embebe el actor vía la FK `usuario_relacionado_id` (`usuario_relacionado:usuario!notificacion_usuario_relacionado_id_fkey(id, nombre)` — desambiguado porque `notificacion` tiene dos FKs a `usuario`), `null` para `obra_aceptada_revista` (sin actor).

**Respuesta 200 OK:**
```json
{ "data": { "items": [ <NotificacionConActor>, ... ], "total": 12 } }
```
`total` viene de `{count:'exact'}` sobre el mismo query paginado (no un segundo round-trip). No soporta `tipo` como query param — ese filtro solo lo aplica la lectura SSR de `/notificaciones` (`lib/data/notificaciones.ts`, no este Route Handler).

### GET /api/notificaciones/sin-leer/count — Total no leídas

Endpoint liviano para el badge de la campanita; el nav (`NavClient.tsx`) lo vuelve a pedir en cada evento Realtime del canal `nav:notificaciones:${sessionId}` (§3.23).

**Datos:** `getTotalNoLeidas()` — `count:'exact', head:true` filtrado `leida=false` (no trae filas, solo el conteo).

**Respuesta 200 OK:**
```json
{ "data": { "total": 3 } }
```
La clave es **`total`, no `count`** — mismo nombre que la paginación de arriba, por consistencia de contrato dentro de este recurso.

### POST /api/notificaciones/[id]/leer — Marcar una notificación como leída

**Parámetros de ruta:** `id` — UUID de `notificacion`. Ausente/vacío → 400 `validation_error`.

**Flujo:** `.from('notificacion').update({leida:true, leida_en: now}).eq('id', id).eq('usuario_id', user.id).select('id, leida, leida_en').maybeSingle()`. Solo `leida`/`leida_en` son columnas con `GRANT UPDATE` para `authenticated` (§3.23) — es la única mutación de columna que el cliente puede hacer sobre esta tabla. El `.eq('usuario_id', user.id)` es una comodidad para distinguir "no existe" de "no es tuya" en la respuesta (ambas devuelven 404 igual, sin filtrar cuál fue); la RLS (`notif_update`) es el candado real.

**Respuesta 200 OK:** `{ "data": { "id": "...", "leida": true, "leida_en": "2026-07-12T..." } }`

**Errores:** no encontrada / no es tuya → 404 `not_found`.

### POST /api/notificaciones/marcar-todas-leidas — Marcar todas como leídas

Sin body ni parámetros. `.from('notificacion').update({leida:true, leida_en: now}).eq('usuario_id', user.id).eq('leida', false).select('id')` — el `.eq('usuario_id', ...)` es un filtro de performance (menos filas a evaluar), no el candado de seguridad; la RLS (`notif_update`) ya scopea la escritura a `auth.uid()` sin importar el filtro explícito.

**Respuesta 200 OK:** `{ "data": { "updated": 5 } }` — `updated` es la cantidad de filas afectadas (`data?.length ?? 0` del `.select('id')` encadenado). `0` si no había ninguna no leída — no es error.

### DELETE /api/notificaciones/[id] — Borrar una notificación

**Parámetros de ruta:** `id` — UUID de `notificacion`. Ausente/vacío → 400 `validation_error`.

**Flujo:** `.from('notificacion').delete().eq('id', id).eq('usuario_id', user.id).select('id').maybeSingle()` — misma lógica de "no encontrada vs. no es tuya → 404 sin distinguir" que el endpoint de leer; la RLS (`notif_delete`) es el candado real.

**Respuesta 200 OK:** `{ "data": null }` · No encontrada / no es tuya → 404 `not_found`.

### PATCH /api/usuario/preferencias-notificaciones — Actualizar preferencias `notif_app_*`

**Body:** 1 o más de las 5 claves booleanas (todas opcionales individualmente, pero se exige **al menos una**):
```json
{ "notif_app_comentarios": true, "notif_app_seguidores": false,
  "notif_app_revista": true, "notif_app_mensajes": true, "notif_app_likes": true }
```

**Validación:** cada clave presente debe ser `boolean` (si no → 400 `validation_error` con el nombre de la clave en el mensaje); body sin ninguna de las 5 claves → 400 `validation_error`. Claves desconocidas se ignoran silenciosamente (no whitelisted explícitamente contra un error, solo no se copian al objeto `updates`).

**Flujo:** `.from('usuario').update(updates).eq('id', user.id)` — **deliberadamente sin `.select()` encadenado**: las 5 columnas no tienen `GRANT SELECT` para ningún rol (§3.23), así que un `.select()` tras el `UPDATE` fallaría con `permission denied for column` aunque la escritura misma haya funcionado (el `UPDATE` sí tiene `GRANT UPDATE` de columna). La respuesta en su lugar hace eco del `updates` ya validado, no de una lectura post-escritura.

**Respuesta 200 OK:** `{ "data": { "notif_app_comentarios": true, "notif_app_seguidores": false, ... } }` — solo las claves que vinieron en el body (no las 5 siempre).

**Errores:** `usuario` inválido/no boolean → 400 `validation_error`.

### DTOs de Notificaciones

Añadidos a `lib/types/database.ts` (extensión aditiva):

| DTO | Campos |
|---|---|
| `TipoNotificacion` (tipo) | `'comentario_nueva' \| 'comentario_respuesta' \| 'obra_aceptada_revista' \| 'nuevo_seguidor' \| 'solicitud_mensaje' \| 'obra_likeada'` |
| `Notificacion` | `id` string · `usuario_id` string · `tipo` TipoNotificacion · `usuario_relacionado_id` string\|null (actor) · `publicacion_relacionada_id` string\|null · `comentario_relacionado_id` string\|null (ancla de agregación, ver BD §3.23) · `descripcion` string · `enlace` string\|null · `contador` number · `leida` boolean · `leida_en` string\|null · `creada_en` string |
| `NotificacionConActor` | `Notificacion & { usuario_relacionado: Pick<Usuario,'id'\|'nombre'> \| null }` — shape real devuelto por `GET /api/notificaciones` (embed de actor) |
| `PreferenciasNotifApp` | `notif_app_comentarios` boolean · `notif_app_seguidores` boolean · `notif_app_revista` boolean · `notif_app_mensajes` boolean · `notif_app_likes` boolean — shape de `mis_preferencias_notif_app()` y del body/respuesta de `PATCH /api/usuario/preferencias-notificaciones` |

---

*Vitrina · Especificaciones de la API*
