import Avatar from '@/components/ui/Avatar'
import type { Usuario } from '@/lib/types/database'

export interface PerfilViewProps {
  perfil: Usuario
  esPropio?: boolean
}

export default function PerfilView({ perfil, esPropio = false }: PerfilViewProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start gap-6">
      <Avatar nombre={perfil.nombre} size="lg" />

      <div className="flex flex-col gap-1.5">
        <h1 className="text-[--size-heading-md] font-bold font-serif text-[--color-text]">
          {perfil.nombre}
        </h1>

        {perfil.institucion && (
          <p className="text-sm text-[--color-text-muted]">
            {perfil.institucion}
          </p>
        )}

        {perfil.carrera && (
          <p className="text-sm text-[--color-text-muted]">
            {perfil.carrera}
          </p>
        )}

        {esPropio && (
          <p className="text-sm text-[--color-text-muted] mt-1">
            <span className="font-medium text-[--color-text]">Email:</span>{' '}
            {perfil.email}
          </p>
        )}
      </div>
    </div>
  )
}
