import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import type { PerfilPublico } from '@/lib/types/database'

export interface PerfilViewProps {
  perfil: PerfilPublico
  esPropio?: boolean
  /** Own user's email — sourced from auth.getUser(), passed only when esPropio=true. Never from DB. */
  email?: string
}

export default function PerfilView({ perfil, esPropio = false, email }: PerfilViewProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start gap-6">
      <Avatar nombre={perfil.nombre} size="lg" />

      <div className="flex flex-col gap-1.5">
        <h1 className="text-[length:var(--size-heading-md)] font-normal font-display text-[--color-text]">
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
          <>
            {email && (
              <p className="text-sm text-[--color-text-muted] mt-1">
                <span className="font-medium text-[--color-text]">Email:</span>{' '}
                {email}
              </p>
            )}
            <Link
              href={`/usuario/${perfil.id}`}
              className="text-xs uppercase tracking-wider text-[--color-text-muted] hover:text-[--color-primary] transition-colors mt-2 self-start"
            >
              Ver mi perfil público →
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
