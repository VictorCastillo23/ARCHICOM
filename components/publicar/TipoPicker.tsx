'use client'

import type { TipoPublicacion } from '@/lib/types/database'
import {
  CATEGORIA_META,
  TIPO_META,
  TIPOS_POR_CATEGORIA,
} from '@/lib/constants/publicaciones'

interface TipoPickerProps {
  value: TipoPublicacion | null
  onChange: (tipo: TipoPublicacion) => void
  disabled?: boolean
}

/**
 * Type-first publication picker: the 19 types grouped by category as selectable
 * chips, replacing the flat <select>. Exposed as a radiogroup for accessibility.
 */
export default function TipoPicker({ value, onChange, disabled = false }: TipoPickerProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-text">
        ¿Qué quieres publicar?
        <span className="ml-1 text-danger" aria-hidden="true">
          *
        </span>
      </span>
      <div
        role="radiogroup"
        aria-label="Tipo de publicación"
        className="rounded-md border border-border bg-surface p-3 flex flex-col gap-4"
      >
        {TIPOS_POR_CATEGORIA.map(({ categoria, tipos }) => (
          <div key={categoria}>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
              {CATEGORIA_META[categoria].label}
            </p>
            <div className="flex flex-wrap gap-2">
              {tipos.map((tipo) => {
                const selected = value === tipo
                return (
                  <button
                    key={tipo}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={disabled}
                    onClick={() => onChange(tipo)}
                    className={[
                      'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      selected
                        ? 'border-primary bg-primary text-primary-fg'
                        : 'border-border bg-surface text-text hover:bg-surface-muted',
                    ].join(' ')}
                  >
                    {TIPO_META[tipo].label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
