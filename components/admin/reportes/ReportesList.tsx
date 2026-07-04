'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import { ApiError, apiClient } from '@/lib/api/client'
import type { ReporteConDetalle, MotivoReporte } from '@/lib/types/database'

const MOTIVO_LABELS: Record<MotivoReporte, string> = {
  contenido_inapropiado: 'Contenido inapropiado',
  plagio: 'Plagio',
  spam: 'Spam',
  otro: 'Otro',
}

export default function ReportesList() {
  // Starts as true so the initial render shows loading without a sync setState in effect
  const [loading, setLoading] = useState(true)
  const [reportes, setReportes] = useState<ReporteConDetalle[]>([])
  const [fetchError, setFetchError] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  // Initial fetch — all setState calls are inside promise callbacks (not synchronously in effect)
  useEffect(() => {
    let cancelled = false

    apiClient<{ reportes: ReporteConDetalle[] }>('/api/reportes?estado=pendiente')
      .then((res) => {
        if (!cancelled) {
          setReportes(res.reportes ?? [])
          setFetchError('')
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFetchError('No se pudieron cargar los reportes.')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Retry — called from an event handler, not from an effect
  function retry() {
    setLoading(true)
    setFetchError('')

    apiClient<{ reportes: ReporteConDetalle[] }>('/api/reportes?estado=pendiente')
      .then((res) => {
        setReportes(res.reportes ?? [])
        setFetchError('')
      })
      .catch(() => setFetchError('No se pudieron cargar los reportes.'))
      .finally(() => setLoading(false))
  }

  async function handleAction(reporteId: string, action: 'bloquear' | 'descartar') {
    setActionId(reporteId)
    setActionError('')
    try {
      await apiClient(`/api/reportes/${reporteId}/${action}`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      // Optimistic removal from list on success
      setReportes((prev) => prev.filter((r) => r.id !== reporteId))
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : `Error al ${action} el reporte.`
      )
    } finally {
      setActionId(null)
    }
  }

  return (
    <div>
      <h2 className="font-semibold text-lg mb-1">Reportes pendientes</h2>
      <p className="text-xs text-text-muted mb-3">
        Revisa cada reporte y decide si bloquear la publicación o descartar el reporte.
      </p>

      {actionError && (
        <p role="alert" className="text-sm text-danger mb-3">
          {actionError}
        </p>
      )}

      {loading && (
        <p className="text-sm text-text-muted">Cargando reportes…</p>
      )}

      {!loading && fetchError && (
        <ErrorState description={fetchError} retry={retry} />
      )}

      {!loading && !fetchError && reportes.length === 0 && (
        <EmptyState
          title="Sin reportes pendientes"
          description="No hay reportes esperando revisión."
        />
      )}

      {!loading && !fetchError && reportes.length > 0 && (
        <div className="flex flex-col gap-3">
          {reportes.map((rep) => {
            const busy = actionId === rep.id
            return (
              <div
                key={rep.id}
                className="p-4 rounded-md border border-border bg-surface"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/publicacion/${rep.publicacion_id}`}
                      target="_blank"
                      className="font-medium text-sm truncate hover:underline block"
                    >
                      {rep.publicacion?.titulo ?? rep.publicacion_id}
                    </Link>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center rounded-full bg-surface-muted border border-border px-2 py-0.5 text-xs font-medium text-text-muted">
                        {MOTIVO_LABELS[rep.motivo]}
                      </span>
                      {rep.reportante && (
                        <span className="text-xs text-text-muted">
                          Reportado por{' '}
                          <span className="font-medium text-text">
                            {rep.reportante.nombre}
                          </span>
                        </span>
                      )}
                    </div>

                    {rep.detalle && (
                      <p className="text-xs text-text-muted mt-1.5 line-clamp-2">
                        {rep.detalle}
                      </p>
                    )}

                    <p className="text-xs text-text-muted mt-1">
                      {new Date(rep.creado_en).toLocaleDateString('es-AR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="danger"
                      loading={busy}
                      disabled={actionId !== null}
                      onClick={() => handleAction(rep.id, 'bloquear')}
                    >
                      Bloquear
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={busy}
                      disabled={actionId !== null}
                      onClick={() => handleAction(rep.id, 'descartar')}
                    >
                      Descartar
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
