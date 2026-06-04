'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import TipoBadge from '@/components/ui/TipoBadge'
import EmptyState from '@/components/ui/EmptyState'
import { ApiError, apiClient } from '@/lib/api/client'
import type { FeedPublicacion } from '@/lib/types/database'

const PAGE_SIZE = 12

interface Props {
  revistaId: string
  existingPubIds: string[]
  onClose: () => void
}

export default function PublicacionSelector({ revistaId, existingPubIds, onClose }: Props) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [pubs, setPubs] = useState<FeedPublicacion[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  // Starts as true so the initial render shows the spinner without needing a sync setState
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  useEffect(() => {
    let cancelled = false

    apiClient<{ publicaciones: FeedPublicacion[] }>(
      `/api/publicaciones?limit=${PAGE_SIZE + 1}&offset=${offset}`,
    )
      .then((res) => {
        if (cancelled) return
        const all = res.publicaciones ?? []
        setHasMore(all.length > PAGE_SIZE)
        setPubs(all.slice(0, PAGE_SIZE))
        setFetchError('')
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setFetchError('No se pudieron cargar las publicaciones.')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [offset])

  async function handleAdd(pubId: string) {
    setAddingId(pubId)
    try {
      await apiClient(`/api/revistas/${revistaId}/articulos`, {
        method: 'POST',
        body: JSON.stringify({ publicacion_id: pubId }),
      })
      router.refresh()
      onClose()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error al añadir la publicación.')
      setAddingId(null)
    }
  }

  function handlePageChange(next: number) {
    setLoading(true)
    setOffset(next)
  }

  const available = pubs.filter((p) => !existingPubIds.includes(p.id))

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="rounded-[--radius-lg] shadow-xl border border-[--color-border] bg-[--color-surface] p-0 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col backdrop:bg-black/40"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-[--color-border]">
        <h2 className="font-semibold">Añadir publicación</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ✕
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading && (
          <p className="text-sm text-[--color-text-muted] py-8 text-center">Cargando…</p>
        )}
        {!loading && fetchError && (
          <p className="text-sm text-[--color-danger] py-8 text-center">{fetchError}</p>
        )}

        {!loading && !fetchError && available.length === 0 && (
          <EmptyState
            title="Sin publicaciones disponibles"
            description="Todas las publicaciones de esta página ya están en la revista."
          />
        )}

        {!loading && !fetchError && available.length > 0 && (
          <div className="flex flex-col gap-2">
            {available.map((pub) => (
              <div
                key={pub.id}
                className="flex items-center gap-3 p-3 rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-muted]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <TipoBadge tipo={pub.tipo} />
                  </div>
                  <p className="font-medium text-sm truncate">{pub.titulo}</p>
                  <p className="text-xs text-[--color-text-muted]">Por {pub.nombre_autor}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={addingId === pub.id}
                  disabled={addingId !== null}
                  onClick={() => handleAdd(pub.id)}
                >
                  Añadir
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-6 py-3 border-t border-[--color-border]">
        <Button
          variant="ghost"
          size="sm"
          disabled={offset === 0 || loading}
          onClick={() => handlePageChange(Math.max(0, offset - PAGE_SIZE))}
        >
          ← Anterior
        </Button>
        <span className="text-xs text-[--color-text-muted]">
          {offset + 1}–{offset + pubs.length}
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasMore || loading}
          onClick={() => handlePageChange(offset + PAGE_SIZE)}
        >
          Siguiente →
        </Button>
      </div>
    </dialog>
  )
}
