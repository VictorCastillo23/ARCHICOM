import type { Metadata } from 'next'
import Link from 'next/link'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Iniciar sesión | Archicom',
}

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-display font-semibold text-[--color-text]">
          Iniciar sesión
        </h1>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Ingresá con tu cuenta universitaria
        </p>
      </div>

      <div className="bg-[--color-surface] border border-[--color-border] rounded-[--radius-lg] p-6">
        <LoginForm />
      </div>

      <p className="text-center text-sm text-[--color-text-muted]">
        ¿No tenés cuenta?{' '}
        <Link
          href="/signup"
          className="text-[--color-primary] hover:underline font-medium"
        >
          Registrate
        </Link>
      </p>
    </div>
  )
}
