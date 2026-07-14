'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import BellIcon from '@/components/ui/BellIcon'
import NotificationDropdown from './NotificationDropdown'

export interface NotificationBellProps {
  count: number
  onRead: () => void
}

/**
 * Nav bell trigger + unread badge. Owns the dropdown-open state; the dropdown
 * itself is only mounted while open, so its `/api/notificaciones` fetch is
 * lazy (no request until the user actually opens it). Closes on outside
 * click and Escape (no `Popover` primitive exists in this codebase — see
 * `NotificationDropdown`'s header comment).
 */
export default function NotificationBell({ count, onRead }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return

    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close()
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={count > 0 ? `Notificaciones — ${count} sin leer` : 'Notificaciones'}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <BellIcon className="w-5 h-5" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className={[
              'absolute -top-1 -right-1',
              'inline-flex items-center justify-center',
              'min-w-[1.1rem] h-[1.1rem] px-0.5 rounded-full',
              'bg-primary text-primary-fg text-[length:0.6rem] font-bold leading-none',
            ].join(' ')}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && <NotificationDropdown onClose={close} onRead={onRead} />}
    </div>
  )
}
