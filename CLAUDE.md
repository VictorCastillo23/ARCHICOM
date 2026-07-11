# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
**Las invariantes de la sección "Arquitectura" son obligatorias — no las reinterpretes.**

## Proyecto

**Vitrina** — portafolio digital académico (MVP). Jovenes pueden publicar obras (libro, artículo, investigación, poema, dibujo, otro), las exploran/comentan/likean, y los administradores las curan en **revistas temáticas**. **Una sola app Next.js**: área pública + área admin separadas por **segmentos de ruta** (`/admin`). No es un monorepo; es un solo proyecto en la raíz, gestionado con **pnpm**.


## Arquitectura e invariantes (NO violar)

- **Backend = Supabase, YA desplegado.** 9 tablas con RLS, RPC `SECURITY DEFINER` (`aceptar_solicitud` / `rechazar_solicitud`), vista `feed_publicaciones`, trigger `handle_new_user`, bucket `publicaciones`. **No modifiques el esquema sin autorizacion explisita** (tablas, columnas, policies). Para introspección o el endurecimiento del §7 (BD doc), usa el **MCP `supabase`**, no SQL a ciegas.
  > **Excepción documentada (recomendacion-publicacion)**: el esquema se extendió de forma ADITIVA — enum `tipo_publicacion += 'recomendacion'` y columnas nullable `publicacion.obra_autor_externo`, `publicacion.url_externa`, con `feed_publicaciones` recreada preservando `security_invoker=true`. Sin cambios en RLS/RPC/policies. `autor_id` sigue siendo el recomendador (de sesión). Futuras modificaciones de esquema siguen requiriendo aprobación explícita.
  > **Excepción documentada (admin-elimina-publicacion)**: policy de DELETE ADITIVA `admin_elimina` en `publicacion` (`using es_admin()`), aprobada explícitamente. Convive con `eliminar_propio` (OR), no la modifica → autor **o** admin puede borrar. Revistas: sin migración (la policy `admin_gestiona` FOR ALL ya cubría DELETE). El borrado del admin sigue corriendo bajo su JWT (RLS, sin `service_role`); cascade limpia los hijos. Ver `Vitrina_BD_Conexion_Backend.md` §3.6.
  > **Excepción documentada (rag-publicacion)**: esquema extendido de forma ADITIVA (aprobado explícitamente) para el chat RAG por publicación — extensión `pgvector` (schema `extensions`); tablas nuevas `publicacion_chunk` (embedding `vector(384)`; RLS: SELECT si la publicación es visible —respeta `bloqueada`—, INSERT solo autor, DELETE autor o admin) y `publicacion_rag` (estado de indexado + fingerprint); RPC `match_publicacion_chunks` (`language sql stable`, **NO** `security definer` → corre bajo el JWT del llamante, RLS aplica); Edge Function `embed` (gte-small, 384 dims, `verify_jwt`). Sin cambios en tablas/columnas/RLS/RPC existentes. `autor_id` sigue saliendo de sesión. Ver `Vitrina_BD_Conexion_Backend.md` §3.15.
  > **Excepción documentada (rag-rate-limit)**: rate limit del chat RAG (15 preguntas/hora por cuenta, aditivo, aprobado explícitamente) — tabla nueva `rag_rate_limit` (una fila por usuario: contador + ventana; RLS: solo SELECT de la propia fila, **sin** INSERT/UPDATE/DELETE directos) y RPC `consumir_cuota_rag()` **`SECURITY DEFINER`** (como `es_admin`/`aceptar_solicitud`; NO es `service_role`). La RPC es el único camino de mutación del contador → el usuario no puede resetear su cuota. `execute` revocado de `anon` (solo `authenticated`); `usuario_id` sale de `auth.uid()`. Ver `Vitrina_BD_Conexion_Backend.md` §3.16.
  > **Excepción documentada (search-fts)**: búsqueda full-text del buscador (aditivo, aprobado explícitamente). Extensiones `unaccent` y `pg_trgm` en schema `extensions` (como `vector`); wrapper `public.f_unaccent(text)` IMMUTABLE (dict fijo `extensions.unaccent`) para usarlo en columna generada e índice de expresión. **Publicaciones**: columna generada STORED `publicacion.busqueda_tsv tsvector` (`to_tsvector('spanish', f_unaccent(…))` con `setweight` A=título, B=resumen → **accent-insensitive**) + índice GIN; RPC `buscar_publicaciones(p_q, p_limit, p_offset)`. **Usuarios**: índice GIN trigram de expresión sobre `f_unaccent(lower(nombre))` + RPC `buscar_usuarios(p_q, p_limit, p_offset)` (substring OR `word_similarity`/`<%` → **typo-tolerante y accent-insensitive**; solo expone `id/nombre/institucion/carrera`). Ambas RPC `language sql stable` **SECURITY INVOKER** (NO `security definer` → RLS del llamante aplica: publicaciones respeta `bloqueada`; mismo criterio que `match_publicacion_chunks`), `set search_path=''`, devuelven `total` (count-over) para paginar; `grant execute` a `anon` y `authenticated` (búsqueda pública, no toca la edge `embed`). Sin capa semántica/RAG (elegido explícitamente). Sin cambios en tablas/columnas/RLS/RPC existentes. Ver `Vitrina_BD_Conexion_Backend.md` §3.17.
  > **Excepción documentada (rag-busqueda-hibrida)**: capa semántica del buscador (aditivo, aprobado explícitamente). RPC `match_publicacion_chunks_global(p_query_embedding, p_match_count)` `language sql stable` **SECURITY INVOKER** (RLS de `publicacion_chunk` aplica, respeta `bloqueada`), `set search_path` a `public,extensions`; usa el HNSW (over-fetch + dedup al mejor chunk por publicación); `execute` solo a `authenticated`. Policies admin ADITIVAS `chunk_admin_write` (publicacion_chunk) y `rag_admin_write` (publicacion_rag) `FOR ALL using es_admin()` (espejo de `admin_elimina`) para que el **backfill** admin indexe PDFs ajenos bajo el JWT del admin (NO `service_role`). Auto-index de todo PDF al publicar (se quitó el opt-in) corre bajo el JWT del autor (RLS existente). La búsqueda híbrida (RRF de FTS + semántico) es **solo SSR en `/buscar` y solo para logueados**; anónimo → FTS (la edge `embed` no se toca). Sin generación LLM (solo retrieval). Sin cambios en tablas/columnas/RLS/RPC existentes. Ver `Vitrina_BD_Conexion_Backend.md` §3.18.
  > **Excepción documentada (perfil-colecciones-og)**: esquema extendido de forma ADITIVA (aprobado explícitamente; migraciones `add_ciudad_to_usuario` y `create_colecciones_tables`, 2026-07-08). Columna nullable `usuario.ciudad text` (texto libre, `check ≤50` chars, mismo patrón que `institucion`/`carrera`; sin RLS nueva). Dos tablas nuevas: `coleccion` (dueño `usuario_id`, `titulo ≤100`, `descripcion ≤500` nullable, `visibilidad` `publica`/`privada` default `privada`) y `coleccion_publicacion` (PK compuesta `coleccion_id, publicacion_id`, `orden`, `agregado_en`). RLS: `coleccion_select` pública-o-dueño; `coleccion_insert/update/delete` solo dueño (`usuario_id = auth.uid()`); `coleccion_publicacion_select` hereda visibilidad de la colección vía `exists`; `coleccion_publicacion_write` (`FOR ALL`) solo dueño de la colección. Sin RPC nuevas (CRUD directo bajo RLS, mismo patrón que `guardado`), sin `service_role`. La imagen Open Graph dinámica por publicación (`opengraph-image.tsx`/`twitter-image.tsx`, Satori) no toca esquema — solo lee `getPublicacion` (ya envuelto en `cache()` de React). Sin cambios en tablas/columnas/RLS/RPC existentes. Ver `Vitrina_BD_Conexion_Backend.md` §3.19 y §3.20.
