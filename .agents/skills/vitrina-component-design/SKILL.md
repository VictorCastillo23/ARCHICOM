---
name: vitrina-component-design
description: "Trigger: new component, UI component, build a form, build a list, admin panel UI, screen design. Apply Vitrina's existing component-design conventions instead of inventing new ones."
license: Apache-2.0
metadata:
  author: "victorJavier"
  version: "1.0"
---

## Activation Contract

Load when writing or reviewing a component under `components/` or `app/**/page.tsx`, choosing Server vs Client Component, or styling with Tailwind theme tokens in this repo.

## Hard Rules

- Reuse a `components/ui/*` primitive (table below) before writing new markup. Only add a new primitive if none fits.
- Tailwind v4 theme tokens: use generated utilities (`text-text`, `bg-surface`) or the paren form `text-(--color-text)`. NEVER the v3 bracket form `text-[--color-text]` — it silently compiles to an invalid value, no build/lint error.
- No toast library exists. Errors → `role="alert"`; success → `role="status"`; both as local inline `<p>` in component state (see `NotificacionesForm.tsx`).
- Client mutations go through `apiClient`/`ApiError` (`lib/api/client.ts`) — never raw `fetch` in a component.
- `'use client'` only for interactivity (forms, search, expand/collapse, mutations). SSR reads live in `lib/data/*.ts`, called from an async Server Component.

## Decision Gates

| Primitive (`components/ui/`) | Use for | Key props |
|---|---|---|
| `Button` | any clickable action | `variant` (primary/secondary/ghost/danger), `size`, `loading` |
| `Field` | text/textarea input | `label`, `name`, `error?`, `helper?`, `multiline?`, `required?` |
| `Modal` | dialog/confirmation | `open`, `onClose`, `labelledById` — focus trap/Escape/scroll-lock built in |
| `Badge` | status pill | `tone` (neutral/info/success/warning/danger/accent) |
| `Pagination` | offset paging | `basePath`, `searchParams`, `offset`, `limit`, `hasMore` — server-driven `<Link>`s, no client state |
| `Avatar` | user identity | `nombre`, `size`, `src?` (initials fallback) |
| `EmptyState` / `ErrorState` | zero results / fetch failure | `title`, `description?`, `action?{label,href}` / `retry?()` |
| `Toggle` | persisted DB boolean | `checked`, `onChange`, `label` — `role="switch"`, never `aria-pressed` |

| Pattern | When | Fork from |
|---|---|---|
| Chip `role="radiogroup"` | few mutually-exclusive options | `components/publicar/TipoPicker.tsx` |
| Debounce+abort combobox | search-as-you-type | `components/buscar/SearchBox.tsx` |
| Expand-in-place row | list row detail already in the fetched payload | `components/admin/AdminCorreoHistorial.tsx` (no second fetch) |
| Client form w/ apiClient | mutation with loading/error/success | `components/perfil/NotificacionesForm.tsx` |

## Execution Steps

1. Check the primitive table — reuse before building raw markup.
2. Check the pattern table — fork an existing pattern before inventing one.
3. Pick Server vs Client per the Hard Rules.
4. Style only with theme utilities or paren-form tokens.
5. Run `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test` before calling the component done.

## Output Contract

State which primitives/patterns were reused (or why a new one was justified), and confirm tsc/lint/test are clean.

## References

- `components/ui/{Button,Field,Modal,Badge,Pagination,Avatar,EmptyState,ErrorState,Toggle}.tsx`
- `components/publicar/TipoPicker.tsx`, `components/buscar/SearchBox.tsx`, `components/admin/AdminCorreoHistorial.tsx`, `components/perfil/NotificacionesForm.tsx`
- `lib/api/client.ts`
- `CLAUDE.md` — "Tailwind v4 — variables de tema" section
