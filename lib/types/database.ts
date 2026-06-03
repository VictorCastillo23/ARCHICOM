// Union-literal type aliases (not TS enum keyword)

export type TipoPublicacion = 'libro' | 'articulo' | 'investigacion' | 'poema' | 'dibujo' | 'otro'
export type RolUsuario = 'usuario' | 'administrador'
export type EstadoRevista = 'borrador' | 'publicada'
export type EstadoSolicitud = 'pendiente' | 'aceptada' | 'rechazada'

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

export type Publicacion = {
  id: string
  titulo: string
  resumen: string
  tipo: TipoPublicacion
  archivo_url?: string
  autor_id: string
  creado_en: string
  actualizado_en: string
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
  usuario?: Pick<Usuario, 'id' | 'nombre'>
}

export type Like = {
  id: string
  publicacion_id: string
  usuario_id: string
  creado_en: string
}

export type Revista = {
  id: string
  titulo: string
  volumen?: number
  descripcion?: string
  estado: EstadoRevista
  editor_id: string
  publicada_en?: string | null
  creado_en: string
}

export type RevistaArticulo = {
  id: string
  revista_id: string
  publicacion_id: string
  orden: number
  publicacion?: Publicacion & { usuario?: Pick<Usuario, 'id' | 'nombre'> }
}

export type SolicitudRevista = {
  id: string
  publicacion_id: string
  revista_id: string
  solicitante_id: string
  mensaje?: string
  estado: EstadoSolicitud
  creado_en: string
}

// View DTO

export type FeedPublicacion = {
  id: string
  titulo: string
  resumen: string
  tipo: TipoPublicacion
  archivo_url?: string
  autor_id: string
  creado_en: string
  nombre_autor: string
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
