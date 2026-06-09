import Link from 'next/link'
import TipoBadge from '@/components/ui/TipoBadge'
import Card from '@/components/ui/Card'
import type { PublicacionCardData } from '@/lib/types/database'

export interface PublicacionCardProps {
  pub: PublicacionCardData
}

export default function PublicacionCard({ pub }: PublicacionCardProps) {
  const { id, titulo, resumen, tipo, nombre_autor, autor_id, creado_en } = pub

  return (
    <Card as="article" className="flex flex-col gap-3 hover:shadow-md transition-shadow motion-safe:hover:-translate-y-1 motion-safe:transition-transform motion-safe:duration-200">
      <div className="flex items-start justify-between gap-2">
        <TipoBadge tipo={tipo} />
        {creado_en && (
          <time
            dateTime={creado_en}
            className="text-xs text-[--color-text-muted] shrink-0"
          >
            {new Date(creado_en).toLocaleDateString('es-AR', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </time>
        )}
      </div>

      <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display leading-snug line-clamp-3">
        <Link
          href={`/publicacion/${id}`}
          className="text-[--color-text] hover:text-[--color-primary] transition-colors"
        >
          {titulo}
        </Link>
      </h2>

      <p className="text-sm text-[--color-text-muted] leading-relaxed line-clamp-3">
        {resumen}
      </p>

      <div className="mt-auto pt-2 border-t border-[--color-border] flex items-center gap-1 text-xs text-[--color-text-muted]">
        <span>Por</span>
        {autor_id ? (
          <Link
            href={`/usuario/${autor_id}`}
            className="font-medium text-[--color-text] hover:text-[--color-primary] transition-colors"
          >
            {nombre_autor}
          </Link>
        ) : (
          <span className="font-medium text-[--color-text]">{nombre_autor}</span>
        )}
      </div>
    </Card>
  )
}
