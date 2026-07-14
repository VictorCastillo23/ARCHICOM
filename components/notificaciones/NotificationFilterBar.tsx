import Link from 'next/link'
import { TIPOS_NOTIFICACION, TIPO_NOTIF_META } from '@/lib/constants/notificaciones'
import type { TipoNotificacion } from '@/lib/types/database'

export interface NotificationFilterBarProps {
  leidas?: 'no-leidas'
  tipo?: TipoNotificacion
}

function buildHref(leidas?: 'no-leidas', tipo?: TipoNotificacion): string {
  const params = new URLSearchParams()
  if (leidas) params.set('leidas', leidas)
  if (tipo) params.set('tipo', tipo)
  const qs = params.toString()
  return qs ? `/notificaciones?${qs}` : '/notificaciones'
}

function chipClasses(active: boolean): string {
  return [
    'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
    active
      ? 'border-primary bg-primary text-primary-fg'
      : 'border-border bg-surface text-text hover:bg-surface-muted',
  ].join(' ')
}

/**
 * URL-driven filter chips (`leidas` + `tipo`) for `/notificaciones` —
 * server-rendered `<Link>`s, no client state. Mirrors `Pagination`'s
 * "server-driven Links, `aria-current` marks the active one" pattern rather
 * than inventing a client `radiogroup` widget for what is plain navigation.
 */
export default function NotificationFilterBar({ leidas, tipo }: NotificationFilterBarProps) {
  return (
    <div className="flex flex-col gap-3">
      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        <Link
          href={buildHref(undefined, tipo)}
          aria-current={!leidas ? 'page' : undefined}
          className={chipClasses(!leidas)}
        >
          Todas
        </Link>
        <Link
          href={buildHref('no-leidas', tipo)}
          aria-current={leidas === 'no-leidas' ? 'page' : undefined}
          className={chipClasses(leidas === 'no-leidas')}
        >
          No leídas
        </Link>
      </nav>

      <nav aria-label="Filtrar por tipo" className="flex flex-wrap gap-2">
        <Link
          href={buildHref(leidas, undefined)}
          aria-current={!tipo ? 'page' : undefined}
          className={chipClasses(!tipo)}
        >
          Todos los tipos
        </Link>
        {TIPOS_NOTIFICACION.map((t) => (
          <Link
            key={t}
            href={buildHref(leidas, t)}
            aria-current={tipo === t ? 'page' : undefined}
            className={chipClasses(tipo === t)}
          >
            {TIPO_NOTIF_META[t].label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
