'use client'

import { useState } from 'react'
import Toggle from '@/components/ui/Toggle'
import { apiClient, ApiError } from '@/lib/api/client'
import type { Usuario } from '@/lib/types/database'

export interface NotificacionesFormProps {
  perfil: Pick<Usuario, 'notif_email_habilitado'>
}

export default function NotificacionesForm({ perfil }: NotificacionesFormProps) {
  const [habilitado, setHabilitado] = useState(perfil.notif_email_habilitado)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleChange(next: boolean) {
    const previous = habilitado
    setHabilitado(next)
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      await apiClient<Usuario>('/api/perfil', {
        method: 'PATCH',
        body: JSON.stringify({ notif_email_habilitado: next }),
      })
      setSuccess(true)
    } catch (err) {
      setHabilitado(previous)
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Error inesperado. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-(length:--size-heading-sm) font-normal font-display text-text">
        Notificaciones
      </h2>

      <Toggle
        id="notif-email-habilitado"
        checked={habilitado}
        onChange={handleChange}
        disabled={loading}
        label="Recibir notificaciones por correo"
      />

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="text-sm text-text-muted">
          Preferencia actualizada correctamente.
        </p>
      )}
    </div>
  )
}
