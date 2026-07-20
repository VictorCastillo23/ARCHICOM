'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

// Replaces the ROOT layout when it crashes — cannot assume `layout.tsx` (and its
// globals.css/theme tokens) ever mounted, so this renders its own complete
// <html>/<body> with plain, theme-independent markup instead of reusing
// components/ui/ErrorState.
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="es">
      <body
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: '1rem',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Algo salió mal</h1>
        <p style={{ marginBottom: '1rem', color: '#555' }}>
          Ocurrió un error inesperado. Intenta de nuevo.
        </p>
        <button
          onClick={reset}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #ccc',
            borderRadius: '0.375rem',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  )
}
