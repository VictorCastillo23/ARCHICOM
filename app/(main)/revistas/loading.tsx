export default function RevistasLoading() {
  return (
    <div>
      <div className="mb-8">
        <div className="h-8 w-32 rounded-md bg-surface-muted animate-pulse" />
        <div className="mt-2 h-4 w-64 rounded-md bg-surface-muted animate-pulse" />
      </div>

      <ul className="flex flex-col gap-6 list-none p-0">
        {Array.from({ length: 3 }).map((_, i) => (
          <li
            key={i}
            className="rounded-lg border border-surface-border bg-surface p-6 flex flex-col gap-3 animate-pulse"
          >
            <div className="h-6 w-20 rounded-full bg-surface-muted" />
            <div className="h-7 w-3/4 rounded-md bg-surface-muted" />
            <div className="h-4 w-full rounded-md bg-surface-muted" />
            <div className="h-4 w-5/6 rounded-md bg-surface-muted" />
            <div className="h-3 w-40 rounded-md bg-surface-muted" />
          </li>
        ))}
      </ul>
    </div>
  )
}
