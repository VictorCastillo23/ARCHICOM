import React from 'react'

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent'

export interface BadgeProps {
  children: React.ReactNode
  tone?: BadgeTone
  className?: string
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-[--color-neutral-bg] text-[--color-neutral]',
  info:    'bg-[--color-info-bg] text-[--color-info]',
  success: 'bg-[--color-success-bg] text-[--color-success]',
  warning: 'bg-[--color-warning-bg] text-[--color-warning]',
  danger:  'bg-[--color-danger-bg] text-[--color-danger]',
  accent:  'bg-[--color-accent-bg] text-[--color-accent]',
}

export default function Badge({
  children,
  tone = 'neutral',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-[--radius-full] px-2.5 py-0.5',
        'text-xs font-medium leading-tight',
        toneClasses[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  )
}
