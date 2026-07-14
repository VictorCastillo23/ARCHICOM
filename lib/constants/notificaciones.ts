import type { TipoNotificacion } from '@/lib/types/database'

/**
 * Single source of truth for notification type display copy (modal heading,
 * `/notificaciones` page filter chips). Adding a value to `TipoNotificacion`
 * forces an entry here (the Record is exhaustive — tsc errors otherwise).
 * Mirrors `lib/constants/publicaciones.ts`'s `TIPO_META` pattern.
 */
export const TIPO_NOTIF_META: Record<TipoNotificacion, { label: string }> = {
  comentario_nueva: { label: 'Comentario nuevo' },
  comentario_respuesta: { label: 'Respuesta a tu comentario' },
  obra_aceptada_revista: { label: 'Obra aceptada en revista' },
  nuevo_seguidor: { label: 'Nuevo seguidor' },
  solicitud_mensaje: { label: 'Solicitud de mensaje' },
  obra_likeada: { label: 'Le gustó tu obra' },
  obra_rechazada_revista: { label: 'Obra no aceptada en revista' },
  recordatorio_cierre_revista: { label: 'Cierre de postulación próximo' },
}

/** Key order = filter-chip display order on `/notificaciones`. */
export const TIPOS_NOTIFICACION: TipoNotificacion[] = [
  'comentario_nueva',
  'comentario_respuesta',
  'obra_likeada',
  'nuevo_seguidor',
  'obra_aceptada_revista',
  'obra_rechazada_revista',
  'solicitud_mensaje',
  'recordatorio_cierre_revista',
]
