import type { Metadata } from 'next'
import { buscarPublicaciones, buscarUsuarios } from '@/lib/data/buscar'
import PublicacionCard from '@/components/feed/PublicacionCard'
import UsuarioCard from '@/components/usuario/UsuarioCard'
import VerMas from '@/components/buscar/VerMas'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import type { PublicacionCardData, UsuarioCardData } from '@/lib/types/database'

// ---------- Metadata ----------

interface BuscarPageProps {
  searchParams: Promise<{ q?: string }>
}

export async function generateMetadata({ searchParams }: BuscarPageProps): Promise<Metadata> {
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  return {
    title: q.length >= 2 ? `Búsqueda: "${q}" — Vitrina` : 'Buscar — Vitrina',
  }
}

// ---------- Page ----------

export default async function BuscarPage({ searchParams }: BuscarPageProps) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim()

  // Guard: too short or empty
  if (q.length < 2) {
    return (
      <div className="animate-page">
        <EmptyState
          title="Buscá en Vitrina"
          description="Ingresá al menos 2 caracteres para encontrar publicaciones y personas."
        />
      </div>
    )
  }

  // Parallel SSR fetch — per-section error isolation
  const [pubsResult, usersResult] = await Promise.all([
    buscarPublicaciones(q, 0, 6),
    buscarUsuarios(q, 0, 6),
  ])

  return (
    <div className="animate-page space-y-12">
      <h1 className="text-(length:--size-heading-md) font-normal font-display text-text">
        Resultados para &ldquo;{q}&rdquo;
      </h1>

      {/* ---- Publicaciones section ---- */}
      <section aria-labelledby="section-publicaciones">
        <h2
          id="section-publicaciones"
          className="text-(length:--size-heading-sm) font-normal font-display text-text mb-6"
        >
          Publicaciones
        </h2>

        {pubsResult.error ? (
          <ErrorState
            title="Error al cargar publicaciones"
            description="No pudimos obtener las publicaciones. Intenta de nuevo más tarde."
          />
        ) : pubsResult.items.length === 0 ? (
          <EmptyState
            title="Sin publicaciones"
            description={`No encontramos publicaciones para "${q}".`}
          />
        ) : (
          <VerMas
            tipo="publicacion"
            q={q}
            initialItems={pubsResult.items as PublicacionCardData[]}
            initialOffset={pubsResult.items.length}
            initialHasMore={pubsResult.hasMore}
          >
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 list-none p-0">
              {pubsResult.items.map((pub) => (
                <li key={pub.id}>
                  <PublicacionCard pub={pub} />
                </li>
              ))}
            </ul>
          </VerMas>
        )}
      </section>

      {/* ---- Personas section ---- */}
      <section aria-labelledby="section-personas">
        <h2
          id="section-personas"
          className="text-(length:--size-heading-sm) font-normal font-display text-text mb-6"
        >
          Personas
        </h2>

        {usersResult.error ? (
          <ErrorState
            title="Error al cargar personas"
            description="No pudimos obtener los resultados de personas. Intenta de nuevo más tarde."
          />
        ) : usersResult.items.length === 0 ? (
          <EmptyState
            title="Sin resultados de personas"
            description={`No encontramos personas para "${q}".`}
          />
        ) : (
          <VerMas
            tipo="usuario"
            q={q}
            initialItems={usersResult.items as UsuarioCardData[]}
            initialOffset={usersResult.items.length}
            initialHasMore={usersResult.hasMore}
          >
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 list-none p-0">
              {usersResult.items.map((u) => (
                <li key={u.id}>
                  <UsuarioCard usuario={u} />
                </li>
              ))}
            </ul>
          </VerMas>
        )}
      </section>
    </div>
  )
}
