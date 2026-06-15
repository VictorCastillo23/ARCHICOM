import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-[--color-border] bg-[--color-surface] mt-auto">
      <div className="mx-auto max-w-6xl px-[--space-page] py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-[--color-text-muted]">
        <span className="font-semibold tracking-tight text-[--color-text]">
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
