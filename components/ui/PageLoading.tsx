/**
 * Reusable loading skeleton for route-level `loading.tsx` files.
 * `variant` shapes the skeleton to the page type so the placeholder matches
 * the real content (avoids the feed-grid skeleton showing on forms/detail).
 */
export default function PageLoading({
  variant = 'grid',
}: {
  variant?: 'grid' | 'detail' | 'form'
}) {
  if (variant === 'detail') {
    return (
      <div className="max-w-[68ch] mx-auto" aria-hidden="true">
        <div className="h-4 w-32 rounded-md bg-surface-muted animate-pulse mb-6" />
        <div className="h-9 w-3/4 rounded-md bg-surface-muted animate-pulse mb-4" />
        <div className="h-4 w-40 rounded-md bg-surface-muted animate-pulse mb-8" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 w-full rounded-md bg-surface-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'form') {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-5" aria-hidden="true">
        <div className="h-8 w-56 rounded-md bg-surface-muted animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-4 w-28 rounded-md bg-surface-muted animate-pulse" />
            <div className="h-10 w-full rounded-md bg-surface-muted animate-pulse" />
          </div>
        ))}
        <div className="h-10 w-32 rounded-md bg-surface-muted animate-pulse" />
      </div>
    )
  }

  return (
    <div aria-hidden="true">
      <div className="mb-8">
        <div className="h-8 w-48 rounded-md bg-surface-muted animate-pulse" />
        <div className="mt-2 h-4 w-72 rounded-md bg-surface-muted animate-pulse" />
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 list-none p-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="rounded-lg border border-surface-border bg-surface p-6 flex flex-col gap-3"
          >
            <div className="h-5 w-20 rounded-full bg-surface-muted animate-pulse" />
            <div className="h-6 w-full rounded-md bg-surface-muted animate-pulse" />
            <div className="h-4 w-5/6 rounded-md bg-surface-muted animate-pulse" />
            <div className="mt-auto pt-2 border-t border-border h-4 w-32 rounded-md bg-surface-muted animate-pulse" />
          </li>
        ))}
      </ul>
    </div>
  )
}
