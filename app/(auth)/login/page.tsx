import type { Metadata } from 'next'
import Link from 'next/link'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Iniciar sesión | Vitrina',
}

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6 animate-page">
      <div className="text-center">
        <h1 className="text-(length:--size-heading-md) font-display font-normal text-text">
          Iniciar sesión
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Ingresa con tu cuenta
        </p>
      </div>

      <div className="bg-surface border border-border rounded-lg p-6 shadow-sm">
        <LoginForm />
      </div>

      <p className="text-center text-sm text-text-muted">
        ¿No tienes cuenta?{' '}
        <Link
          href="/signup"
          className="text-primary hover:underline font-medium"
        >
          Registrate
        </Link>
      </p>
    </div>
  )
}
