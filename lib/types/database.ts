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
  creado_en: string
}

/**
 * Public profile fields — excludes email (sourced from auth.getUser() for own
 * profile) and rol (not readable by anon at the DB grant level; the own user's
 * rol is fetched separately for nav/admin gating).
 */
export type PerfilPublico = Omit<Usuario, 'email' | 'rol'>

export type Publicacion = {
  id: string
  titulo: string
  resumen: string
  tipo: TipoPublicacion
  archivo_url?: string
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
