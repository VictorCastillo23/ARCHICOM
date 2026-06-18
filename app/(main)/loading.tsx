export default function FeedLoading() {
  return (
    <div>
      <div className="mb-8">
        <div className="h-8 w-48 rounded-md bg-surface-muted animate-pulse" />
        <div className="mt-2 h-4 w-72 rounded-md bg-surface-muted animate-pulse" />
      </div>

      {/* Filter skeleton */}
      <div className="flex flex-wrap gap-2 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-7 w-20 rounded-full bg-surface-muted animate-pulse"
          />
        ))}
      </div>

      {/* Card grid skeleton */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 list-none p-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="rounded-lg border border-surface-border bg-surface p-6 flex flex-col gap-3">
            <div className="h-5 w-20 rounded-full bg-surface-muted animate-pulse" />
            <div className="h-6 w-full rounded-md bg-surface-muted animate-pulse" />
            <div className="h-4 w-5/6 rounded-md bg-surface-muted animate-pulse" />
            <div className="h-4 w-3/4 rounded-md bg-surface-muted animate-pulse" />
            <div className="mt-auto pt-2 border-t border-border h-4 w-32 rounded-md bg-surface-muted animate-pulse" />
          </li>
        ))}
      </ul>
    </div>
  )
}
