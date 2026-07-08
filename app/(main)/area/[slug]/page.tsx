import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SLUG_TO_AREA } from '@/lib/constants/areas'
import { countForArea } from '@/lib/data/areas'
import { getPublicacionPorArea } from '@/lib/data/publicaciones'
import FeedList from '@/components/feed/FeedList'
import Pagination from '@/components/ui/Pagination'
import type { PublicacionCardData } from '@/lib/types/database'

// Forced dynamic: this page reads `searchParams` (offset) per request, which
// conflicts with generateStaticParams-based ISR — background revalidation has
// no real request to read searchParams from, causing a DYNAMIC_SERVER_USAGE
// crash (500) in production. See prod incident 2026-07-08.
export const dynamic = 'force-dynamic'

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
    description: `Explora publicaciones académicas de ${area} creadas por la comunidad en Vitrina.`,
    alternates: {
      canonical: `${siteUrl}/area/${slug}`,
    },
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
