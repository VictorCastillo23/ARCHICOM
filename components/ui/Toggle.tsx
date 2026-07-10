'use client'

import { useId } from 'react'

export interface ToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  disabled?: boolean
  id?: string
}

/**
 * Controlled binary-preference switch — `role="switch"` + `aria-checked`.
 * NOT `aria-pressed` (see `components/layout/ThemeToggle.tsx`, which uses that
 * pattern for a momentary, localStorage-only action button). This primitive is
 * for persisted, DB-backed on/off preferences, which are `switch` semantics.
 */
export default function Toggle({ checked, onChange, label, disabled = false, id }: ToggleProps) {
  const generatedId = useId()
  const labelId = id ? `${id}-label` : generatedId

  return (
    <div className="flex items-center justify-between gap-4">
      <span id={labelId} className="text-sm font-medium text-text">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          checked ? 'bg-primary' : 'bg-surface-muted border border-border',
        ].join(' ')}
      >
        <span
          aria-hidden="true"
          className={[
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1',
          ].join(' ')}
        />
      </button>
    </div>
  )
}
