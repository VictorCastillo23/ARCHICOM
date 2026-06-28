'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { apiClient, ApiError } from '@/lib/api/client'
import type { Mensaje } from '@/lib/types/database'

interface HiloMensajesProps {
  /** Present for an existing thread; absent/undefined for a new conversation. */
  conversacionId?: string
  viewerId: string
  otroId: string
  initialMensajes: Mensaje[]
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** Returns the ISO date portion (YYYY-MM-DD) for day separator logic. */
function isoDay(iso: string): string {
  return iso.slice(0, 10)
}

export default function HiloMensajes({
  conversacionId: initialConversacionId,
  viewerId,
  otroId,
  initialMensajes,
}: HiloMensajesProps) {
  const router = useRouter()
  const [conversacionId, setConversacionId] = useState<string | undefined>(
    initialConversacionId
  )
  const [mensajes, setMensajes] = useState<Mensaje[]>(initialMensajes)
  const [texto, setTexto] = useState('')
  const [sending, setSending] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Autoscroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  // Mark messages as read on mount (when we have a conversacionId)
  useEffect(() => {
    if (!conversacionId) return
    fetch('/api/mensajes/leer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversacion_id: conversacionId }),
    }).catch(() => {
      // Non-critical — ignore failures
    })
  }, [conversacionId])

  // Realtime subscription — only when conversacionId is known
  useEffect(() => {
    if (!conversacionId) return

    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    async function subscribe() {
      // The realtime socket must carry the user's JWT, otherwise it authenticates
      // with the publishable (anon) key and the `mensaje_lectura` RLS policy denies
      // delivery — the channel reaches SUBSCRIBED but no INSERT events ever arrive.
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (cancelled) return
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token)
      }

      channel = supabase
        .channel(`mensaje:conv:${conversacionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'mensaje',
            filter: `conversacion_id=eq.${conversacionId}`,
          },
          (payload) => {
            const nuevo = payload.new as Mensaje
            setMensajes((prev) => {
              // Dedupe by id — sender also receives their own INSERT echo,
              // which may already be optimistically appended.
              if (prev.some((m) => m.id === nuevo.id)) return prev
              return [...prev, nuevo]
            })
          }
        )
        .subscribe()
    }

    subscribe()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [conversacionId])

  const handleSend = useCallback(async () => {
    const contenido = texto.trim()
    if (!contenido || sending) return
    setErrorMsg(null)
    setSending(true)

    // Optimistic message (temp- prefixed id to signal pending)
    const tempId = `temp-${Date.now()}`
    const optimistic: Mensaje = {
      id: tempId,
      conversacion_id: conversacionId ?? '',
      emisor_id: viewerId,
      contenido,
      leido: false,
      creado_en: new Date().toISOString(),
    }
    setMensajes((prev) => [...prev, optimistic])
    setTexto('')

    try {
      const { mensaje } = await apiClient<{ mensaje: Mensaje }>('/api/mensajes', {
        method: 'POST',
        body: JSON.stringify({ receptor_id: otroId, contenido }),
      })

      // Replace the optimistic message with the confirmed one
      setMensajes((prev) =>
        prev.map((m) => (m.id === tempId ? mensaje : m))
      )

      // If this was a new conversation, set the conversacionId and redirect
      if (!conversacionId && mensaje.conversacion_id) {
        setConversacionId(mensaje.conversacion_id)
        router.replace(`/mensajes/${mensaje.conversacion_id}`)
      }
    } catch (err) {
      // Remove the optimistic message and show the error
      setMensajes((prev) => prev.filter((m) => m.id !== tempId))
      setTexto(contenido) // restore the text
      if (err instanceof ApiError) {
        setErrorMsg(err.message)
      } else {
        setErrorMsg('Error al enviar el mensaje. Intentá de nuevo.')
      }
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }, [texto, sending, conversacionId, viewerId, otroId, router])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Ctrl+Enter or Cmd+Enter to send
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  const remaining = 2000 - texto.length
  const overLimit = remaining < 0

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* Message list */}
      <div
        className="flex-1 overflow-y-auto py-4 px-1 flex flex-col gap-1"
        aria-live="polite"
        aria-label="Mensajes"
      >
        {mensajes.length === 0 && (
          <p className="text-center text-sm text-text-muted py-8">
            Aún no hay mensajes. ¡Escribí el primero!
          </p>
        )}

        {mensajes.map((msg, idx) => {
          const isOwn = msg.emisor_id === viewerId
          const isTemp = msg.id.startsWith('temp-')

          // Day separator: show when date changes from previous message
          const showDaySep =
            idx === 0 ||
            isoDay(msg.creado_en) !== isoDay(mensajes[idx - 1].creado_en)

          return (
            <div key={msg.id}>
              {showDaySep && (
                <div className="flex items-center gap-3 py-3" aria-hidden="true">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-text-muted capitalize">
                    {formatDay(msg.creado_en)}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}

              <div
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}
              >
                <div
                  className={[
                    'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
                    isOwn
                      ? 'bg-primary text-primary-fg rounded-br-sm'
                      : 'bg-surface border border-border text-text rounded-bl-sm',
                    isTemp ? 'opacity-60' : '',
                  ].join(' ')}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.contenido}</p>
                  <p
                    className={[
                      'text-right mt-1',
                      'text-[length:0.65rem]',
                      isOwn ? 'text-primary-fg/70' : 'text-text-muted',
                    ].join(' ')}
                    aria-label={`Enviado a las ${formatTime(msg.creado_en)}`}
                  >
                    {formatTime(msg.creado_en)}
                    {isOwn && !isTemp && (
                      <span aria-label={msg.leido ? 'Leído' : 'Enviado'}>
                        {' '}
                        {msg.leido ? '✓✓' : '✓'}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div
          role="alert"
          className="mx-1 mb-2 px-3 py-2 rounded-md bg-danger-bg border border-danger text-danger text-sm"
        >
          {errorMsg}
          <button
            type="button"
            aria-label="Cerrar error"
            onClick={() => setErrorMsg(null)}
            className="ml-2 underline text-danger hover:no-underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="border-t border-border pt-3 pb-2 px-1">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribí un mensaje… (Ctrl+Enter para enviar)"
            maxLength={2100} /* allow typing to show the counter feedback before hard cut */
            rows={2}
            disabled={sending}
            aria-label="Mensaje"
            className={[
              'flex-1 resize-none rounded-lg border px-3 py-2 text-sm bg-surface text-text',
              'placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30',
              'disabled:opacity-50 transition-colors',
              overLimit ? 'border-danger' : 'border-input',
            ].join(' ')}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !texto.trim() || overLimit}
            aria-label="Enviar mensaje"
            className={[
              'shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full',
              'bg-primary text-primary-fg transition-colors',
              'hover:bg-primary-hover disabled:opacity-40 disabled:pointer-events-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            ].join(' ')}
          >
            {sending ? (
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
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
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Character counter — only visible near the limit */}
        {texto.length > 1800 && (
          <p
            className={[
              'text-right text-xs mt-1',
              overLimit ? 'text-danger' : 'text-text-muted',
            ].join(' ')}
            aria-live="polite"
          >
            {overLimit ? `${Math.abs(remaining)} caracteres de más` : `${remaining} restantes`}
          </p>
        )}
      </div>
    </div>
  )
}
