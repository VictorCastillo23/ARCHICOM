  1. Estructura General de Navegación

  / (root layout)
  ├── (auth)          → sin Nav, centrado en pantalla
  │   ├── /login
  │   └── /signup
  │
  ├── (main)          → con Nav + Footer
  │   ├── /                    Feed principal
  │   ├── /publicacion/[id]    Detalle de publicación
  │   ├── /publicacion/[id]/editar  Editar publicación (autor) ← requiere sesión
  │   ├── /publicar            Nueva publicación  ← requiere sesión
  │   ├── /perfil              Mi perfil (vitrina) ← requiere sesión
  │   ├── /perfil/ajustes      Ajustes de cuenta   ← requiere sesión
  │   ├── /perfil/guardados    Mis guardados (privado) ← requiere sesión
  │   ├── /perfil/colecciones  Mis colecciones (privado) ← requiere sesión
  │   ├── /coleccion/[id]      Detalle de colección (pública o del dueño; RLS filtra visibilidad)
  │   ├── /usuario/[id]        Perfil público
  │   ├── /usuario/[id]/seguidores  Listado de seguidores/seguidos
  │   ├── /buscar              Resultados de búsqueda global (?q=)
  │   ├── /revistas            Catálogo de revistas
  │   ├── /revistas/[id]       Detalle de revista
  │   ├── /revistas/calendario Calendario editorial (ciclo mensual + edición activa)
  │   ├── /areas               Catálogo de áreas de conocimiento
  │   ├── /area/[slug]         Publicaciones por área
  │   ├── /sobre-nosotros      Página institucional (misión, visión, contacto)
  │   ├── /terminos            Términos de Servicio
  │   ├── /mensajes            Bandeja de conversaciones ← requiere sesión
  │   ├── /mensajes/[conversacionId]  Hilo de mensajes  ← requiere sesión
  │   └── /mensajes/nuevo      Nueva conversación        ← requiere sesión (?u=)
  │
  └── (admin)         → con AdminNav separada ← requiere rol administrador
      ├── /admin               Panel de control
      ├── /admin/revistas      Listado + gestión de revistas
      ├── /admin/revistas/[id] Editor de una revista
      ├── /admin/tags          Catálogo de tags
      ├── /admin/reportes      Moderación de publicaciones reportadas
      └── /admin/correos       Envío de correos masivos a usuarios

  ---

