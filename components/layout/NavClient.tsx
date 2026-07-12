'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { createClient } from '@/lib/supabase/client'
import type { RolUsuario } from '@/lib/types/database'
import SearchBox from '@/components/buscar/SearchBox'
import NotificationBell from '@/components/notificaciones/NotificationBell'
import ThemeToggle from './ThemeToggle'
import MobileMenu, { type NavLink } from './MobileMenu'

export type SessionProp = {
  id: string
  nombre: string
  rol: RolUsuario
}

interface NavClientProps {
  session: SessionProp | null
  /** Total unread message count — passed from Nav.server.tsx RSC fetch. */
  unreadCount?: number
  /** Total unread notification count — passed from Nav.server.tsx RSC fetch. */
  notifUnreadCount?: number
}

export default function NavClient({
  session,
  unreadCount = 0,
  notifUnreadCount = 0,
}: NavClientProps) {
  const router = useRouter()
  const pathname = usePathname()

  // The RSC nav lives in the persistent layout and doesn't recompute on
  // client-side navigation, so the server `unreadCount` goes stale.
  const [count, setCount] = useState(unreadCount)
  const [notifCount, setNotifCount] = useState(notifUnreadCount)
  const sessionId = session?.id

  const refetchCount = useCallback(() => {
    apiClient<{ total: number }>('/api/mensajes/no-leidos')
      .then((d) => setCount(d.total))
      .catch(() => {
        // Non-critical — keep the last known count
      })
  }, [])

  const refetchNotifCount = useCallback(() => {
    apiClient<{ total: number }>('/api/notificaciones/sin-leer/count')
      .then((d) => setNotifCount(d.total))
      .catch(() => {
        // Non-critical — keep the last known count
      })
  }, [])

  // Keep the badges fresh on client-side navigation.
  useEffect(() => {
    if (!sessionId) return
    refetchCount()
    refetchNotifCount()
  }, [pathname, sessionId, refetchCount, refetchNotifCount])

  // Live updates — refetch when a message or request touches the current user.
  // RLS (user JWT) scopes delivery to this user's own conversations/requests.
  useEffect(() => {
    if (!sessionId) return

    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    async function subscribe() {
      const {
        data: { session: s },
      } = await supabase.auth.getSession()
      if (cancelled) return
      if (s?.access_token) {
        await supabase.realtime.setAuth(s.access_token)
      }
      channel = supabase
        .channel(`nav:notificaciones:${sessionId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'mensaje' },
          () => refetchCount()
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'mensaje' },
          () => refetchCount()
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'solicitud_mensaje' },
          () => refetchCount()
        )
        // 4th handler on the SAME channel (Decision 2, notificaciones-app design —
        // do NOT open a second `supabase.channel(...)`). `*` covers aggregating
        // INSERTs, contador-bump/mark-read UPDATEs, and decrement/cleanup DELETEs.
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notificacion',
            filter: `usuario_id=eq.${sessionId}`,
          },
          () => refetchNotifCount()
        )
        .subscribe()
    }

    subscribe()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [sessionId, refetchCount, refetchNotifCount])

  async function handleLogout() {
    try {
      await apiClient('/api/auth/logout', { method: 'POST' })
      router.replace('/')
    } catch {
      // Silently ignore logout errors — session likely already cleared
    }
    router.refresh()
  }

  // Role-aware links for a signed-in user. Reused by the desktop bar and the mobile drawer.
  const userLinks: NavLink[] = session
    ? [
        { href: '/revistas', label: 'Revistas' },
        { href: '/mensajes', label: 'Mensajes' },
        { href: '/notificaciones', label: 'Notificaciones' },
        { href: '/perfil', label: 'Mi Perfil' },
        { href: '/publicar', label: 'Publicar' },
        ...(session.rol === 'administrador'
          ? [{ href: '/admin', label: 'Admin' }]
          : []),
      ]
    : []

  const mobileLinks: NavLink[] = session
    ? userLinks
    : [
        { href: '/login', label: 'Iniciar sesión' },
        { href: '/signup', label: 'Crear cuenta' },
      ]

  return (
    <>
      {/* Desktop nav — inline links, hidden below md (mobile uses the drawer below) */}
      <nav
        aria-label="Navegación principal"
        className="hidden md:flex flex-1 items-center gap-4 text-sm font-medium"
      >
        <div className="flex-1 min-w-0">
          <SearchBox fullWidth />
        </div>
        {session === null ? (
          <>
            <Link
              href="/login"
              className="text-text-muted hover:text-text transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-primary px-3 py-1.5 text-primary-fg hover:bg-primary-hover transition-colors"
            >
              Crear cuenta
            </Link>
          </>
        ) : (
          <>
            {userLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="relative text-text-muted hover:text-text transition-colors"
              >
                {l.label}
                {/* Unread badge — only on the /mensajes link */}
                {l.href === '/mensajes' && count > 0 && (
                  <span
                    aria-label={`${count} mensajes sin leer`}
                    className={[
                      'absolute -top-1.5 -right-2.5',
                      'inline-flex items-center justify-center',
                      'min-w-[1.1rem] h-[1.1rem] px-0.5 rounded-full',
                      'bg-primary text-primary-fg text-[length:0.6rem] font-bold leading-none',
                    ].join(' ')}
                  >
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </Link>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="text-text-muted hover:text-text transition-colors"
              aria-label="Cerrar sesión"
            >
              Salir
            </button>
            <NotificationBell count={notifCount} onRead={refetchNotifCount} />
          </>
        )}
        <ThemeToggle className="shrink-0" />
      </nav>

      {/* Mobile nav — hamburger + drawer, hidden at md and up */}
      <MobileMenu
        className="md:hidden"
        links={mobileLinks}
        onLogout={session ? handleLogout : undefined}
        unreadCount={count}
      />
    </>
  )
}
