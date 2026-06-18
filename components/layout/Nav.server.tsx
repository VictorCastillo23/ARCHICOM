import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSesionUsuario } from '@/lib/data/perfil'
import NavClient, { type SessionProp } from './NavClient'

// RSC — no 'use client'. Resolves auth server-side so HTML arrives with correct nav state.
export default async function Nav() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let session: SessionProp | null = null

  if (user) {
    const { data: perfil } = await getSesionUsuario(user.id)
    if (perfil) {
      session = { id: perfil.id, nombre: perfil.nombre, rol: perfil.rol }
    }
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
        <NavClient session={session} />
      </div>
    </header>
  )
}
