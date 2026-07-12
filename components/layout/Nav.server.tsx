import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSesionUsuario } from '@/lib/data/perfil'
import { getTotalNoLeidos, getTotalSolicitudesPendientes } from '@/lib/data/mensajes'
import { getTotalNoLeidas } from '@/lib/data/notificaciones'
import NavClient, { type SessionProp } from './NavClient'

// RSC — no 'use client'. Resolves auth server-side so HTML arrives with correct nav state.
export default async function Nav() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let session: SessionProp | null = null
  let unreadCount = 0
  let notifUnreadCount = 0

  if (user) {
    // Fetch session profile, unread messages, pending solicitudes, and unread
    // notifications in parallel — mirrors the existing messaging badge seed
    // so the notification bell also avoids a flash-of-zero on first render.
    const [
      { data: perfil },
      { data: noLeidos },
      { data: solicitudesPendientes },
      { data: notifNoLeidas },
    ] = await Promise.all([
      getSesionUsuario(user.id),
      getTotalNoLeidos(),
      getTotalSolicitudesPendientes(user.id),
      getTotalNoLeidas(),
    ])
    if (perfil) {
      session = { id: perfil.id, nombre: perfil.nombre, rol: perfil.rol }
    }
    unreadCount = (noLeidos ?? 0) + (solicitudesPendientes ?? 0)
    notifUnreadCount = notifNoLeidas ?? 0
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-(--space-page) h-14">
        <Link
          href="/"
          className="font-display font-normal text-xl tracking-tight text-text hover:text-primary transition-colors"
        >
          Vitrina
        </Link>
        <NavClient session={session} unreadCount={unreadCount} notifUnreadCount={notifUnreadCount} />
      </div>
    </header>
  )
}
