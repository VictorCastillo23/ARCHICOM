// Union-literal type aliases (not TS enum keyword)

export type TipoPublicacion =
  | 'libro'
  | 'articulo'
  | 'investigacion'
  | 'poema'
  | 'dibujo'
  | 'otro'
  | 'recomendacion'
  | 'ensayo'
  | 'cuento'
  | 'tesis'
  | 'resena'
  | 'fotografia'
  | 'infografia'
  | 'ponencia'
  | 'proyecto'
  | 'ilustracion'
  | 'pintura'
  | 'diseno_grafico'
  | 'diseno_modas'
export type RolUsuario = 'usuario' | 'administrador'
export type EstadoRevista = 'borrador' | 'publicada'
export type EstadoSolicitud = 'pendiente' | 'aceptada' | 'rechazada' | 'retirada'
export type MotivoReporte = 'contenido_inapropiado' | 'plagio' | 'spam' | 'otro'
export type EstadoReporte = 'pendiente' | 'revisado' | 'descartado'

/** Ordered array for select dropdowns and server-side validation (mirrors TIPOS_PUBLICACION pattern). */
export const MOTIVOS_REPORTE: MotivoReporte[] = [
  'contenido_inapropiado',
  'plagio',
  'spam',
  'otro',
]

// Snake_case aliases to satisfy spec REQ-TYPES-01
export type tipo_publicacion = TipoPublicacion
export type rol_usuario = RolUsuario
export type estado_revista = EstadoRevista
export type estado_solicitud = EstadoSolicitud

// Table DTOs

export type Usuario = {
  id: string
  email: string
  nombre: string
  rol: RolUsuario
  institucion?: string
  carrera?: string
  ciudad?: string
  /** Email notification preference (opt-out model, default true). Private — never granted to anon. */
  notif_email_habilitado: boolean
  creado_en: string
}

/**
 * Public profile fields — excludes email (sourced from auth.getUser() for own
 * profile), rol (not readable by anon at the DB grant level; the own user's
 * rol is fetched separately for nav/admin gating), and notif_email_habilitado
 * (private notification preference, never granted to anon — see BD §3.21).
 */
export type PerfilPublico = Omit<Usuario, 'email' | 'rol' | 'notif_email_habilitado'>

export type Publicacion = {
  id: string
  titulo: string
  resumen: string
  tipo: TipoPublicacion
  archivo_url?: string
  /** Client-generated JPEG thumbnail of a PDF's page 1, uploaded to Storage. Null for images (the image itself is the thumbnail) or PDFs not yet re-saved since this feature shipped. */
  archivo_thumbnail_url?: string | null
  autor_id: string
  obra_autor_externo?: string | null
  url_externa?: string | null
  creado_en: string
  bloqueada: boolean
}

export type Tag = {
  id: string
  nombre: string
  area: string
}

export type PublicacionTag = {
  publicacion_id: string
  tag_id: string
  tag?: Tag
}

export type Comentario = {
  id: string
  contenido: string
  publicacion_id: string
  autor_id: string
  creado_en: string
  responde_a: string | null
  usuario?: Pick<Usuario, 'id' | 'nombre'> | null
}

export type ComentarioConUsuario = Comentario & {
  usuario?: Pick<Usuario, 'id' | 'nombre'> | null
}

export type ComentarioArbol = ComentarioConUsuario & {
  respuestas: ComentarioConUsuario[]
}

export type Like = {
  id: string
  publicacion_id: string
  usuario_id: string
}

/** A user who liked a publicacion (public profile fields). */
export type Liker = {
  id: string
  nombre: string
  institucion?: string | null
}

export type Guardado = {
  id: string
  publicacion_id: string
  usuario_id: string
  creado_en: string
}

// Coleccion DTOs

export type VisibilidadColeccion = 'publica' | 'privada'

export type Coleccion = {
  id: string
  usuario_id: string
  titulo: string
  descripcion: string | null
  visibilidad: VisibilidadColeccion
  creado_en: string
}

