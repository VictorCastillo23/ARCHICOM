'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { ApiError, apiClient } from '@/lib/api/client'
import type { SolicitudMensajeRecibida } from '@/lib/types/database'

interface Props {
  solicitudes: SolicitudMensajeRecibida[]
}

type AceptarResult = { emisor_id: string }

export default function SolicitudesMensajeList({ solicitudes: initialSolicitudes }: Props) {
  const router = useRouter()
  const [items, setItems] = useState(initialSolicitudes)
  const [actionId, setActionId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  if (items.length === 0) return null

  async function handleAceptar(id: string) {
    setActionId(id)
    setActionError('')
    try {
      const result = await apiClient<AceptarResult>(
        `/api/mensajes/solicitudes/${id}/aceptar`,
        { method: 'POST' }
      )
      router.push(`/mensajes/nuevo?u=${result.emisor_id}`)
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : 'Error al aceptar la solicitud.'
      )
      setActionId(null)
    }
  }

  async function handleRechazar(id: string) {
    setActionId(id)
    setActionError('')
    try {
      await apiClient<void>(`/api/mensajes/solicitudes/${id}/rechazar`, {
        method: 'POST',
      })
      setItems((prev) => prev.filter((s) => s.id !== id))
      router.refresh()
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : 'Error al rechazar la solicitud.'
      )
    } finally {
      setActionId(null)
    }
  }

  return (
    <section aria-label="Solicitudes de mensaje">
      <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">
        Solicitudes
      </h2>

      {actionError && (
        <p role="alert" className="text-sm text-danger mb-3">
          {actionError}
        </p>
      )}

      <ul className="flex flex-col divide-y divide-border mb-6">
        {items.map((sol) => {
          const busy = actionId === sol.id
          return (
            <li key={sol.id} className="flex items-center gap-3 py-4 px-1">
              {/* Avatar placeholder — initials */}
              <div
                aria-hidden="true"
                className="shrink-0 w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-medium text-primary"
              >
                {sol.emisor.nombre.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text truncate">
                  {sol.emisor.nombre}
                </p>
                <p className="text-xs text-text-muted">
                  quiere conversar contigo
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  loading={busy}
                  disabled={actionId !== null}
                  onClick={() => handleAceptar(sol.id)}
                >
                  Aceptar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  loading={busy}
                  disabled={actionId !== null}
                  onClick={() => handleRechazar(sol.id)}
                >
                  Rechazar
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
