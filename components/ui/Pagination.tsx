import Link from 'next/link'

export interface PaginationProps {
  basePath: string
  searchParams: Record<string, string>
  offset: number
  limit: number
  hasMore: boolean
}

function buildHref(
  basePath: string,
  searchParams: Record<string, string>,
  newOffset: number,
): string {
  const params = new URLSearchParams({ ...searchParams, offset: String(newOffset) })
  return `${basePath}?${params.toString()}`
}

export default function Pagination({
  basePath,
  searchParams,
  offset,
  limit,
  hasMore,
}: PaginationProps) {
  const prevOffset = Math.max(0, offset - limit)
  const nextOffset = offset + limit

  const showPrev = offset > 0
  const showNext = hasMore

  if (!showPrev && !showNext) return null

  return (
    <nav
      aria-label="Paginación"
      className="flex items-center justify-between gap-4 py-6"
    >
      <div>
        {showPrev && (
          <Link
            href={buildHref(basePath, searchParams, prevOffset)}
            className="inline-flex items-center gap-1 text-sm font-medium text-[--color-primary] hover:underline"
          >
            ← Anterior
          </Link>
        )}
      </div>
      <div>
        {showNext && (
          <Link
            href={buildHref(basePath, searchParams, nextOffset)}
            className="inline-flex items-center gap-1 text-sm font-medium text-[--color-primary] hover:underline"
          >
            Siguiente →
          </Link>
        )}
      </div>
    </nav>
  )
}
