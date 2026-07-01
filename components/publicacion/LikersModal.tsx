'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import { apiClient, ApiError } from '@/lib/api/client'
import type { Liker } from '@/lib/types/database'

interface LikersModalProps {
  open: boolean
  onClose: () => void
  publicacionId: string
}

export default function LikersModal({
  open,
  onClose,
  publicacionId,
}: LikersModalProps) {
  const [likers, setLikers] = useState<Liker[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Lazy fetch: only load the list when the modal opens.
  useEffect(() => {
    if (!open) return

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await apiClient<Liker[]>(
          `/api/likes?publicacion_id=${encodeURIComponent(publicacionId)}`,
        )
        if (!cancelled) setLikers(data)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof ApiError
            ? err.message
            : 'No se pudo cargar la lista. Intentá de nuevo.',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [open, publicacionId])

  return (
    <Modal open={open} onClose={onClose} labelledById="likers-title">
      <div className="flex items-center justify-between mb-4">
        <h2 id="likers-title" className="text-base font-semibold text-text">
          Le gustó a
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="rounded-md p-1 text-text-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {loading && (
        <p className="py-8 text-center text-sm text-text-muted">Cargando…</p>
      )}

      {error && !loading && (
        <p className="py-8 text-center text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && likers && likers.length === 0 && (
        <p className="py-8 text-center text-sm text-text-muted">
          Todavía nadie le dio me gusta.
        </p>
      )}

      {!loading && !error && likers && likers.length > 0 && (
        <ul className="max-h-80 overflow-y-auto -mx-2 divide-y divide-border">
          {likers.map((liker) => (
            <li key={liker.id}>
              <Link
                href={`/usuario/${liker.id}`}
                onClick={onClose}
                className="flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-sm font-semibold text-text-muted uppercase"
                >
                  {liker.nombre.charAt(0)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-text">
                    {liker.nombre}
                  </span>
                  {liker.institucion && (
                    <span className="block truncate text-xs text-text-muted">
                      {liker.institucion}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
