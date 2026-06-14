# Archicom

Portafolio digital académico (MVP). Estudiantes universitarios publican obras (libro, artículo, investigación, poema, dibujo, otro), las exploran, comentan y likean. Los administradores curan revistas temáticas.

## Stack

- **Next.js 16** (App Router, Turbopack, React 19)
- **Supabase** — PostgreSQL + Auth + Storage (ya desplegado)
- **Tailwind CSS v4**
- **TypeScript** (strict)

## Setup local

Requiere **pnpm** (el repo declara `pnpm@11.5.2` en `packageManager`; con `corepack enable` se usa la versión correcta automáticamente).

```bash
git clone <repo>
cd back
pnpm install

# Copiar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con los valores de tu proyecto Supabase
```

Variables requeridas (Supabase Dashboard → Project Settings → API):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-anon-key
```

> **No agregar** `SUPABASE_SERVICE_ROLE_KEY` — no se usa. Todas las operaciones corren bajo el JWT del usuario vía `@supabase/ssr`; RLS aplica como ese usuario.

## Comandos

```bash
pnpm dev                # servidor de desarrollo (Turbopack, puerto 3000)
pnpm build              # build de producción
pnpm start              # servidor de producción
pnpm lint               # ESLint (flat config)
pnpm exec tsc --noEmit  # type-check sin emitir
```

## Despliegue en Vercel

El proyecto ya esta publicaco con vercel en esvitrina.com
