import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getRevista } from '@/lib/data/revistas'
import Badge from '@/components/ui/Badge'
import ErrorState from '@/components/ui/ErrorState'
import EmptyState from '@/components/ui/EmptyState'

interface RevistaDetallePageProps {
  params: Promise<{ id: string }>
}

export default async function RevistaDetallePage({ params }: RevistaDetallePageProps) {
  const { id } = await params

  const { data, error } = await getRevista(id)

  if (error) {
    return <ErrorState title="Error al cargar la revista" description="Intentá de nuevo más tarde." />
  }

  if (!data) {
    notFound()
  }

  const articulos = data.revista_articulo ?? []

  return (
    <article>
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Badge tone="success">Publicada</Badge>
          {data.volumen && (
            <span className="text-sm text-[--color-text-muted]">
              Vol. {data.volumen}
            </span>
          )}
        </div>

        <h1 className="text-[--size-heading-lg] font-bold font-serif text-[--color-text] leading-tight mb-4">
          {data.titulo}
        </h1>

        {data.descripcion && (
          <p className="text-base text-[--color-text-muted] leading-relaxed">
            {data.descripcion}
          </p>
        )}
      </header>

      {/* Artículos */}
      <section>
        <h2 className="text-[--size-heading-sm] font-semibold font-serif text-[--color-text] mb-6">
          Artículos ({articulos.length})
        </h2>

        {articulos.length === 0 ? (
          <EmptyState
            title="Sin artículos"
            description="Esta revista todavía no tiene artículos publicados."
          />
        ) : (
          <ol className="flex flex-col gap-4 list-none p-0">
            {articulos.map((articulo, index) => {
              const pub = articulo.publicacion
              if (!pub) return null

              const autor = pub.usuario

              return (
                <li
                  key={articulo.id}
                  className="flex gap-4 py-4 border-b border-[--color-border] last:border-b-0"
                >
                  <span className="text-2xl font-serif font-bold text-[--color-text-muted] w-8 shrink-0 pt-0.5">
                    {index + 1}
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-semibold font-serif">
                      <Link
                        href={`/publicacion/${pub.id}`}
                        className="text-[--color-text] hover:text-[--color-primary] transition-colors"
                      >
                        {pub.titulo}
                      </Link>
                    </h3>
                    {autor && (
                      <p className="text-sm text-[--color-text-muted]">
                        <Link
                          href={`/usuario/${autor.id}`}
                          className="hover:text-[--color-primary] transition-colors"
                        >
                          {autor.nombre}
                        </Link>
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </article>
  )
}
