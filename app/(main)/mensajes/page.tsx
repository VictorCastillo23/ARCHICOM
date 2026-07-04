import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getConversaciones, getSolicitudesMensajeRecibidas } from '@/lib/data/mensajes'
import EmptyState from '@/components/ui/EmptyState'
import SolicitudesMensajeList from '@/components/mensajes/SolicitudesMensajeList'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mensajes — Vitrina' }

function formatRelativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return 'Ahora'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export default async function MensajesPage() {
  // Defensive guard — proxy.ts already redirects unauthenticated users
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: conversaciones }, { data: solicitudes }] = await Promise.all([
    getConversaciones(user.id),
    getSolicitudesMensajeRecibidas(user.id),
  ])
  const lista = conversaciones ?? []
  const solicitudesList = solicitudes ?? []

  return (
    <div className="animate-page flex flex-col gap-6">
      <header>
        <h1 className="text-(length:--size-heading-sm) font-normal font-display text-text">
          Mensajes
        </h1>
      </header>

      {solicitudesList.length > 0 && (
        <SolicitudesMensajeList solicitudes={solicitudesList} />
      )}

      {lista.length === 0 ? (
        <EmptyState
          title="No tienes conversaciones"
          description="Cuando alguien con quien te sigues mutuamente te escriba, aparecerá aqui."
          action={{ label: 'Explorar perfiles', href: '/' }}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {lista.map((conv) => (
            <li key={conv.conversacion_id}>
              <Link
                href={`/mensajes/${conv.conversacion_id}`}
                className="flex items-start gap-3 py-4 px-1 hover:bg-surface-muted transition-colors rounded-md group"
              >
                {/* Avatar placeholder — initials */}
                <div
                  aria-hidden="true"
                  className="shrink-0 w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-medium text-primary"
                >
                  {conv.otro.nombre.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-text truncate group-hover:text-primary transition-colors">
                      {conv.otro.nombre}
                    </span>
                    {conv.ultimo_creado_en && (
                      <span className="shrink-0 text-xs text-text-muted">
                        {formatRelativeTime(conv.ultimo_creado_en)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm text-text-muted truncate">
                      {conv.ultimo_contenido
                        ? conv.ultimo_contenido.slice(0, 80)
                        : 'Sin mensajes aún'}
                    </p>
                    {conv.no_leidos > 0 && (
                      <span
                        aria-label={`${conv.no_leidos} mensajes sin leer`}
                        className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-fg text-xs font-medium"
                      >
                        {conv.no_leidos > 9 ? '9+' : conv.no_leidos}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
