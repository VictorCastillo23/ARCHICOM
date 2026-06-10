'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import { apiClient, ApiError } from '@/lib/api/client'

export interface ComentarioFormProps {
  publicacionId: string
}

export default function ComentarioForm({ publicacionId }: ComentarioFormProps) {
  const router = useRouter()
  const [contenido, setContenido] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        }),
      })
      setContenido('')
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Error al enviar el comentario. Intentá de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Field
        label="Tu comentario"
        name="contenido"
        multiline
        required
        value={contenido}
        onChange={(e) => setContenido((e.target as unknown as HTMLTextAreaElement).value)}
        placeholder="Escribí tu comentario…"
        maxLength={250}
      />
      {error && (
        <p
          role="alert"
          className="text-sm text-[--color-danger]"
          aria-live="polite"
        >
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" loading={loading} disabled={!contenido.trim()}>
          Comentar
        </Button>
      </div>
    </form>
  )
}