- **La seguridad la dan RLS + las RPC** (validan el rol internamente). Esta capa Next **NO es** la seguridad; existe por **SSR/SEO + validación de archivos en servidor**. No dupliques verificaciones de propiedad en el cliente.
- **CERO `service_role` / `admin.ts`.** Todo se hace con el **JWT del usuario** vía `@supabase/ssr` (cookies); RLS aplica como ese usuario, incluido el admin (es un `usuario` con `rol = administrador`). Si crees necesitar `service_role`, **detente y pregunta** — algo está mal.
- **Owner IDs desde la sesión, NUNCA del body.** `autor_id` / `usuario_id` / `solicitante_id` salen siempre de `supabase.auth.getUser()`. Ignora cualquier ID de propietario que venga en el body.
- **Envelope de respuesta uniforme:**
  - Éxito: `NextResponse.json({ data }, { status })`
  - Error: `NextResponse.json({ error: { code, message } }, { status })`
- **`handleError` — mapeo del contrato (APIs §2/§5), sin "etc.":**
  - `23505` (unique) → **409** · `42501` (RLS deniega escritura) → **403**
  - `P0001` (RPC: `No autorizado`, `Solicitud no encontrada`, `La solicitud ya fue resuelta`) → **400**, conservando el `message` original (decisión explícita: respeta el contrato, no lo subas a 403)
  - Sin JWT / sesión inválida → **401** · validación propia → **400** (`code: "validation_error"`) · cualquier otro → **500**

