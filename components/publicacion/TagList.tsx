import Link from 'next/link'
import type { Tag } from '@/lib/types/database'

export interface TagListProps {
  tags: Tag[]
}

export default function TagList({ tags }: TagListProps) {
  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2" aria-label="Etiquetas">
      {tags.map((tag) => (
        <Link
          key={tag.id}
          href={`/?area=${encodeURIComponent(tag.area)}`}
          className="inline-flex items-center rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-medium text-text hover:border-primary hover:text-primary transition-colors"
        >
          {tag.nombre}
        </Link>
      ))}
    </div>
  )
}
