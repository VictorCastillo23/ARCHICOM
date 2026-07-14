---
name: verify
description: Build/launch/drive recipe for verifying Vitrina (es_vitrina) changes at runtime. Use before believing a diff works.
---

# Verifying Vitrina at runtime

## Launch

- `pnpm dev` (Turbopack). Reads `.env.local`/`.env` — do not read those files
  yourself, they're access-restricted; trust the running server instead.
- **Check for an already-running dev server first**: `curl -s -o /dev/null -w
  "%{http_code}" http://localhost:3000/`. This is a single-project repo (not a
  monorepo) and the user often already has `pnpm dev` running on 3000 — reuse
  it rather than spawning a second instance. If you do start your own and
  3000 is taken, Next auto-picks 3001, prints "Ready", but then **still exits
  with code 1** a moment later once its file lock detects the other instance
  ("Another next dev server is already running... Run taskkill /PID <pid> /F
  to stop it"). Don't `taskkill` someone else's server. Just point requests
  at whichever port is actually accepting connections.

## No browser automation tool ships with this session by default

There is no Playwright/Chrome MCP tool preloaded. `.agents/skills/webapp-testing`
is referenced in CLAUDE.md but its directory is empty in this checkout — not
usable as-is. Bootstrap Playwright yourself in the scratchpad dir (~1-2 min,
do NOT install into the project's own `node_modules`):

```bash
cd <scratchpad>
npm install playwright@1.61.1 --no-audit --no-fund
npx --yes playwright@1.61.1 install chromium
```

Then drive it with a small throwaway Node script (`chromium.launch()`,
`page.goto(url, { waitUntil: 'networkidle' })`, hook `page.on('console', ...)`
and `page.on('pageerror', ...)` before `goto` to catch hydration warnings,
`page.screenshot({ path, fullPage: true })`). Run each page load via Bash
`run_in_background: true` — `networkidle` + HMR can take a few seconds.

## The three surfaces

- **Feed** — `http://localhost:3000/` (or `/?tipo=Libro`, `/?area=...` for
  filtered variants). Public, no login needed.
- **Publicación detail** — `http://localhost:3000/publicacion/<id>`. Public
  (anonymous can view), but author-only UI (e.g. postulation button) needs a
  session. Get a real id via `curl http://localhost:3000/api/publicaciones`
  (envelope: `{"data":{"publicaciones":[{id, titulo, ...}]}}`).
- **Perfil** — `http://localhost:3000/perfil`. Requires auth; anonymous
  requests 307-redirect to `/login` (expected, proxy.ts behavior — confirms
  the session guard, not a bug).

## Login gotcha — seeded accounts are BANNED right now

CLAUDE.md documents 3 seeded accounts (2 `usuario`, 1 `administrador`) but
states they are **currently banned in Supabase Auth** (`banned_until`) and
credentials are intentionally undocumented — "pedir acceso al dueño del
proyecto si hace falta reactivarlas". There is no dev-only login bypass and
no way to reach authenticated flows without that access. Treat
perfil-rendering-with-real-data and any author-only client component branch
as a **structurally BLOCKED sub-scope**, not a failure to investigate harder.
`.env.local` is also access-restricted (don't try to read it for creds).

What you *can* verify without auth: page loads (200, no crash), no hydration
console warnings, conditional-render guards that key off `isAuthor`/session
(e.g. a component correctly returning `null` for an anonymous viewer instead
of throwing).

## Misc

- `date` / the system clock is the ground truth for anything date-cycle
  related (e.g. `lib/utils/revistaCiclo.ts` day-of-month windows) — compute
  the expected state yourself before comparing to what renders. Remember the
  project's reference timezone is `America/Mexico_City`; `curl -i` response
  `Date:` headers are UTC, so convert before comparing to a MX-local day
  boundary.
- Don't run `pnpm test` or `tsc` as verification evidence — that's CI's job,
  not proof the UI works.
