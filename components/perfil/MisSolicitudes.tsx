import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import type { BadgeTone } from '@/components/ui/Badge'
import type { SolicitudRevistaDetalle, EstadoSolicitud } from '@/lib/types/database'

interface MisSolicitudesProps {
  solicitudes: SolicitudRevistaDetalle[]
}

const estadoTone: Record<EstadoSolicitud, BadgeTone> = {
  pendiente: 'neutral',
  aceptada: 'success',
  rechazada: 'danger',
  retirada: 'neutral',
}

const estadoLabel: Record<EstadoSolicitud, string> = {
  pendiente: 'Pendiente',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  retirada: 'Retirada',
}

export default function MisSolicitudes({ solicitudes }: MisSolicitudesProps) {
  if (solicitudes.length === 0) {
    return (
      <p className="text-sm text-[--color-text-muted]">
        Todavía no enviaste propuestas a ninguna revista.
      </p>
    )
  }

  return (
    <ul className="list-none p-0">
      {solicitudes.map((s) => (
        <li
          key={s.id}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-4 border-b border-[--color-border] last:border-b-0"
        >
          <div className="flex flex-col gap-0.5">
            <Link
              href={`/publicacion/${s.publicacion.id}`}
              className="text-sm font-medium text-[--color-text] hover:text-[--color-primary] transition-colors"
            >
              {s.publicacion.titulo}
            </Link>
            <span className="text-xs text-[--color-text-muted]">
              en{' '}
              <Link
                href={`/revistas/${s.revista.id}`}
                className="hover:text-[--color-primary] transition-colors"
              >
                {s.revista.titulo}
              </Link>
              {' · '}
              {new Date(s.solicitado_en).toLocaleDateString('es-AR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <Badge tone={estadoTone[s.estado]}>{estadoLabel[s.estado]}</Badge>
        </li>
      ))}
    </ul>
  )
}