## Reparto público / admin

La **app pública** expone solo lo que un `usuario` (rol base) puede hacer + lecturas públicas: auth, perfil propio, publicaciones propias, `publicacion_tag` (etiquetar lo propio), comentarios, likes, lectura de tags/revistas, crear y ver solicitudes propias.

Las **operaciones de admin** (crear/editar/publicar revistas, curar `revista_articulo`, gestionar el catálogo de tags con POST/PATCH/DELETE, aceptar/rechazar solicitudes vía RPC, ver solicitudes por revista) viven bajo el **segmento `/admin`** protegido por rol. No las mezcles con las rutas públicas.

## Footguns (rompen en silencio — verifícalos)

- **Refresh de sesión → en `proxy.ts`** (Next 16 renombró `middleware.ts` → `proxy.ts`; función `proxy`, runtime **`nodejs`**, no edge). Implementa el patrón `updateSession` de `@supabase/ssr`. **Es obligatorio:** sin él la sesión expira y toda la auth se cae. Protege `/perfil` y `/publicar` (→ `/login` sin sesión) y `/admin/*` (→ `/` si `rol ≠ administrador`).
- **`login` DEBE escribir las cookies de sesión** en la respuesta y **`logout` limpiarlas**. Footgun #1 de `@supabase/ssr`.
- **Filtro por área de conocimiento → usa `!inner`.** La vista `feed_publicaciones` NO expone tags (APIs §4.3). Filtra vía `/publicacion` con join: `.select('*, publicacion_tag!inner(tag!inner(area))').eq('publicacion_tag.tag.area', area)`. **Sin `!inner` devuelve TODAS las filas** — el ejemplo de la spec omite el inner join.
- **`signup`:** si Auth tiene confirmación de email activada, NO hay sesión inmediata → no asumas auto-login tras registrarse.
- **Tabla `like`:** palabra reservada en SQL (en SQL crudo es `"like"` con comillas); vía supabase-js usa `.from('like')` con normalidad.
- **Aceptar/rechazar solicitudes: SOLO vía RPC** (atomicidad: UPDATE solicitud + INSERT `revista_articulo`), nunca `PATCH` directo a `solicitud_revista`. Es operación de admin.
- **`usuario` usa grants por columna, no por tabla.** Agregar una columna con `ALTER TABLE usuario ADD COLUMN` **NO** le da `SELECT`/`UPDATE` automático a `anon`/`authenticated` — hay que otorgarlo explícito (`GRANT SELECT/UPDATE (columna) ON usuario TO ...`) en la misma migración, como ya tienen `institucion`/`carrera`. Sin el grant, cualquier query que incluya esa columna falla completa (`permission denied for column`), no solo esa columna. Incidente real: faltó en `ciudad` y tumbó `/perfil` con un `redirect('/login')` que parecía sesión expirada pero era esto. Verificar contra `information_schema.column_privileges` antes de dar por cerrado un cambio de columna en `usuario`. Ver `Vitrina_BD_Conexion_Backend.md` §3.19.

## Estructura objetivo

```
app/
  (public)/ , (admin)/            # páginas por segmento de ruta (cuando lleguen)
  api/<recurso>/route.ts          # Route Handlers (mutaciones / lecturas paginadas del cliente)
  api/<recurso>/[id]/route.ts
lib/
  supabase/client.ts              # browser (createBrowserClient, publishable key)
  supabase/server.ts              # @supabase/ssr (createServerClient, getAll/setAll, await cookies())
  supabase/handleError.ts
  data/*.ts                       # data-layer SERVER-ONLY: llamada DIRECTA desde Server Components (SSR)
  types/database.ts               # DTOs + enums (APIs §8)
proxy.ts                          # refresh de sesión + protección de rutas
.env.local.example                # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (SIN service_role)
```

