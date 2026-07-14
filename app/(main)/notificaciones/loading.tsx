export default function NotificacionesLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse" aria-hidden="true">
      <div className="h-7 w-48 rounded-md bg-surface-muted" />

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="h-8 w-16 rounded-full bg-surface-muted" />
          <div className="h-8 w-24 rounded-full bg-surface-muted" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-28 rounded-full bg-surface-muted" />
          ))}
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface list-none p-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex items-start gap-3 px-4 py-3">
            <div className="h-9 w-9 shrink-0 rounded-full bg-surface-muted" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-4 w-3/4 rounded bg-surface-muted" />
              <div className="h-3 w-20 rounded bg-surface-muted" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
