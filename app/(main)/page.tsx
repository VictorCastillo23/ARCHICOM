import { getFeed } from '@/lib/data/feed'
import { getPublicacionPorArea } from '@/lib/data/publicaciones'
import { getTags } from '@/lib/data/tags'
import FeedList from '@/components/feed/FeedList'
import FeedFilters from '@/components/feed/FeedFilters'
import Pagination from '@/components/ui/Pagination'
import type { PublicacionCardData, TipoPublicacion, FeedPublicacion } from '@/lib/types/database'

const TIPOS: TipoPublicacion[] = ['libro', 'articulo', 'investigacion', 'poema', 'dibujo', 'otro']
const LIMIT = 10

interface FeedPageProps {
  searchParams: Promise<Record<string, string>>
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const sp = await searchParams

  const area = sp.area ?? ''
  const tipo = sp.tipo ?? ''
  const offset = Number(sp.offset ?? 0)

  // area wins when both are present
  let publicaciones: PublicacionCardData[] = []

  if (area) {
    const { data } = await getPublicacionPorArea({ area, limit: LIMIT, offset })
    if (data) {
      publicaciones = data.map((pub) => ({
        id: pub.id,
        titulo: pub.titulo,
        resumen: pub.resumen,
        tipo: pub.tipo,
        nombre_autor: pub.usuario?.nombre ?? 'Autor desconocido',
        autor_id: pub.autor_id,
        creado_en: pub.creado_en,
      }))
    }
  } else {
    const { data } = await getFeed({ tipo: tipo || undefined, limit: LIMIT, offset })
    if (data) {
      publicaciones = (data as FeedPublicacion[]).map((pub) => ({
        id: pub.id,
        titulo: pub.titulo,
        resumen: pub.resumen,
        tipo: pub.tipo,
        nombre_autor: pub.autor_nombre,
        autor_id: pub.autor_id,
        creado_en: pub.creado_en,
      }))
    }
  }

  const { data: tags } = await getTags()
  const areas = [...new Set((tags ?? []).map((t) => t.area))].sort()

  const hasMore = publicaciones.length === LIMIT
  const currentSearchParams = { ...(area ? { area } : tipo ? { tipo } : {}) }

  return (
    <div className="animate-page">
      <div className="mb-8">
        <h1 className="text-[length:var(--size-heading-lg)] font-normal font-display text-[--color-text] leading-tight">
          Publicaciones
        </h1>
        <p className="mt-2 text-sm text-[--color-text-muted]">
          Explorá el trabajo de la comunidad.
        </p>
      </div>

      <FeedFilters
        tipos={TIPOS}
        areas={areas}
        current={{ tipo: tipo || undefined, area: area || undefined }}
      />

      <FeedList publicaciones={publicaciones} />

      <Pagination
        basePath="/"
        searchParams={currentSearchParams}
        offset={offset}
        limit={LIMIT}
        hasMore={hasMore}
      />
    </div>
  )
}
