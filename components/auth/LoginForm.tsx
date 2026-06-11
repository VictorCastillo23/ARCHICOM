'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import { apiClient, ApiError } from '@/lib/api/client'

export default function LoginForm() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage(null)
    setLoading(true)

    try {
      await apiClient('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      // refresh() first so Nav picks up the new session before navigation
      router.refresh()
      router.push('/')
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

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
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
        autoComplete="current-password"
        disabled={loading}
        maxLength={72}
      />

      {errorMessage && (
        <p role="alert" className="text-sm text-[--color-danger]">
          {errorMessage}
        </p>
      )}

      <Button type="submit" loading={loading} className="w-full mt-2">
        Iniciar sesión
      </Button>
    </form>
  )
}
