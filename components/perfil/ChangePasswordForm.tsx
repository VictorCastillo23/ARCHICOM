'use client'

import { useState } from 'react'
import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import { apiClient, ApiError } from '@/lib/api/client'

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (newPassword !== confirmPassword) {
      setError('La nueva contraseña y su confirmación no coinciden.')
      return
    }

    setLoading(true)

    try {
      await apiClient('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Error inesperado. Intentá de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <h2 className="text-(length:--size-heading-sm) font-normal font-display text-text">
        Cambiar contraseña
      </h2>

      <Field
        label="Contraseña actual"
        name="currentPassword"
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        required
        autoComplete="current-password"
        disabled={loading}
        maxLength={72}
      />

      <Field
        label="Nueva contraseña"
        name="newPassword"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
        autoComplete="new-password"
        disabled={loading}
        maxLength={72}
      />

      <Field
        label="Confirmar nueva contraseña"
        name="confirmPassword"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        autoComplete="new-password"
        disabled={loading}
        maxLength={72}
      />

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="text-sm text-text-muted">
          Contraseña actualizada correctamente.
        </p>
      )}

      <Button type="submit" loading={loading} className="self-start">
        Actualizar contraseña
      </Button>
    </form>
  )
}