export type ColeccionPublicacion = {
  coleccion_id: string
  publicacion_id: string
  orden: number
  agregado_en: string
  publicacion?: Pick<Publicacion, 'id' | 'titulo' | 'resumen' | 'tipo' | 'archivo_url' | 'archivo_thumbnail_url'> & {
    usuario?: Pick<Usuario, 'id' | 'nombre'>
  }
}

export type ColeccionDetalle = Coleccion & {
  coleccion_publicacion?: ColeccionPublicacion[]
}

/** `Coleccion` + si ya contiene una publicación dada — ver GET /api/colecciones?publicacion_id= */
export type ColeccionConMembership = Coleccion & {
  agregada: boolean
}

export type ColeccionCardData = {
  id: string
  titulo: string
  visibilidad: VisibilidadColeccion
  total_publicaciones: number
}

export type Revista = {
  id: string
  titulo: string
  volumen?: number
  estado: EstadoRevista
  publicada_en?: string | null
  //creado_en: string
}

export type RevistaArticulo = {
  revista_id: string
  publicacion_id: string
  orden: number
  publicacion?: Pick<Publicacion, 'id' | 'titulo' | 'resumen' | 'tipo'> & {
    usuario?: Pick<Usuario, 'id' | 'nombre'>
  }
}

export type SolicitudRevista = {
  id: string
  publicacion_id: string
  revista_id: string
  solicitante_id: string
  mensaje?: string | null
  respuesta?: string | null
  resuelto_en?: string | null
  revisor_id?: string | null
  estado: EstadoSolicitud
  solicitado_en: string
}

export type SolicitudConDetalle = SolicitudRevista & {
  publicacion: { id: string; titulo: string; tipo: TipoPublicacion }
  revista: { id: string; titulo: string; volumen: number; estado: EstadoRevista }
}

export type UsuarioLink = {
  id: string
  usuario_id: string
  etiqueta: string
  url: string
  orden: number
  creado_en: string
}

// View DTO

export type PublicacionCardData = {
  id: string
  titulo: string
  resumen: string
  tipo: TipoPublicacion
  nombre_autor: string
  autor_id?: string
  creado_en?: string
  archivo_url?: string
  archivo_thumbnail_url?: string | null
}

export type UsuarioCardData = {
  id: string
  nombre: string
  institucion?: string
  carrera?: string
}

export type FeedPublicacion = {
  id: string
  titulo: string
  resumen: string
  tipo: TipoPublicacion
  archivo_url?: string
  archivo_thumbnail_url?: string | null
  autor_id: string
  autor_nombre: string
  obra_autor_externo?: string | null
  url_externa?: string | null
  creado_en: string
}

// Nested / joined relation types

export type PublicacionDetalle = Publicacion & {
  usuario?: Pick<Usuario, 'id' | 'nombre'>
  comentario?: (Comentario & { usuario?: Pick<Usuario, 'id' | 'nombre'> })[]
  publicacion_tag?: PublicacionTag[]
}

export type RevistaDetalle = Revista & {
  revista_articulo?: RevistaArticulo[]
}

// Seguidor table DTO

export type Seguidor = {
  seguidor_id: string
  seguido_id: string
  creado_en: string
}

// View DTO (perfil_contadores)

export type PerfilConteos = {
  usuario_id: string
  n_seguidores: number
  n_seguidos: number
  n_publicaciones: number
}

// Reporte DTOs

export type Reporte = {
  id: string
  publicacion_id: string
  reportante_id: string
  motivo: MotivoReporte
  detalle?: string | null
  estado: EstadoReporte
  revisor_id?: string | null
  resuelto_en?: string | null
  creado_en: string
}

export type ReporteConDetalle = Reporte & {
  publicacion: { id: string; titulo: string } | null
  reportante: { id: string; nombre: string } | null
}

// Solicitudes de mensaje DTOs

export type EstadoSolicitudMensaje = 'pendiente' | 'aceptada' | 'rechazada'

export type SolicitudMensaje = {
  id: string
  emisor_id: string
  receptor_id: string
  estado: EstadoSolicitudMensaje
  creado_en: string
  resuelto_en: string | null
}

