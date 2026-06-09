'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import TipoBadge from '@/components/ui/TipoBadge'
import EmptyState from '@/components/ui/EmptyState'
//import PublicacionSelector from './PublicacionSelector(obsolete)'
import { ApiError, apiClient } from '@/lib/api/client'
import type { EstadoRevista, RevistaArticulo } from '@/lib/types/database'

interface Props {
  revistaId: string
  articulos: RevistaArticulo[]
  estado: EstadoRevista
}

export default function ArticulosList({ revistaId, articulos, estado }: Props) {
  const router = useRouter()
  const [showSelector, setShowSelector] = useState(false)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const readonly = estado === 'publicada'
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
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg">Artículos curados</h2>
          {readonly && (
            <span className="text-xs text-[--color-text-muted] border border-[--color-border] rounded px-1.5 py-0.5">
              solo lectura
            </span>
          )}
        </div>

        {/*!readonly && (
          <Button size="sm" variant="secondary" onClick={() => setShowSelector(true)}>
            + Añadir publicación
          </Button>
        )*/}
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
                key={art.publicacion_id}
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
                      <Link
                        href={`/publicacion/${art.publicacion_id}`}
                        target="_blank"
                        className="font-medium text-sm line-clamp-2 min-h-[2.5rem] leading-5 hover:underline"
                      >
                        {pub.titulo}
                      </Link>
                      {pub.resumen && (
                        <p className="text-xs text-[--color-text-muted] line-clamp-3 min-h-[3rem] leading-4 mt-0.5">{pub.resumen}</p>
                      )}
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

                {!readonly && (
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
                )}
              </div>
            )
          })}
        </div>
      )}

      {/*showSelector && (
        <PublicacionSelector
          revistaId={revistaId}
          existingPubIds={existingPubIds}
          onClose={() => setShowSelector(false)}
        />
      )*/}
    </div>
  )
}
