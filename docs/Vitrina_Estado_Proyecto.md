# Estado del Proyecto de Software
## Portafolio Digital · Vitrina

| Campo | Detalle |
|---|---|
| Versión | 2.2 — **Informe de estado** (reemplaza el Plan v1.1) |
| Fecha de corte | 2026-07-04 |
| Responsable | Developer (1 persona) |
| Verificación | Auditado contra el código real y la BD viva de Supabase (ref `fdfbyhjwnbteccagulxb`); base 2026-06-24, 2026-06-28 mensajería directa, 2026-07-04 **RAG por publicación (chat) + buscador FTS/semántico** |
| Documentos relacionados | `Vitrina_BD_Conexion_Backend.md` (esquema + conexión), `Vitrina_Especificaciones_APIs.md` (contrato de API), `Vitrina_Pantallas_Componentes.md` (pantallas/UI); auditorías `SECURITY_AUDIT.md` y `Auditoria_UX_UI.md` |

> Este documento describe el estado **real** del proyecto, no el plan original. El MVP de 2 semanas se completó y el alcance creció con varias features post-MVP. Las afirmaciones de aquí se verificaron contra la base de datos en vivo y el código fuente.

---

## 1. Resumen ejecutivo

Vitrina es un portafolio digital académico para jóvenes: publican obras (19 tipos, desde libro/artículo hasta dibujo/fotografía, más `recomendación` de obras de terceros), las exploran/comentan/likean/guardan, se siguen entre sí **y se mensajean en privado cuando hay seguimiento mutuo**, reportan contenido, y los administradores curan una **revista mensual** que se publica sola el primer día de cada mes.

**Estado general: MVP completo + features post-MVP en producción de código.** La base de datos está desplegada, poblada y endurecida en seguridad (auditoría 2026-06-18, sin hallazgos Críticos/Altos). El ciclo de revista mensual está automatizado y verificado (job `pg_cron` activo). Quedan deudas menores acotadas (ver §9). **Última incorporación (2026-07-04, rama `feat/rag-publicacion`, sin mergear): RAG por publicación — chat groundeado sobre el PDF (memoria conversacional + rate limit 15/h por cuenta) — y mejora integral del buscador: full-text search en español (título+resumen, stemming, prefijo, acento-insensible), búsqueda de personas typo-tolerante (trigram) y una capa semántica híbrida (RRF de FTS + retrieval vectorial) solo para logueados en `/buscar`. Cobertura de indexado resuelta con auto-index al publicar + backfill admin (1 → 14 PDFs). Verificado (tsc/lint + E2E).** La mensajería directa (2026-06-28) sigue implementada y sin mergear en su propia rama.

**Arquitectura clave:** una sola app Next.js 16 (App Router), área pública + admin por segmentos de ruta; backend 100% Supabase; **cero `service_role`** — todo corre con el JWT del usuario vía `@supabase/ssr`, y la seguridad la dan RLS + RPC `SECURITY DEFINER`.

---

## 2. Estado por módulo

