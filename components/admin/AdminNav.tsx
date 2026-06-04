'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/admin/revistas', label: 'Revistas' },
  { href: '/admin/tags', label: 'Tags' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 bg-[--color-surface] border-b border-[--color-border]">
      <div className="mx-auto max-w-6xl px-[--space-page] h-14 flex items-center gap-6">
        <Link
          href="/admin"
          className="font-semibold text-[--color-text] hover:text-[--color-primary] transition-colors"
        >
          Archicom Admin
        </Link>

        <nav className="flex items-center gap-1" aria-label="Navegación admin">
          {links.map(({ href, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'px-3 py-1.5 rounded-[--radius-md] text-sm font-medium transition-colors',
                  active
                    ? 'bg-[--color-surface-muted] text-[--color-text]'
                    : 'text-[--color-text-muted] hover:text-[--color-text] hover:bg-[--color-surface-muted]',
                ].join(' ')}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        <Link
          href="/"
          className="ml-auto text-xs text-[--color-text-muted] hover:text-[--color-primary] transition-colors"
        >
          ← Sitio público
        </Link>
      </div>
    </header>
  )
}
