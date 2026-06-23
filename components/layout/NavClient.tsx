'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import type { RolUsuario } from '@/lib/types/database'
import SearchBox from '@/components/buscar/SearchBox'
import MobileMenu, { type NavLink } from './MobileMenu'

export type SessionProp = {
  id: string
  nombre: string
  rol: RolUsuario
}

interface NavClientProps {
  session: SessionProp | null
}

export default function NavClient({ session }: NavClientProps) {
  const router = useRouter()

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
        { href: '/perfil', label: session.nombre },
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
        className="hidden md:flex items-center gap-4 text-sm font-medium"
      >
        <SearchBox />
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
                className="text-text-muted hover:text-text transition-colors"
              >
                {l.label}
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
          </>
        )}
      </nav>

      {/* Mobile nav — hamburger + drawer, hidden at md and up */}
      <MobileMenu
        className="md:hidden"
        links={mobileLinks}
        onLogout={session ? handleLogout : undefined}
      />
    </>
  )
}