| Módulo | Estado | Notas |
|---|---|---|
| Autenticación (signup/login/logout/me/resend/change-password) | ✅ Hecho | Route handlers `/api/auth/*` con cookies `@supabase/ssr`; confirmación por email |
| Perfiles (ver/editar, ajustes de cuenta) | ✅ Hecho | `/perfil`, `/perfil/ajustes`, `/usuario/[id]` |
| Feed + filtros (tipo, área) + paginación | ✅ Hecho | SSR; shuffle por request; `LIMIT 24` |
| Publicaciones (crear/editar/eliminar, 19 tipos, recomendaciones) | ✅ Hecho | Form type-first; subida a Storage; admin o autor puede borrar |
| Comentarios con hilos (profundidad 2) | ✅ Hecho | `responde_a` auto-anclado al raíz |
| Likes | ✅ Hecho | Toggle optimista |
| Guardados (marcadores privados) | ✅ Hecho | `/perfil/guardados` |
| Seguidores (grafo social) | ✅ Hecho | `/usuario/[id]/seguidores`, contadores |
| **Mensajería directa (DM)** | ✅ Implementado (sin mergear) | Solo entre seguidores mutuos; RLS + RPC `enviar_mensaje`; Supabase Realtime (mensajes en vivo + recibos de lectura ✓✓); bandeja, hilo, badge en vivo |
| **Solicitudes de mensaje** | ✅ Implementado (sin mergear) | Botón siempre visible; enviar = auto-follow + solicitud; aceptar = follow-back → mutuo → conversación |
| Links de perfil | ✅ Hecho | Hasta 10 por usuario, https-only |
| Buscador global (autocomplete + paginado) | ✅ Hecho + mejorado (sin mergear) | `/buscar`, `/api/buscar`. **FTS español** (título+resumen, stemming/prefijo/acento) + **trigram** typo-tolerante en personas |
| **Búsqueda semántica híbrida** | ✅ Implementado (sin mergear) | RRF de FTS + retrieval vectorial (`match_publicacion_chunks_global`) en `/buscar`, **solo logueados**; auto-index + backfill admin (14 PDFs) |
| **Chat RAG por publicación** | ✅ Implementado (sin mergear) | Respuestas groundeadas sobre el PDF (pgvector, Edge `embed` gte-small); memoria conversacional; rate limit 15/h por cuenta |
| Revista mensual automática | ✅ Hecho | Job `pg_cron` día 1 de cada mes, 19:00 UTC (13:00 UTC-6); rotación idempotente |
| Curación de revista (admin) | ✅ Hecho | Aceptar/rechazar/retirar artículos |
| Moderación de reportes (admin) | ✅ Hecho | Reportar, bloquear, descartar |
| Tendencias / Áreas / CTAs de conversión | ✅ Hecho | `feed_trending`, `/areas`, `/area/[slug]`, HeroBanner, banners anon |
| SEO (sitemap, robots, metadata) | ✅ Hecho | `app/sitemap.ts`, `app/robots.ts` |
| Navegación responsive (móvil) | 🚧 En curso | Rama `feat/nav-responsive-mobile` (drawer accesible) |
| Endurecimiento de seguridad (BD §7) | ✅ Hecho (1 pendiente) | Verificado 2026-06-18; falta activar leaked-password protection |
| Despliegue en Vercel | ⚠️ No verificado | Objetivo del plan; no confirmado en esta auditoría |
| Suite de pruebas | ⚠️ Parcial | Sin test runner local; se usa el MCP `testsprite` / Playwright |

---

## 3. Funcionalidades implementadas (por épica)

### Cuenta y perfil
- Registro con email + confirmación, login/logout, cambio de contraseña (re-verifica la actual).
- Edición de perfil (nombre, institución, carrera) y enlaces de perfil (hasta 10, https-only).
- Portafolio propio en `/perfil` con stats (publicaciones, en revistas, likes, seguidores/seguidos).

### Publicación
- Alta type-first con 19 tipos agrupados por categoría; archivo (PDF/JPG/PNG ≤10 MB) a Storage.
- **Recomendaciones** de obras de terceros (`obra_autor_externo` + `url_externa`).
- Edición owner-only (tipo bloqueado) y borrado (autor **o** admin), con limpieza de Storage best-effort.
- Etiquetado por área vía tags.

### Descubrimiento e interacción
- Feed con filtros por tipo y área (`!inner` join), paginación y orden barajado por request.
- **Tendencias** (score con decaimiento temporal), páginas de **áreas** (`/areas`, `/area/[slug]`).
- Buscador global (autocomplete en navbar + página paginada), con el motor mejorado del bloque siguiente.
- Likes, comentarios con **hilos** (respuestas, profundidad máx. 2), **guardados** privados.
- **Seguidores**: seguir/dejar de seguir, listados de seguidores/seguidos.
- CTAs de conversión para anónimos (HeroBanner, AnonFollowCTA, AnonViewBanner por conteo de vistas).

