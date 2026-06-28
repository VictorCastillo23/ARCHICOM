'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { ApiError, apiClient } from '@/lib/api/client'

export interface EnviarMensajeButtonProps {
  otroId: string
  seSiguen: boolean
  /** ID of the existing conversation; null if no conversation yet. */
  conversacionId: string | null
  solicitudPendiente: boolean
}

type EnviarSolicitudResult = {
  resultado: 'mutuo' | 'solicitud'
  solicitud_id?: string
}

export default function EnviarMensajeButton({
  otroId,
  seSiguen,
  conversacionId,
  solicitudPendiente,
}: EnviarMensajeButtonProps) {
  const router = useRouter()
  const [panelOpen, setPanelOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  // Mutual follow — navigate to conversation or composer
  if (seSiguen) {
    const href = conversacionId
      ? `/mensajes/${conversacionId}`
      : `/mensajes/nuevo?u=${otroId}`

    return (
      <a
        href={href}
        className={[
          'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
          'border border-border bg-surface text-text transition-colors',
          'hover:border-primary hover:text-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        ].join(' ')}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span>Enviar mensaje</span>
      </a>
    )
  }

  // Not mutual — request already sent (pending)
  if (solicitudPendiente || sent) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        className={[
          'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
          'border border-border bg-surface text-text-muted',
          'pointer-events-none opacity-60',
        ].join(' ')}
      >
        Solicitud enviada
      </button>
    )
  }

  // Not mutual — no pending request yet: show "Enviar mensaje" with inline panel
  async function handleEnviarSolicitud() {
    setSending(true)
    setError('')
    try {
      const result = await apiClient<EnviarSolicitudResult>(
        '/api/mensajes/solicitudes',
        {
          method: 'POST',
          body: JSON.stringify({ receptor_id: otroId }),
        }
      )

      if (result?.resultado === 'mutuo') {
        router.push(`/mensajes/nuevo?u=${otroId}`)
      } else {
        setSent(true)
        setPanelOpen(false)
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Error al enviar la solicitud. Intentá de nuevo.'
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setPanelOpen((v) => !v)}
        className={[
          'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
          'border border-border bg-surface text-text transition-colors',
          'hover:border-primary hover:text-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        ].join(' ')}
        aria-expanded={panelOpen}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span>Enviar mensaje</span>
      </button>

      {panelOpen && (
        <div className="rounded-md border border-border bg-surface p-4 max-w-sm">
          <p className="text-sm text-text mb-3">
            Para conversar, ambos se tienen que seguir. Si enviás una solicitud
            vas a empezar a seguir a esta persona y le va a llegar tu pedido.
          </p>

          {error && (
            <p role="alert" className="text-sm text-danger mb-2">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              loading={sending}
              onClick={handleEnviarSolicitud}
            >
              Enviar solicitud
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={sending}
              onClick={() => {
                setPanelOpen(false)
                setError('')
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
