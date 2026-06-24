import Link from 'next/link'

interface AnonFollowCTAProps {
  autorNombre: string
}

/**
 * Server Component — shown on the publication detail page for anonymous visitors
 * when an author is associated with the publication.
 * Caller is responsible for gating: only render when !isAuthenticated && autor.
 * Links to /signup (not /login) — distinct from LikeButton which goes to /login.
 */
export default function AnonFollowCTA({ autorNombre }: AnonFollowCTAProps) {
  return (
    <div className="my-8 rounded-md border border-border bg-surface-muted p-5 text-center">
      <p className="text-sm text-text-muted mb-3">
        ¿Te gustó el trabajo de <span className="font-medium text-text">{autorNombre}</span>?
      </p>
      <Link
        href="/signup"
        className="inline-flex items-center justify-center rounded-md font-medium transition-colors h-10 px-4 text-sm bg-primary text-primary-fg hover:bg-primary-hover"
      >
        Seguí a {autorNombre} para ver más
      </Link>
    </div>
  )
}
