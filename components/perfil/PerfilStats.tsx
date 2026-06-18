import Link from 'next/link'
import Badge from '@/components/ui/Badge'

interface PerfilStatsProps {
  totalPublicaciones: number
  totalEnRevistas: number
  totalLikes: number
  // Optional follower/following counters (from perfil_contadores view).
  // Pass usuarioId so the badges can link to the subpage.
  usuarioId?: string
  seguidores?: number
  seguidos?: number
}

export default function PerfilStats({
  totalPublicaciones,
  totalEnRevistas,
  totalLikes,
  usuarioId,
  seguidores,
  seguidos,
}: PerfilStatsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge tone="neutral">{totalPublicaciones} publicaciones</Badge>
      {totalEnRevistas > 0 && (
        <Badge tone="success">{totalEnRevistas} en revistas</Badge>
      )}
      <Badge tone="info">{totalLikes} likes recibidos</Badge>

      {/* Follower/following badges — only rendered when counts are provided */}
      {seguidores !== undefined && (
        usuarioId ? (
          <Link
            href={`/usuario/${usuarioId}/seguidores?tipo=seguidores`}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full"
            aria-label={`Ver ${seguidores} seguidores`}
          >
            <Badge tone="accent">{seguidores} seguidores</Badge>
          </Link>
        ) : (
          <Badge tone="accent">{seguidores} seguidores</Badge>
        )
      )}

      {seguidos !== undefined && (
        usuarioId ? (
          <Link
            href={`/usuario/${usuarioId}/seguidores?tipo=seguidos`}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full"
            aria-label={`Ver ${seguidos} seguidos`}
          >
            <Badge tone="accent">{seguidos} seguidos</Badge>
          </Link>
        ) : (
          <Badge tone="accent">{seguidos} seguidos</Badge>
        )
      )}
    </div>
  )
}
