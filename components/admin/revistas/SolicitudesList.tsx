'use client'

import { useEffect, useState } from 'react'
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

  async function handleAction(solicitudId: string, action: 'aceptar' | 'rechazar') {
    setActionId(solicitudId)
    try {
      await apiClient(`/api/solicitudes/${solicitudId}/${action}`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      setSolicitudes((prev) => prev.filter((s) => s.id !== solicitudId))
      if (action === 'aceptar') {
        router.refresh()
      }
    } catch (err) {
      alert(err instanceof ApiError ? err.message : `Error al ${action} la solicitud.`)
    } finally {
      setActionId(null)
    }
  }

  return (
    <div>
      <h2 className="font-semibold text-lg mb-3">Solicitudes pendientes</h2>

      {loading && (
        <p className="text-sm text-[--color-text-muted]">Cargando solicitudes…</p>
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
                className="flex items-start gap-3 p-4 rounded-[--radius-md] border border-[--color-border] bg-[--color-surface]"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {sol.publicacion?.titulo ?? sol.publicacion_id}
                  </p>
                  {sol.mensaje && (
                    <p className="text-xs text-[--color-text-muted] mt-0.5 line-clamp-2">
                      {sol.mensaje}
                    </p>
                  )}
                  <p className="text-xs text-[--color-text-muted] mt-1">
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
                    onClick={() => handleAction(sol.id, 'rechazar')}
                  >
                    Rechazar
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
