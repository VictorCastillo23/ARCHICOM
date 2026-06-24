'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import { ApiError, apiClient } from '@/lib/api/client'
import type { EstadoSolicitud } from '@/lib/types/database'

type SolicitudItem = {
  id: string
  publicacion_id: string
  revista_id: string
  solicitante_id: string
  mensaje?: string | null
  estado: EstadoSolicitud
  creado_en: string
  publicacion: { id: string; titulo: string } | null
  revista: { id: string; titulo: string } | null
}

interface Props {
  revistaId: string
}

export default function SolicitudesList({ revistaId }: Props) {
  const router = useRouter()
  // Starts as true so the initial render shows loading without a sync setState in effect
  const [loading, setLoading] = useState(true)
  const [solicitudes, setSolicitudes] = useState<SolicitudItem[]>([])
  const [fetchError, setFetchError] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [rejectPending, setRejectPending] = useState<{ solicitudId: string; motivo: string } | null>(null)

  // Initial fetch — all setState calls are inside promise callbacks (not synchronously in effect)
  useEffect(() => {
    let cancelled = false

    apiClient<{ solicitudes: SolicitudItem[] }>(
      `/api/solicitudes?revista_id=${revistaId}&estado=pendiente`,
    )
      .then((res) => {
        if (!cancelled) {
          setSolicitudes(res.solicitudes ?? [])
          setFetchError('')
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFetchError('No se pudieron cargar las solicitudes.')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [revistaId])

  // Retry — called from an event handler, not from an effect
  function retry() {
    setLoading(true)
    setFetchError('')

    apiClient<{ solicitudes: SolicitudItem[] }>(
      `/api/solicitudes?revista_id=${revistaId}&estado=pendiente`,
    )
      .then((res) => {
        setSolicitudes(res.solicitudes ?? [])
        setFetchError('')
      })
      .catch(() => setFetchError('No se pudieron cargar las solicitudes.'))
      .finally(() => setLoading(false))
  }

  async function handleAction(solicitudId: string, action: 'aceptar' | 'rechazar', respuesta?: string) {
    setActionId(solicitudId)
    setActionError('')
    setRejectPending(null)
    try {
      await apiClient(`/api/solicitudes/${solicitudId}/${action}`, {
        method: 'POST',
        body: JSON.stringify(respuesta ? { respuesta } : {}),
      })
      setSolicitudes((prev) => prev.filter((s) => s.id !== solicitudId))
      if (action === 'aceptar') {
        router.refresh()
      }
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : `Error al ${action} la solicitud.`
      )
    } finally {
      setActionId(null)
    }
  }

  return (
    <div>
      <h2 className="font-semibold text-lg mb-1">Solicitudes pendientes</h2>
      <p className="text-xs text-text-muted mb-3">
        Las solicitudes pendientes se descartan automáticamente el viernes.
      </p>

      {actionError && (
        <p role="alert" className="text-sm text-danger mb-3">
          {actionError}
        </p>
      )}

      {loading && (
        <p className="text-sm text-text-muted">Cargando solicitudes…</p>
      )}

      {!loading && fetchError && (
        <ErrorState description={fetchError} retry={retry} />
      )}

      {!loading && !fetchError && solicitudes.length === 0 && (
        <EmptyState
          title="Sin solicitudes pendientes"
          description="No hay solicitudes esperando revisión para esta revista."
        />
      )}

      {!loading && !fetchError && solicitudes.length > 0 && (
        <div className="flex flex-col gap-3">
          {solicitudes.map((sol) => {
            const busy = actionId === sol.id
            return (
              <div
                key={sol.id}
                className="p-4 rounded-md border border-border bg-surface"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/publicacion/${sol.publicacion_id}`}
                      target="_blank"
                      className="font-medium text-sm truncate hover:underline block"
                    >
                      {sol.publicacion?.titulo ?? sol.publicacion_id}
                    </Link>
                    {sol.mensaje && (
                      <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
                        {sol.mensaje}
                      </p>
                    )}
                    <p className="text-xs text-text-muted mt-1">
                      {new Date(sol.creado_en).toLocaleDateString('es-AR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      loading={busy}
                      disabled={actionId !== null}
                      onClick={() => handleAction(sol.id, 'aceptar')}
                    >
                      Aceptar
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={busy}
                      disabled={actionId !== null}
                      onClick={() => {
                        if (rejectPending?.solicitudId === sol.id) return
                        setRejectPending({ solicitudId: sol.id, motivo: '' })
                      }}
                    >
                      Rechazar
                    </Button>
                  </div>
                </div>

                {rejectPending?.solicitudId === sol.id && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <label
                      htmlFor={`reject-motivo-${sol.id}`}
                      className="block text-xs font-medium text-text mb-1"
                    >
                      Motivo del rechazo <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id={`reject-motivo-${sol.id}`}
                      className="w-full rounded-sm border border-input bg-surface-muted px-3 py-2 text-sm text-text resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={3}
                      maxLength={250}
                      placeholder="Explicá brevemente por qué se rechaza esta solicitud…"
                      value={rejectPending.motivo}
                      onChange={(e) =>
                        setRejectPending({ solicitudId: sol.id, motivo: e.target.value })
                      }
                    />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-text-muted">
                        {rejectPending.motivo.length}/250
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!!actionId}
                          onClick={() => setRejectPending(null)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          loading={busy}
                          disabled={!!actionId || rejectPending.motivo.trim().length === 0}
                          onClick={() => handleAction(sol.id, 'rechazar', rejectPending.motivo.trim())}
                        >
                          Confirmar rechazo
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
