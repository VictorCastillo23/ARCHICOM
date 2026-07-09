import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMisColecciones } from '@/lib/data/colecciones'
import ColeccionCard from '@/components/perfil/ColeccionCard'
import EmptyState from '@/components/ui/EmptyState'
import Link from 'next/link'

export const metadata = { title: 'Mis colecciones — Vitrina' }

export default async function ColeccionesPage() {
  // Defensive redirect — proxy.ts already guards /perfil/*
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: colecciones } = await getMisColecciones(user.id)

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
          Mis colecciones
        </h1>
      </header>

      {!colecciones || colecciones.length === 0 ? (
        <EmptyState
          title="No creaste ninguna colección"
          description="Usa el botón Agregar a colección en cualquier publicación para crear la primera."
          action={{ label: 'Explorar publicaciones', href: '/' }}
        />
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Tus colecciones">
          {colecciones.map((coleccion) => (
            <ColeccionCard key={coleccion.id} coleccion={coleccion} />
          ))}
        </ul>
      )}
    </div>
  )
}
