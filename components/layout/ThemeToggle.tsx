'use client'

import { useSyncExternalStore } from 'react'

/**
 * Manual light/dark toggle. Flips `data-theme` on <html> and persists the choice
 * to localStorage; the anti-FOUC script in the root layout applies it on load.
 *
 * The current theme is read from the DOM via useSyncExternalStore: getServerSnapshot
 * returns false so SSR + the first hydration render match (moon icon), then it
 * reflects the real attribute — no hydration mismatch, no setState-in-effect.
 */
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
  return () => observer.disconnect()
}

const getIsDark = () => document.documentElement.dataset.theme === 'dark'
const getIsDarkServer = () => false

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const dark = useSyncExternalStore(subscribe, getIsDark, getIsDarkServer)

  function toggle() {
    const next = dark ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('theme', next)
    } catch {
      // Private mode / storage disabled — theme still applies for this session.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
      aria-pressed={dark}
      title={dark ? 'Modo claro' : 'Modo oscuro'}
      className={[
        'inline-flex items-center justify-center w-9 h-9 rounded-md',
        'text-text-muted hover:text-text hover:bg-surface-muted transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
        className,
      ].join(' ')}
    >
      {dark ? (
        // Sun — click switches to light
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path
            strokeLinecap="round"
            d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
          />
        </svg>
      ) : (
        // Moon — click switches to dark
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
          />
        </svg>
      )}
    </button>
  )
}
