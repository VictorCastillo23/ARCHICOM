import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface mt-auto">
      <div className="mx-auto max-w-6xl px-(--space-page) py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-text-muted">
        <span className="font-semibold tracking-tight text-text">
          Es Vitrina
        </span>
        <nav className="flex items-center gap-4">

          <Link
            href="/sobre-nosotros"
            className="hover:text-[--color-text] transition-colors"
          >
            Sobre nosotros
          </Link>
        </nav>
        <nav className="flex items-center gap-4">
          <span>Portafolio académico digital</span>
        </nav>
      </div>
    </footer>
  )
}
