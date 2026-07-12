'use client'

import Link from 'next/link'
import { useState } from 'react'
import Avatar from '@/components/ui/Avatar'
import BellIcon from '@/components/ui/BellIcon'
import { apiClient } from '@/lib/api/client'
import type { NotificacionConActor } from '@/lib/types/database'

export interface NotificationItemProps {
  notificacion: NotificacionConActor
  /** Called (with the notification id) right after an optimistic mark-read. */
  onRead?: (id: string) => void
  /** Called right before navigating to `enlace` — e.g. to close the parent dropdown. */
  onNavigate?: () => void
  /** When provided, an extra "ver detalle" button opens the detail modal instead of navigating. */
  onOpenDetail?: (notificacion: NotificacionConActor) => void
}

// Mirrors app/(main)/mensajes/page.tsx's formatRelativeTime for consistent copy.
function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return 'Ahora'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

/**
 * One notification row — shared by the dropdown and the `/notificaciones`
 * page. Renders `descripcion` as-is (already pluralized by the DB trigger's
 * `notif_desc_agg` helper — never re-derived client-side, see BD §3.22).
 * Clicking marks the notification read (fire-and-forget POST, doesn't block
 * navigation) and follows `enlace` via a real `<Link>` so modifier-clicks
 * (open in new tab, etc.) keep working.
 */
export default function NotificationItem({
  notificacion,
  onRead,
  onNavigate,
  onOpenDetail,
}: NotificationItemProps) {
  const [leida, setLeida] = useState(notificacion.leida)

  function markRead() {
    if (leida) return
    setLeida(true)
    apiClient(`/api/notificaciones/${notificacion.id}/leer`, { method: 'POST' }).catch(() => {
      // Non-critical — the badge/list self-corrects on the next Realtime event or refetch.
    })
    onRead?.(notificacion.id)
  }

  function handleOpenDetail(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    markRead()
    onOpenDetail?.(notificacion)
  }

  return (
    <Link
      href={notificacion.enlace ?? '/notificaciones'}
      onClick={() => {
        markRead()
        onNavigate?.()
      }}
      className={[
        'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-muted',
        !leida && 'bg-primary/5',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {notificacion.usuario_relacionado ? (
        <Avatar nombre={notificacion.usuario_relacionado.nombre} size="sm" />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text-muted"
        >
          <BellIcon className="w-4 h-4" />
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm ${leida ? 'text-text-muted' : 'font-medium text-text'}`}
        >
          {notificacion.descripcion}
        </span>
        <span className="mt-0.5 block text-xs text-text-muted">
          {formatRelativeTime(notificacion.creada_en)}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-1">
        {!leida && <span aria-label="No leída" className="h-2 w-2 rounded-full bg-primary" />}
        {onOpenDetail && (
          <button
            type="button"
            onClick={handleOpenDetail}
            aria-label="Ver detalle"
            className="rounded-md p-1 text-text-muted hover:bg-surface hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M12 16v-4m0-4h.01" />
            </svg>
          </button>
        )}
      </span>
    </Link>
  )
}
