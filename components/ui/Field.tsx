import React from 'react'

type InputBaseProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'>

export interface FieldProps extends InputBaseProps {
  label: string
  name: string
  error?: string
  required?: boolean
  multiline?: boolean
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
    'w-full rounded-[--radius-md] border border-[--color-border] bg-[--color-surface]',
    'px-3 py-2 text-[--color-text] text-sm',
    'placeholder:text-[--color-text-muted]',
    'focus:outline-none focus:ring-2 focus:ring-[--color-border-focus] focus:border-transparent',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    error ? 'border-[--color-danger] focus:ring-[--color-danger]' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={name}
        className="text-sm font-medium text-[--color-text]"
      >
        {label}
        {required && (
          <span className="ml-1 text-[--color-danger]" aria-hidden="true">
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
          className="text-xs text-[--color-danger] mt-0.5"
        >
          {error}
        </p>
      )}
    </div>
  )
}
