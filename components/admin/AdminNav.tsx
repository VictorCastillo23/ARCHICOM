'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/admin/revistas', label: 'Revistas' },
  { href: '/admin/tags', label: 'Tags' },
  { href: '/admin/reportes', label: 'Reportes' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 bg-surface border-b-2 border-primary">
      <div className="mx-auto max-w-6xl px-(--space-page) h-14 flex items-center gap-6">
        <Link
          href="/admin"
          className="font-display font-normal text-xl text-text hover:text-primary transition-colors"
        >
          Vitrina Admin
        </Link>

        <nav className="flex items-center gap-1" aria-label="Navegación admin">
          {links.map(({ href, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-fg'
                    : 'text-text-muted hover:text-text hover:bg-surface-muted',
                ].join(' ')}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        <Link
          href="/"
          className="ml-auto text-xs text-text-muted hover:text-primary transition-colors"
        >
          ← Sitio público
        </Link>
      </div>
    </header>
  )
}
