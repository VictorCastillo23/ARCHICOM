import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import TipoBadge from '@/components/ui/TipoBadge'
import EmptyState from '@/components/ui/EmptyState'
import type { BadgeTone } from '@/components/ui/Badge'
import type { EstadoSolicitud, SolicitudConDetalle } from '@/lib/types/database'

interface SolicitudesHistorialProps {
  solicitudes: SolicitudConDetalle[]
}

const estadoTone: Record<EstadoSolicitud, BadgeTone> = {
  pendiente: 'warning',
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function SolicitudesHistorial({ solicitudes }: SolicitudesHistorialProps) {
  if (solicitudes.length === 0) {
    return (
      <EmptyState
        title="No postulaste obras todavía"
        description="Podés postular desde la página de cualquiera de tus publicaciones."
      />
    )
  }

  const sorted = [...solicitudes].sort((a, b) => {
    const aActiva = a.revista?.estado === 'borrador' ? 0 : 1
    const bActiva = b.revista?.estado === 'borrador' ? 0 : 1
    return aActiva - bActiva
  })

  return (
    <ul className="list-none p-0 flex flex-col gap-4">
      {sorted.map((s) => {
        const esBorrador = s.revista?.estado === 'borrador'
        return (
          <li
            key={s.id}
            className={[
              'rounded-[--radius-lg] border p-4 ',
              esBorrador
                ? 'border-[--color-primary] bg-[--color-surface-muted]'
                : 'border-[--color-border] bg-[--color-surface]',
            ].join(' ')}
          >
            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 flex-wrap max-w-[85%] min-w-0 break-words">
                {s.publicacion ? (
                  <Link
                    href={`/publicacion/${s.publicacion.id}`}
                    className="text-sm font-medium text-[--color-text] hover:text-[--color-primary] transition-colors break-words min-w-0"
                  >
                    {s.publicacion.titulo}
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-[--color-text-muted]">
                    Publicación eliminada
                  </span>
                )}
                {/*s.publicacion?.tipo && <TipoBadge tipo={s.publicacion.tipo} />*/}
              </div>
              <Badge tone={estadoTone[s.estado]}>{estadoLabel[s.estado]}</Badge>
            </div>

            {s.revista && (
              <p className="text-xs text-[--color-text-muted] mb-1">
                Revista:{' '}
                {s.revista.estado === 'publicada' ? (
                  <Link
                    href={`/revistas/${s.revista.id}`}
                    className="hover:text-[--color-primary] transition-colors"
                  >
                    {s.revista.titulo}
                    {s.revista.volumen != null && ` (Vol. ${s.revista.volumen})`}
                  </Link>
                ) : (
                  <span>
                    {s.revista.titulo}
                    {s.revista.volumen != null && ` (Vol. ${s.revista.volumen})`}
                    {' '}<span className="italic">— edición en curso</span>
                  </span>
                )}
              </p>
            )}

            <p className="text-xs text-[--color-text-muted]">
              Postulada el {formatDate(s.solicitado_en)}
              {s.resuelto_en && <> · Resuelta el {formatDate(s.resuelto_en)}</>}
            </p>

            {s.respuesta && (
              <div className="mt-3 border-l-2 border-[--color-border] pl-3">
                <p className="text-xs text-[--color-text] break-words">
                  <span className="font-medium">Respuesta:</span> {s.respuesta}
                </p>
                {s.revisor_id == null && s.estado === 'rechazada' && (
                  <p className="text-xs text-[--color-text-muted] mt-0.5">
                    (cierre automático del viernes)
                  </p>
                )}
              </div>
            )}

            {s.mensaje && (
              <p className="mt-2 text-xs text-[--color-text-muted] break-words">
                Tu mensaje: {s.mensaje}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
