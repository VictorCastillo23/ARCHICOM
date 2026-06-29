'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import { apiClient, ApiError } from '@/lib/api/client'

export interface ComentarioFormProps {
  publicacionId: string
  respondaA?: string | null
  onSuccess?: () => void
}

export default function ComentarioForm({ publicacionId, respondaA, onSuccess }: ComentarioFormProps) {
  const router = useRouter()
  const [contenido, setContenido] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isReply = Boolean(respondaA)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!contenido.trim()) return

    setLoading(true)
    setError(null)

    try {
      await apiClient('/api/comentarios', {
        method: 'POST',
        body: JSON.stringify({
          publicacion_id: publicacionId,
          contenido: contenido.trim(),
          ...(respondaA ? { responde_a: respondaA } : {}),
        }),
      })
      setContenido('')
      if (onSuccess) {
        onSuccess()
      } else {
        router.refresh()
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Error al enviar el comentario. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Field
        label={isReply ? 'Tu respuesta' : 'Tu comentario'}
        name="contenido"
        multiline
        required
        value={contenido}
        onChange={(e) => setContenido(e.target.value)}
        placeholder={isReply ? 'Escribe tu respuesta…' : 'Escribe tu comentario…'}
        maxLength={250}
      />
      {error && (
        <p
          role="alert"
          className="text-sm text-danger"
          aria-live="polite"
        >
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" loading={loading} disabled={!contenido.trim()}>
          {isReply ? 'Responder' : 'Comentar'}
        </Button>
      </div>
    </form>
  )
}
