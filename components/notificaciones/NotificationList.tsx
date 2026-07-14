'use client'

import { useState } from 'react'
import EmptyState from '@/components/ui/EmptyState'
import type { NotificacionConActor } from '@/lib/types/database'
import NotificationItem from './NotificationItem'
import NotificationModal from './NotificationModal'

export interface NotificationListProps {
  items: NotificacionConActor[]
}

/**
 * Client wrapper for the `/notificaciones` page's list. The page itself is a
 * Server Component (SSR read via `lib/data`), so the detail modal's
 * open/selected state — and the local read/delete bookkeeping after actions —
 * lives here (mirrors `SolicitudesMensajeList`'s role on `/mensajes`).
 */
export default function NotificationList({ items: initialItems }: NotificationListProps) {
  const [items, setItems] = useState(initialItems)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = items.find((n) => n.id === selectedId) ?? null

  function handleRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)))
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id))
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No tienes notificaciones"
        description="Cuando alguien interactúe con tu obra o tu perfil, aparecerá aquí."
      />
    )
  }

  return (
    <>
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface list-none p-0">
        {items.map((n) => (
          <li key={n.id}>
            <NotificationItem
              notificacion={n}
              onRead={handleRead}
              onOpenDetail={(notif) => setSelectedId(notif.id)}
            />
          </li>
        ))}
      </ul>

      <NotificationModal
        notificacion={selected}
        onClose={() => setSelectedId(null)}
        onRead={handleRead}
        onDelete={handleDelete}
      />
    </>
  )
}
