import type { Metadata } from 'next'
import Link from 'next/link'
import { getAreasConMinimo } from '@/lib/data/areas'
import { AREA_TO_SLUG } from '@/lib/constants/areas'
import EmptyState from '@/components/ui/EmptyState'

export const metadata: Metadata = {
  title: 'Áreas — Vitrina',
  description: 'Explorá publicaciones académicas organizadas por área de conocimiento en Vitrina.',
}

export default async function AreasPage() {
  // Only show areas with ≥3 publications (thin-content gate)
  const areas = await getAreasConMinimo(3)

  // Sort alphabetically for a predictable listing order
  const sorted = [...areas].sort((a, b) => a.area.localeCompare(b.area, 'es'))

  // Filter out any area that is not in our curated slug map
  const mapped = sorted.filter((a) => AREA_TO_SLUG[a.area])

  return (
    <div className="animate-page">
      <div className="mb-8">
        <h1 className="text-(length:--size-heading-lg) font-normal font-display text-text leading-tight">
          Áreas
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Explorá publicaciones organizadas por área de conocimiento.
        </p>
      </div>

      {mapped.length === 0 ? (
        <EmptyState
          title="No hay áreas disponibles"
          description="Cuando haya suficientes publicaciones en un área, aparecerá acá."
        />
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 list-none p-0">
          {mapped.map(({ area, count }) => (
            <li key={area}>
              <Link
                href={`/area/${AREA_TO_SLUG[area]}`}
                className="flex flex-col gap-1 rounded-md border border-border bg-surface p-5 hover:border-primary hover:bg-surface-muted transition-colors group"
              >
                <span className="font-medium text-text group-hover:text-primary transition-colors">
                  {area}
                </span>
                <span className="text-sm text-text-muted">
                  {count} {count === 1 ? 'publicación' : 'publicaciones'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
