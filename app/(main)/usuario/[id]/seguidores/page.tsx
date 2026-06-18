import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPerfil } from '@/lib/data/perfil'
import { getSeguidores, getSeguidos } from '@/lib/data/seguidores'
import UsuarioCard from '@/components/usuario/UsuarioCard'
import EmptyState from '@/components/ui/EmptyState'

interface SeguidoresPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: SeguidoresPageProps) {
  const { id } = await params
  const { data: perfil } = await getPerfil(id)
  if (!perfil) return { title: 'Perfil no encontrado — Vitrina' }
  return { title: `Seguidores de ${perfil.nombre} — Vitrina` }
}

export default async function SeguidoresPage({ params, searchParams }: SeguidoresPageProps) {
  const { id } = await params
  const sp = await searchParams
  const tipo = sp?.tipo === 'seguidos' ? 'seguidos' : 'seguidores'

  const { data: perfil } = await getPerfil(id)
  if (!perfil) notFound()

  const { data: usuarios } =
    tipo === 'seguidores'
      ? await getSeguidores(id, { limit: 50 })
      : await getSeguidos(id, { limit: 50 })

  const lista = usuarios ?? []

  return (
    <div className="animate-page flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link
          href={`/usuario/${id}`}
          className="text-sm text-text-muted hover:text-primary transition-colors"
        >
          ← Volver al perfil de {perfil.nombre}
        </Link>
        <h1 className="text-(length:--size-heading-md) font-normal font-display text-text">
          {tipo === 'seguidores'
            ? `Seguidores de ${perfil.nombre}`
            : `${perfil.nombre} sigue a`}
        </h1>
      </div>

      {/* Tab-style toggle */}
      <div className="flex gap-2" role="tablist" aria-label="Ver seguidores o seguidos">
        <Link
          href={`/usuario/${id}/seguidores?tipo=seguidores`}
          role="tab"
          aria-selected={tipo === 'seguidores'}
          className={[
            'rounded-md px-4 py-2 text-sm font-medium border transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            tipo === 'seguidores'
              ? 'bg-primary text-primary-fg border-primary'
              : 'bg-surface text-text border-border hover:border-primary hover:text-primary',
          ].join(' ')}
        >
          Seguidores
        </Link>
        <Link
          href={`/usuario/${id}/seguidores?tipo=seguidos`}
          role="tab"
          aria-selected={tipo === 'seguidos'}
          className={[
            'rounded-md px-4 py-2 text-sm font-medium border transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            tipo === 'seguidos'
              ? 'bg-primary text-primary-fg border-primary'
              : 'bg-surface text-text border-border hover:border-primary hover:text-primary',
          ].join(' ')}
        >
          Siguiendo
        </Link>
      </div>

      {lista.length === 0 ? (
        <EmptyState
          title={
            tipo === 'seguidores'
              ? `${perfil.nombre} todavía no tiene seguidores`
              : `${perfil.nombre} todavía no sigue a nadie`
          }
          description="Cuando alguien empiece a seguir, aparecerá aquí."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lista.map((usuario) => (
            <UsuarioCard key={usuario.id} usuario={usuario} />
          ))}
        </div>
      )}
    </div>
  )
}
