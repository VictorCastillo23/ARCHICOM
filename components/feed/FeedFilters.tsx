'use client'

import { useRouter } from 'next/navigation'
import type { TipoPublicacion } from '@/lib/types/database'
import { TIPO_META } from '@/lib/constants/publicaciones'

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
    <div className="flex flex-col gap-3 mb-8 pb-6 border-b border-border">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted mr-1">Tipo</span>
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
                  ? 'bg-primary text-primary-fg border-primary'
                  : 'bg-surface text-text border-border hover:border-primary hover:text-primary',
              ].join(' ')}
            >
              {TIPO_META[tipo].label}
            </button>
          )
        })}
      </div>

      {areas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-text-muted mr-1">Área</span>
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
                    ? 'bg-primary text-primary-fg border-primary'
                    : 'bg-surface text-text border-border hover:border-primary hover:text-primary',
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
          className="self-start text-xs text-text-muted underline underline-offset-2 hover:text-primary transition-colors"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
