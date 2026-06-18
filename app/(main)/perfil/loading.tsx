export default function PerfilLoading() {
  return (
    <div className="flex flex-col gap-10 animate-pulse">
      {/* Profile header skeleton */}
      <section className="flex flex-col sm:flex-row items-start gap-6">
        {/* Avatar */}
        <div className="size-20 rounded-full bg-surface-muted shrink-0" />

        <div className="flex flex-col gap-2 flex-1">
          <div className="h-7 w-48 rounded bg-surface-muted" />
          <div className="h-4 w-64 rounded bg-surface-muted" />
          <div className="h-4 w-40 rounded bg-surface-muted" />
          <div className="h-4 w-52 rounded bg-surface-muted" />
        </div>
      </section>

      {/* Edit form skeleton */}
      <section className="border border-border rounded-lg p-6 bg-surface flex flex-col gap-4">
        <div className="h-6 w-32 rounded bg-surface-muted" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="h-4 w-24 rounded bg-surface-muted" />
            <div className="h-10 w-full rounded bg-surface-muted" />
          </div>
        ))}
        <div className="h-10 w-36 rounded bg-surface-muted" />
      </section>

      {/* Publications skeleton */}
      <section className="flex flex-col gap-6">
        <div className="h-6 w-44 rounded bg-surface-muted" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-border p-4 flex flex-col gap-3"
            >
              <div className="h-5 w-20 rounded bg-surface-muted" />
              <div className="h-5 w-full rounded bg-surface-muted" />
              <div className="h-4 w-4/5 rounded bg-surface-muted" />
              <div className="h-4 w-3/5 rounded bg-surface-muted" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
