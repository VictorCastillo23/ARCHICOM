import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getColeccion } from '@/lib/data/colecciones'
import { getPerfil } from '@/lib/data/perfil'
import Badge from '@/components/ui/Badge'
import FeedList from '@/components/feed/FeedList'
import type { PublicacionCardData, VisibilidadColeccion } from '@/lib/types/database'

interface ColeccionPageProps {
  params: Promise<{ id: string }>
}

const VISIBILIDAD_LABELS: Record<VisibilidadColeccion, string> = {
  publica: 'Pública',
  privada: 'Privada',
}

export async function generateMetadata({ params }: ColeccionPageProps): Promise<Metadata> {
  const { id } = await params
  const { data: coleccion } = await getColeccion(id)

  // RLS already filters private/non-owned collections to null via .maybeSingle()
  // (see lib/data/colecciones.ts) — never leak a private titulo in the metadata
  // for a request that couldn't actually read the row.
  if (!coleccion) {
    return { title: 'Colección no encontrada — Vitrina' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vitrina.vercel.app'
  const url = `${siteUrl}/coleccion/${id}`
  const title = `${coleccion.titulo} — Vitrina`
  const description = coleccion.descripcion ?? 'Colección de publicaciones académicas en Vitrina.'

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'website',
      url,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function ColeccionPage({ params }: ColeccionPageProps) {
  const { id } = await params

  const { data: coleccion } = await getColeccion(id)
  if (!coleccion) notFound()

  const { data: propietario } = await getPerfil(coleccion.usuario_id)

  // Members already arrive ordered by `orden` (see getColeccion) — no reorder
  // UI in this slice, render in stored order.
  const publicaciones: PublicacionCardData[] = (coleccion.coleccion_publicacion ?? []).map(
    (item) => ({
      id: item.publicacion?.id ?? item.publicacion_id,
      titulo: item.publicacion?.titulo ?? '',
      resumen: item.publicacion?.resumen ?? '',
      tipo: item.publicacion?.tipo ?? 'otro',
      nombre_autor: item.publicacion?.usuario?.nombre ?? 'Autor desconocido',
      autor_id: item.publicacion?.usuario?.id,
      archivo_url: item.publicacion?.archivo_url,
      archivo_thumbnail_url: item.publicacion?.archivo_thumbnail_url,
    })
  )

  return (
    <div className="animate-page">
      <div className="mb-8 pb-6 border-b border-border">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-(length:--size-heading-lg) font-normal font-display text-text leading-tight">
            {coleccion.titulo}
          </h1>
          <Badge tone={coleccion.visibilidad === 'publica' ? 'info' : 'neutral'}>
            {VISIBILIDAD_LABELS[coleccion.visibilidad]}
          </Badge>
        </div>
        {coleccion.descripcion && (
          <p className="mt-2 text-sm text-text-muted">{coleccion.descripcion}</p>
        )}
        <p className="mt-2 text-xs text-text-muted">
          Por{' '}
          {propietario ? (
            <Link
              href={`/usuario/${coleccion.usuario_id}`}
              className="font-medium text-text hover:text-primary transition-colors"
            >
              {propietario.nombre}
            </Link>
          ) : (
            <span className="font-medium text-text">Autor desconocido</span>
          )}
        </p>
      </div>

      <section>
        <h2 className="text-(length:--size-heading-sm) font-normal font-display text-text mb-6">
          Publicaciones ({publicaciones.length})
        </h2>
        <FeedList publicaciones={publicaciones} />
      </section>
    </div>
  )
}
