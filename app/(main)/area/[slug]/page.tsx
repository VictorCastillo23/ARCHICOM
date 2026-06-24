import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SLUG_TO_AREA, AREA_TO_SLUG } from '@/lib/constants/areas'
import { getAreasConMinimo, countForArea } from '@/lib/data/areas'
import { getPublicacionPorArea } from '@/lib/data/publicaciones'
import FeedList from '@/components/feed/FeedList'
import Pagination from '@/components/ui/Pagination'
import type { PublicacionCardData } from '@/lib/types/database'

// Keep dynamicParams = true (default) so runtime thin-content notFound() fires
// for slugs that are not in generateStaticParams (e.g. areas that drop below 3 pubs).
// export const dynamicParams = true  // this is the default — no need to set explicitly

const LIMIT = 24

interface AreaPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string>>
}

export async function generateMetadata({ params }: AreaPageProps): Promise<Metadata> {
  const { slug } = await params
  const area = SLUG_TO_AREA[slug]
  if (!area) return {}

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vitrina.vercel.app'

  return {
    title: `${area} — Vitrina`,
    description: `Explorá publicaciones académicas de ${area} creadas por la comunidad en Vitrina.`,
    alternates: {
      canonical: `${siteUrl}/area/${slug}`,
    },
  }
}

/**
 * Pre-build pages for areas with ≥3 publications.
 * Empty fallback if Supabase is unreachable at build time — pages are still
 * served on-demand via SSR (dynamicParams = true).
 */
export async function generateStaticParams() {
  try {
    const areas = await getAreasConMinimo(3)
    return areas
      .map((a) => ({ slug: AREA_TO_SLUG[a.area] }))
      .filter((p): p is { slug: string } => Boolean(p.slug))
  } catch {
    return []
  }
}

export default async function AreaPage({ params, searchParams }: AreaPageProps) {
  const { slug } = await params
  const sp = await searchParams
  const offset = Number(sp.offset ?? 0)

  // Resolve slug → area name; 404 for unknown slugs
  const area = SLUG_TO_AREA[slug]
  if (!area) notFound()

  // Thin-content gate: 404 for areas with fewer than 3 publications
  const count = await countForArea(area)
  if (count < 3) notFound()

  // Fetch paginated publications for this area (UNCHANGED — uses existing function)
  const { data } = await getPublicacionPorArea({ area, limit: LIMIT, offset })

  const publicaciones: PublicacionCardData[] = (data ?? []).map((pub) => ({
    id: pub.id,
    titulo: pub.titulo,
    resumen: pub.resumen,
    tipo: pub.tipo,
    nombre_autor: pub.usuario?.nombre ?? 'Autor desconocido',
    autor_id: pub.autor_id,
    creado_en: pub.creado_en,
  }))

  const hasMore = publicaciones.length === LIMIT

  return (
    <div className="animate-page">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-(length:--size-heading-lg) font-normal font-display text-text leading-tight">
          {area}
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Publicaciones académicas de la comunidad en el área de {area}.
        </p>
        <p className="mt-1 text-xs text-text-muted">
          {count} {count === 1 ? 'publicación' : 'publicaciones'}
        </p>
      </div>

      {/* Publication list */}
      <FeedList publicaciones={publicaciones} areaActivo={area} />

      <Pagination
        basePath={`/area/${slug}`}
        searchParams={{}}
        offset={offset}
        limit={LIMIT}
        hasMore={hasMore}
      />
    </div>
  )
}
