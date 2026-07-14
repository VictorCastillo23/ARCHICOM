import Link from 'next/link'
import Badge from '@/components/ui/Badge'

interface VentanaRevistaBannerProps {
  revista: { id: string; titulo: string }
  diasRestantes: number
}

/**
 * Server Component — shown on the unfiltered feed only while an active
 * revista's postulation window is open (see `lib/utils/revistaCiclo.ts`).
 * Rendered conditionally by the caller; renders nothing on its own when the
 * window is closed or there's no active revista.
 */
export default function VentanaRevistaBanner({ revista, diasRestantes }: VentanaRevistaBannerProps) {
  return (
    <div className="mb-10 rounded-lg bg-surface-muted border border-border px-6 py-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Badge tone="info">Postulaciones abiertas</Badge>
        <p className="text-sm text-text">
          <span className="font-medium">{revista.titulo}</span> está aceptando postulaciones —{' '}
          {diasRestantes === 1 ? 'queda 1 día' : `quedan ${diasRestantes} días`}.
        </p>
      </div>
      <Link
        href="/publicar"
        className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:bg-primary-hover transition-colors shrink-0"
      >
        Publicar y postular
      </Link>
    </div>
  )
}