**Lecturas SSR → `lib/data` (Server Components). Lo que el cliente pagina/refresca/muta → Route Handlers.** No dupliques la lógica entre ambos.

## Cuentas y datos sembrados (para verificar)

3 cuentas sembradas (2 `usuario`, 1 `administrador`). **Baneadas en Auth** (`banned_until`) — credenciales no se documentan aquí; pedir acceso al dueño del proyecto si hace falta reactivarlas para pruebas.

Sembrado: 5 publicaciones (cubren los tipos), 1 revista borrador ("Ciencia y Territorio", vol. 1, editor una de las cuentas admin, 2 artículos curados), 3 solicitudes (una `pendiente`, una `aceptada`, una `rechazada`).

Smoke tests útiles: `GET /api/publicaciones` → 5 pubs · `GET /api/publicaciones?area=Biología` → **subconjunto** (prueba el `!inner`) · `login` con una cuenta sembrada → `GET /api/auth/me` → su perfil (prueba cookies).

## Fuente de verdad

`docs/Vitrina_BD_Conexion_Backend.md`, `docs/Vitrina_Especificaciones_APIs.md`, `docs/Vitrina_Pantallas_Componentes.md` y `docs/Vitrina_Estado_Proyecto.md` (estado vivo del proyecto). **Donde un doc y estas invariantes difieran, mandan las invariantes** (recogen decisiones posteriores: una sola app, cero `service_role`, Next 16).

**Mantener los docs sincronizados (obligatorio).** Al introducir un cambio relevante —esquema de BD (enum/columna/vista/RPC/policy), contrato de API (ruta, payload, validación, código de estado, DTO) o flujo/pantalla de UI— **debes actualizar en el mismo cambio** el/los doc(s) de `docs/` que lo describan, para que sigan reflejando el estado real:
- BD (tablas, enums, vistas, RPC, RLS, Storage) → `Vitrina_BD_Conexion_Backend.md`
- Endpoints, payloads, validaciones, códigos de estado, DTOs → `Vitrina_Especificaciones_APIs.md`
- Pantallas, componentes, formularios, flujos de UI → `Vitrina_Pantallas_Componentes.md`

Cambios triviales (refactors internos sin efecto observable, renombres privados, fixes de typo) no requieren tocar los docs. Verifica contra el código real antes de redactar; no documentes lo que no exista.

**Auditorías (fotos de un momento, no specs vivos).** Reportes de assessment puntual; NO arrastran la obligación de "mantener sincronizado" que sí tienen los docs de `docs/` de arriba:
- Seguridad → `auditorias/SECURITY_AUDIT.md` (complementa el §7 de endurecimiento del `Vitrina_BD_Conexion_Backend.md`)
- UX/UI → `auditorias/Auditoria_UX_UI.md` (complementa `Vitrina_Pantallas_Componentes.md`)

---

## Commands

```bash
pnpm dev                 # Dev server (Turbopack, outputs to .next/dev)
pnpm build               # Production build (Turbopack) — does NOT run lint in v16
pnpm start               # Production server
pnpm lint                # ESLint (flat config) — run separately from build
pnpm test                # Vitest — unit tests for pure logic only (see Testing below)
pnpm exec tsc --noEmit   # Type-check
pnpm exec next typegen   # Generate PageProps/LayoutProps/RouteContext helpers
```

## Testing

**Vitest** (`pnpm test`) covers only pure, side-effect-free logic — currently `lib/supabase/handleError.ts` (error → status/code mapping) and `lib/storage/validateFile.ts` (magic-byte validation). It does **not** cover components, pages, or anything that calls Supabase directly (`lib/data/*.ts`).

For everything else — API contracts, RLS/invariant checks, and E2E flows — use the **`testsprite` MCP** to generate/run tests. It is the primary tool for backend and frontend coverage; Vitest is a narrow addition on top, not a replacement.

## Stack

- **Next.js 16.2.9** — App Router, Turbopack default, React 19.2.4 (single project, not a monorepo; pnpm)
- **TypeScript** (strict, target ES2017)
- **Tailwind CSS v4** via `@tailwindcss/postcss`
- **ESLint 9** flat config (`eslint.config.mjs`), `next/core-web-vitals` + `next/typescript`
- **Path alias**: `@/*` → repo root
- **Data**: `@supabase/supabase-js` + `@supabase/ssr`