> 📋 **Auditoría UX/UI standalone:** ver `auditorias/Auditoria_UX_UI.md` (foto puntual; no es un spec vivo de este doc).

  2. Flujo de Navegación

  [Anónimo]
    → / (feed, solo lectura)
    → /publicacion/[id] (solo lectura, sin like/comentar)
    → /revistas + /revistas/[id] + /revistas/calendario
    → /usuario/[id]
    → /login → /signup

  [Usuario autenticado]
    → Todo lo anterior
    → LikeButton y ComentarioForm habilitados
    → /publicar (crear nueva publicación)
    → /perfil (ver y editar perfil propio)
    → En /publicacion/[id] de su propia obra: postular a la revista del mes (SolicitarRevistaButton)

  [Administrador]
    → Todo lo anterior
    → /admin → /admin/revistas → /admin/revistas/[id]
    → /admin/tags
    → /admin/reportes (moderación)

  proxy.ts redirige:
  - /perfil, /publicar, /mensajes* → /login si no hay sesión
  - /admin/* → / si rol ≠ administrador

  ---
  3. Pantallas — Área Pública (main)

  Shell — Layout principal

  Archivo: app/(main)/layout.tsx

  Componentes:
  - Nav.server.tsx — barra superior; resuelve la sesión en servidor (sin flash de hidratación)
    - Logo/nombre "Vitrina" → enlace a /
    - Links: Publicaciones, Revistas
    - Si hay sesión: enlace a /perfil + botón Logout
    - Si no hay sesión: enlace a /login
  - NavClient.tsx — parte interactiva de la Nav. Responsive:
    - **Desktop (≥ md):** links inline (`hidden md:flex`) — SearchBox + Revistas/Perfil/Publicar (+Admin) + Salir, o Revistas/Iniciar sesión/Crear cuenta sin sesión. El link a `/revistas/calendario` NO vive en el nav — es un botón dentro de la página `/revistas` (ver §3.9).
    - **Móvil (< md):** botón hamburguesa que abre `MobileMenu` (`md:hidden`).
    - Los links se derivan una vez de la sesión (rol-aware) y se reusan en ambos.
    - SearchBox — combobox de búsqueda global (ver §3.x abajo); en el drawer va con `fullWidth`.
    - ThemeToggle — botón sol/luna de **modo oscuro** (manual claro/oscuro, no sigue el SO). Alterna
      `data-theme` en `<html>` y persiste en `localStorage` (`theme`). Va en la barra desktop (junto al
      buscador) y en el drawer móvil (fila "Tema" al fondo). Lee el tema con `useSyncExternalStore`
      (hydration-safe). El **tema lo dan los tokens** de `@theme` en `globals.css`, redefinidos bajo
      `:root[data-theme='dark']` → recolorea todo sin tocar componentes. Un **script inline anti-FOUC**
      en `<head>` (root layout) aplica el tema guardado antes del primer paint.
  - MobileMenu.tsx — drawer lateral móvil (hamburguesa → panel deslizante). Reusa el patrón de
    backdrop de los modales (`fixed inset-0 z-50 bg-black/40`) y agrega la a11y que esos modales no
    tienen: `role="dialog" aria-modal`, focus-trap (ciclo de Tab), Escape global, scroll-lock del
    `body`, `inert` cuando está cerrado y returnFocus al botón. Cierra al navegar, al click en el
    backdrop o con Escape. Slide con `transition-transform` (respeta `prefers-reduced-motion`).
  - Footer.tsx — pie de página; enlaza a /sobre-nosotros y /terminos

  Páginas informativas (públicas, sin auth, layout main):
  - /sobre-nosotros — app/(main)/sobre-nosotros/page.tsx — descripción del proyecto, misión,
    visión, valores y contacto.
  - /terminos — app/(main)/terminos/page.tsx — Términos de Servicio (v1.0). Server Component
    estático (JSX plano, sin markdown), espeja la estructura de sobre-nosotros. Enlazada desde el
    footer y desde el checkbox de aceptación del registro (4.2).

  Widget de búsqueda global — SearchBox (components/buscar/SearchBox.tsx)
  - Siempre visible en el navbar, para usuarios anónimos y autenticados.
  - Dispara búsqueda tras debounce ~300 ms cuando el input tiene ≥ 2 caracteres.
  - Llama a GET /api/buscar?q=... (modo autocomplete, sin tipo).
  - Muestra hasta 6 sugerencias combinadas: publicaciones primero, luego usuarios (slot-fill hasta cap 6).
  - Estados del dropdown: loading (skeleton), resultados, sin resultados, error.
  - Navegación con teclado: ↓/↑ mueven el índice activo (clamp, sin wrap); Enter con sugerencia → navega a /publicacion/[id] o /usuario/[id]; Enter sin sugerencia → /buscar?q=...; Esc cierra el dropdown.
  - Click fuera del widget cierra el dropdown.
  - AbortController cancela fetches anteriores cuando el usuario sigue tipeando.
  - Accesibilidad (WCAG 2.1 AA): input role="combobox" aria-expanded aria-controls aria-autocomplete="list" aria-activedescendant; dropdown role="listbox"; opciones role="option" aria-selected.
  - No usa createBrowserClient; solo apiClient → /api/buscar.

  ---
  3.1 Feed de Publicaciones — /

  Descripción: Pantalla de inicio. Muestra todas las publicaciones con filtros y paginación. Renderizado en servidor     
  (SSR).

  Componentes:

  ┌─────────────────┬──────────────────────────────────────────┬─────────────────────────────────────────────────────┐   
  │   Componente    │                 Función                  │                        Datos                        │   
  ├─────────────────┼──────────────────────────────────────────┼─────────────────────────────────────────────────────┤   
  │ FeedFilters     │ Filtros por tipo y por área de           │ tipos[], areas[], filtro activo en URL (?tipo=,     │   
  │                 │ conocimiento                             │ ?area=)                                             │   
  ├─────────────────┼──────────────────────────────────────────┼─────────────────────────────────────────────────────┤   
  │ FeedList        │ Lista de tarjetas de publicaciones       │ publicaciones: PublicacionCardData[]                │   
  ├─────────────────┼──────────────────────────────────────────┼─────────────────────────────────────────────────────┤   
  │ PublicacionCard │ Tarjeta individual de publicación        │ titulo, resumen, tipo, nombre_autor, creado_en      │   
  ├─────────────────┼──────────────────────────────────────────┼─────────────────────────────────────────────────────┤   
  │ TipoBadge       │ Badge con el tipo (libro, artículo,      │ tipo: TipoPublicacion                               │   
  │                 │ poema…)                                  │                                                     │   
  ├─────────────────┼──────────────────────────────────────────┼─────────────────────────────────────────────────────┤   
  │ Pagination      │ Navegación anterior/siguiente            │ offset, limit, hasMore — modifica ?offset= en URL   │   
  └─────────────────┴──────────────────────────────────────────┴─────────────────────────────────────────────────────┘   

  Componentes adicionales en la home (NO listados arriba):
  - **HeroBanner** (`components/feed/HeroBanner.tsx`) — banner de conversión; se renderiza **solo para anónimos** (`!isAuthenticated`), encima de todo.
  - **VentanaRevistaBanner** (`components/feed/VentanaRevistaBanner.tsx`) — banner de postulación a revista, entre HeroBanner y TrendingSection. Ver §12.
  - **TrendingSection** — sección "Tendencias" encima del feed, solo sin filtros (`!area && !tipo`).

  Comportamiento:
  - Si hay ?area=: filtra vía getPublicacionPorArea (join !inner con publicacion_tag)
  - Si hay ?tipo=: filtra vía getFeed con parámetro tipo
  - Sin filtros: muestra el feed completo + Tendencias
  - Orden de despliegue: aleatorio por recarga (shuffle Fisher-Yates en servidor,
    por request). La selección y la paginación siguen siendo por creado_en + range;
    solo se baraja el orden visual dentro de la página.
  - **Límite por página: 24 publicaciones** (`const LIMIT = 24` en `app/(main)/page.tsx`)
  - **Miniatura de archivo en PublicacionCard** (`components/feed/PublicacionCard.tsx`): si la
    publicación tiene `archivo_url`, la card muestra una miniatura arriba del título (bleed hasta el
    borde de la Card, `aspect-[4/3]`, `object-cover`). Imagen (JPG/PNG) → la propia `archivo_url` es
    la miniatura. PDF con `archivo_thumbnail_url` (generada client-side al publicar/editar, ver
    Vitrina_Especificaciones_APIs.md §4.2) → se usa esa URL. PDF sin `archivo_thumbnail_url`
    (publicado antes de este cambio, o el render client-side falló) → ícono genérico de documento
    (SVG inline). Sin `archivo_url` (recomendación o publicación solo-enlace) → sin miniatura, card
    igual que antes. `<img>` crudo (no `next/image`): mismo patrón que
    `components/publicacion/ArchivoVistaPrevia.tsx` para URLs de Storage — `next/image` requeriría
    `images.remotePatterns` para el host de Supabase, no configurado en `next.config.ts`.

  ---
  3.2 Detalle de Publicación — /publicacion/[id]

  Descripción: Página completa de una publicación. Muestra contenido, tags, likes y comentarios.

  Componentes:

  ┌────────────────┬───────────────────────────────────────┬─────────────────────────────────────────────────────────┐   
  │   Componente   │                Función                │                          Datos                          │   
  ├────────────────┼───────────────────────────────────────┼─────────────────────────────────────────────────────────┤   
  │ TipoBadge      │ Tipo de la publicación                │ tipo                                                    │   
  ├────────────────┼───────────────────────────────────────┼─────────────────────────────────────────────────────────┤   
  │ Link al autor  │ Nombre clicable → /usuario/[autor.id] │ autor.nombre, autor.id                                  │   
  ├────────────────┼───────────────────────────────────────┼─────────────────────────────────────────────────────────┤   
  │ Resumen        │ Bloque de texto con el resumen        │ resumen                                                 │   
  ├────────────────┼───────────────────────────────────────┼─────────────────────────────────────────────────────────┤   
  │ ArchivoVista-  │ Preview embebido del archivo: imagen  │ archivo_url (opcional)                                  │
  │ Previa         │ inline / PDF en iframe; al presionar  │                                                         │
  │                │ abre en otra pestaña. Detecta tipo    │                                                         │
  │                │ por extensión; extensión desconocida  │                                                         │
  │                │ → fallback "Ver archivo".             │                                                         │
  ├────────────────┼───────────────────────────────────────┼─────────────────────────────────────────────────────────┤   
  │ Obra recomendada │ Bloque con la atribución externa    │ obra_autor_externo, url_externa (solo recomendación)   │   
  ├────────────────┼───────────────────────────────────────┼─────────────────────────────────────────────────────────┤   
  │ Enlace         │ Bloque "Ver enlace ↗" para publica-   │ url_externa (tipos no-recomendación, opcional)          │
  │                │ ciones normales con enlace externo    │                                                         │
  ├────────────────┼───────────────────────────────────────┼─────────────────────────────────────────────────────────┤   
  │ TagList        │ Lista de etiquetas                    │ tags: Tag[]                                             │   
  ├────────────────┼───────────────────────────────────────┼─────────────────────────────────────────────────────────┤   
  │ LikeButton     │ Toggle de like con contador           │ publicacionId, initialLiked, initialCount,              │   
  │                │ (feedback inmediato de la acción)     │ isAuthenticated                                         │   
  ├────────────────┼───────────────────────────────────────┼─────────────────────────────────────────────────────────┤   
  │ LikersStack    │ Prueba social: stack de avatares +    │ publicacionId, preview: {id,nombre}[], count            │   
  │                │ "A María y N más les gustó"; abre     │                                                         │   
  │                │ el modal de "quién likeó"             │                                                         │   
  ├────────────────┼───────────────────────────────────────┼─────────────────────────────────────────────────────────┤   
  │ LikersModal    │ Ventana flotante y scrolleable con    │ open, onClose, publicacionId                            │   
  │                │ la lista de usuarios que dieron like  │                                                         │   
  ├────────────────┼───────────────────────────────────────┼─────────────────────────────────────────────────────────┤   
  │ GuardarButton  │ Botón Guardar (marcador PRIVADO),     │ publicacionId, initialSaved, isAuthenticated            │   
  │                │ toggle optimista sin contador         │                                                         │   
  ├────────────────┼───────────────────────────────────────┼─────────────────────────────────────────────────────────┤   
  │ ComentarioList │ Lista de hilos (raíces + respuestas)  │ comentarios: ComentarioArbol[]                          │   
  │ (client)       │ con botón "Responder" en raíces;      │ publicacionId: string                                   │   
  │                │ formulario inline al responder;       │ isAuthenticated: boolean                                │   
  │                │ estado replyingTo: string | null      │                                                         │   
  ├────────────────┼───────────────────────────────────────┼─────────────────────────────────────────────────────────┤   
  │ ComentarioForm │ Textarea + botón. Reutilizado como    │ publicacionId: string                                   │   
  │ (client)       │ formulario raíz (permanente) e inline │ respondaA?: string | null                               │   
  │                │ en respuestas. Copy cambia según modo │ onSuccess?: () => void                                  │   
  ├────────────────┼───────────────────────────────────────┼─────────────────────────────────────────────────────────┤
  │ SolicitarRevista│ Botón "Postular a la revista de este │ publicacionId, esAutor, revistaActiva,                  │
  │ Button         │ mes" + estado de la solicitud         │ solicitudExistente (estado o null)                      │
  └────────────────┴───────────────────────────────────────┴─────────────────────────────────────────────────────────┘   

  **Cabecera de comentarios:** muestra `Comentarios ({total})` donde `total` es la suma de raíces + respuestas (proviene de `getComentariosArbol` — no de `arbol.length`).

  **Hilos (ComentarioList):**
  - Los comentarios raíz se ordenan `creado_en DESC` (más nuevo arriba). Las respuestas dentro de cada hilo se ordenan `creado_en ASC` (conversación cronológica).
  - Con sesión: cada comentario raíz muestra botón "Responder". Al hacer click aparece un `ComentarioForm` inline bajo ese raíz; si se vuelve a hacer click (o se hace click en otro "Responder") el formulario anterior se colapsa. Solo un formulario inline abierto a la vez (`replyingTo` state).
  - Las respuestas (nivel 2) NO muestran botón "Responder" — profundidad máxima 2 a nivel de UI.
  - Sin sesión: toda la estructura de raíces y respuestas es visible en modo lectura; ningún "Responder" se muestra.

  Quién dio like (LikersStack + LikersModal):
  - Debajo de la fila de acciones, `LikersStack` muestra **prueba social**: hasta 3 avatares apilados (inicial del nombre, `-space-x-2`) + copy "A María y N más les gustó". Solo se renderiza cuando `count > 0`. Es la entrada descubrible a la lista (más intuitiva que un número clickeable, y funciona en touch sin depender de hover).
  - El `preview` (hasta 3 likers) se resuelve por SSR con `getLikersPreview` (`lib/data/publicaciones.ts`) y el `count` viene de `getLikesInfo`. Tras un like, `router.refresh()` del `LikeButton` re-corre el Server Component y actualiza el stack.
  - Al hacer click, `LikersStack` abre `LikersModal`: ventana flotante y **scrolleable** (`max-h-80 overflow-y-auto`) con la lista completa, ordenada por `nombre` asc (la tabla `like` no tiene timestamp; el orden se hace en JS). Reutiliza el `Modal` de UI (focus-trap, Escape, backdrop, scroll-lock). Cada fila enlaza a `/usuario/{id}` (inicial + institución opcional).
  - **Fetch lazy:** la lista completa se pide a `GET /api/likes?publicacion_id=…` recién al abrir el modal (no en el render). Estados: cargando / error / vacío / lista. Visible también sin sesión (los likes son públicos).

  Comportamiento condicional:
  - Sin sesión: el toggle de LikeButton redirige a /login al hacer click (el corazón no queda "deshabilitado" visualmente); ComentarioForm oculto, SolicitarRevistaButton oculto; aparece aviso "Iniciá sesión para comentar" con link a /login. GuardarButton **NO** se deshabilita: al hacer click redirige a /login (punto de conversión, igual que SeguirButton).
  - Con sesión, pero NO es el autor: todo habilitado excepto SolicitarRevistaButton (solo el autor puede postular su obra)
  - Con sesión, autor, revista activa, pero ventana de postulación cerrada (día 1, o día 26 en adelante, hora `America/Mexico_City`): SolicitarRevistaButton reemplaza el botón "Postular a {titulo}" por un texto explicativo ("Las postulaciones a la edición de este mes están cerradas. Reabren el día 2 del próximo mes.") — no se intenta el POST. Ver §12 (VentanaRevistaBanner) y `lib/utils/revistaCiclo.ts`.
  - Con sesión y ES el autor:
    - Si no hay solicitud previa para la edición activa → botón "Postular a la revista de este mes" (POST /api/solicitudes con el revista_id de la edición en borrador)
    - Si ya postuló → muestra el estado (pendiente / aceptada / rechazada) en lugar del botón; si fue rechazada en una edición anterior, puede volver a postular en la edición activa
    - Si no hay edición activa en borrador → mensaje "No hay una revista abierta este mes"

  ---
  3.3 Nueva Publicación — /publicar

  Descripción: Formulario **type-first** para que el usuario autenticado cree una publicación.
  El tipo se elige primero con un selector visual agrupado (TipoPicker); el resto del formulario
  aparece y se adapta según el tipo. Ruta protegida.

  Componentes: PublicarForm (orquestador) + TipoPicker (selector) + ArchivoPreview (vista previa).

  Selector de tipo (TipoPicker): los 20 tipos como **chips clickeables agrupados por categoría**
  (no un `<select>`), expuesto como `radiogroup` accesible. Las categorías (metadata SOLO de
  frontend en `TIPO_META`, NO es columna de BD ni viaja en el payload):

  ┌─────────────────────┬──────────────────────────────────────────────────────────┐
  │      Categoría      │                          Tipos                           │
  ├─────────────────────┼──────────────────────────────────────────────────────────┤
  │ Texto y académico   │ libro, artículo, investigación, ensayo, cuento, poema,   │
  │                     │ reseña, tesis, ponencia, proyecto                        │
  ├─────────────────────┼──────────────────────────────────────────────────────────┤
  │ Arte y visual       │ dibujo, ilustración, pintura, diseño gráfico, diseño de  │
  │                     │ modas, fotografía, infografía                            │
  ├─────────────────────┼──────────────────────────────────────────────────────────┤
  │ Recomendación       │ recomendación                                            │
  ├─────────────────────┼──────────────────────────────────────────────────────────┤
  │ Otro                │ otro                                                     │
  └─────────────────────┴──────────────────────────────────────────────────────────┘

  Campos del formulario (aparecen una vez elegido el tipo): Título (text), Resumen (textarea),
  Áreas (checkboxes por área, opcional), Archivo (file, adaptativo — ver abajo).

  Comportamiento adaptativo por categoría:
  - **Arte y visual** → el archivo es "Imagen de la obra" y es **requerido** (validación en cliente:
    sin archivo no se publica). Además puede sumar un "Enlace (opcional)".
  - **Recomendación** → aparecen "Autor original" (obra_autor_externo, requerido) + "Enlace a la
    obra" (url_externa, url requerida); **sin** sección de archivo.
  - **Texto y académico / Otro** → archivo opcional (PDF/JPG/PNG, máx. 10 MB) + "Enlace a la obra
    (opcional)" (url_externa). Se requiere **al menos uno** de archivo o enlace; si el enlace se
    completa, debe ser una URL http(s) válida. La validación se hace en cliente y se reafirma en el
    endpoint.
  - **Con PDF (nuevo o ya adjunto)** → en **cada guardado** (crear o editar título/resumen/PDF) se
    (re)indexa **automáticamente** (llamada a `POST /api/publicaciones/[id]/index`) para mantener el
    chat RAG **y** la búsqueda semántica al día. La ruta es idempotente por sha256, así que una
    edición de solo metadatos es un no-op barato; un PDF reemplazado se reindexa. El auto-indexado
    es **automático** (sin checkbox opt-in ni botón manual) y **best-effort y silencioso**: si falla,
    **reintenta hasta 3 veces** (1,5 s entre intentos) y si igual no lo logra, **no muestra ningún
    error** (re-editar reintenta; el backfill admin es el fallback). Muestra "Preparando el
    documento…" durante el proceso.
  - **Con PDF (nuevo o ya adjunto)** → además aparece un toggle "Activar chat sobre el documento"
    (`chat_habilitado`, componente `Toggle`, gateado por `tienePdf`, **apagado por defecto** en
    creación). Independiente del auto-indexado de arriba: el indexado siempre corre; este toggle
    solo controla si `ChatRAGWidget` queda disponible en el detalle de la publicación (ver §14). Se
    envía siempre de forma explícita en el payload (`crearPublicacion`/`editarPublicacion`), nunca
    omitido, para poder apagarlo y no solo encenderlo.

  Flujo:
  1. El usuario elige primero el tipo en el TipoPicker; recién entonces se muestra el resto del form.
  2. Se completan los campos (adaptados a la categoría del tipo).
  3. Si hay archivo, se sube a Supabase Storage → se obtiene archivo_url.
  3.5. Si el archivo es PDF: apenas se elige (no en el submit) arranca en paralelo la generación
     client-side de una miniatura JPEG de la página 1 (`pdfjs-dist`, `lib/pdf/generateThumbnail.ts`,
     ver ArchivoPreview abajo). Al hacer submit se espera esa generación, se sube la miniatura al
     mismo bucket (segunda llamada a `POST /api/storage/upload`) y su URL se incluye como
     `archivo_thumbnail_url`. Si falla el render (PDF corrupto, etc.) o el archivo no es PDF, no se
     bloquea el publish: sigue sin miniatura (la card muestra el ícono genérico, ver §3.1).
  4. POST /api/publicaciones con los datos + URL (incluida la atribución externa cuando aplica) +
     archivo_thumbnail_url cuando se generó.
  5. Se asocian las áreas seleccionadas (POST /api/publicaciones/[id]/tags por cada una);
     cada respuesta se verifica — si alguna falla, la publicación NO se pierde y se muestra un aviso
     con enlace a la publicación creada (en vez de redirigir y arriesgar un duplicado).
  5.5. Si hay PDF, se llama automáticamente a POST /api/publicaciones/[id]/index (best-effort,
     auto-index). Un fallo se suma al aviso suave con enlace, sin perder la publicación.
  6. En éxito total: redirige a la publicación creada.

  ---
  3.3.1 Editar Publicación — /publicacion/[id]/editar

  Componente: PublicarForm (mismo componente, en modo edición vía props).

  Ruta: app/(main)/publicacion/[id]/editar/page.tsx (Server Component, SSR). Owner-only:
  resuelve sesión + getPublicacion(id); si no hay sesión → /login; si el usuario no es el autor
  (data.autor_id !== user.id) → notFound(). RLS `editar_propio` es la seguridad real; esto es UX/SSR.
  El guard de proxy.ts cubre `/publicacion/.../editar` (redirige a /login sin sesión) sin bloquear la
  lectura pública del detalle.

  PublicarForm es dual: con props `publicacionId`, `initialValues`, `initialTagIds`, `lockTipo` entra
  en modo edición:
  - Siembra los campos con los valores actuales; el **tipo queda bloqueado** (TipoPicker disabled).
  - El archivo actual se conserva; solo se re-sube si el usuario elige uno nuevo. Se mantiene la regla
    "al menos uno de archivo/enlace" (un archivo ya cargado la satisface).
  - Al elegir un archivo nuevo, `archivo_thumbnail_url` se recalcula: PDF nuevo → se regenera la
    miniatura (o se limpia a `null` si el render falla); imagen nueva → se limpia a `null` (la miniatura
    del PDF anterior ya no aplica). Sin archivo nuevo elegido, la miniatura existente no se toca. La
    miniatura vieja (si la había) se borra de Storage best-effort cuando se reemplaza.
  - Submit → PATCH /api/publicaciones/[id] (sin enviar `tipo`). Las áreas se actualizan por **diff**:
    POST las nuevas, DELETE (?tag_id=) las quitadas. En éxito redirige al detalle.
  - El botón dice "Guardar cambios" (en creación dice "Publicar").

  Punto de entrada: botón "Editar" en el bloque de acciones del autor del detalle (3.2), junto a
  "Postular" y "Eliminar", visible solo si `isAuthor`.

  ---
  3.4 Mi Perfil — /perfil

  Descripción: Vitrina / dashboard del usuario autenticado: lo que muestra (identidad, stats,
  postulaciones y publicaciones propias). La **administración de cuenta** (editar datos, enlaces,
  contraseña) vive en una pantalla aparte, `/perfil/ajustes` (3.4.1). Ruta protegida.

  Componentes:

  ┌────────────────┬───────────────────────────────────────────────┬──────────────────────────────────────────────────┐  
  │   Componente   │                    Función                    │                      Datos                       │  
  ├────────────────┼───────────────────────────────────────────────┼──────────────────────────────────────────────────┤  
  │ PerfilView     │ Muestra nombre, institución, carrera y avatar │ perfil, esPropio: true (incluye LinksStrip)      │  
  ├────────────────┼───────────────────────────────────────────────┼──────────────────────────────────────────────────┤  
  │ PerfilStats    │ Contadores (pubs, revistas, likes, seguidores)│ getPerfilStats + getConteos                      │  
  ├────────────────┼───────────────────────────────────────────────┼──────────────────────────────────────────────────┤  
  │ SolicitudesHistorial │ "Mis postulaciones"                     │ getMisSolicitudes + estadoVentana (prop única)   │  
  ├────────────────┼───────────────────────────────────────────────┼──────────────────────────────────────────────────┤  
  │ FeedList       │ Lista de publicaciones propias                │ publicaciones del usuario autenticado            │  
  └────────────────┴───────────────────────────────────────────────┴──────────────────────────────────────────────────┘  

  Secciones:
  1. Cabecera con datos actuales (PerfilView — incluye LinksStrip de solo lectura) + link "Ajustes" → /perfil/ajustes
  2. Stats (PerfilStats)
  3. "Mis postulaciones" — SolicitudesHistorial. Para cada solicitud `pendiente` de la edición en curso
     (`revista.estado === 'borrador'`) muestra "N días restantes" cuando la ventana está abierta, o un
     `Badge` "En curación editorial" cuando está cerrada (día 1, o día 26 en adelante) — nunca un número,
     nunca "0 días restantes". Solicitudes no `pendiente` no muestran este texto. `estadoVentana` se
     calcula **una sola vez** en `perfil/page.tsx` vía `getEstadoVentanaPostulacion()` y se pasa como
     prop única — no se enhebra por `getMisSolicitudes`/`SolicitudConDetalle` (el estado de la ventana
     es global y derivado del tiempo, no un dato por fila).
  4. "Mis publicaciones" — reutiliza FeedList

  Nota: los enlaces se **muestran** acá (LinksStrip, read-only) y se **editan** en /perfil/ajustes.
  La página mantiene `getLinksUsuario` en su `Promise.all` SSR porque el header los renderiza.

  ---
  3.4.1 Ajustes de cuenta — /perfil/ajustes

  Descripción: Administración de cuenta del usuario autenticado, separada de la vitrina por
  frecuencia de uso. Ruta protegida por el mismo `startsWith('/perfil')` de `proxy.ts` (sin cambios
  en el proxy). Server Component con el patrón de auth habitual (auth.getUser → getPerfil; redirect
  a /login si falta sesión o perfil).

  Componentes:

  ┌────────────────────┬───────────────────────────────────────────────┬──────────────────────────────────────────────┐  
  │     Componente     │                    Función                    │                     Datos                     │  
  ├────────────────────┼───────────────────────────────────────────────┼──────────────────────────────────────────────┤  
  │ PerfilEditForm     │ Editar nombre, institución, carrera           │ nombre, institucion, carrera → PATCH /api/perfil │  
  ├────────────────────┼───────────────────────────────────────────────┼──────────────────────────────────────────────┤  
  │ LinksEditor        │ Gestionar enlaces (alta/edición/orden/borrado)│ getLinksUsuario → POST/PATCH/DELETE /api/perfil/links* │  
  ├────────────────────┼───────────────────────────────────────────────┼──────────────────────────────────────────────┤  
  │ NotificacionesForm │ Alternar notificaciones por correo + 5 tipos  │ getPreferenciasNotificacion + getPreferenciasNotifApp → PATCH /api/perfil │  
  │                    │ de notificación in-app (Toggle ×6)            │ + PATCH /api/usuario/preferencias-notificaciones (§22)                    │  
  ├────────────────────┼───────────────────────────────────────────────┼──────────────────────────────────────────────┤  
  │ ChangePasswordForm │ Cambiar contraseña (actual + nueva + confirmar)│ POST /api/auth/change-password               │  
  └────────────────────┴───────────────────────────────────────────────┴──────────────────────────────────────────────┘  

  Secciones (en cards separadas, ordenadas por frecuencia, la de menor uso al final):
  1. Cabecera: "Ajustes de cuenta" + link "← Volver al perfil"
  2. Editar perfil (PerfilEditForm)
  3. Mis enlaces (LinksEditor)
  4. Notificaciones (NotificacionesForm) — 6 Toggles (`components/ui/Toggle.tsx`, `role="switch"` +
     `aria-checked`, distinto del `aria-pressed` de ThemeToggle), cada uno con optimistic update +
     rollback si falla, independiente de los demás (un `loadingKey` por fila, no un loading global):
     el primero persiste `notif_email_habilitado` vía PATCH /api/perfil; los 5 siguientes
     (`notif_app_comentarios`, `notif_app_seguidores`, `notif_app_revista`, `notif_app_mensajes`,
     `notif_app_likes` — separados por un `border-t`, sección "Notificaciones dentro de la app")
     persisten vía PATCH /api/usuario/preferencias-notificaciones (§22), un booleano por request.
     Valores iniciales SSR: `getPreferenciasNotificacion()` (RPC `mi_notif_email_habilitado`) y
     `getPreferenciasNotifApp()` (RPC `mis_preferencias_notif_app()`, §3.23) — ambos son el único
     camino de lectura porque estas columnas no tienen GRANT SELECT (ver BD §3.23).
  5. Seguridad — cambio de contraseña (ChangePasswordForm). La confirmación se valida en el cliente;
     el backend re-verifica la contraseña actual antes de actualizar. POST a `/api/auth/change-password`.

  ---
  3.5 Perfil Público — /usuario/[id]

  Descripción: Perfil de lectura de cualquier usuario. Sin opción de edición.

  Componentes:

  ┌────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ Componente │                                     Función                                                     │
  ├────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ PerfilView │ Igual que en /perfil pero con esPropio: false (no muestra controles de edición). Renderiza LinksStrip. │
  ├────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ FeedList   │ Publicaciones del usuario con contador en el título                                             │
  └────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────┘

  ---
  3.6 Buscador Global — /buscar?q=...

  Archivo: app/(main)/buscar/page.tsx (Server Component, SSR)

  Descripción: Página de resultados de búsqueda global. Renderiza dos secciones paralelas:
  "Publicaciones" y "Personas". Carga los primeros 6 ítems de cada sección en SSR y delega
  la carga incremental al componente VerMas (client component).

  Comportamiento:
  - q ausente, vacío o < 2 chars → EmptyState invitando a buscar. No se hace ningún fetch.
  - q válido → Promise.all([buscarPublicaciones, buscarUsuarios]) en paralelo (no waterfall).
  - Sección Publicaciones: grid de PublicacionCard; si vacío → EmptyState; si error → ErrorState.
  - Sección Personas: grid de UsuarioCard; si vacío → EmptyState; si error → ErrorState.
  - Cada sección es independiente: el error de una no oculta la otra.
  - VerMas llama a GET /api/buscar?tipo=publicacion|usuario&q=...&offset=N; appends results.
  - Motor (BD §3.17): publicaciones = full-text search en español (RPC buscar_publicaciones):
    busca en título Y resumen, con stemming, prefijo, ranking por relevancia y accent-insensitive
    (biologia ≡ biología). Usuarios = búsqueda trigram (RPC buscar_usuarios): typo-tolerante
    (cristofer→Cristopher) y accent-insensitive (perez→Pérez). Aplica igual al dropdown del navbar
    (mismo /api/buscar).
  - Capa semántica híbrida (BD §3.18) — SOLO en esta página y SOLO para logueados: la sección
    Publicaciones usa buscarPublicacionesHibrido, que fusiona el FTS con retrieval semántico sobre
    los PDFs indexados (RRF), sumando recall de contenido que no está en título/resumen. Anónimo →
    solo FTS. El dropdown del navbar NO usa semántico. VerMas pagina con FTS y deduplica contra la
    primera página híbrida.
  - generateMetadata exporta title = Búsqueda: "{q}" — Vitrina (o "Buscar — Vitrina" si sin q).

  Metadata: title dinámico con el término buscado.

  Componentes:
  - PublicacionCard (PublicacionCardData)
  - UsuarioCard (UsuarioCardData)
  - VerMas (tipo, q, initialItems, initialOffset, initialHasMore, children)
  - EmptyState (copy específico de búsqueda, sin action)
  - ErrorState (por sección)

  ---
  3.7 Catálogo de Revistas — /revistas

  Descripción: Lista de todas las revistas en estado `publicada` (`app/(main)/revistas/page.tsx`).

  Componentes:
  - **Card** por revista (`Card as="article"`).
  - **Badge (tone: info)** con el volumen (`Vol. N`) — `revista.volumen`.
  - **Link a /revistas/[id]** en el título — `revista.titulo`.
  - **EmptyState** "Sin revistas publicadas" si no hay ninguna.

  > ⚠️ **No existe "Nombre del editor" ni "Descripción":** `revista.editor_id` no existe en el esquema (cualquier admin cura cualquier edición) y `revista.descripcion` tampoco existe (verificado en la BD viva). Ni el catálogo ni el detalle de revista muestran editor ni descripción. Agregar descripción de revista requeriría una migración aditiva aprobada.

  ---
  3.8 Detalle de Revista — /revistas/[id]

  Descripción: Vista de una revista con sus artículos curados (`app/(main)/revistas/[id]/page.tsx`).

  Contenido:
  - Cabecera: badge "Publicada" + volumen (`Vol. N`) + título. (Sin descripción — ver §3.7.)
  - Lista numerada de artículos (`revista_articulo`), cada uno con título → `/publicacion/[id]` y autor → `/usuario/[id]`; cabecera "Artículos ({n})".
  - `EmptyState` si la edición no tiene artículos.

  ---
  3.9 Calendario Editorial — /revistas/calendario

  Descripción: Página pública, 100% lectura, sin mutaciones (`app/(main)/revistas/calendario/page.tsx`, Server Component con `export const metadata` estático). Explica el ciclo mensual de revistas y muestra la edición en preparación, si existe.

  Data: `getRevistaActiva()` (`lib/data/revistas.ts`) para la edición en `estado = 'borrador'`; si hay una, `getRevista(id)` para el conteo de obras curadas vía `revista_articulo.length` (no se infiere del `select('*')` de `getRevistaActiva`).

  Contenido:
  - **Explicador de ciclo:** 3 tarjetas (`Card` + `Badge`) con un array local `CICLO_ETAPAS` (sin fechas ni cómputos por instancia — solo copy genérico: apertura/publicación, postulaciones hasta el día 25, curación del 26 a fin de mes). Siempre se renderiza, sin importar el estado de `getRevistaActiva()`.
  - **Card "Edición actual":** si hay edición activa → `Badge (tone: info)` "Edición en preparación" + volumen (`Vol. N` o "Volumen pendiente" si `volumen` es null) + título + conteo de obras curadas ("N obras curadas" / "Aún sin obras curadas"). Si no hay edición activa o hay error al leerla → nota `Card` con "No hay ninguna edición abierta en este momento" (estado defensivo, no rompe la página).
  - **Link a /revistas** (`buttonClasses({ variant: 'secondary' })`) para ver el archivo de ediciones publicadas.

  > No hay "Próxima edición" con fecha estimada ni tabla de próximas ediciones: `estado_revista` solo tiene `borrador`/`publicada`, con un índice único parcial que garantiza como máximo una revista en `borrador` — cualquier fecha futura sería inventada.

  ---
  4. Pantallas — Área de Autenticación (auth)

  ▎ Layout sin Nav; centrado en pantalla, card con borde.

  4.1 Login — /login

  Componente: LoginForm

  Campos:

  ┌────────────────────────┬──────────┐
  │         Campo          │   Tipo   │
  ├────────────────────────┼──────────┤
  │ Email                  │ email    │
  ├────────────────────────┼──────────┤
  │ Contraseña             │ password │
  ├────────────────────────┼──────────┤
  │ Botón "Iniciar sesión" │ submit   │
  └────────────────────────┴──────────┘

  Comportamiento:
  - POST /api/auth/login — escribe cookies de sesión en la respuesta
  - Errores inline bajo el formulario
  - Link a /signup al pie

  ---
  4.2 Registro — /signup

  Componente: SignupForm

  Campos:

  ┌──────────────────────────────┬──────────┐
  │            Campo             │   Tipo   │
  ├──────────────────────────────┼──────────┤
  │ Nombre                       │ text     │
  ├──────────────────────────────┼──────────┤
  │ Email                        │ email    │
  ├──────────────────────────────┼──────────┤
  │ Contraseña                   │ password │
  ├──────────────────────────────┼──────────┤
  │ Acepto los Términos (→ link) │ checkbox │
  ├──────────────────────────────┼──────────┤
  │ Botón "Crear cuenta"         │ submit   │
  └──────────────────────────────┴──────────┘

  Comportamiento:
  - POST /api/auth/signup
  - El checkbox "Acepto los Términos de Servicio" es obligatorio: enlaza a /terminos
    (target="_blank") y bloquea el submit si está desmarcado (error inline + botón
    deshabilitado). El consentimiento se valida solo en cliente; no se persiste en BD.
  - Si la confirmación por email está desactivada: sesión inmediata → redirige a /
  - Si está activada: muestra aviso de verificación
  - Link a /login al pie

  ---
  5. Pantallas — Área Admin (admin)

  ▎ Layout con AdminNav separada. Accesible solo si rol = administrador.

  5.1 Panel de Control — /admin

  Descripción: Hub de navegación con tres cards de acceso rápido.

  Cards:
  - Revista del mes → /admin/revistas — ver la edición activa, curar artículos y resolver solicitudes (la creación/publicación es automática)
  - Tags → /admin/tags — crear, editar y eliminar tags del catálogo
  - Reportes → /admin/reportes — revisar y moderar publicaciones reportadas

  ---
  5.2 Gestión de Revistas — /admin/revistas

  Componente: RevistasListClient

  Funcionalidades:
  - Listado de TODAS las revistas (incluye la edición activa en borrador y las publicadas)
  - **Sin botón "Nueva revista":** las ediciones las crea el job mensual automático (`pg_cron`); el administrador no crea revistas a mano
  - La edición activa (en borrador) aparece destacada con un acceso directo a su editor
  - Cada fila con: título, estado (borrador/publicada), volumen, enlace a editar

  ---
  5.3 Editor de Revista — /admin/revistas/[id]

  Descripción: Vista de edición de la revista. Para la edición activa (en borrador) permite curar artículos y resolver solicitudes; para ediciones publicadas es de solo lectura. La publicación NO se dispara desde aquí (la hace el job mensual, día 1).

  Componentes:

  ┌─────────────────────┬──────────────────────────────────────┬─────────────────────────────────────────────────────┐   
  │     Componente      │               Función                │                        Datos                        │   
  ├─────────────────────┼──────────────────────────────────────┼─────────────────────────────────────────────────────┤   
  │ RevistaPatchForm    │ Editar metadatos de la revista       │ titulo, volumen → PATCH /api/revistas/[id].         │
  │                     │ (NO incluye estado: el cambio a      │ El campo estado lo gestiona el sistema              │
  │                     │ publicada es automático)             │                                                     │   
  ├─────────────────────┼──────────────────────────────────────┼─────────────────────────────────────────────────────┤   
  │ ArticulosList       │ Lista de publicaciones curadas en la │ revista_articulo[] — permite quitar artículos       │   
  │                     │  edición activa                      │                                                     │   
  ├─────────────────────┼──────────────────────────────────────┼─────────────────────────────────────────────────────┤   
  │ PublicacionSelector │ Selector para agregar publicaciones  │ Busca publicaciones, llama POST                     │   
  │                     │ manualmente a la edición activa      │ /api/revistas/[id]/articulos                        │   
  ├─────────────────────┼──────────────────────────────────────┼─────────────────────────────────────────────────────┤   
  │ SolicitudesList     │ Solicitudes de la edición activa.    │ Botones Aceptar (RPC aceptar_solicitud) / Rechazar  │   
  │                     │ Las pendientes se descartan solas    │ (RPC rechazar_solicitud). Cualquier admin resuelve  │   
  │                     │ el día 1 de cada mes al cerrar       │                                                     │   
  └─────────────────────┴──────────────────────────────────────┴─────────────────────────────────────────────────────┘   

  Nota: cualquier administrador puede aceptar/rechazar solicitudes de cualquier edición (no hay editor asignado). El día 1 de cada mes a las 13:00 (UTC-6) el sistema publica la edición con lo aceptado, rechaza automáticamente lo que siga pendiente y abre el borrador del mes siguiente.

  ---
  5.4 Gestión de Tags — /admin/tags

  Componente: TagsManager

  Funcionalidades:
  - Lista de todos los tags con nombre y área de conocimiento
  - Inline para crear nuevo tag: POST /api/tags
  - Editar tag existente: PATCH /api/tags/[id]
  - Eliminar tag: DELETE /api/tags/[id]

  ---
  6. Componentes UI — Design System

  Ubicados en components/ui/, reutilizados en toda la app:

  ┌────────────┬───────────────────────────────────────────────────────────────────────────────┐
  │ Componente │                                  Descripción                                  │
  ├────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ Button     │ Botón con variantes de estilo (primary, secondary, danger)                    │
  ├────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ Card       │ Contenedor con borde, radio y sombra. Acepta as prop (div, article, li)       │
  ├────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ Badge      │ Chip de texto con tone (info, success, warning, danger, neutral)              │
  ├────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ TipoBadge  │ Badge especializado para los 20 tipos de publicación, cada uno con tono propio │
  ├────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ Field      │ Wrapper de label + input/textarea + mensaje de error                          │
  ├────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ Avatar     │ Imagen circular con fallback a iniciales del nombre                           │
  ├────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ Pagination │ Botones Anterior/Siguiente que modifican ?offset= en la URL                   │
  ├────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ EmptyState │ Ilustración + título + descripción para listas vacías                         │
  ├────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ ErrorState │ Mensaje de error con título y descripción para fallos de carga                │
  └────────────┴───────────────────────────────────────────────────────────────────────────────┘

  > **UI presentes en `components/ui/` no listados arriba:** `Modal` (overlay accesible que reusan `ReportarButton` y `ConfirmDeleteModal`), `Spinner` y `PageLoading` (estados de carga).
  >
  > **Componentes de feature presentes y aún sin documentar en este archivo:** `PublicacionesRelacionadas` (detalle), `SolicitudRevistaForm` (`components/revistas/`), `EliminarPublicacionButton` + `ConfirmDeleteModal` (acciones del autor en el detalle), `EliminarRevistaButton` (admin), y los sub-componentes de links `LinkAddForm`/`LinkRow`.

  Componentes de búsqueda (components/buscar/, components/usuario/):

  ┌────────────────┬──────────────────────────────────────────────────────────────────────────────────┐
  │ Componente     │ Descripción                                                                      │
  ├────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
  │ SearchBox      │ 'use client'. Combobox de búsqueda global en la navbar. Props: ninguna.           │
  │                │ Llama a /api/buscar (autocomplete). Keyboard nav, AbortController, a11y completa. │
  ├────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
  │ VerMas         │ 'use client'. Loader incremental. Props: tipo, q, initialItems,                  │
  │                │ initialOffset, initialHasMore, children (initial SSR grid).                      │
  │                │ Importa PublicacionCard / UsuarioCard para ítems extra client-side.              │
  ├────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
  │ UsuarioCard    │ Server Component. Props: usuario: UsuarioCardData (id, nombre, institucion?,      │
  │                │ carrera?). Muestra Avatar + nombre + institución o carrera. Link a /usuario/[id]. │
  │                │ NUNCA incluye rol, email ni avatar_url — anon-safe.                              │
  └────────────────┴──────────────────────────────────────────────────────────────────────────────────┘

  ---
  7. Relación entre Componentes y Datos

  FeedPage
    └─ FeedFilters          ← lee URL params, escribe URL params
    └─ FeedList
         └─ PublicacionCard ← link a /publicacion/[id]
              └─ TipoBadge
    └─ Pagination           ← lee/escribe ?offset= en URL

  PublicacionPage
    └─ TipoBadge
    └─ Link → /usuario/[autor_id]
    └─ TagList
    └─ LikeButton           ← POST /api/likes (client component)
    └─ ComentarioList
    └─ ComentarioForm       ← POST /api/comentarios (client component)
    └─ SolicitarRevistaButton ← POST /api/solicitudes (solo el autor; obra → edición activa; deshabilitado
                                 con explainer inline cuando la ventana de postulación está cerrada)

  PerfilPage
    └─ PerfilView           ← read-only display (renderiza LinksStrip)
    └─ PerfilEditForm       ← PATCH /api/perfil (client component)
    └─ LinksEditor          ← POST/PATCH/DELETE /api/perfil/links* (client island)
    └─ FeedList             ← publicaciones propias

  AdminRevistaPage
    └─ RevistaPatchForm     ← PATCH /api/revistas/[id]
    └─ ArticulosList        ← DELETE /api/revistas/[id]/articulos
    └─ PublicacionSelector  ← POST  /api/revistas/[id]/articulos
    └─ SolicitudesList      ← POST  /api/solicitudes/[id]/aceptar
                               POST  /api/solicitudes/[id]/rechazar

  BuscarPage (/buscar?q=...)
    └─ Section "Publicaciones"
         └─ PublicacionCard (grid SSR, lista-none)
         └─ VerMas tipo="publicacion" (client — appends extra pages)
         └─ EmptyState  (si 0 resultados — copy específico de búsqueda)
         └─ ErrorState  (si buscarPublicaciones retorna error)
    └─ Section "Personas"
         └─ UsuarioCard (grid SSR)
         └─ VerMas tipo="usuario" (client — appends extra pages)
         └─ EmptyState  (si 0 resultados)
         └─ ErrorState  (si buscarUsuarios retorna error)

  ---

  ## 8. Enlaces de Perfil

  ### LinksStrip  (`components/perfil/LinksStrip.tsx`)

  - **Tipo:** Server Component (sin `'use client'`).
  - **Prop:** `links: UsuarioLink[]`
  - **Comportamiento:** Renderiza nada si `links.length === 0` (sin placeholder vacío). Muestra cada enlace como un chip con un ícono de cadena.
  - **Seguridad:** Cada `<a>` lleva **siempre** `target="_blank" rel="noopener noreferrer nofollow"` sin excepción. Centralizado aquí para que no pueda olvidarse.
  - **Usado en:** `PerfilView` — visible en `/perfil` (propietario) y `/usuario/[id]` (visitante anónimo o autenticado).

  ### LinksEditor  (`components/perfil/LinksEditor.tsx`)

  - **Tipo:** Client Component (`'use client'`).
  - **Prop:** `initialLinks: UsuarioLink[]`
  - **Ubicado en:** `/perfil` como `<section aria-label="Mis enlaces">` independiente, debajo del formulario de edición de perfil.
  - **Operaciones:**
    - **Agregar:** formulario inline con campos `etiqueta` + `url`. Botón deshabilitado cuando `links.length >= LINK_LIMIT (10)`. POST a `/api/perfil/links`.
    - **Editar:** modo de edición inline por fila. PATCH a `/api/perfil/links/[id]`.
    - **Eliminar:** botón "Eliminar" por fila. DELETE a `/api/perfil/links/[id]`.
    - **Reordenar:** botones ↑/↓ por fila. **Optimistic update con rollback:** ordena la lista local inmediatamente, luego PATCH a `/api/perfil/links` con `{ orden: string[] }`. Si la llamada falla, revierte al orden anterior y muestra el error. Mismo patrón de rollback que `LikeButton`.
  - **Validación cliente:** `isHttpsUrl` (de `lib/validation/url.ts`) en `onBlur` y en submit. Muestra error inline antes de enviar la request. El servidor revalida siempre (authoritative).
  - **Después de mutaciones:** llama `router.refresh()` para resincronizar el estado SSR.
  - **Usa:** `Button` (variants: secondary para agregar, primary para guardar, ghost para cancelar/editar, danger para eliminar) y `Field` (etiqueta, url inputs).

  ### PerfilView — soporte de enlaces

  - Nueva prop opcional: `links?: UsuarioLink[]` (default `[]`).
  - Importa y renderiza `<LinksStrip links={links} />` debajo de los datos de perfil (institución, carrera, email, enlace público).
  - Ambas páginas (`/perfil` y `/usuario/[id]`) pasan `links` usando `getLinksUsuario` en su `Promise.all` SSR.

  ---

  ## 9. Seguidores

  ### SeguirButton  (`components/usuario/SeguirButton.tsx`)

  - **Tipo:** Client Component (`'use client'`).
  - **Props:** `seguidoId: string`, `initialFollowing?: boolean` (default `false`), `isAuthenticated?: boolean` (default `false`).
  - **Patrón:** Optimistic toggle idéntico a `LikeButton`: snapshot `wasFollowing` → `setFollowing(!was)` → llamada API → `router.refresh()` → rollback en catch. `ApiError` no se propaga (409 "ya seguís" es benigno); los errores inesperados se loguean.
  - **Follow:** POST `/api/seguidores` body `{ seguido_id: seguidoId }`.
  - **Unfollow:** DELETE `/api/seguidores/${encodeURIComponent(seguidoId)}`.
  - **Sin sesión:** redirige a `/login` en lugar de llamar la API.
  - **Accesibilidad:** `aria-pressed={following}`, `aria-label` dinámico ("Seguir" / "Dejar de seguir").
  - **Visibilidad (decidida en la página, no en el botón):** Solo se renderiza desde `/usuario/[id]/page.tsx` cuando `viewer && viewer.id !== perfil.id`. No aparece en `/perfil` (perfil propio) ni para visitantes anónimos.

  ### PerfilStats — soporte de seguidores

  Nuevas props opcionales: `usuarioId?: string`, `seguidores?: number`, `seguidos?: number`.

  - Cuando `seguidores` es provisto, renderiza un Badge "X seguidores". Si `usuarioId` también está presente, el badge es un `<Link>` a `/usuario/[usuarioId]/seguidores?tipo=seguidores`.
  - Cuando `seguidos` es provisto, renderiza un Badge "X seguidos". Si `usuarioId` está presente, enlaza a `/usuario/[usuarioId]/seguidores?tipo=seguidos`.
  - Props existentes (`totalPublicaciones`, `totalEnRevistas`, `totalLikes`) sin cambios — callers previos no se ven afectados.
  - Datos fuente: `getConteos(userId)` en `lib/data/seguidores.ts`, añadido al `Promise.all` de las páginas `/perfil` y `/usuario/[id]`.

  ### /usuario/[id]/seguidores  (`app/(main)/usuario/[id]/seguidores/page.tsx`)

  - **Tipo:** Server Component async (SSR).
  - **Props:** `params: Promise<{ id }>`, `searchParams: Promise<{ tipo? }>`.
  - **Lógica:** Lee `tipo` de `searchParams` (default `"seguidores"`). Llama `getSeguidores(id)` o `getSeguidos(id)` con `limit: 50`. Si el perfil no existe → `notFound()`.
  - **Estructura:**
    - Breadcrumb "← Volver al perfil de {nombre}".
    - Título dinámico ("Seguidores de X" / "X sigue a").
    - Dos tab-links: **Seguidores** / **Siguiendo** (Tailwind active classes por `tipo`).
    - Grid `sm:grid-cols-2 lg:grid-cols-3` de `UsuarioCard` (cada uno enlaza a `/usuario/[id]`).
    - `EmptyState` cuando la lista está vacía.
  - **generateMetadata:** título "Seguidores de {nombre} — Vitrina".
  - **No pagina en MVP:** carga hasta 50 con `getSeguidores/getSeguidos` directo. El endpoint `GET /api/seguidores` queda disponible para "carga más" futuro.

  ---

  ## 10. Moderación de Reportes

  ### ReportarButton (`components/publicacion/ReportarButton.tsx`)

  - **Tipo:** Client Component (`'use client'`).
  - **Props:** `publicacionId: string`, `isAuthenticated: boolean`.
  - **Visibilidad:** Solo se renderiza cuando `isAuthenticated = true`. La página lo pasa `{isAuthenticated && !isAuthor}` para ocultar el botón al autor de la publicación.
  - **Comportamiento:**
    - Muestra un botón de texto discreto "Reportar publicación".
    - Al hacer click, abre un modal (overlay fijo, `role="dialog"`, `aria-modal`).
    - Modal contiene: `<select>` con los 4 motivos (`contenido_inapropiado`, `plagio`, `spam`, `otro`) en español; `<textarea>` opcional (máx. 500 chars) con contador; botones Cancelar y Enviar reporte.
    - Submit → POST `/api/reportes { publicacion_id, motivo, detalle }`.
    - On success (201): muestra "Gracias, recibimos tu reporte." y cierra el modal tras 1.5 s.
    - On 409 (duplicado): muestra inline "Ya reportaste esta publicación." (no cierra el modal).
    - Otros errores: mensaje genérico inline.
  - **Placement en `/publicacion/[id]`:** Debajo del `LikeButton`, solo para usuarios autenticados que no son el autor.

  ### ReportesList (`components/admin/reportes/ReportesList.tsx`)

  - **Tipo:** Client Component (`'use client'`), clonado de `SolicitudesList`.
  - **Props:** ninguna (`revistaId` no aplica — lista todos los pendientes).
  - **Fetch:** `useEffect` → `apiClient<{ reportes: ReporteConDetalle[] }>('/api/reportes?estado=pendiente')`.
  - **Cada fila muestra:** link a `/publicacion/{publicacion_id}`, badge de motivo, nombre del reportante, detalle (line-clamp-2), fecha.
  - **Acciones por fila:**
    - **Bloquear** (`variant="danger"`) → POST `/api/reportes/{id}/bloquear`; on 204: eliminación optimista de la fila.
    - **Descartar** (`variant="ghost"`) → POST `/api/reportes/{id}/descartar`; on 204: eliminación optimista.
    - Errores → `alert(message)`.
  - **Estados:** loading, `ErrorState` con retry, `EmptyState` "Sin reportes pendientes", lista de filas.

  ### `/admin/reportes` — Pantalla de moderación

  - **Archivo:** `app/(admin)/admin/reportes/page.tsx` (Server Component).
  - **Metadata:** `{ title: 'Reportes' }`.
  - **Estructura:** heading block con subtítulo "Moderación" + descripción; `<ReportesList />`.
  - **Acceso:** protegido por `proxy.ts` (`/admin/*` → `/` si `rol ≠ administrador`). No requiere auth check adicional en la página.

  ### Panel de admin (`/admin`) — tile Reportes

  - **Archivo:** `app/(admin)/admin/page.tsx` (editado).
  - Tercer tile en la grilla `sm:grid-cols-2`: **"Reportes"** → `/admin/reportes`, descripción "Revisá y moderá publicaciones reportadas."

  ### AdminNav — entrada Reportes

  - **Archivo:** `components/admin/AdminNav.tsx` (editado).
  - Entrada `{ href: '/admin/reportes', label: 'Reportes' }` añadida al array `links`, después de "Tags".

  ---

  ## 11. Guardados

  ### GuardarButton  (`components/publicacion/GuardarButton.tsx`)

  - **Tipo:** Client Component (`'use client'`).
  - **Props:** `publicacionId: string`, `initialSaved?: boolean` (default `false`), `isAuthenticated?: boolean` (default `false`).
  - **Patrón:** Optimistic toggle idéntico a `LikeButton` pero **sin contador** (boolean puro): snapshot `wasSaved` → `setSaved(!was)` → llamada API → `router.refresh()` → rollback en catch. `ApiError` no se propaga; los errores inesperados se loguean.
  - **Guardar:** POST `/api/guardados` body `{ publicacion_id: publicacionId }`.
  - **Quitar:** DELETE `/api/guardados/${encodeURIComponent(publicacionId)}`.
  - **Sin sesión:** NO se deshabilita; al hacer click redirige a `/login` (punto de conversión, igual que `SeguirButton`).
  - **Accesibilidad:** `aria-pressed={saved}`, `aria-label` dinámico ("Guardar" / "Quitar de guardados").
  - **Ubicación:** junto al `LikeButton` en `/publicacion/[id]`.

  ### /perfil/guardados  (`app/(main)/perfil/guardados/page.tsx`)

  - **Tipo:** Server Component async (SSR). Ruta protegida por el `startsWith('/perfil')` de `proxy.ts` (sin cambios en proxy); redirect defensivo a `/login` si no hay sesión.
  - **Datos:** `getMisGuardados(user.id)` en `lib/data/guardados.ts` → `PublicacionCardData[]`, ordenado por fecha de guardado (`guardado.creado_en desc`).
  - **Estructura:** breadcrumb "← Mi perfil", título "Mis guardados", luego `FeedList` con las publicaciones (reusa el componente del feed). Lista vacía → `EmptyState` ("No guardaste ninguna publicación", acción "Explorar publicaciones" → `/`).
  - **metadata:** título "Mis guardados — Vitrina".
  - **Acceso desde UI:** link "Guardados" en la cabecera de `/perfil` (junto a "Ajustes").

  ---

## 12. Trending, Áreas y CTAs

### VentanaRevistaBanner (`components/feed/VentanaRevistaBanner.tsx`)

- **Tipo:** Server Component (sin `'use client'`).
- **Props:** `{ revista: { id: string; titulo: string }; diasRestantes: number }` (`diasRestantes` nunca `null` acá — solo se renderiza cuando la ventana está abierta).
- **Ubicación en UI:** home (`app/(main)/page.tsx`), entre `HeroBanner` y `TrendingSection`.
- **Condición de render:** solo cuando NO hay filtros activos (`!area && !tipo`) **Y** existe una revista activa (`getRevistaActiva()`) **Y** la ventana de postulación está abierta (`getEstadoVentanaPostulacion().abierta`, días 2–25 `America/Mexico_City`). Si falta cualquiera de las tres condiciones, no se renderiza nada (sin banner, sin error).
- **Render:** `Badge` "Postulaciones abiertas" + texto con el título de la revista y "quedan N días" (o "queda 1 día"); CTA → `/publicar`.
- **Estilo:** mismo patrón visual que `HeroBanner` (`rounded-lg bg-surface-muted border border-border`).
- **No hay countdown ni recomputo en cliente:** el estado se calcula server-side por request; no hay hidratación ni `setInterval`.

### TrendingSection (`components/feed/TrendingSection.tsx`)

- **Tipo:** Server Component (sin `'use client'`).
- **Props:** `{ items: PublicacionCardData[] }`.
- **Ubicación en UI:** home (`app/(main)/page.tsx`) ENCIMA del feed normal. Solo aparece cuando no hay filtros activos (`!area && !tipo`).
- **Render:** `<h2>Tendencias</h2>` + subtítulo + `<FeedList publicaciones={items} />`. Si `items.length === 0` → `EmptyState` (título "No hay tendencias aún", sin acción).
- **Orden:** score descendente (ordering IS the feature — sin `shuffle()`).
- **Fetch:** `getTrendingFeed({ limit: 3 })` desde `lib/data/trending.ts`. Se resuelve en paralelo con `getFeed` via `Promise.all` (sin waterfall).

### /area/[slug] (`app/(main)/area/[slug]/page.tsx`)

- **Tipo:** Server Component async (SSR). `dynamicParams = true` (default).
- **Parámetros:** `slug` (await params — Next 16 async params).
- **Resolución:** `SLUG_TO_AREA[slug]` → `notFound()` si no existe. `countForArea(area) < 3` → `notFound()` (thin-content gate).
- **Datos:** `getPublicacionPorArea({ area, limit, offset })` — función existente, sin cambios.
- **Render:** `<h1>{area}</h1>` + descripción + contador "N publicaciones" + `<FeedList areaActivo={area} />` + `<Pagination basePath="/area/{slug}" />`.
- **SEO:** `generateMetadata` → título `"{Área} — Vitrina"`, canonical `/area/{slug}`. `generateStaticParams` → slugs de áreas con ≥3 pubs via `getAreasConMinimo(3)`.
- **Nota:** `/?area=` sigue funcionando sin cambios — son dos superficies independientes.

### /areas (`app/(main)/areas/page.tsx`)

- **Tipo:** Server Component (SSR).
- **Datos:** `getAreasConMinimo(3)` filtra áreas con ≥3 publicaciones.
- **Render:** grid de cards `<Link href="/area/{slug}">` con nombre del área y conteo. Solo áreas en `AREA_TO_SLUG`. Lista vacía → `EmptyState`.
- **metadata:** título "Áreas — Vitrina".
- **Acceso desde UI:** link "Áreas" en el Footer (primera nav).

### Sitemap y robots

- `app/sitemap.ts`: rutas estáticas (`/`, `/areas`, `/sobre-nosotros`, `/terminos`, `/revistas`) + una entrada por área con ≥3 pubs. URL base desde `NEXT_PUBLIC_SITE_URL` (fallback a constante si no está).
- `app/robots.ts`: `Allow: /`, `Disallow: ['/admin', '/api']`, `Sitemap:` apunta a `{base}/sitemap.xml`.

### Footer — enlace Áreas

- `components/layout/Footer.tsx`: se añadió `<Link href="/areas">Áreas</Link>` en la primera `<nav>` junto a "Sobre nosotros" y "Términos".

### AnonFollowCTA (`components/publicacion/AnonFollowCTA.tsx`)

- **Tipo:** Server Component.
- **Props:** `{ autorNombre: string }`.
- **Ubicación:** detail page (`/publicacion/[id]`), DESPUÉS del bloque like/save/report y ANTES de los comentarios.
- **Condición de render:** `!isAuthenticated && autor` (gateado en el page, no en el componente).
- **Render:** card con copy "¿Te gustó el trabajo de {autorNombre}?" y `<Link href="/signup">` estilizado como botón primario.
- **LikeButton:** NO modificado — sigue redirigiendo a `/login` (comportamiento existente, sin cambios).

### AnonViewBanner (`components/publicacion/AnonViewBanner.tsx`)

- **Tipo:** Client Component (`'use client'`).
- **Ubicación:** final del `<article>` en detail page, gateado `!isAuthenticated`.
- **Comportamiento:**
  1. On mount: si `document.cookie` incluye `vitrina_banner_dismissed=1`, no hace nada.
  2. `POST /api/view-count` via `apiClient`. Si `showBanner: true` → muestra el banner.
  3. Errores se silencian (fail silently).
- **Dismiss:** escribe `vitrina_banner_dismissed=1` a `document.cookie` (sesión, sin httpOnly). Oculta el banner.
- **UI:** `fixed inset-x-0 bottom-0` — no bloquea lectura, no es modal. Mensaje + link `/signup` + botón ×.
- **Tailwind v4:** usa utilidades generadas (`bg-surface`, `border-border`, `text-text`, `text-text-muted`) — nunca `clase-[--var]`.

---

## 13. Mensajería Directa

Mensajería 1-a-1 privada entre usuarios que se siguen mutuamente. Todas las rutas bajo `/mensajes` están protegidas por `proxy.ts` (`pathname.startsWith('/mensajes')` → redirect a `/login` sin sesión). Para el esquema de BD y los endpoints ver `Vitrina_BD_Conexion_Backend.md` §3.13 y `Vitrina_Especificaciones_APIs.md` §14.

### /mensajes — Bandeja (`app/(main)/mensajes/page.tsx`)

- **Tipo:** Server Component async (SSR).
- **Datos:** `Promise.all([getConversaciones(user.id), getSolicitudesMensajeRecibidas(user.id)])` — ambas llamadas en paralelo.
- **Estructura:**
  - `<h1>Mensajes</h1>`.
  - **Sección "Solicitudes"** (encima de las conversaciones): si `solicitudesList.length > 0`, renderiza `<SolicitudesMensajeList solicitudes={solicitudesList} />`. Si está vacía, no renderiza nada (sin placeholder).
  - Lista `<ul>` de filas de conversaciones: avatar por iniciales (primera letra de `otro.nombre`), nombre del otro participante, preview del `ultimo_contenido` (truncado a 80 chars), timestamp relativo de `ultimo_creado_en`, badge de no leídos cuando `no_leidos > 0` (muestra el número; 9+ cuando supera 9).
  - Cada fila es un `<Link href="/mensajes/{conversacion_id}">`.
  - `EmptyState` cuando no hay conversaciones ("No tenés conversaciones", descripción, acción "Explorar perfiles" → `/`). La sección de solicitudes se muestra independientemente de si hay conversaciones.
- **Metadata:** `{ title: 'Mensajes — Vitrina' }`.
- **Redirección defensiva:** redirige a `/login` si no hay sesión (la protección real es `proxy.ts`).

---

### /mensajes/[conversacionId] — Hilo (`app/(main)/mensajes/[conversacionId]/page.tsx`)

- **Tipo:** Server Component async (SSR). Shell que carga los datos iniciales y pasa al Client Component.
- **Parámetros:** `await props.params` (Next 16 async params).
- **Datos (en paralelo):**
  - `supabase.from('conversacion').select('id, usuario_a, usuario_b').eq('id', conversacionId).maybeSingle()` — carga la conversación directamente (no a través de la bandeja).
  - `getMensajes(conversacionId, { limit: 50 })` — mensajes iniciales SSR, orden ascendente.
  - `getPerfil(otroId)` — nombre del otro participante para el header.
- **Validaciones:**
  - Conversación no encontrada o viewer no es participante → `notFound()`.
  - Deriva `otroId` comparando `conv.usuario_a`/`conv.usuario_b` con `user.id`.
- **Estructura:**
  - Header: ← enlace a `/mensajes`, avatar por inicial, nombre del otro participante (link a `/usuario/{otroId}`).
  - `<HiloMensajes conversacionId viewerId otroId initialMensajes />`.
  - **Layout de pantalla completa:** el shell usa `fixed inset-x-0 top-14 bottom-0` (debajo de la nav hasta el fondo del viewport) en lugar de un contenedor en flujo con `100dvh`. Solo la lista de mensajes interna hace scroll; el footer y el padding general del layout quedan cubiertos por el chat, evitando una doble barra de desplazamiento. Igual en `/mensajes/nuevo`.
- **Metadata:** `{ title: 'Conversación — Vitrina' }`.

---

### /mensajes/nuevo — Nueva conversación (`app/(main)/mensajes/nuevo/page.tsx`)

- **Tipo:** Server Component async (SSR).
- **Query params:** `?u=<otroId>` (uuid del receptor).
- **Validaciones:**
  - Sin `?u=` → `notFound()`.
  - `u === user.id` → redirect a `/mensajes` (no se puede escribir a uno mismo).
  - `getSeSiguenMutuamente(user.id, otroId)` es false O perfil no existe → `notFound()` (gate visual — la seguridad real está en la RPC).
- **Datos (en paralelo):** `getSeSiguenMutuamente` + `getPerfil(otroId)`.
- **Redirect a conversación existente:** tras el gate de mutualidad, llama `getConversacionConUsuario(user.id, otroId)`. Si la conversación ya existe (p. ej. el par se siguió, se dejaron de seguir, y luego volvieron a conectarse vía solicitud), hace `redirect('/mensajes/<id>')` preservando el historial en lugar de mostrar el compositor vacío.
- **Estructura:** idéntica a `/mensajes/[conversacionId]` pero con badge "Nueva conversación" en el header. `<HiloMensajes viewerId otroId initialMensajes={[]} />` (sin `conversacionId` prop → modo nueva conversación). Solo se llega aquí si no existe conversación previa.
- **Metadata:** `{ title: 'Nuevo mensaje — Vitrina' }`.

---

### HiloMensajes (`components/mensajes/HiloMensajes.tsx`)

- **Tipo:** Client Component (`'use client'`).
- **Props:**
  - `conversacionId?: string` — undefined en modo nueva conversación.
  - `viewerId: string`
  - `otroId: string`
  - `initialMensajes: Mensaje[]`

**Estado interno:** `mensajes` (array), `texto`, `sending`, `errorMsg`, `conversacionId` (puede mutar en modo nuevo).

**Comportamiento al montar:**
1. Marca mensajes como leídos: `POST /api/mensajes/leer { conversacion_id }` (fire-and-forget; errores ignorados). Solo si `conversacionId` está presente.
2. Suscripción Realtime (solo si `conversacionId` está presente):
   ```ts
   // Autentica el socket con el JWT del usuario antes de suscribir (ver BD §3.13 Realtime — footgun).
   await supabase.realtime.setAuth(session.access_token)

   const channel = supabase
     .channel(`mensaje:conv:${conversacionId}`)
     .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensaje',
         filter: `conversacion_id=eq.${conversacionId}` }, (payload) => {
       const nuevo = payload.new as Mensaje
       setMensajes(prev => prev.some(m => m.id === nuevo.id) ? prev : [...prev, nuevo])
       // Mensaje entrante del otro participante mientras tenemos el hilo abierto →
       // marcarlo leído inmediatamente para que el emisor reciba el ✓✓ en tiempo real.
       if (nuevo.emisor_id !== viewerId) marcarLeido(convId)
     })
     .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mensaje',
         filter: `conversacion_id=eq.${conversacionId}` }, (payload) => {
       // Refleja actualizaciones, principalmente `leido` pasando a true (tick ✓✓).
       // Requiere REPLICA IDENTITY FULL en `mensaje` — ver BD §3.13 Realtime.
       const actualizado = payload.new as Mensaje
       setMensajes(prev => prev.map(m => m.id === actualizado.id ? actualizado : m))
     })
     .subscribe()
   return () => { supabase.removeChannel(channel) }  // cleanup
   ```
   - **Deduplicación por id (INSERT):** el emisor recibe su propio INSERT (Realtime echo); si ya está appended optimistamente, se descarta.
   - **Recibo de lectura en tiempo real (UPDATE):** cuando el receptor marca `leido = true`, el emisor recibe el UPDATE y el tick ✓ pasa a ✓✓ sin recargar. Requiere `REPLICA IDENTITY FULL` en la tabla `mensaje`.
   - **Cleanup:** `supabase.removeChannel(channel)` en el retorno del `useEffect`.

**Envío (optimistic):**
1. Append inmediato de un mensaje temporal (`id: 'temp-${Date.now()}'`, `leido: false`).
2. `POST /api/mensajes { receptor_id: otroId, contenido }`.
3. On success: reemplaza el temporal con el mensaje confirmado (por `tempId`). Si no había `conversacionId`, lo establece del `mensaje.conversacion_id` retornado y llama `router.replace('/mensajes/<convId>')`.
4. On error: elimina el temporal, restaura el texto en el compositor, muestra el error (banner inline).

**Compositor:**
- `<textarea>` + botón enviar. Ctrl+Enter o Cmd+Enter envían.
- Contador de caracteres visible cuando el texto supera 1800 (muestra restantes; rojo cuando supera 2000).
- `maxLength={2100}` como corte suave para mostrar feedback antes del límite absoluto.
- Botón deshabilitado si `sending || !texto.trim() || overLimit`.

**Lista de mensajes:**
- Separadores de día entre mensajes de distinta fecha (ISO `YYYY-MM-DD`).
- Burbujas alineadas a derecha (propio, `bg-primary text-primary-fg`) o izquierda (otro, `bg-surface border border-border`).
- Mensajes temporales con `opacity-60`.
- Tick de lectura: ✓ (enviado) / ✓✓ (leído) en los mensajes propios no temporales.
- `aria-live="polite"` en el contenedor de mensajes.
- Autoscroll a bottom cuando `mensajes` cambia.

**Archivos:** `components/mensajes/HiloMensajes.tsx`.

---

### SolicitudesMensajeList (`components/mensajes/SolicitudesMensajeList.tsx`)

- **Tipo:** Client Component (`'use client'`).
- **Props:** `solicitudes: SolicitudMensajeRecibida[]`
- **Estado interno:** `items` (array de solicitudes), `actionId` (string|null — ID en proceso), `actionError` (string).
- **Render:** `<section aria-label="Solicitudes de mensaje">` con heading "Solicitudes" + lista `<ul>` de filas. Retorna `null` si `items.length === 0` (sin placeholder vacío).
- **Cada fila:** avatar por iniciales del emisor, nombre del emisor + copy "quiere conversar con vos", botones **Aceptar** y **Rechazar** (ambos deshabilitados mientras `actionId !== null`).
- **Aceptar:** `POST /api/mensajes/solicitudes/{id}/aceptar` → redirige a `/mensajes/nuevo?u=<emisor_id>` (abre el compositor con esa persona).
- **Rechazar:** `POST /api/mensajes/solicitudes/{id}/rechazar` → elimina la fila optimistamente del estado local (`items.filter`) + `router.refresh()`.
- **Errors:** banner `role="alert"` arriba de la lista con el mensaje del error; no cierra el panel.
- **Ubicación en `/mensajes`:** se renderiza **encima** de la lista de conversaciones si hay solicitudes pendientes.

**Archivos:** `components/mensajes/SolicitudesMensajeList.tsx`.

---

### EnviarMensajeButton (`components/usuario/EnviarMensajeButton.tsx`)

- **Tipo:** Client Component (`'use client'`).
- **Props:**
  - `otroId: string` — UUID del otro usuario.
  - `seSiguen: boolean` — indica si ya existe seguimiento mutuo.
  - `conversacionId: string | null` — ID de conversación existente, o null si no hay.
  - `solicitudPendiente: boolean` — indica si el viewer ya envió una solicitud pendiente.
- **Visibilidad (gateada en el caller):** se renderiza siempre que hay sesión y no es el perfil propio (`viewer && !esPropio`). La decisión de qué rama mostrar la toma el componente según las props.
- **3 estados de render:**
  1. **Follow mutuo (`seSiguen === true`):** muestra un `<a>` estilizado "Enviar mensaje" que navega a `/mensajes/{conversacionId}` (conversación existente) o `/mensajes/nuevo?u={otroId}` (conversación nueva).
  2. **Solicitud pendiente (`solicitudPendiente === true` o después de enviar):** muestra un botón deshabilitado "Solicitud enviada".
  3. **Sin mutualidad ni pendiente:** muestra botón "Enviar mensaje" (`aria-expanded`) que abre un panel inline con el copy "Para conversar, ambos se tienen que seguir…" + botón **"Enviar solicitud"** + botón "Cancelar". Al enviar llama `POST /api/mensajes/solicitudes { receptor_id: otroId }`. Si `resultado === 'mutuo'` → redirige a `/mensajes/nuevo?u={otroId}`; si `resultado === 'solicitud'` → transiciona al estado "Solicitud enviada".
- **Integración en `/usuario/[id]`:** el page añade en paralelo `getSeSiguenMutuamente` + `getConversacionConUsuario` (si seSiguen) y `getSolicitudMensajePendiente` (si NO seSiguen) al `Promise.all` SSR. Renderiza `<EnviarMensajeButton otroId={id} seSiguen={seSiguen} conversacionId={conv?.id ?? null} solicitudPendiente={solicitudPendiente} />`.

**Archivos:** `components/usuario/EnviarMensajeButton.tsx`, `app/(main)/usuario/[id]/page.tsx` (modificado).

---

### Data layer — funciones nuevas en `lib/data/mensajes.ts`

El archivo ya contiene `getConversaciones`, `getMensajes`, `getConversacionConUsuario`, `getSeSiguenMutuamente` y `getTotalNoLeidos`; las siguientes son adicionales.

| Función | Firma | Descripción |
|---|---|---|
| `getSolicitudesMensajeRecibidas` | `(viewerId: string) → SolicitudMensajeRecibida[] \| null` | Solicitudes `pendiente` recibidas por `viewerId`. Resuelve el perfil `emisor` con un batched query (sin N+1), igual que `getConversaciones`. Orden: `creado_en desc`. |
| `getSolicitudMensajePendiente` | `(emisorId, receptorId) → boolean` | Devuelve `true` si existe una solicitud `pendiente` del emisor al receptor. Gate visual usado por `/usuario/[id]`. |
| `getTotalSolicitudesPendientes` | `(viewerId: string) → number` | Total de solicitudes `pendiente` recibidas; usado en `Nav.server.tsx` para el badge. |

**Archivos:** `lib/data/mensajes.ts`.

---

### Nav — Link y badge de mensajes no leídos + solicitudes pendientes

- **`Nav.server.tsx`** (modificado): cuando hay sesión, obtiene en paralelo `getTotalNoLeidos(user.id)` y `getTotalSolicitudesPendientes(user.id)`. El resultado `unreadCount` que se pasa a `<NavClient>` es la **suma** de ambos: `(noLeidos ?? 0) + (solicitudesPendientes ?? 0)`. Este valor es el inicial; el cliente lo toma y lo mantiene actualizado.
- **`NavClient.tsx`** (modificado):
  - Acepta `unreadCount?: number` (default 0). Guarda el valor en estado local (`useState(unreadCount)`) para poder actualizarlo sin re-render del RSC.
  - Añade `/mensajes` al array `userLinks` (entre Revistas y el perfil propio).
  - En el render de los links de desktop, cuando `l.href === '/mensajes'` y `count > 0`, muestra un `<span>` badge posicionado (arriba-derecha del link) con el conteo (9+ cuando supera 9).
  - **Re-fetch en navegación:** `useEffect([pathname])` llama `GET /api/mensajes/no-leidos` en cada cambio de ruta. Necesario porque el RSC del layout no se re-ejecuta en navegaciones client-side.
  - **Actualizaciones Realtime en vivo:** suscripción al canal `nav:notificaciones:{sessionId}` con `setAuth(session.access_token)` antes del `.subscribe()`. Escucha `mensaje INSERT`, `mensaje UPDATE` y `solicitud_mensaje INSERT`; cada evento dispara un re-fetch de `GET /api/mensajes/no-leidos`. El badge se actualiza sin recargar la página ni navegar.
- **`MobileMenu.tsx`** (modificado):
  - Acepta `unreadCount?: number`.
  - Muestra el mismo badge en el link `/mensajes` del drawer móvil.

**Archivos:** `components/layout/Nav.server.tsx`, `components/layout/NavClient.tsx`, `components/layout/MobileMenu.tsx`.

---

## 14. Compartir Enlace

### CompartirButton (`components/ui/CompartirButton.tsx`)

- **Tipo:** Client Component (`'use client'`).
- **Props:** `path: string` (ruta relativa a compartir, ej. `/publicacion/123`), `label?: string` (texto del botón y base del `aria-label`; default `'Compartir'`).
- **Comportamiento:** al hacer click copia al portapapeles la URL absoluta (`window.location.origin + path`, resuelta en el momento del click) vía `navigator.clipboard.writeText`, con **fallback** (textarea temporal fuera de pantalla + `document.execCommand('copy')`) para contextos inseguros o navegadores sin Clipboard API. Muestra feedback **"¡Copiado!"** (con ícono de check) durante ~2 s y vuelve a `label`. **Solo copia el enlace** — no abre share sheet nativo ni integra redes sociales.
- **Estilo:** mismo patrón visual que `LikeButton`/`SeguirButton` (`inline-flex … rounded-md px-4 py-2 text-sm border`, hover `border-primary text-primary`); estado copiado en `text-primary border-primary`.
- **Accesibilidad:** `aria-label` dinámico (`"{label} — copiar enlace"` / `"Enlace copiado al portapapeles"`), texto del botón en `aria-live="polite"`.
- **Nota:** `navigator.clipboard` requiere contexto seguro (https o localhost); el fallback cubre el resto.
- **Uso en `/publicacion/[id]`:** botón "Compartir" en la fila de acciones junto a `LikeButton`/`GuardarButton` (`app/(main)/publicacion/[id]/page.tsx`), con `path={`/publicacion/${id}`}`. Visible para todos (con o sin sesión).
- **Uso en `/usuario/[id]`:** botón "Compartir perfil" en la fila de acciones junto a `SeguirButton`/`EnviarMensajeButton` (`app/(main)/usuario/[id]/page.tsx`), con `path={`/usuario/${id}`}`. **Siempre visible** (incluso en el perfil propio o sin sesión), a diferencia de Seguir/Enviar mensaje que se gatean por sesión/mutualidad.

**Archivos:** `components/ui/CompartirButton.tsx`, `app/(main)/publicacion/[id]/page.tsx` (modificado), `app/(main)/usuario/[id]/page.tsx` (modificado).

---

## 15. Chat RAG sobre el Documento

Permite preguntarle al PDF de una publicación: el autor lo "indexa" (extrae texto, lo trocea y genera embeddings) y cualquier usuario logueado puede preguntarle y recibir una respuesta acotada al contenido del documento (grounding estricto — sin invención). Ver excepción documentada `rag-publicacion` en `CLAUDE.md` / `Vitrina_BD_Conexion_Backend.md` §3.15 (esquema) y `Vitrina_Especificaciones_APIs.md` §17-18 (endpoints/DTOs).

### getEstadoRag (`lib/data/rag.ts`)

- **Tipo:** data-layer SERVER-ONLY (`lib/data/*`), llamado directo desde el Server Component de detalle.
- **Firma:** `getEstadoRag(publicacionId: string): Promise<{ indexado: boolean; chunks: number } | null>`.
- **Comportamiento:** lee `publicacion_rag.chunks` (SELECT público vía RLS `rag_select using (true)`, seguro para cualquier visitante incluido anónimo). `indexado = chunks > 0`. Devuelve `null` si no hay fila (nunca indexado) o si hay error — nunca lanza.

### Indexado automático (sin botón manual)

El indexado se dispara automáticamente desde `PublicarForm` cuando se sube un **PDF nuevo** (al crear, o al reemplazar el archivo en una edición) — ver §3.1. No hay botón manual ni componente `IndexarButton`. Las publicaciones existentes se cubren con el backfill admin (`POST /api/admin/rag/backfill`).

### ChatRAGWidget (`components/publicacion/ChatRAGWidget.tsx`)

- **Tipo:** Client Component (`'use client'`). Espeja `ComentarioForm` (estado loading/error, `apiClient`/`ApiError`) + `HiloMensajes` (burbujas, autoscroll, Ctrl+Enter, contador de caracteres).
- **Props:** `publicacionId: string`.
- **Estado:** `mensajes: RagMensaje[]` (local, no persiste — cada sesión de chat empieza vacía), `pregunta`, `sending`, `errorMsg`.
- **Comportamiento:**
  - Lista de burbujas `aria-live="polite"`: pregunta del usuario alineada a la derecha (`bg-primary text-primary-fg rounded-br-sm`), respuesta del asistente a la izquierda (`bg-surface border border-border text-text rounded-bl-sm`) — idéntica paleta a `HiloMensajes`.
  - Estado vacío: **"Preguntá sobre este documento."**
  - Composer: `textarea` + botón enviar (ícono avión/spinner), límite `MAX_PREGUNTA` (500, de `lib/rag/config.ts`) con contador visible cerca del límite, Ctrl+Enter/Cmd+Enter para enviar, deshabilitado mientras `sending` o vacío o sobre el límite.
  - `handleSend`: agrega la pregunta de forma optimista → `POST /api/publicaciones/{id}/chat` (`{ pregunta }`) → agrega la respuesta (`{ respuesta }`) como burbuja del asistente. **No streaming**. En error (`ApiError`): quita la burbuja optimista, restaura el texto en el composer y muestra banner de error dismissable.
- **Accesibilidad:** lista con `aria-live="polite"`, botón enviar con `aria-label`, spinner `aria-hidden`.

### Integración en `/publicacion/[id]` (`app/(main)/publicacion/[id]/page.tsx`, modificado)

- `tienePdf = archivo_url` termina en `.pdf` (case-insensitive) — el bloque completo de RAG solo se monta si `tienePdf`.
- `getEstadoRag(id)` se agrega al `Promise.all` existente (junto a likes/guardado/comentarios) — **no** introduce un request en cascada.
- Sección **"Pregunta al documento"**, debajo de `ArchivoVistaPrevia` (ya **no** hay botón de indexar). Ahora tiene dos bloques hermanos, gateados además por `data.chat_habilitado` (ver `Vitrina_BD_Conexion_Backend.md` §3.24):
  - **`tienePdf && chat_habilitado`** (el bloque de siempre):
    - **Logueado + indexado (`chunks > 0`):** ve `ChatRAGWidget`.
    - **Logueado + no indexado:** mensaje muted. Al **autor** le dice que el documento se está preparando (el indexado corre solo al subir el PDF); a los demás, "El autor todavía no preparó este documento para preguntas." (sin input — evita una llamada al chat sin fragmentos).
    - **No logueado:** mensaje con `Link` a `/login` (mismo patrón que la sección de comentarios) — no se monta el widget ni se expone el composer a anónimos, evitando el 401 esperable de `/chat` (solo logueados, guardrail de costo).
  - **`tienePdf && !chat_habilitado && isAuthor`** (bloque nuevo): la sección se **oculta para todos los demás** (nadie más ve rastro de que el PDF existe como chateable); solo el autor ve un hint muted — "El chat sobre este documento está desactivado." — con un `Link` a `/publicacion/[id]/editar` para activarlo.

**Archivos:** `lib/data/rag.ts`, `components/publicacion/ChatRAGWidget.tsx`, `app/(main)/publicacion/[id]/page.tsx` (modificado). El indexado lo dispara `PublicarForm` (auto-index con PDF nuevo, incondicional respecto a `chat_habilitado`).

---

## 16. Panel Admin de Correos Masivos

Consumen el esquema/RPC/Edge Function ya documentados en `Vitrina_BD_Conexion_Backend.md` §3.21 y los endpoints de `Vitrina_Especificaciones_APIs.md` §21. El toggle de preferencia (`NotificacionesForm`, §3.4.1) es una feature distinta ya documentada arriba.

### getCorreosAdmin (`lib/data/correos.ts`)

- **Tipo:** data-layer SERVER-ONLY, llamado directo desde `app/(admin)/admin/correos/page.tsx` (Server Component). Guard: RLS (`correo_admin_select using es_admin()`) + la protección de `/admin/*` en `proxy.ts` — mismo modelo de confianza que `lib/data/revistas.ts`/`lib/data/tags.ts`, sin `requireAdmin()` explícito (ese helper es de Route Handlers).
- **Firma:** `getCorreosAdmin({ limit?, offset? }): Promise<{ correos: CorreoAdminDetalle[], hasMore: boolean, error: unknown }>`.
- **Paginación:** `hasMore = correos.length === limit` (mismo patrón que `getPublicacionPorArea`/`/area/[slug]`), sin `count(*)` separado.

### AdminCorreoForm (`components/admin/AdminCorreoForm.tsx`)

- **Tipo:** Client Component. Campos: `Field` para asunto (≤200) y cuerpo (10-5000, `multiline`), ambos con contador de caracteres vía `helper`. Selector de destinatarios como `role="radiogroup"` de 3 chips (mismo patrón visual que `TipoPicker`): **"Todos los usuarios"** / **"Usuarios específicos"** / **"Usuarios sin publicaciones"** — **sin** opción "por ciudad" (decisión explícita: `usuario.ciudad` es texto libre, no hay lista de municipios en el proyecto; el tipo `DestinatariosCriterio` y la RPC sí soportan `{tipo:'ciudad'}` para uso futuro/API directa).
- **"Usuarios específicos":** monta `AdminUsuarioMultiSelect`.
- **"Usuarios sin publicaciones":** arma `{tipo:'sin_publicacion'}` — el conteo real y la resolución a ids concretos los hace el servidor (`resolverIdsSinPublicacion`, `lib/data/correos.ts`), sin lógica de resolución en el cliente. Ver `Vitrina_Especificaciones_APIs.md` §21.
- **"Ver vista previa":** valida en cliente (mismos límites que `lib/validation/correoAdmin.ts`) → `POST /api/admin/correos/contar` con el criterio construido → abre `AdminCorreoPreview` con el conteo real y la lista de destinatarios resueltos (mismo request, sin fetch extra).
- **Confirmar (dentro del modal):** `POST /api/admin/correos` → mensaje inline de éxito con el resumen enviados/fallidos (mismo patrón `role="status"`/`role="alert"` que `NotificacionesForm`, sin toasts — el proyecto no usa una librería de toasts) → resetea el form → `router.refresh()` para que el historial SSR se actualice sin recarga completa.

### AdminUsuarioMultiSelect (`components/admin/AdminUsuarioMultiSelect.tsx`)

- **Tipo:** Client Component, fork del esqueleto de debounce/abort/combobox de `components/buscar/SearchBox.tsx` (300 ms, `AbortController`), pero acumulando selección en vez de navegar.
- **Fetch:** `GET /api/buscar?q=...` (modo autocomplete, sin `tipo`) — toma solo `usuarios` de la respuesta, ya typo-tolerant/accent-insensitive (`buscar_usuarios` RPC).
- **Props:** `{ selected: UsuarioCardData[], onChange }`. Selección como chips (`Avatar` + nombre + botón `×`); filtra de las sugerencias los usuarios ya elegidos.

### AdminCorreoPreview (`components/admin/AdminCorreoPreview.tsx`)

- **Tipo:** Client Component, wrapper delgado sobre `components/ui/Modal.tsx`. Muestra asunto/cuerpo tal cual se enviarán y "¿Enviar a N usuario(s)? No se puede deshacer.". Si el conteo supera `LIMITE_DESTINATARIOS` (500, espejo del cap de la Edge Function), deshabilita "Confirmar" y muestra el aviso.
- **Prop `destinatarios: DestinatarioResuelto[]`** (viene de `/contar`, ver `Vitrina_Especificaciones_APIs.md` §21): botón disclosure "Ver lista de destinatarios (N)" (`aria-expanded` + estado local, mismo patrón que `AdminCorreoHistorial`) que despliega una lista con scroll (`nombre` + `email` de cada uno) — no dispara un fetch adicional, usa los datos ya traídos por el conteo.

### AdminCorreoHistorial (`components/admin/AdminCorreoHistorial.tsx`)

- **Tipo:** Client Component. Recibe `correos: CorreoAdminDetalle[]` como prop (ya vienen con el join a `admin` desde `getCorreosAdmin`) — **no** hace un segundo fetch a `GET /api/admin/correos/[id]` para expandir una fila; esa ruta queda disponible para uso directo de la API.
- **Fila:** asunto, `Badge` de `estado` (`pendiente`=warning, `completado`=success, `fallido`=danger), descripción corta de destinatarios (`"Todos los usuarios"` / `"Ciudad: X"` / `"N usuarios específicos"`), fecha. Click expande in-place (estado local `expandedId`) mostrando cuerpo completo, admin que envió, y los 3 contadores (`cantidad_destinatarios/enviados/fallidos`).
- Sin resultados → `EmptyState` "Sin envíos todavía".

### `/admin/correos` — Pantalla (`app/(admin)/admin/correos/page.tsx`)

- **Tipo:** Server Component async. `dynamic = 'force-dynamic'` (lee `searchParams.offset`, mismo motivo que `/area/[slug]`). **Metadata:** `{ title: 'Correos' }`.
- **Estructura:** heading block ("Comunicación" / "Correos") → `AdminCorreoForm` → sección "Historial reciente" (`AdminCorreoHistorial` + `Pagination`, `limit=10`).
- **Acceso:** protegido por `proxy.ts` (`/admin/*` → `/` si `rol ≠ administrador`), igual que el resto de `/admin/*`.

### Panel de admin (`/admin`) — tile Correos

- **Archivo:** `app/(admin)/admin/page.tsx` (editado). Cuarto tile en la grilla: **"Correos"** → `/admin/correos`, descripción "Envía correos personalizados a los usuarios de la plataforma."

### AdminNav — entrada Correos

- **Archivo:** `components/admin/AdminNav.tsx` (editado). Entrada `{ href: '/admin/correos', label: 'Correos' }` añadida al array `links`, después de "Reportes".

---

## 17. Colecciones

Listas curadas de publicaciones, propias o ajenas, con visibilidad `publica`/`privada` (más rico que Guardados §11, que es un toggle plano sin agrupar). Ownership vía `usuario_id` de sesión; la seguridad real es la RLS de `coleccion`/`coleccion_publicacion`, sin RPC `SECURITY DEFINER`. Endpoints en `Vitrina_Especificaciones_APIs.md` §19, DTOs en §20, esquema en `Vitrina_BD_Conexion_Backend.md` §3.20.

### AgregarAColeccionButton (`components/publicacion/AgregarAColeccionButton.tsx`)

- **Tipo:** Client Component (`'use client'`).
- **Props:** `publicacionId: string`, `isAuthenticated?: boolean` (default `false`).
- **Sin sesión:** a diferencia de `GuardarButton`/`SeguirButton` (que se renderizan y redirigen a `/login` al click), este componente hace `if (!isAuthenticated) return null` — no se monta nada. El `router.push('/login')` dentro de `handleOpen` queda como guardia defensiva inalcanzable desde la UI, ya que el botón que lo dispara nunca se renderiza sin sesión.
- **Al abrir el modal:** `GET /api/colecciones?publicacion_id=${publicacionId}` trae `ColeccionConMembership[]` (todas las colecciones del usuario + `agregada: boolean` por colección) — evita mostrar "Agregar" en colecciones que ya contienen la publicación al reabrir el modal. Se re-fetchea cada vez que `isOpen` pasa a `true` (no cachea entre aperturas).
- **Estados de carga:** `idle | loading | error`, con `Spinner` mientras carga y botón "Reintentar" en error.
- **Lista de colecciones existentes:** cada fila muestra título + `Badge` de visibilidad (`info`=pública, `neutral`=privada) + botón "Agregar"/"Agregada" (`disabled` si ya agregada o si esa fila está en `pendingId`, con `loading` mientras la request está en vuelo).
- **Agregar:** `POST /api/colecciones/{id}/publicaciones` body `{ publicacion_id }`. Un `409` (la publicación ya estaba en la colección) se trata como éxito silencioso — marca la colección como agregada sin mostrar error, no dispara `listErrorMsg`.
- **Crear colección al vuelo (mismo modal, sin componente aparte):** botón "+ Nueva colección" despliega un form inline con `Field` de título (`maxLength={100}`, requerido) y un `<select>` de visibilidad (`privada` default, `publica`). Submit: `POST /api/colecciones` → inserta la colección nueva al principio de la lista local (`ColeccionConMembership` con `agregada: false`) → inmediatamente `POST /api/colecciones/{nueva.id}/publicaciones` para agregar la publicación actual. Si este segundo POST falla con algo distinto de `409`, el mensaje aclara que "La colección se creó, pero no se pudo agregar la publicación. Intenta desde la lista." (la colección ya quedó creada, no hay rollback).
- **No hay componente `ColeccionForm` independiente** en el proyecto: la creación vive inline en este modal; la edición vive inline en `ColeccionCard` (ver abajo). Ambos formularios inline comparten los mismos campos (título/descripción/visibilidad) pero están duplicados, no extraídos a un componente compartido.
- **Sin acción de quitar en este modal** — solo agrega; no hay botón para remover la publicación de una colección desde aquí (ver nota de gap más abajo).
- **Ubicación:** junto a `GuardarButton` en `/publicacion/[id]`.

### ColeccionCard (`components/perfil/ColeccionCard.tsx`)

- **Tipo:** Client Component, self-contained — mantiene su propio estado local (título/descripción/visibilidad en edición, `isDeleted`) para que la página padre (`/perfil/colecciones`) siga siendo un Server Component puro.
- **Props:** `{ coleccion: Coleccion }`.
- **Vista normal:** `Link` a `/coleccion/{id}` con el título, `Badge` de visibilidad, descripción truncada (`line-clamp-2`) si existe, y botones "Editar"/"Eliminar".
- **Edición inline:** al hacer click en "Editar" cambia a un `<form>` con `Field` de título (`maxLength={100}`, requerido) y descripción (`maxLength={500}`, `multiline`, opcional) + `<select>` de visibilidad. Guardar → `PATCH /api/colecciones/{id}` con los tres campos → actualiza el estado local con la fila devuelta → `router.refresh()`. Validación cliente: título vacío (tras `trim()`) bloquea el submit con mensaje inline.
- **Eliminar:** botón abre un `Modal` de confirmación (mismo patrón visual que `ConfirmDeleteModal`) con el aviso "Esta acción no se puede deshacer. Las publicaciones que agregaste no se eliminan, solo se quitan de esta colección." Confirmar → `DELETE /api/colecciones/{id}` → ocultamiento optimista inmediato (`setIsDeleted(true)`, la card retorna `null`) + `router.refresh()` para resincronizar la lista SSR.

### /perfil/colecciones (`app/(main)/perfil/colecciones/page.tsx`)

- **Tipo:** Server Component async (SSR). Redirect defensivo a `/login` si no hay `user` (`proxy.ts` ya protege todo `/perfil/*` vía `startsWith`).
- **Datos:** `getMisColecciones(user.id)` (`lib/data/colecciones.ts`) → **todas** las colecciones del usuario de sesión, cualquier `visibilidad`, ordenadas `creado_en desc`.
- **Estructura:** breadcrumb "← Mi perfil" (`Link` a `/perfil`), título "Mis colecciones".
- **Lista vacía:** `EmptyState` — "No creaste ninguna colección" / "Usa el botón Agregar a colección en cualquier publicación para crear la primera." / acción "Explorar publicaciones" → `/`.
- **Lista con datos:** `<ul aria-label="Tus colecciones">` de `ColeccionCard`, una por colección.
- **metadata:** `{ title: 'Mis colecciones — Vitrina' }`.
- **Acceso desde UI:** link "Colecciones" en la cabecera de `/perfil` (`app/(main)/perfil/page.tsx`), entre "Guardados" y "Ajustes" — mismo bloque de botones descrito en §11.

### /coleccion/[id] (`app/(main)/coleccion/[id]/page.tsx`)

- **Tipo:** Server Component async (SSR).
- **Datos:** `getColeccion(id)` (`lib/data/colecciones.ts`) — trae la colección con sus `coleccion_publicacion` anidados (join a `publicacion` y `publicacion.usuario`), ordenados por `orden asc` en la propia query (`.order('orden', { referencedTable: 'coleccion_publicacion' })`). Usa `.maybeSingle()`: la RLS `coleccion_select` ya filtra a pública-o-dueño, así que una colección privada ajena o inexistente resuelve `null` en vez de tirar un `PGRST116` — la página responde con `notFound()`.
- **Dueño:** `getPerfil(coleccion.usuario_id)` para mostrar nombre + link a `/usuario/{id}`; si el perfil no resuelve, cae a texto plano "Autor desconocido" (no rompe la página).
- **Render:** título (`h1`) + `Badge` de visibilidad (`info`=pública, `neutral`=privada) junto al título; descripción opcional debajo; línea "Por {nombre}" (o "Autor desconocido"); sección "Publicaciones (N)" con `FeedList` mapeando cada `coleccion_publicacion.publicacion` a `PublicacionCardData`.
- **Orden de publicaciones:** ya vienen ordenadas por `orden` desde `getColeccion` — la página las renderiza tal cual, **sin UI de reordenar** en esta versión (comentario explícito en el código: "no reorder UI in this slice").
- **Detalle de `FeedList`:** la página le pasa solo `publicaciones`, sin `isAuthenticated`/`areaActivo`/`tipoActivo`. Si la colección está vacía, `FeedList` cae en su rama de empty-state "anónimo" genérica (CTA "Crea tu cuenta" → `/signup`) independientemente de si el visitante está logueado, porque el prop no se propaga desde esta pantalla.
- **`generateMetadata`:** si `getColeccion` devuelve `null` (privada ajena o inexistente), título fijo "Colección no encontrada — Vitrina" — evita filtrar el `titulo` real de una colección privada en la metadata de una request que no pudo leer la fila. Si existe: título `"{titulo} — Vitrina"`, `description` = `descripcion` de la colección o fallback genérico, `alternates.canonical` = `{siteUrl}/coleccion/{id}`. **No hay `opengraph-image.tsx`/`twitter-image.tsx` para colecciones** (a diferencia de `/publicacion/[id]`, que sí genera una imagen OG dinámica con Satori) — el directorio `app/(main)/coleccion/[id]/` solo contiene `page.tsx`; el "OG" de esta pantalla se limita a los meta tags estándar de `generateMetadata`.

### Gaps conocidos (verificados contra el código, sin UI todavía)

- **Quitar una publicación de una colección:** el endpoint `DELETE /api/colecciones/[id]/publicaciones/[pubId]` existe y funciona, pero ningún componente lo invoca — ni en `/coleccion/[id]`, ni en `AgregarAColeccionButton`, ni en ningún otro lugar del árbol de `components/`. Solo es alcanzable llamando la API directo.
- **Reordenar publicaciones dentro de una colección:** la columna `orden` existe y `getColeccion` ordena por ella, pero no hay ningún control de UI (drag-and-drop, flechas, etc.) que la modifique.
- **`ColeccionCardData`** (DTO declarado en `lib/types/database.ts`, ver `Vitrina_Especificaciones_APIs.md` §20) **no tiene consumidor**: `ColeccionCard` usa el tipo `Coleccion` directo, no `ColeccionCardData` (que además traería `total_publicaciones`, un dato que ninguna pantalla actual muestra).

---

## 18. Notificaciones In-App

Campanita + dropdown + página completa para las 6 notificaciones auto-generadas (`comentario_nueva`, `comentario_respuesta`, `obra_aceptada_revista`, `nuevo_seguidor`, `solicitud_mensaje`, `obra_likeada`) — ver excepción documentada `notificaciones-app` en `CLAUDE.md`, esquema/RLS/triggers en `Vitrina_BD_Conexion_Backend.md` §3.23, endpoints en `Vitrina_Especificaciones_APIs.md` §22. Reemplaza/complementa el badge de mensajería (§13): son dos badges distintos (mensajes vs. notificaciones) en la misma barra de nav, sobre el mismo canal Realtime compartido.

### BellIcon (`components/ui/BellIcon.tsx`)

- **Tipo:** presentacional puro (sin `'use client'`, sin estado). SVG inline de campana, mismo patrón que los íconos de `ThemeToggle`/`MobileMenu` (`stroke="currentColor"`, `viewBox="0 0 24 24"`, `aria-hidden="true"` — decorativo, el control padre pone el `aria-label`).
- **Props:** `className?: string` (default `'w-5 h-5'`).

### NotificationBell (`components/notificaciones/NotificationBell.tsx`)

- **Tipo:** Client Component (`'use client'`).
- **Props:** `count: number`, `onRead: () => void`.
- **Comportamiento:** botón con `BellIcon` + badge de conteo (mismo estilo que el badge de `/mensajes` en `NavClient` — círculo `bg-primary`, `9+` cuando supera 9). Controla el estado abierto/cerrado del dropdown; se cierra con click afuera (`pointerdown` fuera del contenedor) o Escape. El `NotificationDropdown` **solo se monta mientras está abierto** — su fetch es perezoso, no dispara ninguna request hasta que el usuario abre la campanita.

### NotificationDropdown (`components/notificaciones/NotificationDropdown.tsx`)

- **Tipo:** Client Component (`'use client'`).
- **Props:** `onClose: () => void`, `onRead: () => void`.
- **Sin primitivo `Popover`** en este proyecto — es un `<div>` posicionado en absoluto (`absolute right-0 mt-2`) bajo la campanita, mismo criterio que `MobileMenu` a esta escala.
- **Datos:** al montarse, `GET /api/notificaciones?limit=8` (vía `apiClient`) — trae las 8 notificaciones más recientes con el actor embebido (`usuario_relacionado`).
- **"Marcar todas leídas":** botón visible solo si hay alguna no leída en la lista cargada; `POST /api/notificaciones/marcar-todas-leidas` → marca todo local como leído + `onRead()` (refresca el badge del padre).
- **"Ver todas":** link a `/notificaciones` al pie, cierra el dropdown al navegar. Solo se muestra cuando `total >= 5` (usa el `total` de la respuesta de `GET /api/notificaciones`, no la cantidad de items cargados en el dropdown, que está topeada a 8) — con menos de 5 notificaciones no tiene sentido ofrecer un link a "ver todas".
- **Estados:** cargando (`"Cargando…"`), error (`role="alert"`), vacío (`role="status"`, `"No tienes notificaciones."`).

### NotificationItem (`components/notificaciones/NotificationItem.tsx`)

- **Tipo:** Client Component (`'use client'`). Compartido por el dropdown y la página `/notificaciones`.
- **Props:** `notificacion: NotificacionConActor`, `onRead?: (id) => void`, `onNavigate?: () => void`, `onOpenDetail?: (notificacion) => void`.
- **Renderiza `descripcion` tal cual** — el texto ya viene pluralizado desde el trigger de BD (`notif_desc_agg`); el componente **no re-deriva** el conteo/copy en cliente.
- **Avatar del actor:** `Avatar` (iniciales) con `usuario_relacionado.nombre` cuando existe; ícono `BellIcon` genérico cuando no (solo `obra_aceptada_revista` no tiene actor).
- **Click:** es un `<Link href={enlace}>` real (no `router.push` manual) — al hacer click dispara un `POST /leer` **no bloqueante** (fire-and-forget, no espera la respuesta para navegar) y navega; mantiene funcionando Ctrl/Cmd-click y "abrir en pestaña nueva".
- **`onOpenDetail` (opcional):** agrega un botón "ver detalle" (ícono, `stopPropagation` + `preventDefault`) que abre `NotificationModal` en vez de navegar. Solo se pasa desde la página `/notificaciones` — el dropdown no lo usa (tiene "Ver todas" para eso).
- **Indicador de no leída:** punto `bg-primary` a la derecha mientras `leida === false`.

### NotificationModal (`components/notificaciones/NotificationModal.tsx`)

- **Tipo:** Client Component (`'use client'`). Reusa `components/ui/Modal.tsx` (focus trap, Escape, scroll-lock ya incluidos).
- **Props:** `notificacion: NotificacionConActor | null`, `onClose: () => void`, `onRead?: (id) => void`, `onDelete?: (id) => void`.
- **Contenido:** avatar + nombre del actor (link a `/usuario/{id}`, si hay actor), encabezado con la etiqueta del tipo (`TIPO_NOTIF_META`, `lib/constants/notificaciones.ts`), `descripcion` completa, link al `enlace` contextual ("Ver contenido →"), timestamp formateado (`Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' })`).
- **Acciones:** "Marcar leída" (`POST /leer`, solo si no está leída), "Eliminar" (`DELETE`, `Button variant="danger"` con `loading`), "Cerrar".

### NotificationFilterBar (`components/notificaciones/NotificationFilterBar.tsx`)

- **Tipo:** Server-renderable (sin `'use client'`) — chips de filtro `leidas`/`tipo` como `<Link>`s planos con `aria-current="page"` marcando el activo, mismo criterio "Links server-driven, sin estado cliente" que `Pagination`.
- **Props:** `leidas?: 'no-leidas'`, `tipo?: TipoNotificacion`.
- **Fila 1 (estado):** "Todas" / "No leídas".
- **Fila 2 (tipo):** "Todos los tipos" + un chip por cada `TipoNotificacion` (orden fijo en `TIPOS_NOTIFICACION`).

### NotificationList (`components/notificaciones/NotificationList.tsx`)

- **Tipo:** Client Component (`'use client'`) — wrapper de estado para la página `/notificaciones` (que es un Server Component y no puede tener estado interactivo). Guarda el estado local de la lista (para reflejar leída/eliminada sin refetch) y cuál notificación está seleccionada para el modal.
- **Props:** `items: NotificacionConActor[]` (SSR inicial).
- **Vacío:** `EmptyState` — "No tienes notificaciones" / "Cuando alguien interactúe con tu obra o tu perfil, aparecerá aquí."
- **Con datos:** `<ul>` de `NotificationItem` (con `onOpenDetail`) + `NotificationModal` controlado por el `id` seleccionado.

### /notificaciones (`app/(main)/notificaciones/page.tsx`)

- **Tipo:** Server Component async (SSR). Redirect defensivo a `/login` si no hay `user` (mismo patrón que `/mensajes`; la protección real vía `proxy.ts` queda pendiente — ver nota abajo).
- **`searchParams`:** `Promise<Record<string,string>>`, `await`eado (Next 16 async API). Lee `leidas` (`'no-leidas'` o ausente = todas) y `tipo` (uno de `TipoNotificacion` o ausente = todos).
- **Datos:** `getNotificaciones({ filtro, tipo, limit: 20, offset })` (`lib/data/notificaciones.ts`) — SSR directo, no pasa por el Route Handler.
- **Render:** título, `NotificationFilterBar`, `NotificationList`, `Pagination` (mismo primitivo que `/area/[slug]`).
- **`loading.tsx`:** skeleton propio (lista + chips), mismo criterio hand-rolled que `perfil/loading.tsx` en vez del `PageLoading` genérico variant `grid` (esto es una lista, no una grilla de cards).
- **Protección de ruta:** `proxy.ts` incluye `/notificaciones` en los prefijos protegidos (mismo patrón que `/perfil`/`/publicar`/`/mensajes` — redirect a `/login` sin sesión); el redirect defensivo del Server Component de arriba queda como segunda capa, no la única.

### Nav — campanita de notificaciones (extiende §13)

- **`Nav.server.tsx`** (modificado): agrega `getTotalNoLeidas()` (`lib/data/notificaciones.ts`) al mismo `Promise.all` que ya resuelve `unreadCount`; pasa `notifUnreadCount` a `<NavClient>` — mismo criterio de seed inicial que el badge de mensajes.
- **`NavClient.tsx`** (modificado):
  - Acepta `notifUnreadCount?: number` (default 0), estado local `notifCount`.
  - `refetchNotifCount` — `GET /api/notificaciones/sin-leer/count`, lee `total` (no `count`).
  - **Mismo `useEffect([pathname])`** que ya refresca el badge de mensajes ahora también llama `refetchNotifCount`.
  - **Mismo canal Realtime** `nav:notificaciones:{sessionId}` (no se abre un canal nuevo) — se le agrega un 4° handler `{ event: '*', schema: 'public', table: 'notificacion', filter: 'usuario_id=eq.{sessionId}' } → refetchNotifCount()`. `*` cubre inserts agregadores, updates de contador/lectura, y deletes de decremento/limpieza en un solo handler.
  - Renderiza `<NotificationBell count={notifCount} onRead={refetchNotifCount} />` en la barra de nav desktop, junto al botón "Salir"/antes de `ThemeToggle`.
  - El link `/notificaciones` en `userLinks` está comentado (no aparece en la nav desktop ni en el drawer móvil) — hoy la única entrada a `/notificaciones` es la campanita (dropdown → "Ver todas", visible solo con 5+ notificaciones) o la URL directa.

**Archivos:** `components/ui/BellIcon.tsx`, `components/notificaciones/{NotificationBell,NotificationDropdown,NotificationItem,NotificationModal,NotificationFilterBar,NotificationList}.tsx`, `lib/constants/notificaciones.ts`, `app/(main)/notificaciones/{page,loading}.tsx`, `lib/data/notificaciones.ts` (modificado — agrega el embed `usuario_relacionado` y el filtro `tipo` a `getNotificaciones`), `lib/types/database.ts` (modificado — nuevo tipo `NotificacionConActor`), `components/layout/{Nav.server,NavClient}.tsx` (modificados).

**Preferencias:** los 5 toggles `notif_app_*` viven en `/perfil/ajustes` — ver `NotificacionesForm` (§3.4.1), extendido con una fila `Toggle` por tipo, cada una persistiendo vía PATCH `/api/usuario/preferencias-notificaciones` (§22).

---

## 19. Citar Publicación

### CitarButton (`components/ui/CitarButton.tsx`)

- **Tipo:** Client Component (`'use client'`).
- **Props:** `titulo: string`, `autorNombre: string`, `tipo: string`, `creadoEn: string` (timestamptz), `path: string` (ruta relativa, ej. `/publicacion/123`).
- **Comportamiento:** botón "Citar" que abre un modal (reusa `components/ui/Modal.tsx` — focus trap, Escape, click-fuera y scroll-lock ya incluidos, sin reimplementar nada). El modal muestra:
  - Un aviso (`role="note"`, estilo ámbar `border-warning bg-warning-bg text-warning`) advirtiendo que Vitrina no es un repositorio académico revisado por pares ni asigna DOI.
  - La cita en formato APA 7: `{autorNombre} ({año}). {título en cursiva} [{Tipo}]. Vitrina. {url}`, en un `<blockquote>` seleccionable. `año = new Date(creadoEn).getFullYear()`; `url = window.location.origin + path`, **resuelta en el click** (igual que `CompartirButton`, nunca en render/SSR).
  - **Etiqueta de tipo:** mapea `tipo` a un label en español entre corchetes vía `TIPO_META` (`lib/constants/publicaciones.ts`) — ej. `tesis → [Tesis]`, `articulo → [Artículo]`; `recomendacion` y `otro` se normalizan a `[Publicación]` (única excepción sobre `TIPO_META`, resuelta con una función local en el propio componente, sin tocar `TIPO_META`).
  - Botón "Copiar cita": copia el **texto plano** de la cita (sin la cursiva del título) reusando la misma lógica de copiado con fallback que `CompartirButton`, extraída a `lib/clipboard.ts` (`copyToClipboard`, compartida por ambos botones). Feedback "¡Copiado!" ~2 s en `aria-live="polite"`.
  - Botón "Cerrar" (`components/ui/Button.tsx`, `variant="secondary"`).
- **Estilo del botón "Citar" y de "Copiar cita":** mismo patrón visual pill que `CompartirButton` (`inline-flex … rounded-md px-4 py-2 text-sm border`, hover `border-primary text-primary`; "Copiar cita" añade el estado copiado `text-primary border-primary`).
- **Accesibilidad:** `aria-label="Citar esta publicación"` en el disparador; modal con `role="dialog"`/`aria-modal="true"` (heredado de `Modal`) y `aria-labelledby` al `<h2>` del título.
- **Uso en `/publicacion/[id]`:** en la fila de acciones, junto a `CompartirButton` (`app/(main)/publicacion/[id]/page.tsx`), con `titulo={data.titulo}`, `autorNombre={autor?.nombre ?? 'Autor desconocido'}`, `tipo={data.tipo}`, `creadoEn={data.creado_en}`, `path={`/publicacion/${id}`}`. Visible para todos (con o sin sesión), igual que Compartir.

**Archivos:** `components/ui/CitarButton.tsx`, `lib/clipboard.ts` (nuevo — `copyToClipboard` compartida), `components/ui/CompartirButton.tsx` (modificado — usa el helper compartido, sin cambio de comportamiento), `app/(main)/publicacion/[id]/page.tsx` (modificado).

---

  Con esta estructura tenés todo lo necesario para atacar la implementación del frontend sin adivinar nada. Cada pantalla  tiene su fuente de datos mapeada, los componentes definidos y las rutas de API que tocan.