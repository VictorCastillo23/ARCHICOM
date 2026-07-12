'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiClient, ApiError } from '@/lib/api/client'
import type { NotificacionConActor } from '@/lib/types/database'
import NotificationItem from './NotificationItem'

const DROPDOWN_LIMIT = 8

export interface NotificationDropdownProps {
  onClose: () => void
  /** Called whenever the unread count may have changed (item read, mark-all). */
  onRead: () => void
}

/**
 * Compact notification list, positioned under the bell button. No `Popover`
 * primitive exists in this codebase — a plain absolutely-positioned `div` is
 * the established pattern (mirrors `MobileMenu`'s portal-free positioning
 * choice at this scale). Fetches lazily: only mounted while the bell is open.
 */
export default function NotificationDropdown({ onClose, onRead }: NotificationDropdownProps) {
  const [items, setItems] = useState<NotificacionConActor[] | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiClient<{ items: NotificacionConActor[]; total: number }>(
      `/api/notificaciones?limit=${DROPDOWN_LIMIT}`,
    )
      .then((d) => {
        if (!cancelled) {
          setItems(d.items)
          setTotal(d.total)
        }
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las notificaciones')
      })
    return () => {
      cancelled = true
    }
  }, [])

  function handleItemRead(id: string) {
    setItems((prev) => prev?.map((n) => (n.id === id ? { ...n, leida: true } : n)) ?? prev)
    onRead()
  }

  async function handleMarkAllRead() {
    setMarking(true)
    setError(null)
    try {
      await apiClient('/api/notificaciones/marcar-todas-leidas', { method: 'POST' })
      setItems((prev) => prev?.map((n) => ({ ...n, leida: true })) ?? prev)
      onRead()
    } catch {
      setError('No se pudo marcar todo como leído')
    } finally {
      setMarking(false)
    }
  }

  const hasUnread = items?.some((n) => !n.leida) ?? false

  return (
    <div
      role="dialog"
      aria-label="Notificaciones"
      className="absolute right-0 z-40 mt-2 w-80 max-w-[90vw] rounded-lg border border-border bg-surface shadow-lg"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-semibold text-text">Notificaciones</span>
        {hasUnread && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={marking}
            className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
          >
            Marcar todas leídas
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {items === null && !error && (
          <p className="px-4 py-6 text-center text-sm text-text-muted">Cargando…</p>
        )}
        {error && (
          <p role="alert" className="px-4 py-6 text-center text-sm text-danger">
            {error}
          </p>
        )}
        {items?.length === 0 && (
          <p role="status" className="px-4 py-6 text-center text-sm text-text-muted">
            No tienes notificaciones.
          </p>
        )}
        {items?.map((n) => (
          <NotificationItem
            key={n.id}
            notificacion={n}
            onRead={handleItemRead}
            onNavigate={onClose}
          />
        ))}
      </div>

      {total !== null && total >= 5 && (
        <div className="border-t border-border px-4 py-2 text-center">
          <Link
            href="/notificaciones"
            onClick={onClose}
            className="text-sm font-medium text-primary hover:underline"
          >
            Ver todas
          </Link>
        </div>
      )}
    </div>
  )
}
