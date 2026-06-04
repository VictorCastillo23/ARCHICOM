'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import type { RolUsuario } from '@/lib/types/database'

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
    } catch {
      // Silently ignore logout errors — session likely already cleared
    }
    router.refresh()
  }

  return (
    <nav
      aria-label="Navegación principal"
      className="flex items-center gap-4 text-sm font-medium"
    >
      {session === null ? (
        <>
          <Link
            href="/login"
            className="text-[--color-text-muted] hover:text-[--color-text] transition-colors"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/signup"
            className="rounded-[--radius-md] bg-[--color-primary] px-3 py-1.5 text-white hover:bg-[--color-primary-hover] transition-colors"
          >
            Crear cuenta
          </Link>
        </>
      ) : (
        <>
          <Link
            href="/perfil"
            className="text-[--color-text-muted] hover:text-[--color-text] transition-colors"
          >
            {session.nombre}
          </Link>
          <Link
            href="/publicar"
            className="text-[--color-text-muted] hover:text-[--color-text] transition-colors"
          >
            Publicar
          </Link>
          {session.rol === 'administrador' && (
            <Link
              href="/admin"
              className="text-[--color-text-muted] hover:text-[--color-text] transition-colors"
            >
              Admin
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="text-[--color-text-muted] hover:text-[--color-text] transition-colors"
            aria-label="Cerrar sesión"
          >
            Salir
          </button>
        </>
      )}
    </nav>
  )
}
