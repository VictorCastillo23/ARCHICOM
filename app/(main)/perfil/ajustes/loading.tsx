export default function AjustesLoading() {
  return (
    <div className="flex flex-col gap-10 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-3 w-28 rounded bg-surface-muted" />
        <div className="h-8 w-56 rounded bg-surface-muted" />
      </div>

      {/* Three form sections skeleton */}
      {[1, 2, 3].map((section) => (
        <section
          key={section}
          className="border border-border rounded-lg p-6 bg-surface flex flex-col gap-4"
        >
          <div className="h-6 w-40 rounded bg-surface-muted" />
          {[1, 2].map((field) => (
            <div key={field} className="flex flex-col gap-1">
              <div className="h-4 w-24 rounded bg-surface-muted" />
              <div className="h-10 w-full rounded bg-surface-muted" />
            </div>
          ))}
          <div className="h-10 w-36 rounded bg-surface-muted" />
        </section>
      ))}
    </div>
  )
}
