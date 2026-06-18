import type { UsuarioLink } from '@/lib/types/database'

interface LinksStripProps {
  links: UsuarioLink[]
}

/**
 * Presentational link strip rendered in PerfilView for both /perfil and
 * /usuario/[id]. Renders nothing when the list is empty.
 * Security: every anchor carries target="_blank" rel="noopener noreferrer nofollow"
 * without exception — centralised here so the attributes can't be forgotten.
 */
export default function LinksStrip({ links }: LinksStripProps) {
  if (links.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {links.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-muted hover:text-primary hover:border-primary transition-colors"
        >
          <svg
            className="w-3 h-3 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          {link.etiqueta}
        </a>
      ))}
    </div>
  )
}
