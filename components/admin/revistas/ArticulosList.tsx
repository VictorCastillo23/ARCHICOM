'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import TipoBadge from '@/components/ui/TipoBadge'
import EmptyState from '@/components/ui/EmptyState'
import PublicacionSelector from './PublicacionSelector'
import { ApiError, apiClient } from '@/lib/api/client'
import type { RevistaArticulo } from '@/lib/types/database'

interface Props {
  revistaId: string
  articulos: RevistaArticulo[]
}

export default function ArticulosList({ revistaId, articulos }: Props) {
  const router = useRouter()
  const [showSelector, setShowSelector] = useState(false)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const sorted = [...articulos].sort((a, b) => a.orden - b.orden)
  const existingPubIds = sorted.map((a) => a.publicacion_id)

  async function handleMove(index: number, direction: 'up' | 'down') {
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= sorted.length) return

    const a = sorted[index]
    const b = sorted[swapIndex]
    setMovingId(a.publicacion_id)

    try {
      await apiClient(`/api/revistas/${revistaId}/articulos`, {
        method: 'PATCH',
        body: JSON.stringify({
          articulos: [
            { publicacion_id: a.publicacion_id, orden: b.orden },
            { publicacion_id: b.publicacion_id, orden: a.orden },
          ],
        }),
      })
      router.refresh()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error al reordenar.')
    } finally {
      setMovingId(null)
    }
  }

  async function handleRemove(publicacionId: string) {
    setRemovingId(publicacionId)
    try {
      await apiClient(
        `/api/revistas/${revistaId}/articulos?publicacion_id=${publicacionId}`,
        { method: 'DELETE' },
      )
      router.refresh()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error al quitar el artículo.')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-lg">Artículos curados</h2>
        <Button size="sm" variant="secondary" onClick={() => setShowSelector(true)}>
          + Añadir publicación
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          title="Sin artículos"
          description="Añadí publicaciones para curar esta revista."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((art, i) => {
            const pub = art.publicacion
            const isMoving = movingId === art.publicacion_id
            const isRemoving = removingId === art.publicacion_id
            const busy = isMoving || isRemoving

            return (
              <div
                key={art.id}
                className="flex items-center gap-3 p-3 rounded-[--radius-md] border border-[--color-border] bg-[--color-surface]"
              >
                <span className="text-xs text-[--color-text-muted] w-6 text-right shrink-0">
                  {i + 1}
                </span>

                <div className="flex-1 min-w-0">
                  {pub ? (
                    <>
                      <div className="flex items-center gap-2 mb-0.5">
                        <TipoBadge tipo={pub.tipo} />
                      </div>
                      <p className="font-medium text-sm truncate">{pub.titulo}</p>
                      {pub.usuario && (
                        <p className="text-xs text-[--color-text-muted]">
                          Por {pub.usuario.nombre}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-[--color-text-muted]">
                      ID: {art.publicacion_id}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={i === 0 || busy}
                    loading={isMoving}
                    aria-label="Mover arriba"
                    onClick={() => handleMove(i, 'up')}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={i === sorted.length - 1 || busy}
                    loading={isMoving}
                    aria-label="Mover abajo"
                    onClick={() => handleMove(i, 'down')}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busy}
                    loading={isRemoving}
                    aria-label="Quitar artículo"
                    onClick={() => handleRemove(art.publicacion_id)}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showSelector && (
        <PublicacionSelector
          revistaId={revistaId}
          existingPubIds={existingPubIds}
          onClose={() => setShowSelector(false)}
        />
      )}
    </div>
  )
}
