import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getNotificaciones } from '@/lib/data/notificaciones'
import { TIPOS_NOTIFICACION } from '@/lib/constants/notificaciones'
import NotificationFilterBar from '@/components/notificaciones/NotificationFilterBar'
import NotificationList from '@/components/notificaciones/NotificationList'
import Pagination from '@/components/ui/Pagination'
import type { TipoNotificacion } from '@/lib/types/database'

export const metadata: Metadata = { title: 'Notificaciones — Vitrina' }

const LIMIT = 20

interface NotificacionesPageProps {
  searchParams: Promise<Record<string, string>>
}

function parseTipo(value: string | undefined): TipoNotificacion | undefined {
  return (TIPOS_NOTIFICACION as string[]).includes(value ?? '')
    ? (value as TipoNotificacion)
    : undefined
}

export default async function NotificacionesPage({ searchParams }: NotificacionesPageProps) {
  // Defensive guard — proxy.ts already redirects unauthenticated users (mirrors mensajes/page.tsx)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const sp = await searchParams
  const leidas = sp.leidas === 'no-leidas' ? ('no-leidas' as const) : undefined
  const tipo = parseTipo(sp.tipo)
  const offset = Number(sp.offset ?? 0)

  const { data } = await getNotificaciones({ filtro: leidas, tipo, limit: LIMIT, offset })
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const hasMore = offset + items.length < total

  return (
    <div className="animate-page flex flex-col gap-6">
      <header>
        <h1 className="text-(length:--size-heading-sm) font-normal font-display text-text">
          Notificaciones
        </h1>
      </header>

      <NotificationFilterBar leidas={leidas} tipo={tipo} />

      <NotificationList items={items} />

      <Pagination
        basePath="/notificaciones"
        searchParams={{ ...(leidas ? { leidas } : {}), ...(tipo ? { tipo } : {}) }}
        offset={offset}
        limit={LIMIT}
        hasMore={hasMore}
      />
    </div>
  )
}
