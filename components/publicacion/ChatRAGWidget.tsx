'use client'

import { useEffect, useRef, useState } from 'react'
import { apiClient, ApiError } from '@/lib/api/client'
import { MAX_HISTORIAL, MAX_PREGUNTA } from '@/lib/rag/config'
import type { RagMensaje } from '@/lib/types/database'

interface ChatRAGWidgetProps {
  publicacionId: string
}

export default function ChatRAGWidget({ publicacionId }: ChatRAGWidgetProps) {
  const [mensajes, setMensajes] = useState<RagMensaje[]>([])
  const [pregunta, setPregunta] = useState('')
  const [sending, setSending] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Keep the latest message in view by scrolling ONLY the inner list container.
  // (scrollIntoView would scroll the whole page, making it jump on each message.)
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [mensajes])

  async function handleSend() {
    const contenido = pregunta.trim()
    if (!contenido || sending || contenido.length > MAX_PREGUNTA) return

    setErrorMsg(null)
    setSending(true)

    // Last N turns as conversational memory (captured before the optimistic add).
    const historial = mensajes.slice(-MAX_HISTORIAL)

    // Optimistic add of the user's question
    setMensajes((prev) => [...prev, { rol: 'user', contenido }])
    setPregunta('')

    try {
      const { respuesta } = await apiClient<{ respuesta: string }>(
        `/api/publicaciones/${publicacionId}/chat`,
        {
          method: 'POST',
          body: JSON.stringify({ pregunta: contenido, historial }),
        }
      )
      setMensajes((prev) => [...prev, { rol: 'assistant', contenido: respuesta }])
    } catch (err) {
      // Keep the question visible but drop the optimistic bubble and restore
      // the text so the user can retry without retyping.
      setMensajes((prev) => prev.slice(0, -1))
      setPregunta(contenido)
      if (err instanceof ApiError) {
        setErrorMsg(err.message)
      } else {
        setErrorMsg('Error al enviar la pregunta. Intenta de nuevo.')
      }
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  const remaining = MAX_PREGUNTA - pregunta.length
  const overLimit = remaining < 0

  return (
    <div className="rounded-lg border border-border">
      {/* Message list */}
      <div
        ref={listRef}
        className="max-h-96 overflow-y-auto p-3 flex flex-col gap-2"
        aria-live="polite"
        aria-label="Conversación con el asistente"
      >
        {mensajes.length === 0 && (
          <p className="text-center text-sm text-text-muted py-6">
            Pregunta sobre este documento.
          </p>
        )}

        {mensajes.map((msg, idx) => {
          const isUser = msg.rol === 'user'
          return (
            <div
              key={idx}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={[
                  'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                  isUser
                    ? 'bg-primary text-primary-fg rounded-br-sm'
                    : 'bg-surface border border-border text-text rounded-bl-sm',
                ].join(' ')}
              >
                <p className="whitespace-pre-wrap break-words">{msg.contenido}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div
          role="alert"
          className="mx-3 mb-2 px-3 py-2 rounded-md bg-danger-bg border border-danger text-danger text-sm"
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
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pregunta sobre este documento… (Ctrl+Enter para enviar)"
            maxLength={MAX_PREGUNTA + 50}
            rows={2}
            disabled={sending}
            aria-label="Pregunta"
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
            disabled={sending || !pregunta.trim() || overLimit}
            aria-label="Enviar pregunta"
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

        {pregunta.length > MAX_PREGUNTA - 100 && (
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
