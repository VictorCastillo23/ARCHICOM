import Badge from '@/components/ui/Badge'

interface PerfilStatsProps {
  totalPublicaciones: number
  totalEnRevistas: number
  totalLikes: number
}

export default function PerfilStats({
  totalPublicaciones,
  totalEnRevistas,
  totalLikes,
}: PerfilStatsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge tone="neutral">{totalPublicaciones} publicaciones</Badge>
      {totalEnRevistas > 0 && (
        <Badge tone="success">{totalEnRevistas} en revistas</Badge>
      )}
      <Badge tone="info">{totalLikes} likes recibidos</Badge>
    </div>
  )
}
