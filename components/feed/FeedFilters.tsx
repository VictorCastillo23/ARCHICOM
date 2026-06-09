'use client'

import { useRouter } from 'next/navigation'
import type { TipoPublicacion } from '@/lib/types/database'

const TIPO_LABELS: Record<TipoPublicacion, string> = {
  libro:         'Libro',
  articulo:      'Artículo',
  investigacion: 'Investigación',
  poema:         'Poema',
  dibujo:        'Dibujo',
  otro:          'Otro',
}

export interface FeedFiltersProps {
  tipos: TipoPublicacion[]
  areas: string[]
  current: { tipo?: string; area?: string }
}

export default function FeedFilters({ tipos, areas, current }: FeedFiltersProps) {
  const router = useRouter()

  function selectTipo(tipo: TipoPublicacion) {
    // Clear area, reset offset
    router.push(`/?tipo=${encodeURIComponent(tipo)}`)
  }

  function selectArea(area: string) {
    // Clear tipo, reset offset
    router.push(`/?area=${encodeURIComponent(area)}`)
  }

  function clearFilters() {
    router.push('/')
  }

  const hasFilter = Boolean(current.tipo || current.area)

  return (
    <div className="flex flex-col gap-3 mb-8 pb-6 border-b border-[--color-border]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-[--color-text-muted] mr-1">Tipo</span>
        {tipos.map((tipo) => {
          const isActive = current.tipo === tipo
          return (
            <button
              key={tipo}
              type="button"
              onClick={() => (isActive ? clearFilters() : selectTipo(tipo))}
              aria-pressed={isActive}
              className={[
                'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                isActive
                  ? 'bg-[--color-primary] text-[--color-primary-fg] border-[--color-primary]'
                  : 'bg-[--color-surface] text-[--color-text] border-[--color-border] hover:border-[--color-primary] hover:text-[--color-primary]',
              ].join(' ')}
            >
              {TIPO_LABELS[tipo]}
            </button>
          )
        })}
      </div>

      {areas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-[--color-text-muted] mr-1">Área</span>
          {areas.map((area) => {
            const isActive = current.area === area
            return (
              <button
                key={area}
                type="button"
                onClick={() => (isActive ? clearFilters() : selectArea(area))}
                aria-pressed={isActive}
                className={[
                  'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                  isActive
                    ? 'bg-[--color-primary] text-[--color-primary-fg] border-[--color-primary]'
                    : 'bg-[--color-surface] text-[--color-text] border-[--color-border] hover:border-[--color-primary] hover:text-[--color-primary]',
                ].join(' ')}
              >
                {area}
              </button>
            )
          })}
        </div>
      )}

      {hasFilter && (
        <button
          type="button"
          onClick={clearFilters}
          className="self-start text-xs text-[--color-text-muted] underline underline-offset-2 hover:text-[--color-primary] transition-colors"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
