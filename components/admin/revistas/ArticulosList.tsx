'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import TipoBadge from '@/components/ui/TipoBadge'
import EmptyState from '@/components/ui/EmptyState'
import { ApiError, apiClient } from '@/lib/api/client'
import type { EstadoRevista, RevistaArticulo } from '@/lib/types/database'

interface Props {
  revistaId: string
  articulos: RevistaArticulo[]
  estado: EstadoRevista
}

export default function ArticulosList({ revistaId, articulos, estado }: Props) {
  const router = useRouter()
  const [movingId, setMovingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [removePending, setRemovePending] = useState<{ publicacionId: string; motivo: string } | null>(null)

  const readonly = estado === 'publicada'
  const sorted = [...articulos].sort((a, b) => a.orden - b.orden)

  async function handleMove(index: number, direction: 'up' | 'down') {
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= sorted.length) return

    const a = sorted[index]
    const b = sorted[swapIndex]
    setMovingId(a.publicacion_id)
    setActionError('')

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
      setActionError(err instanceof ApiError ? err.message : 'Error al reordenar.')
    } finally {
      setMovingId(null)
    }
  }

  async function handleRemove(publicacionId: string, motivo: string) {
    setRemovingId(publicacionId)
    setActionError('')
    setRemovePending(null)
    try {
      await apiClient(
        `/api/revistas/${revistaId}/articulos?publicacion_id=${publicacionId}`,
        {
          method: 'DELETE',
          body: JSON.stringify({ motivo: motivo.trim() || null }),
        },
      )
      router.refresh()
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : 'Error al quitar el artículo.'
      )
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
            <span className="text-xs text-text-muted border border-border rounded px-1.5 py-0.5">
              solo lectura
            </span>
          )}
        </div>
      </div>

      {actionError && (
        <p role="alert" className="text-sm text-danger mb-3">
          {actionError}
        </p>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          title="Sin artículos"
          description="Añade publicaciones para curar esta revista."
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
                className="rounded-md border border-border bg-surface p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-muted w-6 text-right shrink-0">
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
                          <p className="text-xs text-text-muted line-clamp-3 min-h-[3rem] leading-4 mt-0.5">{pub.resumen}</p>
                        )}
                        {pub.usuario && (
                          <p className="text-xs text-text-muted">
                            Por {pub.usuario.nombre}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-text-muted">
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
                        onClick={() => {
                          if (removePending?.publicacionId === art.publicacion_id) return
                          setRemovePending({ publicacionId: art.publicacion_id, motivo: '' })
                        }}
                      >
                        ✕
                      </Button>
                    </div>
                  )}
                </div>

                {removePending?.publicacionId === art.publicacion_id && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <label
                      htmlFor={`remove-motivo-${art.publicacion_id}`}
                      className="block text-xs font-medium text-text mb-1"
                    >
                      Motivo de la cancelación
                    </label>
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-text-muted mt-2 shrink-0 leading-none">
                        Aceptada y después cancelada por:
                      </span>
                      <textarea
                        id={`remove-motivo-${art.publicacion_id}`}
                        className="flex-1 rounded-sm border border-input bg-surface-muted px-3 py-2 text-sm text-text resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        rows={2}
                        maxLength={200}
                        placeholder="razón del retiro…"
                        value={removePending.motivo}
                        onChange={(e) =>
                          setRemovePending({ publicacionId: art.publicacion_id, motivo: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-text-muted">
                        {removePending.motivo.length}/200
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isRemoving}
                          onClick={() => setRemovePending(null)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          loading={isRemoving}
                          disabled={isRemoving}
                          onClick={() => handleRemove(art.publicacion_id, removePending.motivo)}
                        >
                          Confirmar retiro
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
