'use client'

import { useEffect, useRef, useState } from 'react'
import { copyToClipboard } from '@/lib/clipboard'

export interface CompartirButtonProps {
  /** Relative path to share, e.g. `/publicacion/123`. The origin is resolved at click time. */
  path: string
  /** Button text and base for the accessible label. */
  label?: string
}

/**
 * Copies an absolute link (origin + path) to the clipboard and shows a brief
 * "¡Copiado!" confirmation. Client-only; the origin is read at click time so the
 * same component works across environments (local, preview, prod).
 */
export default function CompartirButton({ path, label = 'Compartir' }: CompartirButtonProps) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  async function handleClick() {
    const url = `${window.location.origin}${path}`
    const ok = await copyToClipboard(url)
    if (!ok) return
    setCopied(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={copied ? 'Enlace copiado al portapapeles' : `${label} — copiar enlace`}
      className={[
        'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
        'border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        copied
          ? 'bg-surface text-primary border-primary'
          : 'bg-surface text-text border-border hover:border-primary hover:text-primary',
      ].join(' ')}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        {copied ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        )}
      </svg>
      <span aria-live="polite">{copied ? '¡Copiado!' : label}</span>
    </button>
  )
}
