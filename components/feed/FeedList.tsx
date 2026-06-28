import EmptyState from '@/components/ui/EmptyState'
import PublicacionCard from './PublicacionCard'
import type { PublicacionCardData } from '@/lib/types/database'

export interface FeedListProps {
  publicaciones: PublicacionCardData[]
  isAuthenticated?: boolean
  tipoActivo?: string
  areaActivo?: string
}

export default function FeedList({
  publicaciones,
  isAuthenticated,
  tipoActivo,
  areaActivo,
}: FeedListProps) {
  if (publicaciones.length === 0) {
    if (areaActivo) {
      return (
        <EmptyState
          title={`No hay publicaciones en ${areaActivo}`}
          description="Esta disciplina aún no tiene obras. Puedes ser quien la inaugure."
          action={{ label: `Publicar en ${areaActivo}`, href: '/publicar' }}
        />
      )
    }

    if (tipoActivo) {
      return (
        <EmptyState
          title={`No hay ${tipoActivo} todavía`}
          description={`¿Tenés un ${tipoActivo}? Compartilo con la comunidad.`}
          action={{ label: `Publicar un ${tipoActivo}`, href: '/publicar' }}
        />
      )
    }

    if (isAuthenticated) {
      return (
        <EmptyState
          title="Aún no hay publicaciones"
          description="La comunidad espera tu primera obra."
          action={{ label: 'Publica la primera', href: '/publicar' }}
        />
      )
    }

    return (
      <EmptyState
        title="Aún no hay publicaciones"
        description="Sé el primero en compartir tu trabajo con la comunidad."
        action={{ label: 'Crea tu cuenta', href: '/signup' }}
      />
    )
  }

  return (
    <ul className="animate-stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 list-none p-0">
      {publicaciones.map((pub) => (
        <li key={pub.id}>
          <PublicacionCard pub={pub} />
        </li>
      ))}
    </ul>
  )
}
