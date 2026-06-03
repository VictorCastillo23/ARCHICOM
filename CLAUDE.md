# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
**Las invariantes de la sección "Arquitectura" son obligatorias — no las reinterpretes.**

@AGENTS.md

## Proyecto

**Archicom** — portafolio digital académico (MVP). Estudiantes universitarios publican obras (libro, artículo, investigación, poema, dibujo, otro), las exploran/comentan/likean, y los administradores las curan en **revistas temáticas**. **Una sola app Next.js**: área pública + área admin separadas por **segmentos de ruta** (`/admin`). No es un monorepo; es un solo proyecto en la raíz, gestionado con **npm**.

## Arquitectura e invariantes (NO violar)

- **Backend = Supabase, YA desplegado.** 9 tablas con RLS, RPC `SECURITY DEFINER` (`aceptar_solicitud` / `rechazar_solicitud`), vista `feed_publicaciones`, trigger `handle_new_user`, bucket `publicaciones`. **No modifiques el esquema** (tablas, columnas, policies). Para introspección o el endurecimiento del §7 (BD doc), usa el **MCP `supabase`**, no SQL a ciegas.
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

Pass de los tres: `Archicom123!`

| Nombre | Email | Rol |
|---|---|---|
| María García | `m.garcia@uaq.mx` | `usuario` |
| Carlos Romo | `c.romo@unam.mx` | `usuario` |
| Dra. Laura Vega | `l.vega@tec.mx` | `administrador` |

Sembrado: 5 publicaciones (cubren los tipos), 1 revista borrador ("Ciencia y Territorio", vol. 1, editor Laura, 2 artículos curados), 3 solicitudes (una `pendiente`, una `aceptada`, una `rechazada`).

Smoke tests útiles: `GET /api/publicaciones` → 5 pubs · `GET /api/publicaciones?area=Biología` → **subconjunto** (prueba el `!inner`) · `login` (María) → `GET /api/auth/me` → su perfil (prueba cookies).

## Fuente de verdad

`prompts/Archicom_Plan_Proyecto.md`, `prompts/Archicom_BD_Conexion_Backend.md`, `prompts/Archicom_Especificaciones_APIs.md`. **Donde un doc y estas invariantes difieran, mandan las invariantes** (recogen decisiones posteriores: una sola app, cero `service_role`, Next 16).

---

## Commands

```bash
npm run dev       # Dev server (Turbopack, outputs to .next/dev)
npm run build     # Production build (Turbopack) — does NOT run lint in v16
npm run start     # Production server
npm run lint      # ESLint (flat config) — run separately from build
npx tsc --noEmit  # Type-check
npx next typegen  # Generate PageProps/LayoutProps/RouteContext helpers
```

No local test runner is configured — use the **`testsprite` MCP** to generate/run tests.

## Stack

- **Next.js 16.2.6** — App Router, Turbopack default, React 19.2.4 (single project, not a monorepo; npm)
- **TypeScript** (strict, target ES2017)
- **Tailwind CSS v4** via `@tailwindcss/postcss`
- **ESLint 9** flat config (`eslint.config.mjs`), `next/core-web-vitals` + `next/typescript`
- **Path alias**: `@/*` → repo root
- **Data**: `@supabase/supabase-js` + `@supabase/ssr`

## Next.js 16 — breaking changes vs 14/15

This version differs significantly from 14/15. For exact v16 API details, prefer the **`context7` MCP** or `node_modules/next/dist/docs/` over training data.

**Async Request APIs** — `cookies()`, `headers()`, `draftMode()`, `params`, `searchParams` are fully async; synchronous access is removed.

```ts
// CORRECT in v16
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params
}
```

Run `npx next typegen` for the `PageProps`/`LayoutProps`/`RouteContext` helpers.

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

Módulos de conocimiento que el agente usa automáticamente según el contexto. Se instalan con `npx skills add` y se registran en [skills-lock.json](skills-lock.json).

| Nombre | Ubicación | Cuándo se activa |
|---|---|---|
| `next-best-practices` | [.agents/skills/next-best-practices/SKILL.md](.agents/skills/next-best-practices/SKILL.md) | Automático al escribir/revisar código Next.js: convenciones de archivos, límites RSC, patrones de datos, async APIs, metadata, errores, route handlers, imágenes, fuentes, bundling, hydration. No invocable por el usuario. |
| `find-skills` | [.agents/skills/find-skills/SKILL.md](.agents/skills/find-skills/SKILL.md) | Cuando el usuario pregunta "¿existe un skill para X?" o quiere extender capacidades del agente. Busca en skills.sh. |
| `skill-creator` | [.agents/skills/skill-creator/SKILL.md](.agents/skills/skill-creator/SKILL.md) | Crear un skill nuevo, editar/mejorar uno existente, correr evals, u optimizar su `description`. |

## MCPs

Se configuran en [.mcp.json](.mcp.json).

| Nombre | Tipo / URL | Variables | Cuándo usar |
|---|---|---|---|
| `context7` | HTTP — `https://mcp.context7.com/mcp` | `CONTEXT7_API_KEY` | Docs actualizadas de librerías/frameworks (Next.js 16, React, Tailwind, supabase-js). **Preferir sobre memoria y sobre búsqueda web** para specs de API. |
| `github` | stdio — `npx @modelcontextprotocol/server-github` | `GITHUB_TOKEN` | API de GitHub: issues/PRs, buscar código, ramas, archivos remotos. |
| `supabase` | HTTP — `https://mcp.supabase.com/mcp` | _(auth por sesión)_ | Introspección de la BD: explorar tablas, ejecutar SQL, ver advisors/logs, aplicar el endurecimiento del §7. **Úsalo para verificar el esquema en vez de adivinar.** |
| `testsprite` | stdio — `npx @testsprite/testsprite-mcp@latest` | `TESTSPRITE_API_KEY` | Planes de testing (frontend/backend), generar y ejecutar tests. Útil para el bloque de pruebas/endurecimiento. |