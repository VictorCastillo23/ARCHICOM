import Link from 'next/link'
import Image from 'next/image'
import TipoBadge from '@/components/ui/TipoBadge'
import Card from '@/components/ui/Card'
import { getTipoArchivo } from '@/lib/utils/archivo'
import type { PublicacionCardData } from '@/lib/types/database'

export interface PublicacionCardProps {
  pub: PublicacionCardData
  /** Set for above-the-fold cards (first grid row) to skip lazy-loading and hint LCP. */
  priority?: boolean
}

// Generic document glyph shown for a PDF that has no thumbnail yet (either
// pre-dates this feature, or client-side rendering failed at publish time).
function IconoDocumento() {
  return (
    <svg
      className="w-10 h-10 text-text-muted"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  )
}

export default function PublicacionCard({ pub, priority = false }: PublicacionCardProps) {
  const {
    id,
    titulo,
    resumen,
    tipo,
    nombre_autor,
    autor_id,
    creado_en,
    archivo_url,
    archivo_thumbnail_url,
  } = pub

  // Only render a thumbnail slot when there's an actual file — a link-only or
  // recommendation publication has no archivo_url and keeps the plain card.
  const tipoArchivo = archivo_url ? getTipoArchivo(archivo_url) : null
  const imagenMiniatura =
    tipoArchivo === 'imagen' ? archivo_url : tipoArchivo === 'pdf' ? archivo_thumbnail_url : null

  return (
    <Card as="article" className="h-full flex flex-col gap-3 hover:shadow-md transition-shadow motion-safe:hover:-translate-y-1 motion-safe:transition-transform motion-safe:duration-200">
      <Link
        href={`/publicacion/${id}`}
        className="text-text hover:text-primary transition-colors"
      >
        {archivo_url && (
          <div className="relative -mx-6 -mt-6 aspect-[4/3] rounded-t-lg border-b border-border bg-surface-muted overflow-hidden">
            {imagenMiniatura ? (
              <Image
                src={imagenMiniatura}
                alt=""
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                priority={priority}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <IconoDocumento />
              </div>
            )}
          </div>
        )}
        <br />
        <div className="flex items-start justify-between gap-2">
          <TipoBadge tipo={tipo} />
          {creado_en && (
            <time
              dateTime={creado_en}
              className="text-xs text-text-muted shrink-0"
            >
              {new Date(creado_en).toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </time>
          )}
        </div>
        <h2 className="text-(length:--size-heading-sm) font-normal font-display leading-snug line-clamp-2 break-words min-h-[3rem]">

          {titulo}

        </h2>

        <p className="text-sm text-text-muted leading-relaxed line-clamp-3 break-words ">
          {resumen}
        </p>
      </Link>
      <div className="mt-auto pt-2 border-t border-border flex items-center gap-1 text-xs text-text-muted">
        <span>Por</span>
        {autor_id ? (
          <Link
            href={`/usuario/${autor_id}`}
            className="font-medium text-text hover:text-primary transition-colors"
          >
            {nombre_autor}
          </Link>
        ) : (
          <span className="font-medium text-text">{nombre_autor}</span>
        )}
      </div>
    </Card>
  )
}
