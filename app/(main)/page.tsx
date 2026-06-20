import { createClient } from '@/lib/supabase/server'
import { getFeed } from '@/lib/data/feed'
import { getPublicacionPorArea } from '@/lib/data/publicaciones'
import { getTags } from '@/lib/data/tags'
import { shuffle } from '@/lib/utils/shuffle'
import FeedList from '@/components/feed/FeedList'
import FeedFilters from '@/components/feed/FeedFilters'
import HeroBanner from '@/components/feed/HeroBanner'
import Pagination from '@/components/ui/Pagination'
import type { PublicacionCardData, FeedPublicacion } from '@/lib/types/database'
import { TIPOS_PUBLICACION } from '@/lib/constants/publicaciones'

const LIMIT = 24

interface FeedPageProps {
  searchParams: Promise<Record<string, string>>
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const sp = await searchParams

  const area = sp.area ?? ''
  const tipo = sp.tipo ?? ''
  const offset = Number(sp.offset ?? 0)

  // Resolve session for HeroBanner and smart EmptyState
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthenticated = Boolean(user)

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

  // Randomize display order so every reload shows a different arrangement.
  // The fetch/pagination set is still deterministic (creado_en + range); only
  // the visual order within the page is shuffled.
  publicaciones = shuffle(publicaciones)

  const { data: tags } = await getTags()
  const areas = [...new Set((tags ?? []).map((t) => t.area))].sort()

  const hasMore = publicaciones.length === LIMIT
  const currentSearchParams = { ...(area ? { area } : tipo ? { tipo } : {}) }

  return (
    <div className="animate-page">
      {!isAuthenticated && <HeroBanner />}

      <div id="feed">
        <div className="mb-8">
          <h1 className="text-(length:--size-heading-lg) font-normal font-display text-text leading-tight">
            Publicaciones
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Explorá el trabajo de la comunidad.
          </p>
        </div>

        <FeedFilters
          tipos={TIPOS_PUBLICACION}
          areas={areas}
          current={{ tipo: tipo || undefined, area: area || undefined }}
        />

        <FeedList
          publicaciones={publicaciones}
          isAuthenticated={isAuthenticated}
          tipoActivo={tipo || undefined}
          areaActivo={area || undefined}
        />

        <Pagination
          basePath="/"
          searchParams={currentSearchParams}
          offset={offset}
          limit={LIMIT}
          hasMore={hasMore}
        />
      </div>
    </div>
  )
}
