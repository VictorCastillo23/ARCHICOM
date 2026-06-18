import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPerfil, getPerfilStats } from '@/lib/data/perfil'
import { getMisPublicaciones } from '@/lib/data/publicaciones'
import { getLinksUsuario } from '@/lib/data/links'
import { getConteos, getEsSeguido } from '@/lib/data/seguidores'
import PerfilView from '@/components/perfil/PerfilView'
import PerfilStats from '@/components/perfil/PerfilStats'
import SeguirButton from '@/components/usuario/SeguirButton'
import FeedList from '@/components/feed/FeedList'
import ErrorState from '@/components/ui/ErrorState'
import type { PublicacionCardData, Publicacion } from '@/lib/types/database'

interface UsuarioPageProps {
  params: Promise<{ id: string }>
}

export default async function UsuarioPage({ params }: UsuarioPageProps) {
  const { id } = await params

  // Resolve session and profile in parallel
  const supabase = await createClient()
  const [
    { data: { user: viewer } },
    { data: perfil, error: perfilError },
  ] = await Promise.all([
    supabase.auth.getUser(),
    getPerfil(id),
  ])

  if (perfilError) {
    return <ErrorState title="Error al cargar el perfil" description="Intentá de nuevo más tarde." />
  }

  if (!perfil) {
    notFound()
  }

  const esPropio = !!viewer && viewer.id === id

  // Fetch the rest of the page data in parallel
  const [
    { data: publicaciones },
    stats,
    { data: links },
    { data: conteos },
    { data: isFollowing },
  ] = await Promise.all([
    getMisPublicaciones(id),
    getPerfilStats(id),
    getLinksUsuario(id),
    getConteos(id),
    // Only resolve follow state when there is a session AND it's not own profile
    viewer && !esPropio
      ? getEsSeguido(viewer.id, id)
      : Promise.resolve({ data: false, error: null }),
  ])

  const publicacionesData: PublicacionCardData[] = (publicaciones ?? []).map((pub: Publicacion) => ({
    id: pub.id,
    titulo: pub.titulo,
    resumen: pub.resumen,
    tipo: pub.tipo,
    nombre_autor: perfil.nombre,
    autor_id: pub.autor_id,
    creado_en: pub.creado_en,
  }))

  return (
    <div className="animate-page">
      <div className="mb-6 pb-6 border-b border-border">
        <PerfilView perfil={perfil} esPropio={false} links={links ?? []} />
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <PerfilStats
            totalPublicaciones={stats.totalPublicaciones}
            totalEnRevistas={stats.totalEnRevistas}
            totalLikes={stats.totalLikes}
            usuarioId={id}
            seguidores={conteos?.n_seguidores ?? 0}
            seguidos={conteos?.n_seguidos ?? 0}
          />
          {/* SeguirButton: only shown when there is a session and it's not own profile */}
          {viewer && !esPropio && (
            <SeguirButton
              seguidoId={id}
              initialFollowing={isFollowing ?? false}
              isAuthenticated={true}
            />
          )}
        </div>
      </div>

      <section>
        <h2 className="text-(length:--size-heading-sm) font-normal font-display text-text mb-6">
          Publicaciones ({publicacionesData.length})
        </h2>
        <FeedList publicaciones={publicacionesData} />
      </section>
    </div>
  )
}
