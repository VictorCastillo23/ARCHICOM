'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { apiClient, ApiError } from '@/lib/api/client'
import { TIPO_NOTIF_META } from '@/lib/constants/notificaciones'
import type { NotificacionConActor } from '@/lib/types/database'

export interface NotificationModalProps {
  notificacion: NotificacionConActor | null
  onClose: () => void
  /** Called after a successful mark-read (the notification is opened already-read by the caller in practice). */
  onRead?: (id: string) => void
  /** Called after a successful delete — the caller removes it from its list/count. */
  onDelete?: (id: string) => void
}

function formatFecha(iso: string): string {
  return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  )
}

/**
 * Full detail view for a single notification, reusing `components/ui/Modal.tsx`
 * (focus trap + Escape-to-close + scroll-lock already built in). Shows the
 * actor (avatar + name, linking to their profile), the type heading, the full
 * `descripcion`, the contextual `enlace`, and the timestamp, plus mark-read /
 * delete / close actions.
 */
export default function NotificationModal({
  notificacion,
  onClose,
  onRead,
  onDelete,
}: NotificationModalProps) {
  const titleId = useId()
  const [leida, setLeida] = useState(notificacion?.leida ?? false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!notificacion) return null

  async function handleMarkRead() {
    if (!notificacion || leida) return
    setError(null)
    try {
      await apiClient(`/api/notificaciones/${notificacion.id}/leer`, { method: 'POST' })
      setLeida(true)
      onRead?.(notificacion.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo marcar como leída')
    }
  }

  async function handleDelete() {
    if (!notificacion) return
    setError(null)
    setDeleting(true)
    try {
      await apiClient(`/api/notificaciones/${notificacion.id}`, { method: 'DELETE' })
      onDelete?.(notificacion.id)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar la notificación')
      setDeleting(false)
    }
  }

  const tipoLabel = TIPO_NOTIF_META[notificacion.tipo].label

  return (
    <Modal open={!!notificacion} onClose={onClose} labelledById={titleId}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          {notificacion.usuario_relacionado ? (
            <Link href={`/usuario/${notificacion.usuario_relacionado.id}`} onClick={onClose}>
              <Avatar nombre={notificacion.usuario_relacionado.nombre} size="md" />
            </Link>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-semibold text-text">
              {tipoLabel}
            </h2>
            {notificacion.usuario_relacionado && (
              <Link
                href={`/usuario/${notificacion.usuario_relacionado.id}`}
                onClick={onClose}
                className="text-sm text-primary hover:underline"
              >
                {notificacion.usuario_relacionado.nombre}
              </Link>
            )}
          </div>
        </div>

        <p className="text-sm text-text">{notificacion.descripcion}</p>

        <p className="text-xs text-text-muted">{formatFecha(notificacion.creada_en)}</p>

        {notificacion.enlace && (
          <Link
            href={notificacion.enlace}
            onClick={onClose}
            className="text-sm font-medium text-primary hover:underline"
          >
            Ver contenido →
          </Link>
        )}

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          {!leida && (
            <Button variant="secondary" size="sm" onClick={handleMarkRead}>
              Marcar leída
            </Button>
          )}
          <Button variant="danger" size="sm" loading={deleting} onClick={handleDelete}>
            Eliminar
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
