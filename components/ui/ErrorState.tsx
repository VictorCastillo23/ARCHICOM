import { buttonClasses } from '@/components/ui/Button'

export interface ErrorStateProps {
  title?: string
  description?: string
  retry?: () => void
}

export default function ErrorState({
  title = 'Algo salió mal',
  description,
  retry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="w-12 h-12 rounded-full bg-danger-bg flex items-center justify-center mb-4">
        <svg
          className="w-5 h-5 text-danger"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-text mb-1">{title}</h2>
      {description && (
        <p className="text-sm text-text-muted max-w-sm">{description}</p>
      )}
      {retry && (
        <button
          type="button"
          onClick={retry}
          className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'mt-4' })}
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
