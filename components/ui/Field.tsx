import React from 'react'

type InputBaseProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'>

export interface FieldProps extends Omit<InputBaseProps, 'onChange'> {
  label: string
  name: string
  error?: string
  required?: boolean
  multiline?: boolean
  // The rendered element is an <input> or a <textarea> depending on `multiline`,
  // so the change event target can be either.
  onChange?: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>
}

export default function Field({
  label,
  name,
  error,
  required,
  multiline = false,
  className = '',
  ...inputProps
}: FieldProps) {
  const errorId = error ? `${name}-error` : undefined

  const inputClasses = [
    'w-full rounded-md border border-border bg-surface',
    'px-3 py-2 text-text text-sm',
    'placeholder:text-text-muted',
    'focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    error ? 'border-danger focus:ring-danger' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={name}
        className="text-sm font-medium text-text"
      >
        {label}
        {required && (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {multiline ? (
        <textarea
          id={name}
          name={name}
          required={required}
          aria-describedby={errorId}
          aria-invalid={!!error}
          rows={4}
          className={inputClasses}
          {...(inputProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={name}
          name={name}
          required={required}
          aria-describedby={errorId}
          aria-invalid={!!error}
          className={inputClasses}
          {...inputProps}
        />
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs text-danger mt-0.5"
        >
          {error}
        </p>
      )}
    </div>
  )
}
