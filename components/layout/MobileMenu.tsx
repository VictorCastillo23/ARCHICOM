'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import SearchBox from '@/components/buscar/SearchBox'

export type NavLink = { href: string; label: string }

interface MobileMenuProps {
  links: NavLink[]
  onLogout?: () => void
  className?: string
  /** Total unread message count — passed from NavClient to show a badge in the drawer. */
  unreadCount?: number
}

const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'

export default function MobileMenu({ links, onLogout, className = '', unreadCount = 0 }: MobileMenuProps) {
  const [open, setOpen] = useState(false)
  const drawerId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // While open: lock body scroll, trap focus (Escape closes, Tab cycles within the
  // panel), move focus in, and return it to the trigger on close.
  useEffect(() => {
    if (!open) return

    const trigger = triggerRef.current
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (!panel.contains(active)) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    // Move focus into the panel (after paint so the slide-in element is interactive).
    const raf = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    })

    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKeyDown)
      cancelAnimationFrame(raf)
      trigger?.focus()
    }
  }, [open])

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={drawerId}
        className="inline-flex h-12 w-12 items-center justify-center rounded-md text-text hover:bg-surface-muted transition-colors"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Drawer — portaled to <body> so `fixed` is measured against the viewport.
          Rendered inside the header it would be confined to the 56px bar, because the
          header's backdrop-filter creates a containing block for fixed descendants. */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}
            aria-hidden={!open}
          >
        {/* Backdrop */}
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity motion-reduce:transition-none ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {/* Panel */}
        <div
          ref={panelRef}
          id={drawerId}
          role="dialog"
          aria-modal="true"
          aria-label="Menú"
          inert={!open}
          className={`absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col gap-4 border-l border-border bg-surface p-4 shadow-lg transition-transform duration-200 motion-reduce:transition-none ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-lg text-text">Menú</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-text hover:bg-surface-muted transition-colors"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <SearchBox fullWidth />

          <nav aria-label="Navegación" className="flex flex-col">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between py-3 text-text-muted hover:text-text transition-colors"
              >
                <span>{l.label}</span>
                {l.href === '/mensajes' && unreadCount > 0 && (
                  <span
                    aria-label={`${unreadCount} mensajes sin leer`}
                    className={[
                      'inline-flex items-center justify-center',
                      'min-w-[1.2rem] h-[1.2rem] px-1 rounded-full',
                      'bg-primary text-primary-fg text-[length:0.65rem] font-bold leading-none',
                    ].join(' ')}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            ))}
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onLogout()
                }}
                className="block py-3 text-left text-text-muted hover:text-text transition-colors"
              >
                Salir
              </button>
            )}
          </nav>
        </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
