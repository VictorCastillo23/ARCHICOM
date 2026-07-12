# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
**Las invariantes de la sección "Arquitectura" son obligatorias — no las reinterpretes.**

## Proyecto

**Vitrina** — portafolio digital académico (MVP). Jovenes pueden publicar obras (libro, artículo, investigación, poema, dibujo, otro), las exploran/comentan/likean, y los administradores las curan en **revistas temáticas**. **Una sola app Next.js**: área pública + área admin separadas por **segmentos de ruta** (`/admin`). No es un monorepo; es un solo proyecto en la raíz, gestionado con **pnpm**.


## Arquitectura e invariantes (NO violar)

- **Backend = Supabase, YA desplegado.** RLS en todas las tablas, RPC `SECURITY DEFINER` (`aceptar_solicitud` / `rechazar_solicitud` / `consumir_cuota_rag`), vista `feed_publicaciones` (`security_invoker=true`), trigger `handle_new_user`, bucket `publicaciones`. **No modifiques el esquema sin autorización explícita** (tablas, columnas, policies). Para introspección o el endurecimiento del §7 (BD doc), usa el **MCP `supabase`**, no SQL a ciegas. Esquema actual, más allá del set base (detalle completo en `Vitrina_BD_Conexion_Backend.md`):
  - `publicacion`: tipo `recomendacion` (obra de terceros) con columnas nullable `obra_autor_externo`/`url_externa`; `autor_id` es siempre quien publica/recomienda (de sesión), nunca el autor externo. DELETE: autor propio o admin vía `es_admin()`. Columna generada `busqueda_tsv` para FTS en español, accent-insensitive (pesos título/resumen), con índice GIN (§3.6, §3.17).
  - `publicacion_chunk` / `publicacion_rag`: chunks con embedding `vector(384)` (pgvector) para el chat RAG por publicación; RLS respeta `bloqueada`. RPCs `match_publicacion_chunks` y `match_publicacion_chunks_global` son `SECURITY INVOKER` (no `security definer` → corren bajo el JWT del llamante) (§3.15, §3.18).
  - `rag_rate_limit`: cuota de 15 preguntas/hora por cuenta; solo mutable vía RPC `consumir_cuota_rag()` (`SECURITY DEFINER`, no `service_role`); el usuario solo puede leer su propia fila (§3.16).
  - RPCs `buscar_publicaciones` / `buscar_usuarios`: `SECURITY INVOKER`, `set search_path=''`, paginan devolviendo `total`; típo-tolerantes y accent-insensitive vía `pg_trgm`/`unaccent`. Búsqueda híbrida (FTS + semántico) solo SSR en `/buscar` para usuarios logueados; anónimo → solo FTS (§3.17, §3.18).
  - `coleccion` / `coleccion_publicacion`: colecciones de usuario (`publica`/`privada`), RLS por dueño, CRUD directo sin RPC (§3.19).
  - `usuario.ciudad`: columna nullable de texto libre, mismo patrón que `institucion`/`carrera` — sujeta al footgun de grants por columna (ver Footguns) (§3.19).
  - `publicacion.chat_habilitado`: columna aditiva `boolean not null default false` para publicaciones nuevas, backfilled `true` para las existentes salvo una excepción puntual. La activa el autor desde el form de publicar/editar (toggle gateado por PDF); el indexado/embeddings sigue siendo incondicional, sin relación con este flag. `/api/publicaciones/[id]/chat` valida el flag antes de invocar `consumir_cuota_rag()` (una publicación con el chat apagado no gasta cuota ni llama al LLM). Ver `Vitrina_BD_Conexion_Backend.md` §3.24.
  - `notificacion`: tabla de notificaciones in-app, escrita EXCLUSIVAMENTE por 9 triggers `SECURITY DEFINER` (owner bypassea RLS, como `handle_new_user`) — sin policy ni grant explícito de INSERT para `anon`/`authenticated`. RLS: SELECT/UPDATE/DELETE solo la fila propia (`usuario_id = auth.uid()`); el UPDATE está limitado por columna (`grant update (leida, leida_en)` únicamente, mismo blocker ya resuelto para `mensaje` — ver footgun de grants por columna y §7.1b). 4 de los 6 tipos (`obra_likeada`, `comentario_nueva`, `comentario_respuesta`, `nuevo_seguidor`) AGREGAN vía índice único parcial + `ON CONFLICT DO UPDATE` (`contador+1`) mientras la fila esté sin leer, con trigger `AFTER DELETE` simétrico que decrementa o borra la fila al deshacer la acción origen (unlike / borrar comentario / dejar de seguir); marcar como leída resetea la agregación — es el comportamiento intencional, no un bug. 5 columnas `notif_app_*` en `usuario` (una por tipo, default `true`) solo tienen `GRANT UPDATE` — NUNCA `SELECT` (mismo criterio de privacidad ya establecido para `notif_email_habilitado`, §3.21 — un `GRANT SELECT` de columna sería role-wide, no row-scoped, y filtraría preferencias entre usuarios) — se leen vía RPC `SECURITY DEFINER` self-scoped `mis_preferencias_notif_app()`. `usuario_id`/actor siempre de sesión o de la fila origen del evento, nunca del body. Ver `Vitrina_BD_Conexion_Backend.md` §3.23.
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

**Vitest** (`pnpm test`, config `vitest.config.ts`, `include: ['**/*.test.ts']`) covers only pure, side-effect-free logic — `lib/supabase/handleError.ts` (error → status/code mapping), `lib/storage/validateFile.ts` (magic-byte validation), `lib/validation/correoAdmin.ts` (admin bulk-email payload validation), and the plain-TypeScript siblings of the notif-email Edge Functions under `supabase/functions/**` (`_shared/email-template.ts`, `enviar-correo-masivo/{chunk,plain-text-to-html,validate-payload}.ts`, `enviar-notificacion-email/route-predicate.ts` — each documents in its own header why it avoids Deno-only APIs so it can run here). It does **not** cover components, pages, anything that calls Supabase directly (`lib/data/*.ts`), or the Deno `index.ts` entrypoints themselves (excluded from `tsc`, run only on Supabase's Deno runtime).

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