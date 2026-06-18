import type { Metadata } from 'next'
import Link from 'next/link'
import SignupForm from '@/components/auth/SignupForm'

export const metadata: Metadata = {
  title: 'Crear cuenta | Vitrina',
}

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6 animate-page">
      <div className="text-center">
        <h1 className="text-(length:--size-heading-md) font-display font-normal text-text">
          Crear cuenta
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Creá tu portafolio académico
        </p>
      </div>

      <div className="bg-surface border border-border rounded-lg p-6 shadow-sm">
        <SignupForm />
      </div>

      <p className="text-center text-sm text-text-muted">
        ¿Ya tenés cuenta?{' '}
        <Link
          href="/login"
          className="text-primary hover:underline font-medium"
        >
          Ingresá
        </Link>
      </p>
    </div>
  )
}
