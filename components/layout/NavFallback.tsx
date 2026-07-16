import Link from 'next/link'

// Suspense fallback for Nav.server — same header shape/height to avoid CLS.
// Rendered instantly (no auth/data fetch) so FCP doesn't wait on session
// resolution; NavClient's real state streams in once Nav.server resolves.
export default function NavFallback() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-(--space-page) h-14">
        <Link
          href="/"
          className="font-display font-normal text-xl tracking-tight text-text hover:text-primary transition-colors"
        >
          Vitrina
        </Link>
      </div>
    </header>
  )
}
