<div align="center">

# 📚 Vitrina

### Portafolio digital académico para los Jovenes

Publicá tus obras, recominendá las de otros, y dejá que la comunidad las descubra, comente y postulate en las **revistas temáticas**.

[![Live](https://img.shields.io/badge/demo-esvitrina.com-000?style=for-the-badge&logo=vercel)](https://esvitrina.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-000?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-087EA4?style=for-the-badge&logo=react)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

</div>

---

## ✨ Qué es

**Vitrina** es una plataforma donde los jovenes comparten sus creaciones —investigaciones, artículos, tesis, trabajos académicos, proyectos tecnológicos, libros, escritos literarios, ilustraciones, arte visual, poesía y revistas— y recomiendan obras de terceros. La comunidad las explora por disciplina, las comenta y las likea; los administradores aceptan las publicaciones postuladas para componer **revistas temáticas semanales** que se publican automáticamente.

Una sola app **Next.js** (App Router): área pública + área de administración separadas por segmentos de ruta (`/admin`), protegidas por rol.

## 🚀 Funcionalidades

| Área | Qué incluye |
|---|---|
| 🔐 **Autenticación** | Registro con confirmación de email, login/logout, sesión persistente por cookies (`@supabase/ssr`), reenvío de confirmación |
| 📝 **Publicaciones** | Crear obra propia o **recomendar obra de terceros**, subir archivo (PDF/imagen), editar y eliminar lo propio, etiquetar por disciplina |
| 🔎 **Descubrimiento** | Feed paginado, filtros por **tipo de obra** y por **área de conocimiento**, página de detalle, perfiles públicos de autor |
| 💬 **Interacción** | Comentarios y likes en cada publicación |
| 📰 **Revistas temáticas** | Una edición activa por semana; los usuarios postulan sus obras y los administradores las curan (aceptar/rechazar) |
| 🛡️ **Panel de administración** | Gestión de revistas y artículos curados, catálogo de tags y resolución de solicitudes — todo bajo `/admin`, protegido por rol |

## 🧱 Stack

- **Next.js 16** — App Router, Turbopack, Server Components
- **React 19** + **TypeScript** (strict)
- **Supabase** — PostgreSQL + Auth + Storage (ya desplegado, con RLS y RPC `SECURITY DEFINER`)
- **Tailwind CSS v4** (vía `@tailwindcss/postcss`)
- **Vercel** — hosting + Analytics

## 🔒 Modelo de seguridad

La seguridad la dan las **políticas RLS** y las **RPC** de Supabase, que validan el rol internamente. La capa Next **no es** la capa de seguridad: existe por SSR/SEO y validación de archivos en servidor.

- **Cero `service_role`.** Toda operación corre bajo el **JWT del usuario** vía `@supabase/ssr`; RLS aplica como ese usuario (el admin es un `usuario` con `rol = administrador`).
- **Owner IDs desde la sesión**, nunca del body: `autor_id` / `usuario_id` / `solicitante_id` salen de `auth.getUser()`.
- Aceptar/rechazar solicitudes es **atómico** (vía RPC: actualiza la solicitud e inserta el artículo en una sola transacción).

## 📂 Estructura

```
app/
  (auth)/        login · signup
  (main)/        feed · publicar · publicacion/[id] · perfil · usuario/[id] · revistas
  (admin)/       admin · admin/revistas · admin/tags        ← protegido por rol
  api/<recurso>/ Route Handlers (mutaciones / lecturas paginadas del cliente)
lib/
  supabase/      client (browser) · server (@supabase/ssr) · handleError
  data/          data-layer SERVER-ONLY para lecturas SSR
  types/         DTOs + enums
  validation/    validadores (p. ej. URL para recomendaciones)
  constants/     fuente única de los tipos de publicación
proxy.ts         refresh de sesión + protección de rutas (Next 16)
```

## ⚙️ Setup local

Requiere **pnpm** (el repo declara `pnpm@11.5.2` en `packageManager`; con `corepack enable` se usa la versión correcta automáticamente).

```bash
git clone https://github.com/VictorCastillo23/Es_Vitrina.git
cd back
pnpm install
```

Crear un archivo `.env.local` en la raíz con los valores de tu proyecto Supabase (Dashboard → Project Settings → API):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-anon-key
```

> ⚠️ **No agregar** `SUPABASE_SERVICE_ROLE_KEY` — no se usa. Todas las operaciones corren bajo el JWT del usuario vía `@supabase/ssr`; RLS aplica como ese usuario.

## 🧪 Comandos

```bash
pnpm dev                # servidor de desarrollo (Turbopack, puerto 3000)
pnpm build              # build de producción
pnpm start              # servidor de producción
pnpm lint               # ESLint (flat config)
pnpm exec tsc --noEmit  # type-check sin emitir
```

## ☁️ Despliegue

Desplegado en **Vercel**: **[esvitrina.com](https://esvitrina.com)** 🌐
