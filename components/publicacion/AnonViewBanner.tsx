'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api/client'

/**
 * Client component — mounts on the publication detail page for anonymous visitors.
 * Calls POST /api/view-count on mount (once per page load).
 * Shows a dismissable fixed bottom banner when showBanner = true (≥2 views).
 * Never blocks reading — positioned fixed at bottom, not a modal overlay.
 *
 * Dismiss: writes vitrina_banner_dismissed=1 to document.cookie (non-HttpOnly
 * UX flag, no server round-trip). Banner is suppressed for the rest of the session.
 */
export default function AnonViewBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Skip fetch entirely if already dismissed this session
    if (document.cookie.includes('vitrina_banner_dismissed=1')) return

    apiClient<{ showBanner: boolean }>('/api/view-count', { method: 'POST' })
      .then((d) => setShow(d.showBanner))
      .catch(() => {
        // Fail silently — banner not showing is always safe
      })
  }, [])

  function dismiss() {
    // Session cookie (no Max-Age) — dismissed flag clears when browser closes
    document.cookie = 'vitrina_banner_dismissed=1; path=/; SameSite=Lax'
    setShow(false)
  }

  if (!show) return null

  return (
    <div
      role="complementary"
      aria-label="Invitación a registrarse"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface shadow-lg"
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-(--space-page) py-4">
        <div className="flex items-center gap-3">
          <p className="text-sm text-text">
            Estás explorando mucho.{' '}
            <Link
              href="/signup"
              className="font-semibold text-primary hover:underline"
            >
              Creá tu vitrina
            </Link>{' '}
            y comparte tu trabajo con la comunidad.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar"
          className="shrink-0 rounded-md p-1.5 text-text-muted hover:bg-surface-muted hover:text-text transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