### Búsqueda y RAG (post-2026-06-28, rama `feat/rag-publicacion`, sin mergear)
- **Buscador FTS (español).** Publicaciones dejan el `ilike` (que solo miraba el título) por full-text search sobre **título + resumen** con `tsvector` generado, índice GIN, stemming, prefijo (autocomplete), multi-palabra y **acento-insensible** (`unaccent`). Ranking por `ts_rank`. RPC `buscar_publicaciones` (`SECURITY INVOKER`, respeta `bloqueada`).
- **Personas typo-tolerantes.** RPC `buscar_usuarios` con **trigram** (`pg_trgm`, `word_similarity`) y acento-insensible: `cristofer`→Cristopher, `perez`→Pérez.
- **Búsqueda semántica híbrida** (solo `/buscar`, solo logueados): embebe la consulta (Edge `embed`) y **fusiona** el ranking FTS con retrieval vectorial (RPC `match_publicacion_chunks_global`, HNSW coseno) vía **Reciprocal Rank Fusion**. Suma recall del **contenido del PDF** que no está en título/resumen; anónimo → solo FTS. Retrieval puro, **sin generación LLM** en el buscador.
- **Cobertura de indexado:** auto-index en **cada guardado** con PDF (crear o editar título/resumen/PDF; sin checkbox ni botón manual; silencioso con hasta 3 reintentos, idempotente por sha256) + **backfill** admin (`POST /api/admin/rag/backfill`, secuencial, idempotente) habilitado por policies admin aditivas. Cobertura llevada de 1 → **14 PDFs** (198 chunks).
- **Chat RAG por publicación:** `POST /api/publicaciones/[id]/chat` responde **groundeado** (título+resumen + top-K chunks recuperados), con **memoria conversacional** (condense de los últimos turnos) y **rate limit** de 15 preguntas/hora por cuenta (RPC `consumir_cuota_rag` `SECURITY DEFINER`, contador a prueba de manipulación).

### Mensajería (post-2026-06-24, sin mergear)
- **Mensajería directa 1-a-1 habilitada solo con seguimiento mutuo.** La regla vive en Postgres: RPC `enviar_mensaje` (`SECURITY DEFINER`, valida `se_siguen` y hace find-or-create de la conversación de forma atómica) + RLS privada; la capa Next no es la seguridad.
- **Tiempo real (Supabase Realtime, primera vez en el repo):** los mensajes aparecen al instante y los **recibos de lectura (✓✓)** se actualizan en vivo (suscripción a INSERT/UPDATE de `mensaje`; `REPLICA IDENTITY FULL`; el socket lleva el JWT vía `realtime.setAuth`). El **badge de no leídos** de la nav también es en vivo (refetch por navegación + Realtime).
- **Solicitudes de mensaje:** si no hay seguimiento mutuo, el botón ofrece enviar una solicitud → **auto-follow** al destinatario + ítem de solicitud en su bandeja; al **aceptar**, follow-back → quedan mutuos → conversación. Patrón calcado de `solicitud_revista` (RPCs `enviar_solicitud_mensaje` / `aceptar_solicitud_mensaje` / `rechazar_solicitud_mensaje`).
- **UI:** bandeja `/mensajes` (conversaciones + solicitudes), hilo `/mensajes/[id]` (shell full-screen), compositor de conversación nueva `/mensajes/nuevo`.

### Revista mensual
- Una sola edición activa (índice único parcial sobre `estado = borrador`).
- Postulación de obra propia; el server resuelve la edición activa y el solicitante.
- Curación por **cualquier** administrador: aceptar/rechazar (RPC transaccionales) y **retirar** artículo (RPC `retirar_articulo` → marca la solicitud `retirada`).
- Rotación automática el día 1 de cada mes a las 13:00 UTC-6 (`pg_cron`): publica, descarta pendientes y abre el siguiente borrador.

### Moderación
- Reporte de publicaciones (4 motivos) por usuarios autenticados (no el autor).
- Panel admin `/admin/reportes`: **bloquear** (oculta la publicación vía policy RESTRICTIVE) o **descartar**.

---

## 4. Arquitectura real

