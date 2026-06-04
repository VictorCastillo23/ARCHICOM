'use client'

import ErrorState from '@/components/ui/ErrorState'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <ErrorState
        title="Algo salió mal"
        description={error.message || 'Ocurrió un error inesperado. Intentá de nuevo.'}
        retry={reset}
      />
    </div>
  )
}
