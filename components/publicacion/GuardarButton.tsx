'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient, ApiError } from '@/lib/api/client'

export interface GuardarButtonProps {
  publicacionId: string
  initialSaved?: boolean
  isAuthenticated?: boolean
}

export default function GuardarButton({
  publicacionId,
  initialSaved = false,
  isAuthenticated = false,
}: GuardarButtonProps) {
  const router = useRouter()
  const [saved, setSaved] = useState(initialSaved)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // Optimistic update
    const wasSaved = saved
    setSaved(!wasSaved)
    setLoading(true)

    try {
      if (wasSaved) {
        await apiClient(
          `/api/guardados/${encodeURIComponent(publicacionId)}`,
          { method: 'DELETE' }
        )
      } else {
        await apiClient('/api/guardados', {
          method: 'POST',
          body: JSON.stringify({ publicacion_id: publicacionId }),
        })
      }
      router.refresh()
    } catch (err) {
      // Revert optimistic update on error
      setSaved(wasSaved)
      if (!(err instanceof ApiError)) {
        console.error('Error al procesar el guardado:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label={saved ? 'Quitar de guardados' : 'Guardar'}
      aria-pressed={saved}
      className={[
        'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
        'border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        saved
          ? 'bg-primary text-primary-fg border-primary'
          : 'bg-surface text-text border-border hover:border-primary hover:text-primary',
      ].join(' ')}
    >
      <svg
        className="w-4 h-4"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        />
      </svg>
      <span>{saved ? 'Guardado' : 'Guardar'}</span>
    </button>
  )
}
