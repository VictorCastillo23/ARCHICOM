'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient, ApiError } from '@/lib/api/client'

export interface LikeButtonProps {
  publicacionId: string
  initialLiked?: boolean
  initialCount?: number
  isAuthenticated?: boolean
}

export default function LikeButton({
  publicacionId,
  initialLiked = false,
  initialCount = 0,
  isAuthenticated = false,
}: LikeButtonProps) {
  const router = useRouter()
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // Optimistic update
    const wasLiked = liked
    const prevCount = count
    setLiked(!wasLiked)
    setCount(wasLiked ? Math.max(0, count - 1) : count + 1)
    setLoading(true)

    try {
      if (wasLiked) {
        await apiClient('/api/likes', {
          method: 'DELETE',
          body: JSON.stringify({ publicacion_id: publicacionId }),
        })
      } else {
        await apiClient('/api/likes', {
          method: 'POST',
          body: JSON.stringify({ publicacion_id: publicacionId }),
        })
      }
      router.refresh()
    } catch (err) {
      // Revert optimistic update on error
      setLiked(wasLiked)
      setCount(prevCount)
      if (!(err instanceof ApiError)) {
        console.error('Error al procesar el like:', err)
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
      aria-label={liked ? 'Quitar me gusta' : 'Me gusta'}
      aria-pressed={liked}
      className={[
        'inline-flex items-center gap-2 rounded-[--radius-md] px-4 py-2 text-sm font-medium',
        'border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        liked
          ? 'bg-[--color-primary] text-[--color-primary-fg] border-[--color-primary]'
          : 'bg-[--color-surface] text-[--color-text] border-[--color-border] hover:border-[--color-primary] hover:text-[--color-primary]',
      ].join(' ')}
    >
      <svg
        className="w-4 h-4"
        fill={liked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      <span>{count}</span>
    </button>
  )
}
