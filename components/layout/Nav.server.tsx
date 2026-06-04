import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/data/perfil'
import NavClient, { type SessionProp } from './NavClient'

// RSC — no 'use client'. Resolves auth server-side so HTML arrives with correct nav state.
export default async function Nav() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let session: SessionProp | null = null

  if (user) {
    const { data: perfil } = await getPerfil(user.id)
    if (perfil) {
      session = { id: perfil.id, nombre: perfil.nombre, rol: perfil.rol }
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[--color-border] bg-[--color-surface]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-[--space-page] h-14">
        <Link
          href="/"
          className="font-bold text-lg tracking-tight text-[--color-text] hover:text-[--color-primary] transition-colors"
        >
          Archicom
        </Link>
        <NavClient session={session} />
      </div>
    </header>
  )
}
