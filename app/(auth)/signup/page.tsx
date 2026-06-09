import type { Metadata } from 'next'
import Link from 'next/link'
import SignupForm from '@/components/auth/SignupForm'

export const metadata: Metadata = {
  title: 'Crear cuenta | Archicom',
}

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6 animate-page">
      <div className="text-center">
        <h1 className="text-[length:var(--size-heading-md)] font-display font-normal text-[--color-text]">
          Crear cuenta
        </h1>
        <p className="mt-2 text-sm text-[--color-text-muted]">
          Creá tu portafolio académico
        </p>
      </div>

      <div className="bg-[--color-surface] border border-[--color-border] rounded-[--radius-lg] p-6 shadow-sm">
        <SignupForm />
      </div>

      <p className="text-center text-sm text-[--color-text-muted]">
        ¿Ya tenés cuenta?{' '}
        <Link
          href="/login"
          className="text-[--color-primary] hover:underline font-medium"
        >
          Ingresá
        </Link>
      </p>
    </div>
  )
}
