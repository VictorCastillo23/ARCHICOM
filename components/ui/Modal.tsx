'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export interface ModalProps {
  open: boolean
  onClose: () => void
  /** id of the heading that labels the dialog (for aria-labelledby) */
  labelledById?: string
  children: React.ReactNode
  className?: string
}

/**
 * Accessible modal dialog. Centralizes the dialog a11y pattern (focus trap,
 * Escape to close, backdrop click to close, body scroll lock, initial focus,
 * and focus return to the trigger). Portaled to <body> so `fixed` is measured
 * against the viewport. Mirrors the focus-management of MobileMenu.
 */
export default function Modal({
  open,
  onClose,
  labelledById,
  children,
  className = '',
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  // Keep onClose in a ref so the effect depends only on `open` (callers can
  // pass inline arrow functions without re-running the trap on every render).
  const onCloseRef = useRef(onClose)
  useLayoutEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return

    const trigger = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCloseRef.current()
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

    const raf = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    })

    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKeyDown)
      cancelAnimationFrame(raf)
      trigger?.focus?.()
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => onCloseRef.current()}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledById}
        className={[
          'relative w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-lg',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