export type SolicitudMensajeRecibida = {
  id: string
  emisor: UsuarioCardData
  creado_en: string
}

// RAG DTOs (rag-publicacion)

export type PublicacionChunk = {
  id: string
  publicacion_id: string
  indice: number
  contenido: string
  creado_en: string
}

export type RagMensaje = {
  rol: 'user' | 'assistant'
  contenido: string
}

// Mensajería directa DTOs

export type Conversacion = {
  id: string
  usuario_a: string
  usuario_b: string
  creado_en: string
  actualizado_en: string
}

export type Mensaje = {
  id: string
  conversacion_id: string
  emisor_id: string
  contenido: string
  leido: boolean
  creado_en: string
}

export type ConversacionResumen = {
  conversacion_id: string
  otro: UsuarioCardData
  ultimo_contenido: string | null
  ultimo_emisor_id: string | null
  ultimo_creado_en: string | null
  actualizado_en: string
  no_leidos: number
}

// Admin bulk-email DTOs (notificaciones-email-resend, Phase 4a)

export type DestinatariosCriterio =
  | { tipo: 'todos' }
  | { tipo: 'ciudad'; valor: string }
  | { tipo: 'ids'; valor: string[] }
  // Resolved server-side (Route Handler) into { tipo: 'ids', valor } before it
  // ever reaches resolver_destinatarios_correo / enviar-correo-masivo — the
  // RPC has no concept of "no publications", so it never sees this variant.
  | { tipo: 'sin_publicacion' }

/** Shape of a resolved recipient row — matches resolver_destinatarios_correo's RETURNS TABLE. */
export type DestinatarioResuelto = { id: string; email: string; nombre: string }

/** Reconciled against design's DDL (M3) — supersedes an earlier spec draft's 'enviado'|'error'. */
export type EstadoCorreoAdmin = 'pendiente' | 'completado' | 'fallido'

export type CorreoAdmin = {
  id: string
  admin_id: string | null
  asunto: string
  cuerpo: string
  destinatarios_criterio: DestinatariosCriterio
  cantidad_destinatarios: number
  cantidad_enviados: number
  cantidad_fallidos: number
  estado: EstadoCorreoAdmin
  enviado_en: string
}

export type CorreoAdminDetalle = CorreoAdmin & {
  /** null if the sending admin's account was later deleted (admin_id ON DELETE SET NULL). */
  admin: Pick<Usuario, 'id' | 'nombre'> | null
}

// Notificaciones DTOs (notificaciones-app)

export type TipoNotificacion =
  | 'comentario_nueva'
  | 'comentario_respuesta'
  | 'obra_aceptada_revista'
  | 'nuevo_seguidor'
  | 'solicitud_mensaje'
  | 'obra_likeada'

export type Notificacion = {
  id: string
  usuario_id: string
  tipo: TipoNotificacion
  /** The actor who triggered the notification (liker, commenter, follower...). */
  usuario_relacionado_id: string | null
  publicacion_relacionada_id: string | null
  /** For `comentario_respuesta`, the parent (root) comment — the cascade anchor. Always null for `comentario_nueva` (see BD §3.22). */
  comentario_relacionado_id: string | null
  descripcion: string
  enlace: string | null
  /** Aggregation count for the 4 aggregating types (obra_likeada, comentario_nueva, comentario_respuesta, nuevo_seguidor); always 1 for the other 2. */
  contador: number
  leida: boolean
  leida_en: string | null
  creada_en: string
}

/**
 * Shape returned by RPC `mis_preferencias_notif_app()` — these 5 columns have
 * NO SELECT grant (private, unlike public profile fields); only readable via
 * this self-scoped SECURITY DEFINER RPC. See BD §3.22.
 */
export type PreferenciasNotifApp = {
  notif_app_comentarios: boolean
  notif_app_seguidores: boolean
  notif_app_revista: boolean
  notif_app_mensajes: boolean
  notif_app_likes: boolean
}
