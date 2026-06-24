import Link from 'next/link'
import { buttonClasses } from '@/components/ui/Button'

export interface EmptyStateProps {
  title: string
  description?: string
  action?: { label: string; href: string }
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="w-12 h-12 rounded-full bg-surface-muted border border-border flex items-center justify-center mb-4">
        <svg
          className="w-5 h-5 text-text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-3-3v6M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-text mb-1">{title}</h2>
      {description && (
        <p className="text-sm text-text-muted max-w-sm">{description}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className={buttonClasses({ size: 'sm', className: 'mt-4' })}
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
