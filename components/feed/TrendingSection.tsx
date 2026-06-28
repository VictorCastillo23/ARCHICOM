import FeedList from '@/components/feed/FeedList'
import EmptyState from '@/components/ui/EmptyState'
import type { PublicacionCardData } from '@/lib/types/database'

interface TrendingSectionProps {
  items: PublicacionCardData[]
}

/**
 * Server Component — renders the Tendencias block on the unfiltered home page.
 * Items MUST be ordered by score descending (no shuffle — ordering is the feature).
 * At high volume this data can come from a pg_cron-refreshed materialized view
 * instead of the plain view; that's a future optimization, not implemented here.
 */
export default function TrendingSection({ items }: TrendingSectionProps) {
  return (
    <section className="mb-12" aria-labelledby="trending-heading">
      <div className="mb-6">
        <h2
          id="trending-heading"
          className="text-(length:--size-heading-sm) font-normal font-display text-text leading-tight"
        >
          Tendencias
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Lo más popular de la comunidad en este momento.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No hay tendencias aún"
          description="Cuando la comunidad interactúe, lo más popular aparecerá aqui."
        />
      ) : (
        <FeedList publicaciones={items} />
      )}
    </section>
  )
}
