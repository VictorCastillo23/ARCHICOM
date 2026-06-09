import EmptyState from '@/components/ui/EmptyState'
import PublicacionCard from './PublicacionCard'
import type { PublicacionCardData } from '@/lib/types/database'

export interface FeedListProps {
  publicaciones: PublicacionCardData[]
}

export default function FeedList({ publicaciones }: FeedListProps) {
  if (publicaciones.length === 0) {
    return (
      <EmptyState
        title="Sin publicaciones"
        description="Todavía no hay publicaciones con estos filtros."
      />
    )
  }

  return (
    <ul className="animate-stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 list-none p-0">
      {publicaciones.map((pub) => (
        <li key={pub.id}>
          <PublicacionCard pub={pub} />
        </li>
      ))}
    </ul>
  )
}