### Tailwind v4 — variables de tema (footgun, rompe en silencio)

Para colores/espaciados del tema (definidos en `@theme` en `app/globals.css`) usá **la utility generada** (`text-text`, `bg-surface`, `border-border`, `text-text-muted`, `accent-primary`) o, si necesitás la variable explícita, **la forma de paréntesis v4**: `text-(--color-text)`, `px-(--space-page)`.

**NUNCA uses `clase-[--var]`** (ej. `text-[--color-text]`). Es la sintaxis _arbitraria_ de Tailwind **v3**; en **v4** ya no resuelve a `var(...)` → compila a un valor inválido (`color: --color-text`) y **el estilo se cae en silencio** (sin error de build, lint ni tipos). El árbitro v4 movió ese shorthand de corchetes a paréntesis.

> Excepción válida: el arbitrario **tipado** sí se usa para tamaños, p.ej. `text-[length:var(--size-heading-lg)]` — ese lleva `var(...)` completo y es correcto. Lo prohibido es el corchete con variable _pelada_ (`-[--`).

## Next.js 16 — breaking changes vs 14/15

This version differs significantly from 14/15. For exact v16 API details, prefer the **`context7` MCP** or `node_modules/next/dist/docs/` over training data.

**Async Request APIs** — `cookies()`, `headers()`, `draftMode()`, `params`, `searchParams` are fully async; synchronous access is removed.

```ts
// CORRECT in v16
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params
}
```

Run `pnpm exec next typegen` for the `PageProps`/`LayoutProps`/`RouteContext` helpers.

**`middleware` → `proxy`** — Rename `middleware.ts` → `proxy.ts`, exported `middleware` → `proxy`. Edge runtime is NOT supported in `proxy`; use `nodejs`. *(This is where the `@supabase/ssr` session refresh lives — see Footguns.)*

**`next lint` removed** — Use the `eslint` CLI; `next build` no longer lints.

**Turbopack is the default** — `next dev`/`next build` use Turbopack (Webpack via `--webpack`). Config is top-level: `const nextConfig: NextConfig = { turbopack: { /* ... */ } }`.

**Other deltas (condensed):**
- Caching: `revalidateTag('tag', 'max')` (cacheLife profile now required); new `updateTag(tag)`; `cacheLife`/`cacheTag` stable (drop `unstable_`); PPR via `cacheComponents: true`.
- `next/image`: use `images.remotePatterns` (not `images.domains`); default `minimumCacheTTL` 4h; default `qualities` `[75]`.
- Parallel routes: every `@slot` needs an explicit `default.tsx`.
- Removed: `serverRuntimeConfig`/`publicRuntimeConfig`, AMP, `experimental.dynamicIO` (→ `cacheComponents`).
- Use `eslint.config.mjs`, not `.eslintrc.*`.

## Skills

Módulos de conocimiento que el agente usa automáticamente según el contexto. Se instalan con `pnpm dlx skills add` y se registran en [skills-lock.json](skills-lock.json).

