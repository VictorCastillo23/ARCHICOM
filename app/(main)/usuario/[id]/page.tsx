import { notFound } from 'next/navigation'
import { getPerfil, getPerfilStats } from '@/lib/data/perfil'
import { getMisPublicaciones } from '@/lib/data/publicaciones'
import PerfilView from '@/components/perfil/PerfilView'
import PerfilStats from '@/components/perfil/PerfilStats'
import FeedList from '@/components/feed/FeedList'
import ErrorState from '@/components/ui/ErrorState'
import type { PublicacionCardData, Publicacion } from '@/lib/types/database'

interface UsuarioPageProps {
  params: Promise<{ id: string }>
}

export default async function UsuarioPage({ params }: UsuarioPageProps) {
  const { id } = await params

  const { data: perfil, error: perfilError } = await getPerfil(id)

  if (perfilError) {
    return <ErrorState title="Error al cargar el perfil" description="Intentá de nuevo más tarde." />
  }

  if (!perfil) {
    notFound()
  }

  const [{ data: publicaciones }, stats] = await Promise.all([
    getMisPublicaciones(id),
    getPerfilStats(id),
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
      <div className="mb-6 pb-6 border-b border-[--color-border]">
        <PerfilView perfil={perfil} esPropio={false} />
        <div className="mt-4">
          <PerfilStats
            totalPublicaciones={stats.totalPublicaciones}
            totalEnRevistas={stats.totalEnRevistas}
            totalLikes={stats.totalLikes}
          />
        </div>
      </div>

      <section>
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-[--color-text] mb-6">
          Publicaciones ({publicacionesData.length})
        </h2>
        <FeedList publicaciones={publicacionesData} />
      </section>
    </div>
  )
}
