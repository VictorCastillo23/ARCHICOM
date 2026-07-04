'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import { apiClient, ApiError } from '@/lib/api/client'

// Shape returned by POST /api/auth/signup → { data: { user, needsConfirmation } }
type SignupResponse = {
  user: { id: string; email?: string } | null
  // True when no session was created → the user must confirm via email.
  // Computed server-side (session === null); covers both new accounts and the
  // already-registered decoy without leaking which case it is.
  needsConfirmation: boolean
}

export default function SignupForm() {
  const router = useRouter()

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [confirmationRequired, setConfirmationRequired] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage(null)
    setConfirmationRequired(false)

    if (!acceptedTerms) {
      setErrorMessage('Debes aceptar los Términos de Servicio para crear una cuenta.')
      return
    }

    setLoading(true)

    try {
      const data = await apiClient<SignupResponse>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ nombre, email, password }),
      })

      if (data.needsConfirmation) {
        // No session yet — user must confirm via email.
        setConfirmationRequired(true)
      } else {
        // Session created immediately (email confirmation disabled) —
        // refresh Nav then navigate home.
        router.refresh()
        router.push('/')
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage('Error inesperado. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResendMessage(null)
    setResendError(null)
    setResending(true)

    try {
      await apiClient<{ sent: boolean }>('/api/auth/resend', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setResendMessage('Te reenviamos el correo de confirmación.')
    } catch (err) {
      if (err instanceof ApiError) {
        setResendError(err.message)
      } else {
        setResendError('No pudimos reenviar el correo. Intenta de nuevo.')
      }
    } finally {
      setResending(false)
    }
  }

  if (confirmationRequired) {
    return (
      <div
        role="status"
        className="rounded-md bg-surface-muted border border-border p-4 text-sm text-text"
      >
        <p className="font-medium">¡Cuenta creada!</p>
        <p className="mt-1 text-text-muted">
          Te enviamos un correo de confirmación a{' '}
          <span className="font-medium text-text">{email}</span>. Una vez
          que confirmes tu cuenta, puedes{' '}
          <Link href="/login" className="text-primary hover:underline">
            iniciar sesión
          </Link>
          .
        </p>

        <p className="mt-3 text-text-muted">
          ¿No te llegó? Revisa el spam o reenvíalo:
        </p>
        <div className="mt-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={resending}
            onClick={handleResend}
          >
            Reenviar correo
          </Button>
        </div>

        {resendMessage && (
          <p role="status" className="mt-2 text-success">
            {resendMessage}
          </p>
        )}
        {resendError && (
          <p role="alert" className="mt-2 text-danger">
            {resendError}
          </p>
        )}
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
        maxLength={50}
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
        maxLength={50}
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
        minLength={8}
        maxLength={72}
        helper="Mínimo 8 caracteres."
      />

      <label className="flex items-start gap-2 text-sm text-text-muted">
        <input
          type="checkbox"
          name="terms"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          disabled={loading}
          className="mt-0.5 accent-primary"
        />
        <span>
          Acepto los{' '}
          <Link
            href="/terminos"
            target="_blank"
            className="text-primary hover:underline"
          >
            Términos de Servicio
          </Link>
          .
        </span>
      </label>

      {errorMessage && (
        <p role="alert" className="text-sm text-danger">
          {errorMessage}
        </p>
      )}

      <Button type="submit" loading={loading} className="w-full mt-2">
        Crear cuenta
      </Button>
    </form>
  )
}
