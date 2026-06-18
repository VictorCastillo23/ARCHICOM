'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient, ApiError } from '@/lib/api/client'

export interface SeguirButtonProps {
  seguidoId: string
  initialFollowing?: boolean
  isAuthenticated?: boolean
}

export default function SeguirButton({
  seguidoId,
  initialFollowing = false,
  isAuthenticated = false,
}: SeguirButtonProps) {
  const router = useRouter()
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // Optimistic update
    const wasFollowing = following
    setFollowing(!wasFollowing)
    setLoading(true)

    try {
      if (wasFollowing) {
        await apiClient(
          `/api/seguidores/${encodeURIComponent(seguidoId)}`,
          { method: 'DELETE' }
        )
      } else {
        await apiClient('/api/seguidores', {
          method: 'POST',
          body: JSON.stringify({ seguido_id: seguidoId }),
        })
      }
      router.refresh()
    } catch (err) {
      // Revert optimistic update on error
      setFollowing(wasFollowing)
      if (!(err instanceof ApiError)) {
        console.error('Error al procesar el follow:', err)
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
      aria-label={following ? 'Dejar de seguir' : 'Seguir'}
      aria-pressed={following}
      className={[
        'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
        'border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        following
          ? 'bg-primary text-primary-fg border-primary'
          : 'bg-surface text-text border-border hover:border-primary hover:text-primary',
      ].join(' ')}
    >
      <svg
        className="w-4 h-4"
        fill={following ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        {following ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
          />
        )}
      </svg>
      <span>{following ? 'Siguiendo' : 'Seguir'}</span>
    </button>
  )
}
