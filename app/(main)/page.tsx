import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getFeed } from '@/lib/data/feed'
import { getTrendingFeed } from '@/lib/data/trending'
import { getPublicacionPorArea } from '@/lib/data/publicaciones'
import { getTags } from '@/lib/data/tags'
import { getRevistaActiva } from '@/lib/data/revistas'
import { shuffle } from '@/lib/utils/shuffle'
import { getEstadoVentanaPostulacion } from '@/lib/utils/revistaCiclo'
import FeedList from '@/components/feed/FeedList'
import FeedFilters from '@/components/feed/FeedFilters'
import HeroBanner from '@/components/feed/HeroBanner'
import TrendingSection from '@/components/feed/TrendingSection'
import VentanaRevistaBanner from '@/components/feed/VentanaRevistaBanner'
import Pagination from '@/components/ui/Pagination'
import type { PublicacionCardData, FeedPublicacion, Revista } from '@/lib/types/database'
import { TIPOS_PUBLICACION } from '@/lib/constants/publicaciones'

const LIMIT = 24

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vitrina.vercel.app'
const description = 'Explora publicaciones académicas de la comunidad: libros, artículos, investigaciones, poemas y más.'

export const metadata: Metadata = {
  description,
  alternates: { canonical: siteUrl },
  openGraph: {
    title: 'Vitrina',
    description,
    type: 'website',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vitrina',
    description,
  },
}

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
  let trending: PublicacionCardData[] = []
  let revistaActiva: Revista | null = null

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
        archivo_url: pub.archivo_url,
        archivo_thumbnail_url: pub.archivo_thumbnail_url,
      }))
    }
  } else {
    // Fetch trending, main feed, and (when unfiltered) the active revista
    // concurrently to avoid a waterfall. Trending and the revista lookup are
    // only fetched (and shown) when no filters are active.
    const [feedRes, trendingRes, revistaRes] = await Promise.all([
      getFeed({ tipo: tipo || undefined, limit: LIMIT, offset }),
      !tipo ? getTrendingFeed({ limit: 3 }) : Promise.resolve({ data: [], error: null }),
      !tipo ? getRevistaActiva() : Promise.resolve({ data: null, error: null }),
    ])
    revistaActiva = revistaRes.data

    if (feedRes.data) {
      publicaciones = (feedRes.data as FeedPublicacion[]).map((pub) => ({
        id: pub.id,
        titulo: pub.titulo,
        resumen: pub.resumen,
        tipo: pub.tipo,
        nombre_autor: pub.autor_nombre,
        autor_id: pub.autor_id,
        creado_en: pub.creado_en,
        archivo_url: pub.archivo_url,
        archivo_thumbnail_url: pub.archivo_thumbnail_url,
      }))
    }

    if (trendingRes.data) {
      trending = (trendingRes.data as FeedPublicacion[]).map((pub) => ({
        id: pub.id,
        titulo: pub.titulo,
        resumen: pub.resumen,
        tipo: pub.tipo,
        nombre_autor: pub.autor_nombre,
        autor_id: pub.autor_id,
        creado_en: pub.creado_en,
        archivo_url: pub.archivo_url,
        archivo_thumbnail_url: pub.archivo_thumbnail_url,
      }))
    }
  }

  // Randomize display order so every reload shows a different arrangement.
  // The fetch/pagination set is still deterministic (creado_en + range); only
  // the visual order within the page is shuffled.
  // Trending keeps score order (ordering IS the feature — no shuffle).
  publicaciones = shuffle(publicaciones)

  const { data: tags } = await getTags()
  const areas = [...new Set((tags ?? []).map((t) => t.area))].sort()

  const hasMore = publicaciones.length === LIMIT
  const currentSearchParams = { ...(area ? { area } : tipo ? { tipo } : {}) }

  // Postulation window banner: unfiltered home only, active revista required,
  // window must be open. `diasRestantes` is guaranteed non-null when `abierta`.
  const estadoVentana = !area && !tipo ? getEstadoVentanaPostulacion() : null

  return (
    <div className="animate-page">
      {!isAuthenticated && <HeroBanner />}

      {estadoVentana?.abierta && revistaActiva && estadoVentana.diasRestantes !== null && (
        <VentanaRevistaBanner
          revista={{ id: revistaActiva.id, titulo: revistaActiva.titulo }}
          diasRestantes={estadoVentana.diasRestantes}
        />
      )}

      {/* Trending section: only shown on the unfiltered home page (no area, no tipo) */}
      {!area && !tipo && <TrendingSection items={trending} />}

      <div id="feed">
        <div className="mb-8">
          <h1 className="text-(length:--size-heading-lg) font-normal font-display text-text leading-tight">
            Publicaciones
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Explora el trabajo de la comunidad.
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
