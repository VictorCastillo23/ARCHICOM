'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import ErrorState from '@/components/ui/ErrorState'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AdminError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <ErrorState
        title="Algo salió mal"
        description={error.message || 'Ocurrió un error inesperado. Intenta de nuevo.'}
        retry={reset}
      />
    </div>
  )
}
