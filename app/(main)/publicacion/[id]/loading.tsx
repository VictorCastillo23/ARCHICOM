export default function PublicacionLoading() {
  return (
    <article className="max-w-3xl mx-auto animate-pulse">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-6 w-20 rounded-full bg-[--color-surface-muted]" />
          <div className="h-4 w-32 rounded-[--radius-md] bg-[--color-surface-muted]" />
        </div>
        <div className="h-10 w-full rounded-[--radius-md] bg-[--color-surface-muted] mb-2" />
        <div className="h-10 w-4/5 rounded-[--radius-md] bg-[--color-surface-muted] mb-4" />
        <div className="h-4 w-40 rounded-[--radius-md] bg-[--color-surface-muted]" />
      </header>

      <div className="mb-8 flex flex-col gap-2">
        <div className="h-4 w-full rounded-[--radius-md] bg-[--color-surface-muted]" />
        <div className="h-4 w-full rounded-[--radius-md] bg-[--color-surface-muted]" />
        <div className="h-4 w-5/6 rounded-[--radius-md] bg-[--color-surface-muted]" />
        <div className="h-4 w-4/5 rounded-[--radius-md] bg-[--color-surface-muted]" />
      </div>

      <div className="mb-8">
        <div className="h-6 w-24 rounded-[--radius-md] bg-[--color-surface-muted] mb-3" />
        <div className="flex gap-2">
          <div className="h-7 w-16 rounded-full bg-[--color-surface-muted]" />
          <div className="h-7 w-20 rounded-full bg-[--color-surface-muted]" />
          <div className="h-7 w-14 rounded-full bg-[--color-surface-muted]" />
        </div>
      </div>

      <div className="mb-10 pb-8 border-b border-[--color-border]">
        <div className="h-10 w-28 rounded-[--radius-md] bg-[--color-surface-muted]" />
      </div>

      <div>
        <div className="h-7 w-36 rounded-[--radius-md] bg-[--color-surface-muted] mb-6" />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="border-b border-[--color-border] pb-4">
              <div className="flex gap-3 mb-2">
                <div className="h-4 w-24 rounded-[--radius-md] bg-[--color-surface-muted]" />
                <div className="h-4 w-20 rounded-[--radius-md] bg-[--color-surface-muted]" />
              </div>
              <div className="h-4 w-full rounded-[--radius-md] bg-[--color-surface-muted]" />
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}
