## 1. Campo "ciudad" en el perfil de usuario

**Modelo de datos**

Una sola columna nueva en la tabla `usuario`:

```sql
alter table public.usuario
  add column ciudad text;
```

- **Texto libre** 

**Dónde se edita:** en `/perfil` (edición de perfil), junto a institución y carrera que ya existen — mismo formulario, sin pantalla nueva.

**Privacidad:** el campo debería ser opcional (`null` permitido) 


---

## 2. Colecciones (confirmado, con más profundidad)

**Modelo de datos**

```sql
create table public.coleccion (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuario(id) on delete cascade,
  titulo text not null,
  descripcion text,
  visibilidad text not null default 'publica' check (visibilidad in ('publica','privada')),
  creado_en timestamptz not null default now()
);

create table public.coleccion_publicacion (
  coleccion_id uuid not null references coleccion(id) on delete cascade,
  publicacion_id uuid not null references publicacion(id) on delete cascade,
  orden int not null default 0,
  agregado_en timestamptz not null default now(),
  primary key (coleccion_id, publicacion_id)
);
```

**RLS (siguiendo el mismo patrón que `seguidor`/`publicacion`):**

| Policy | FOR | TO | Regla |
|---|---|---|---|
| `coleccion_lectura_publica` | SELECT | anon, authenticated | `using (visibilidad = 'publica' or usuario_id = auth.uid())` |
| `coleccion_escritura` | INSERT/UPDATE/DELETE | authenticated | `using/with check (usuario_id = auth.uid())` |
| `coleccion_publicacion_lectura` | SELECT | igual que arriba, vía join | hereda visibilidad de la colección |
| `coleccion_publicacion_escritura` | INSERT/DELETE | authenticated | solo el dueño de la colección puede agregar/quitar |

**Endpoints:**

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/colecciones` | Crear colección (título, visibilidad) |
| `PATCH` | `/api/colecciones/[id]` | Editar metadatos (owner-only) |
| `DELETE` | `/api/colecciones/[id]` | Borrar (owner-only) |
| `POST` | `/api/colecciones/[id]/publicaciones` | Agregar obra a la colección |
| `DELETE` | `/api/colecciones/[id]/publicaciones/[pubId]` | Quitar obra |
| `GET` | `/api/colecciones/[id]` | Ver colección (respeta visibilidad) |

**UI:**
- Botón "Agregar a colección" junto al botón de "guardar" existente en cada publicación — abre un modal (reutilizando el componente `Modal` que ya tienen) con lista de tus colecciones + opción "crear nueva".
- Nueva sección "Colecciones" en el perfil (`/perfil`), junto a "Publicaciones" y "En revistas".
- Página pública `/coleccion/[id]` con listado de obras en el orden definido.

**Esfuerzo:** medio — 2 tablas nuevas + 6 endpoints + 2 pantallas, pero totalmente aditivo (no toca nada existente), igual que hicieron con mensajería y RAG.

---

## 3. Notificaciones por email (solo transaccionales + envío manual de admin)

Dos flujos distintos, conviene separarlos claramente:

### A) Transaccionales automáticas

Disparadas por evento, no por un job. Los dos casos que ya identificamos:
1. **Nueva solicitud de mensaje** (cuando alguien te escribe sin seguimiento mutuo).
2. **Tu obra fue aceptada en la revista del mes** (cuando un admin resuelve `aceptar_solicitud`).

**Cómo implementarlo:**
- Necesitas un proveedor de envío (Resend es buena opción, tiene tier gratuito de 3,000 emails/mes, se integra fácil con Next.js/Supabase Edge Functions).
- Trigger en BD (`AFTER INSERT` en `solicitud_mensaje`, `AFTER UPDATE` en `solicitud` cuando `estado` cambia a `aceptada`) que llama una Edge Function `enviar-notificacion-email`.
- Tabla de preferencias simple:

```sql
alter table public.usuario
  add column notif_email_habilitado boolean not null default true;
```

Un solo toggle en `/perfil/configuracion` ("Recibir notificaciones por correo") — no hace falta granularidad por tipo si son solo 2 eventos.

**Esfuerzo:** bajo-medio. Es la parte más simple de "notificaciones por email" porque no requiere job programado ni plantillas complejas — 2 triggers + 1 Edge Function + 2 plantillas de correo.

### B) Correo personalizado por admin

Esto es más un **mini panel de mensajería masiva**, no una notificación automática.

**Modelo de datos (opcional, para historial):**

```sql
create table public.correo_admin (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references usuario(id),
  asunto text not null,
  cuerpo text not null,
  destinatarios jsonb not null, -- lista de usuario_id o criterio (ej. {"ciudad":"León"})
  enviado_en timestamptz not null default now()
);
```

**Pantalla nueva:** `/admin/correos` con:
- Campo de asunto + cuerpo en texto plano (textarea simple, sin editor de formato — como pediste).
- Selector de destinatarios: **todos los usuarios**, **usuarios específicos** (buscador tipo el que ya usan en `PublicacionSelector`), o por criterio simple (ej. por ciudad, aprovechando el campo del punto 1).
- Botón "Enviar" → llama `POST /api/admin/correos`, que internamente hace batch-send vía el proveedor de email (cuidando límites de rate del free tier — Resend permite ~100/segundo pero mejor encolar en lotes de 50-100).

**Consideraciones:**
- Requiere `requireAdmin` en el endpoint, igual que el resto del panel admin.
- Conviene un límite o confirmación ("¿enviar a 5,000 usuarios?") para evitar envíos accidentales masivos.
- Guardar el historial (tabla `correo_admin`) ayuda a no reenviar el mismo mensaje dos veces y sirve como bitácora para las instituciones aliadas.

**Esfuerzo:** medio — 1 tabla + 1 pantalla admin + 1 endpoint con envío por lotes.

---

## 4. Compartir obra — Nivel básico (Open Graph)

**Qué hace:** cuando alguien pega el link de una publicación en WhatsApp, Facebook o Twitter/X, en vez de mostrar un link pelón, se ve una tarjeta con imagen, título y autor.

**Implementación (usando `@vercel/og`, compatible con Next.js):**

```
app/api/og/[id]/route.tsx  →  genera una imagen dinámica (PNG) con:
  - Título de la publicación
  - Nombre del autor
  - TipoBadge (reutilizando el componente/estilo ya existente)
  - Fondo con el color del área/tag correspondiente
```

Y en la página de la publicación (`app/publicacion/[id]/page.tsx` o donde esté), agregar metadata dinámica:

```tsx
export async function generateMetadata({ params }) {
  const pub = await getPublicacion(params.id);
  return {
    openGraph: {
      title: pub.titulo,
      description: pub.resumen,
      images: [`/api/og/${params.id}`],
    },
  };
}
```

**Por qué es "nivel básico":** no requiere que el usuario haga nada ni haya un botón de "compartir" — es automático en cualquier link que ya comparten hoy manualmente (WhatsApp, redes, etc.). El "nivel avanzado" (imagen descargable tipo story) quedaría para después si se quiere.

**Esfuerzo:** bajo. Es una ruta nueva + una función de metadata, sin tocar tablas ni RLS — el más barato de los 4.