- **Frontend/Backend:** una sola app **Next.js 16.2.9** (App Router, Turbopack, React 19), TypeScript strict, Tailwind v4, gestionada con **pnpm**.
- **Backend de datos:** Supabase (PostgreSQL 17 + Auth + Storage), desplegado y poblado.
- **Modelo de seguridad:** **cero `service_role`**. Todo corre con el JWT del usuario vía `@supabase/ssr` (cookies); RLS + RPC `SECURITY DEFINER` aplican la autorización. El refresco de sesión vive en `proxy.ts` (Next 16 renombró `middleware.ts`).
- **Capas de datos:** lecturas SSR en `lib/data/*` (Server Components); mutaciones y lecturas paginadas del cliente vía Route Handlers `/api/*`.
- **Superficie de código (corte 2026-07-04):** ~26 rutas de página, **45** route handlers de API (incluye `publicaciones/[id]/index` y `/chat` del RAG, y `admin/rag/backfill`), ~65 componentes.

Estructura de rutas:

```
app/
  (auth)/   login, signup
  (main)/   / · /publicacion/[id] (+/editar) · /publicar · /perfil (+/ajustes, /guardados)
            /usuario/[id] (+/seguidores) · /buscar · /revistas (+/[id])
            /mensajes (+/[id], /nuevo) · /areas · /area/[slug] · /sobre-nosotros · /terminos
  (admin)/  /admin · /admin/revistas (+/[id]) · /admin/tags · /admin/reportes
  api/      45 route handlers (auth, publicaciones (+/index, /chat RAG), comentarios,
            likes, tags, revistas, solicitudes, reportes, seguidores, guardados, perfil,
            storage, buscar, view-count, mensajes/conversaciones/solicitudes-de-mensaje,
            admin/rag/backfill)
  sitemap.ts · robots.ts
```

---

## 5. Modelo de datos (estado real)

**19 tablas** (todas con RLS, **49 políticas** en total):
`usuario`, `publicacion`, `comentario`, `like`, `tag`, `publicacion_tag`, `revista`, `revista_articulo`, `solicitud_revista`, `usuario_link`, `seguidor`, `reporte`, `guardado`, `conversacion`, `mensaje`, `solicitud_mensaje`, **`publicacion_chunk`** (embeddings `vector(384)`, HNSW coseno), **`publicacion_rag`** (estado de indexado + fingerprint sha256), **`rag_rate_limit`** (cuota del chat, 1 fila/usuario).

**4 vistas** (`security_invoker = true`): `feed_publicaciones`, `feed_trending`, `perfil_contadores`, `bandeja_conversaciones`.

**Extensiones (schema `extensions`):** `vector` (pgvector 0.8, RAG), `unaccent` + `pg_trgm` (buscador FTS/trigram). **Edge Function `embed`** (gte-small, 384 dims, `verify_jwt`) para embeddings de indexado y de la query semántica.

**21 funciones**:
- RPC de negocio admin (`SECURITY DEFINER`, validan `es_admin()`): `aceptar_solicitud`, `rechazar_solicitud`, `retirar_articulo`, `bloquear_publicacion`, `descartar_reporte`.
- RPC de mensajería (`SECURITY DEFINER`, `EXECUTE` solo `authenticated`): `enviar_mensaje`, `enviar_solicitud_mensaje`, `aceptar_solicitud_mensaje`, `rechazar_solicitud_mensaje`.
- **RPC de RAG/búsqueda:** `consumir_cuota_rag` (`SECURITY DEFINER`, cuota del chat); `match_publicacion_chunks` y `match_publicacion_chunks_global` (retrieval vectorial, `SECURITY INVOKER`); `buscar_publicaciones` y `buscar_usuarios` (FTS/trigram, `SECURITY INVOKER`); `f_unaccent` (helper IMMUTABLE).
- Sistema: `publicar_revista_mensual` (job mensual), `handle_new_user` (trigger de alta), `bloquear_cambio_rol` (trigger anti-escalada), `es_admin` (helper).
- `SECURITY INVOKER`: `get_area_counts` (conteos por área), `se_siguen` (helper de mutualidad).

