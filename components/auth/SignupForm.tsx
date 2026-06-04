'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import { apiClient, ApiError } from '@/lib/api/client'

// Shape returned by POST /api/auth/signup  → { data: { user } }
type SignupResponse = {
  user: {
    id: string
    email?: string
    // Supabase sets identities to [] when email confirmation is required
    identities?: { id: string }[]
    confirmation_sent_at?: string
  } | null
}

export default function SignupForm() {
  const router = useRouter()

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [confirmationRequired, setConfirmationRequired] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage(null)
    setConfirmationRequired(false)
    setLoading(true)

    try {
      const data = await apiClient<SignupResponse>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ nombre, email, password }),
      })

      // When email confirmation is required, Supabase returns a user with
      // identities === [] (empty array) — no active session is created.
      const needsConfirmation =
        !data.user ||
        (Array.isArray(data.user.identities) && data.user.identities.length === 0)

      if (needsConfirmation) {
        setConfirmationRequired(true)
      } else {
        // Session created immediately — refresh Nav then navigate home
        router.refresh()
        router.push('/')
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage('Error inesperado. Intentá de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (confirmationRequired) {
    return (
      <div
        role="status"
        className="rounded-[--radius-md] bg-[--color-surface-muted] border border-[--color-border] p-4 text-sm text-[--color-text]"
      >
        <p className="font-medium">¡Cuenta creada!</p>
        <p className="mt-1 text-[--color-text-muted]">
          Revisá tu correo para confirmar tu cuenta antes de ingresar.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field
        label="Nombre completo"
        name="nombre"
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
        autoComplete="name"
        disabled={loading}
      />

      <Field
        label="Email"
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        disabled={loading}
      />

      <Field
        label="Contraseña"
        name="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="new-password"
        disabled={loading}
      />

      {errorMessage && (
        <p role="alert" className="text-sm text-[--color-danger]">
          {errorMessage}
        </p>
      )}

      <Button type="submit" loading={loading} className="w-full mt-2">
        Crear cuenta
      </Button>
    </form>
  )
}
