import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMisGuardados } from '@/lib/data/guardados'
import FeedList from '@/components/feed/FeedList'
import EmptyState from '@/components/ui/EmptyState'
import Link from 'next/link'

export const metadata = { title: 'Mis guardados — Vitrina' }

export default async function GuardadosPage() {
  // Defensive redirect — proxy.ts already guards /perfil/*
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: pubs } = await getMisGuardados(user.id)

  return (
    <div className="animate-page flex flex-col gap-8">
      <header>
        <Link
          href="/perfil"
          className="text-xs uppercase tracking-wider text-text-muted hover:text-primary transition-colors"
        >
          ← Mi perfil
        </Link>
        <h1 className="mt-4 text-(length:--size-heading-sm) font-normal font-display text-text">
          Mis guardados
        </h1>
      </header>

      {!pubs || pubs.length === 0 ? (
        <EmptyState
          title="No guardaste ninguna publicación"
          description="Usa el botón Guardar en cualquier publicación para verla aquí."
          action={{ label: 'Explorar publicaciones', href: '/' }}
        />
      ) : (
        <FeedList publicaciones={pubs} />
      )}
    </div>
  )
}