**Enums**:
- `tipo_publicacion` (19 valores), `rol_usuario` (`usuario`/`administrador`), `estado_revista` (`borrador`/`publicada`).
- `estado_solicitud` (`pendiente`/`aceptada`/`rechazada`/**`retirada`**).
- `motivo_reporte` (4), `estado_reporte` (`pendiente`/`revisado`/`descartado`).

**Job `pg_cron`:** `revista-mensual`, expresión `0 19 1 * *` (día 1 de cada mes, 19:00 UTC = 13:00 UTC-6).

**Realtime:** tabla `mensaje` en la publicación `supabase_realtime` con `REPLICA IDENTITY FULL` (entrega eventos INSERT/UPDATE filtrados por `conversacion_id` para mensajes en vivo y recibos de lectura). La RLS de `mensaje`/`solicitud_mensaje` protege el canal; el cliente debe pasar el JWT con `realtime.setAuth`.

> El modelo ER del plan original (9 entidades) quedó obsoleto: las 4 tablas aditivas (`usuario_link`, `seguidor`, `reporte`, `guardado`) y el estado `retirada` se agregaron después. El detalle por tabla/columna/RLS está en `Vitrina_BD_Conexion_Backend.md`.

---

## 6. Snapshot de la base de datos viva (2026-07-04)

| Métrica | Valor |
|---|---|
| Publicaciones | 40 |
| Publicaciones indexadas para RAG (chunks > 0) | 14 (198 chunks) |
| Revistas (total / en borrador) | 3 / **1** (invariante de "una sola activa" se cumple) |
| Usuarios | 27 |

> Los conteos crecen con las pruebas manuales; el dato relevante es que exista **exactamente una** revista en `borrador`. Cobertura RAG: ~14 de ~18 PDFs con texto (el resto son imágenes sin texto extraíble; 1 libro grande y 3 fixtures con URL dummy quedan pendientes).

---

## 7. Roles y permisos (estado real)

| Acción | Usuario | Administrador |
|---|---|---|
| Registrarse / iniciar sesión | ✓ | ✓ |
| Publicar / editar / eliminar obras propias | ✓ | ✓ |
| Comentar, responder (hilos), dar like, guardar | ✓ | ✓ |
| Seguir / dejar de seguir, gestionar enlaces de perfil | ✓ | ✓ |
| Reportar una publicación | ✓ (1 por publicación) | ✓ |
| Postular obra propia a la revista del mes | ✓ | ✓ |
| Ver el estado de sus solicitudes | ✓ | ✓ |
| Mensajear en privado (solo con seguimiento mutuo) | ✓ | ✓ |
| Enviar / aceptar / rechazar solicitudes de mensaje | ✓ | ✓ |
| Eliminar **cualquier** publicación | — | ✓ (policy `admin_elimina`) |
| Aceptar / rechazar / retirar artículos de la revista | — | ✓ (cualquier admin) |
| Bloquear / descartar reportes | — | ✓ |
| Editar metadatos de la revista activa | — | ✓ |
| Gestionar catálogo de tags | — | ✓ |
| Crear / publicar revistas | — | — (automático, `pg_cron`) |

---

## 8. Seguridad (estado verificado)

Auditoría read-only contra la BD viva el **2026-06-18** (ver `SECURITY_AUDIT.md`): postura **sólida, sin hallazgos Críticos ni Altos**.

Controles verificados como correctos:
- **Cero `service_role`** en la app; todo bajo el JWT del usuario.
- PII protegida por GRANTs de columna (`anon`/`authenticated` sin `SELECT` sobre `usuario.email`; `anon` sin `rol`).
- Triple defensa anti-escalada de rol/email (grant de columna + trigger `bloquear_cambio_rol` + policy `editar_propio`).
- `search_path` fijado en todas las funciones `SECURITY DEFINER`; `security_invoker` en las vistas.
- Policy RESTRICTIVE `publicacion_oculta_bloqueadas` realmente oculta lo bloqueado.
- Aislamiento de Storage por carpeta `{auth.uid()}/…`.

**Pendiente (único hallazgo Medio):** activar **Leaked Password Protection** (HaveIBeenPwned) en el panel de Auth. El signup hoy solo valida longitud (8–72).

> **Adición 2026-06-28:** las RPC de mensajería (`SECURITY DEFINER`) mantienen la postura del §7.1: `search_path` fijado y `EXECUTE` revocado a `public`/`anon` (solo `authenticated`; el control real es la validación interna de `auth.uid()`). `get_advisors` (security) tras las migraciones no arrojó hallazgos nuevos más allá de los `WARN` ya documentados.

> **Adición 2026-07-04 (RAG + buscador):** las nuevas RPC de retrieval/búsqueda son `SECURITY INVOKER` (la RLS del llamante decide qué ve; `publicacion_chunk` respeta `bloqueada`, `match_publicacion_chunks_global` solo `authenticated`) con `search_path` fijado; `consumir_cuota_rag` es `SECURITY DEFINER` (cuota a prueba de manipulación). Las policies admin aditivas `chunk_admin_write`/`rag_admin_write` (`using es_admin()`) habilitan el backfill bajo el **JWT del admin**, sin `service_role`. Extensiones (`vector`/`unaccent`/`pg_trgm`) en el schema `extensions` (no `public`). `get_advisors` (security) tras las migraciones: sin hallazgos nuevos.

---

## 9. Deuda conocida y próximos pasos

- ⚠️ **Activar leaked-password protection** (Auth → Policies). Un clic, único hallazgo Medio abierto.
- ⚠️ **Commitear/mergear el RAG y el buscador** (rama `feat/rag-publicacion`): chat RAG, rate limit, FTS, trigram e híbrido semántico — implementados y verificados (tsc/lint + E2E), con parte ya commiteada en la rama; falta cerrar/mergear a `main`.
- ⚠️ **Commitear/mergear la mensajería** (rama `feat/mensajeria-directa`): implementada y verificada (tsc/lint), pero sin bajar a commits (bloqueo conocido del pre-commit hook por falsos positivos sobre código preexistente en `database.ts`).
- ℹ️ **Reintentar 1 PDF pendiente de indexar** ("Noches Blancas", libro grande que trip­ó el edge en el backfill); re-ejecutar `POST /api/admin/rag/backfill` (idempotente) cuando el edge esté descargado.
- 🚧 **Terminar nav responsive móvil** (rama `feat/nav-responsive-mobile`).
- ⚠️ **Verificar/realizar el despliegue en Vercel** (no confirmado en esta auditoría).
- ⚠️ **Cobertura de pruebas:** no hay test runner local; formalizar pruebas de flujos críticos vía `testsprite`/Playwright.
- ℹ️ Documentación de `promts/` **sincronizada con el estado real** el 2026-06-24 (APIs, BD y Pantallas auditados y corregidos).

Incorporado (2026-07-04, en rama `feat/rag-publicacion`, **sin mergear**):
- 🆕 **Chat RAG por publicación** (esquema aditivo vía MCP: `pgvector`, `publicacion_chunk`, `publicacion_rag`, RPC `match_publicacion_chunks`, Edge Function `embed`), con **memoria conversacional** y **rate limit** 15/h por cuenta (`rag_rate_limit` + RPC `consumir_cuota_rag`).
- 🆕 **Buscador FTS español** (`buscar_publicaciones`: `tsvector` título+resumen, stemming, prefijo, acento con `unaccent`) + **personas trigram** (`buscar_usuarios`, `pg_trgm word_similarity`).
- 🆕 **Búsqueda semántica híbrida** (`match_publicacion_chunks_global` + RRF en `lib/data/buscar.ts`), solo `/buscar` y solo logueados; **auto-index** al publicar + **backfill** admin (policies `chunk_admin_write`/`rag_admin_write`) → cobertura 1 → 14 PDFs.
- ℹ️ Docs de `promts/` re-sincronizados el 2026-07-04 (BD §3.15–§3.18, APIs, Pantallas, Estado). Advisors de seguridad sin hallazgos nuevos. Pendiente: 1 PDF grande ("Noches Blancas") que el edge no procesó (reintentable); commit/merge de la rama.

Incorporado (2026-06-28, en rama `feat/mensajeria-directa`, **sin mergear**):
- 🆕 **Mensajería directa + solicitudes de mensaje** (esquema aditivo aplicado vía MCP: `conversacion`, `mensaje`, `solicitud_mensaje`, vista `bandeja_conversaciones`, 5 funciones nuevas, Realtime). Advisors de seguridad sin hallazgos nuevos.
- 🆕 Recibos de lectura (✓✓) y badge de no leídos **en vivo** (Supabase Realtime).
- 🔧 Fixes: hidratación (`MobileMenu` con `useSyncExternalStore`, `suppressHydrationWarning`), CSP de dev (`unsafe-eval` + `wss` para Realtime), y shell full-screen del chat (anti doble-scroll).
- ℹ️ Docs de `promts/` re-sincronizados el 2026-06-28 (BD, APIs, Pantallas, Estado).

Resueltos recientemente (2026-06-24):
- ✅ `usuario.email` CHECK ampliado a 254 (migración `widen_usuario_email_check_to_254`), alineado con el signup y RFC 5321.
- ✅ Removido código muerto `revista.descripcion` (DTO + 2 páginas).

---

## 10. Restricciones y presupuesto

- **Infraestructura:** free tier (Supabase free + Vercel free). Total estimado **$10–$25 USD** (dominio/reserva opcionales).
- **Límites free tier Supabase:** 500 MB DB, 1 GB Storage, 50k MAU — holgado para el MVP. ⚠️ El job `pg_cron` ahora corre **una vez al mes** (antes semanal), por lo que aporta mucha menos actividad para evitar la pausa por inactividad del plan free — conviene asegurar actividad adicional.
- **Equipo:** 1 developer full-stack.

---

## 11. Gestión de riesgos (actualizado)

| Riesgo | Estado / Mitigación |
|---|---|
| Job mensual `pg_cron` no rota el ciclo | Mitigado: función idempotente y transaccional; job activo (`0 19 1 * *`); disparo manual de respaldo + `cron.job_run_details` documentados. |
| Zona horaria del cron mal configurada | Mitigado: `0 19 1 * *` (UTC) = día 1 de cada mes, 13:00 UTC-6 verificado. |
| Permisos entre roles | Mitigado: 49 políticas RLS + auditoría de seguridad 2026-06-18 sin hallazgos altos. |
| Archivos maliciosos/grandes | Mitigado: validación de MIME (PDF/JPG/PNG) y tamaño (≤10 MB) en cliente y servidor. |
| Contraseñas filtradas | **Abierto:** falta activar leaked-password protection. |
| Pausa del proyecto free por inactividad | ⚠️ El cron ahora es **mensual** y aporta poca actividad; conviene asegurar actividad adicional y respaldar. |

---

## 12. Criterios de éxito (estado)

| Criterio | Estado |
|---|---|
| Autenticación funcional | ✅ |
| Publicación end-to-end (con archivo) | ✅ |
| Filtrado del feed (tipo + área) | ✅ |
| Likes y comentarios | ✅ (con hilos) |
| Revista mensual (postular → aceptar → publicar) | ✅ |
| Rotación automática (una sola activa) | ✅ (verificado en vivo: 1 borrador) |
| Separación de roles | ✅ |
| Mensajería entre seguidores mutuos (DM + solicitudes, tiempo real) | ✅ Implementado (sin mergear) |
| Buscador mejorado (FTS español + trigram personas + híbrido semántico) | ✅ Implementado (sin mergear) |
| Chat RAG por publicación (grounded + memoria + rate limit) | ✅ Implementado (sin mergear) |
| Despliegue en URL pública de Vercel | ⚠️ No verificado |

**Definition of Done:** código en la rama principal, la funcionalidad pasa su prueba, sin errores en consola, reflejado en el tablero Kanban como *Hecho*.

---

*Vitrina · Informe de Estado v2.2 · 2026-07-04 (reemplaza el Plan de Proyecto v1.1)*
