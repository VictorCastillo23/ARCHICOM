import Link from 'next/link'
import TipoBadge from '@/components/ui/TipoBadge'
import Card from '@/components/ui/Card'
import type { PublicacionCardData } from '@/lib/types/database'

export interface PublicacionCardProps {
  pub: PublicacionCardData
}

function truncate(text: string, maxLen = 150): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen).trimEnd() + '…'
}

export default function PublicacionCard({ pub }: PublicacionCardProps) {
  const { id, titulo, resumen, tipo, nombre_autor, autor_id, creado_en } = pub

  return (
    <Card as="article" className="flex flex-col gap-3 hover:shadow-md transition-shadow">
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

      <h2 className="text-[--size-heading-sm] font-semibold font-serif leading-snug">
        <Link
          href={`/publicacion/${id}`}
          className="text-[--color-text] hover:text-[--color-primary] transition-colors"
        >
          {titulo}
        </Link>
      </h2>

      <p className="text-sm text-[--color-text-muted] leading-relaxed">
        {truncate(resumen)}
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
