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

1. Importar el repositorio en [vercel.com](https://vercel.com).
2. Agregar en **Project Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Deploy — el framework se detecta automáticamente como Next.js.

> No agregar `SUPABASE_SERVICE_ROLE_KEY` en Vercel — no existe en el proyecto.

## Cuentas de prueba

Contraseña de todas: `Archicom123!`

| Nombre | Email | Rol |
|--------|-------|-----|
| María García | `m.garcia@uaq.mx` | `usuario` |
| Carlos Romo | `c.romo@unam.mx` | `usuario` |
| Dra. Laura Vega | `l.vega@tec.mx` | `administrador` |

## Tests

No hay test runner local. Los tests se generan y ejecutan vía el MCP **testsprite**. Ver [`TEST_PLAN.md`](TEST_PLAN.md) para el plan de pruebas y resultados del ciclo de hardening (admin-capa5).
