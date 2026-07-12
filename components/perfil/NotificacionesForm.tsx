'use client'

import { useState } from 'react'
import Toggle from '@/components/ui/Toggle'
import { apiClient, ApiError } from '@/lib/api/client'
import type { PreferenciasNotifApp, Usuario } from '@/lib/types/database'

export interface NotificacionesFormProps {
  perfil: Pick<Usuario, 'notif_email_habilitado'>
  preferenciasApp: PreferenciasNotifApp
}

// Order + copy for the 5 notif_app_* toggles — mirrors TIPO_NOTIF_META's
// grouping in lib/constants/notificaciones.ts (comment → follower → revista →
// mensaje → like) so the settings list reads in the same order notifications
// are documented in BD §3.23.
const APP_PREF_ROWS: {
  key: keyof PreferenciasNotifApp
  label: string
}[] = [
  { key: 'notif_app_comentarios', label: 'Comentarios en tus publicaciones' },
  { key: 'notif_app_seguidores', label: 'Nuevos seguidores' },
  { key: 'notif_app_revista', label: 'Tu obra fue aceptada en una revista' },
  { key: 'notif_app_mensajes', label: 'Solicitudes de mensaje' },
  { key: 'notif_app_likes', label: 'Me gusta en tus publicaciones' },
]

export default function NotificacionesForm({
  perfil,
  preferenciasApp,
}: NotificacionesFormProps) {
  const [habilitado, setHabilitado] = useState(perfil.notif_email_habilitado)
  const [prefsApp, setPrefsApp] = useState(preferenciasApp)
  const [loadingKey, setLoadingKey] = useState<
    keyof PreferenciasNotifApp | 'notif_email_habilitado' | null
  >(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleChange(next: boolean) {
    const previous = habilitado
    setHabilitado(next)
    setError(null)
    setSuccess(false)
    setLoadingKey('notif_email_habilitado')

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
      setLoadingKey(null)
    }
  }

  async function handleAppPrefChange(key: keyof PreferenciasNotifApp, next: boolean) {
    const previous = prefsApp[key]
    setPrefsApp((current) => ({ ...current, [key]: next }))
    setError(null)
    setSuccess(false)
    setLoadingKey(key)

    try {
      await apiClient<Partial<PreferenciasNotifApp>>(
        '/api/usuario/preferencias-notificaciones',
        {
          method: 'PATCH',
          body: JSON.stringify({ [key]: next }),
        }
      )
      setSuccess(true)
    } catch (err) {
      setPrefsApp((current) => ({ ...current, [key]: previous }))
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Error inesperado. Intenta de nuevo.')
      }
    } finally {
      setLoadingKey(null)
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
        disabled={loadingKey !== null}
        label="Recibir notificaciones por correo"
      />

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <h3 className="text-sm font-medium text-text-muted">
          Notificaciones dentro de la app
        </h3>

        {APP_PREF_ROWS.map(({ key, label }) => (
          <Toggle
            key={key}
            id={`notif-app-${key}`}
            checked={prefsApp[key]}
            onChange={(next) => handleAppPrefChange(key, next)}
            disabled={loadingKey !== null}
            label={label}
          />
        ))}
      </div>

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
