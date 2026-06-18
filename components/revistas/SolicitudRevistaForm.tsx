'use client'

import { useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import { apiClient, ApiError } from '@/lib/api/client'
import type { Publicacion } from '@/lib/types/database'

interface Props {
  revistaId: string
  misPublicaciones: Publicacion[]
  isAuthenticated: boolean
}

export default function SolicitudRevistaForm({ revistaId, misPublicaciones, isAuthenticated }: Props) {
  const [selectedPubId, setSelectedPubId] = useState(misPublicaciones[0]?.id ?? '')
  const [mensaje, setMensaje] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!isAuthenticated) {
    return (
      <p className="text-sm text-text-muted">
        <Link href="/login" className="text-primary hover:underline font-medium">
          Iniciá sesión
        </Link>{' '}
        para proponer tus publicaciones a esta revista.
      </p>
    )
  }

  if (misPublicaciones.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        Todavía no tenés publicaciones para proponer.{' '}
        <Link href="/publicar" className="text-primary hover:underline font-medium">
          Publicá una
        </Link>
        .
      </p>
    )
  }

  if (success) {
    return (
      <p role="status" className="text-sm font-medium text-primary">
        ¡Solicitud enviada! El editor de la revista la revisará pronto.
      </p>
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedPubId) return

    setLoading(true)
    setError(null)

    try {
      await apiClient('/api/solicitudes', {
        method: 'POST',
        body: JSON.stringify({
          publicacion_id: selectedPubId,
          revista_id: revistaId,
          mensaje: mensaje.trim() || undefined,
        }),
      })
      setSuccess(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('Ya tenés una solicitud pendiente para esa publicación en esta revista.')
      } else if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Error al enviar la solicitud. Intentá de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="publicacion_id"
          className="text-sm font-medium text-text"
        >
          Publicación
        </label>
        <select
          id="publicacion_id"
          name="publicacion_id"
          value={selectedPubId}
          onChange={(e) => setSelectedPubId(e.target.value)}
          required
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {misPublicaciones.map((pub) => (
            <option key={pub.id} value={pub.id}>
              {pub.titulo}
            </option>
          ))}
        </select>
      </div>

      <Field
        label="Mensaje (opcional)"
        name="mensaje"
        multiline
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        placeholder="¿Por qué encaja tu publicación en esta revista?"
      />

      {error && (
        <p role="alert" className="text-sm text-danger" aria-live="polite">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" loading={loading}>
          Enviar solicitud
        </Button>
      </div>
    </form>
  )
}
