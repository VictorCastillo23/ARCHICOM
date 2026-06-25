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
    return <ErrorState title="Error al cargar la revista" description="Intenta de nuevo más tarde." />
  }

  if (!data) {
    notFound()
  }

  const articulos = data.revista_articulo ?? []

  return (
    <article className="animate-page">
      <div className="mb-6 pb-4 border-b border-border">
        <Link
          href="/revistas"
          className="text-xs uppercase tracking-wider text-text-muted hover:text-primary transition-colors"
        >
          ← Revistas
        </Link>
      </div>

      {/* Editorial cover header */}
      <header className="mb-10 pb-8 border-b-2 border-border">
        <div className="flex items-center gap-3 mb-5">
          <Badge tone="success">Publicada</Badge>
          {data.volumen && (
            <span className="text-xs font-medium uppercase tracking-widest text-text-muted">
              Vol. {data.volumen}
            </span>
          )}
        </div>

        <h1 className="text-(length:--size-heading-lg) font-normal font-display text-text leading-tight mb-4">
          {data.titulo}
        </h1>
      </header>

      {/* Curated article list */}
      <section>
        <h2 className="text-(length:--size-heading-sm) font-normal font-display text-text mb-6">
          Artículos ({articulos.length})
        </h2>

        {articulos.length === 0 ? (
          <EmptyState
            title="Sin artículos"
            description="Esta revista todavía no tiene artículos publicados."
          />
        ) : (
          <ol className="flex flex-col gap-0 list-none p-0">
            {articulos.map((articulo, index) => {
              const pub = articulo.publicacion
              if (!pub) return null

              const autor = pub.usuario

              return (
                <li
                  key={articulo.id}
                  className="flex gap-4 py-5 border-b border-border last:border-b-0"
                >
                  <span className="text-2xl font-display font-normal text-text-muted w-8 shrink-0 pt-0.5 leading-none">
                    {index + 1}
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-normal font-display">
                      <Link
                        href={`/publicacion/${pub.id}`}
                        className="text-text hover:text-primary transition-colors"
                      >
                        {pub.titulo}
                      </Link>
                    </h3>
                    {autor && (
                      <p className="text-sm text-text-muted">
                        <Link
                          href={`/usuario/${autor.id}`}
                          className="hover:text-primary transition-colors"
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