| Nombre | Ubicación | Cuándo se activa |
|---|---|---|
| `next-best-practices` | [.agents/skills/next-best-practices/SKILL.md](.agents/skills/next-best-practices/SKILL.md) | Automático al escribir/revisar código Next.js: convenciones de archivos, límites RSC, patrones de datos, async APIs, metadata, errores, route handlers, imágenes, fuentes, bundling, hydration. No invocable por el usuario. |
| `find-skills` | [.agents/skills/find-skills/SKILL.md](.agents/skills/find-skills/SKILL.md) | Cuando el usuario pregunta "¿existe un skill para X?" o quiere extender capacidades del agente. Busca en skills.sh. |
| `skill-creator` | [.agents/skills/skill-creator/SKILL.md](.agents/skills/skill-creator/SKILL.md) | Crear un skill nuevo, editar/mejorar uno existente, correr evals, u optimizar su `description`. |
| `vercel-react-best-practices` | [.agents/skills/vercel-react-best-practices/SKILL.md](.agents/skills/vercel-react-best-practices/SKILL.md) | Automático al escribir/revisar/refactorizar React/Next.js: patrones de performance de Vercel Engineering (data fetching, bundle, re-renders). |
| `frontend-design` | [.agents/skills/frontend-design/SKILL.md](.agents/skills/frontend-design/SKILL.md) | Al construir páginas, componentes o layouts con foco en calidad visual: UI pulida, evita la estética genérica de IA. |
| `web-design-guidelines` | [.agents/skills/web-design-guidelines/SKILL.md](.agents/skills/web-design-guidelines/SKILL.md) | Cuando el usuario pide revisar UI/UX, accesibilidad o auditar el diseño contra las Web Interface Guidelines. |
| `ui-ux-pro-max` | [.agents/skills/ui-ux-pro-max/SKILL.md](.agents/skills/ui-ux-pro-max/SKILL.md) | Al planear, construir, revisar o mejorar UI/UX (web o mobile): base buscable con 50+ estilos, 161 paletas, 57 pares de fuentes, 161 tipos de producto, 99 guías de UX y 25 tipos de gráficos sobre 10 stacks. Decisiones de color, tipografía, espaciado, layout, estados e interacción; integra el MCP de shadcn/ui. |
| `git-commit` | [.agents/skills/git-commit/SKILL.md](.agents/skills/git-commit/SKILL.md) | Al pedir un commit o `/commit`: detecta type/scope desde el diff, genera mensaje convencional, staging inteligente. |
| `supabase` | [.agents/skills/supabase/SKILL.md](.agents/skills/supabase/SKILL.md) | Automático en cualquier tarea de Supabase: Database, Auth, Storage, Edge Functions, Realtime, `@supabase/ssr`, sesiones/JWT/cookies, RLS, CLI/MCP, migraciones, auditorías de seguridad y extensiones de Postgres. Oficial de Supabase. |
| `supabase-postgres-best-practices` | [.agents/skills/supabase-postgres-best-practices/SKILL.md](.agents/skills/supabase-postgres-best-practices/SKILL.md) | Al escribir, revisar u optimizar queries, esquema o configuración de Postgres: performance y buenas prácticas oficiales de Supabase. Clave para las invariantes de RLS y el endurecimiento del §7 (BD). |
| `webapp-testing` | [.agents/skills/webapp-testing/SKILL.md](.agents/skills/webapp-testing/SKILL.md) | Toolkit con Playwright para probar la app local: verificar frontend, depurar UI, capturar screenshots y ver logs del navegador. Complementa el MCP `testsprite`. Oficial de Anthropic. |
| `vitrina-component-design` | [.agents/skills/vitrina-component-design/SKILL.md](.agents/skills/vitrina-component-design/SKILL.md) | Al crear o revisar componentes en `components/`/`app/**/page.tsx`: qué primitivo de `components/ui/` reusar, qué patrón ya existente clonar (radiogroup en chips, combobox debounce/abort, fila expandible in-place, form con `apiClient`), Server vs Client Component, y la regla de tokens de tema de Tailwind v4. **Autoría local del proyecto** (no instalado vía `skills add`, no está en `skills-lock.json`). |

## MCPs

Se configuran en [.mcp.json](.mcp.json).

| Nombre | Tipo / URL | Variables | Cuándo usar |
|---|---|---|---|
| `context7` | HTTP — `https://mcp.context7.com/mcp` | `CONTEXT7_API_KEY` | Docs actualizadas de librerías/frameworks (Next.js 16, React, Tailwind, supabase-js). **Preferir sobre memoria y sobre búsqueda web** para specs de API. |
| `github` | stdio — `npx @modelcontextprotocol/server-github` | `GITHUB_TOKEN` | API de GitHub: issues/PRs, buscar código, ramas, archivos remotos. |
| `supabase` | HTTP — `https://mcp.supabase.com/mcp` | _(auth por sesión)_ | Introspección de la BD: explorar tablas, ejecutar SQL, ver advisors/logs, aplicar el endurecimiento del §7. **Úsalo para verificar el esquema en vez de adivinar.** |
| `testsprite` | stdio — `npx @testsprite/testsprite-mcp@latest` | `TESTSPRITE_API_KEY` | Planes de testing (frontend/backend), generar y ejecutar tests. Útil para el bloque de pruebas/endurecimiento. |
| `postman` | stdio — `npx @postman/postman-mcp-server@latest` | `POSTMAN_API_KEY` | Colecciones, environments, mocks y specs de Postman. Útil para documentar y probar los endpoints de la API. |