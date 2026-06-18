import Link from 'next/link'
import Card from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'
import type { UsuarioCardData } from '@/lib/types/database'

export interface UsuarioCardProps {
  usuario: UsuarioCardData
}

export default function UsuarioCard({ usuario }: UsuarioCardProps) {
  const { id, nombre, institucion, carrera } = usuario
  const secondary = institucion ?? carrera ?? null

  return (
    <Card
      as="article"
      className="h-full flex flex-col gap-3 hover:shadow-md transition-shadow motion-safe:hover:-translate-y-1 motion-safe:transition-transform motion-safe:duration-200"
    >
      <Link
        href={`/usuario/${id}`}
        className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
        aria-label={`Ver perfil de ${nombre}`}
      >
        <Avatar nombre={nombre} size="md" />
        <div className="min-w-0">
          <p className="text-(length:--size-heading-sm) font-normal font-display leading-snug text-text group-hover:text-primary transition-colors truncate">
            {nombre}
          </p>
          {secondary && (
            <p className="text-xs text-text-muted truncate mt-0.5">
              {secondary}
            </p>
          )}
        </div>
      </Link>
    </Card>
  )
}
