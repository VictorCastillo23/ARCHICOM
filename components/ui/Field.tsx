'use client'

import React, { useId, useState } from 'react'

type InputBaseProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'>

export interface FieldProps extends Omit<InputBaseProps, 'onChange'> {
  label: string
  name: string
  error?: string
  /** Persistent helper text below the field (e.g. password criteria). */
  helper?: string
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
  helper,
  required,
  multiline = false,
  className = '',
  type,
  ...inputProps
}: FieldProps) {
  const [reveal, setReveal] = useState(false)
  const helperId = useId()
  const errorId = error ? `${name}-error` : undefined
  const describedBy = [error ? errorId : null, helper ? helperId : null]
    .filter(Boolean)
    .join(' ') || undefined

  const isPassword = type === 'password'
  const effectiveType = isPassword && reveal ? 'text' : type

  const inputClasses = [
    'w-full rounded-md border border-input bg-surface',
    'px-3 py-2 text-text text-sm',
    isPassword ? 'pr-10' : '',
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
      <label htmlFor={name} className="text-sm font-medium text-text">
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
          aria-describedby={describedBy}
          aria-invalid={!!error}
          rows={4}
          className={inputClasses}
          {...(inputProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <div className={isPassword ? 'relative' : undefined}>
          <input
            id={name}
            name={name}
            type={effectiveType}
            required={required}
            aria-describedby={describedBy}
            aria-invalid={!!error}
            className={inputClasses}
            {...inputProps}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              aria-label={reveal ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={reveal}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-text-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded-r-md"
            >
              {reveal ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.88 9.88" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          )}
        </div>
      )}

      {helper && !error && (
        <p id={helperId} className="text-xs text-text-muted mt-0.5">
          {helper}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger mt-0.5">
          {error}
        </p>
      )}
    </div>
  )
}
