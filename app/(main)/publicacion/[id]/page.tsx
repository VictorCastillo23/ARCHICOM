import { notFound } from 'next/navigation'
import { getPublicacion } from '@/lib/data/publicaciones'
import { createClient } from '@/lib/supabase/server'
import TipoBadge from '@/components/ui/TipoBadge'
import ErrorState from '@/components/ui/ErrorState'
import TagList from '@/components/publicacion/TagList'
import ComentarioList from '@/components/publicacion/ComentarioList'
import ComentarioForm from '@/components/publicacion/ComentarioForm'
import LikeButton from '@/components/publicacion/LikeButton'
import Link from 'next/link'
import type { Comentario, Tag, PublicacionTag, Usuario } from '@/lib/types/database'

interface PublicacionPageProps {
  params: Promise<{ id: string }>
}

export default async function PublicacionPage({ params }: PublicacionPageProps) {
  const { id } = await params

  const { data, error } = await getPublicacion(id)

  if (error) {
    return <ErrorState title="Error al cargar la publicación" description="Intentá de nuevo más tarde." />
  }

  if (!data) {
    notFound()
  }

  // Resolve author info
  const autor = data.usuario as (Pick<Usuario, 'id' | 'nombre'> & { institucion?: string }) | undefined

  // Resolve tags
  const tags: Tag[] = (data.publicacion_tag ?? [])
    .map((pt: PublicacionTag) => pt.tag)
    .filter((t): t is Tag => Boolean(t))

  // Resolve comments
  const comentarios = (data.comentario ?? []) as (Comentario & { usuario?: Pick<Usuario, 'id' | 'nombre'> | null })[]

  // Determine auth status for LikeButton
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthenticated = Boolean(user)

  return (
    <article className="max-w-3xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <TipoBadge tipo={data.tipo} />
          <time
            dateTime={data.creado_en}
            className="text-sm text-[--color-text-muted]"
          >
            {new Date(data.creado_en).toLocaleDateString('es-AR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        </div>

        <h1 className="text-[--size-heading-lg] font-bold font-serif text-[--color-text] leading-tight mb-4">
          {data.titulo}
        </h1>

        {autor && (
          <p className="text-sm text-[--color-text-muted]">
            Por{' '}
            <Link
              href={`/usuario/${autor.id}`}
              className="font-medium text-[--color-text] hover:text-[--color-primary] transition-colors"
            >
              {autor.nombre}
            </Link>
          </p>
        )}
      </header>

      {/* Resumen */}
      <section className="mb-8">
        <p className="text-base text-[--color-text] leading-relaxed">{data.resumen}</p>
      </section>

      {/* Archivo */}
      {data.archivo_url && (
        <div className="mb-8">
          <a
            href={data.archivo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[--radius-md] border border-[--color-border] bg-[--color-surface] px-4 py-2 text-sm font-medium text-[--color-text] hover:border-[--color-primary] hover:text-[--color-primary] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Ver archivo
          </a>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[--color-text-muted] mb-3">
            Etiquetas
          </h2>
          <TagList tags={tags} />
        </div>
      )}

      {/* Like */}
      <div className="mb-10 pb-8 border-b border-[--color-border]">
        <LikeButton
          publicacionId={id}
          initialLiked={false}
          initialCount={0}
          isAuthenticated={isAuthenticated}
        />
      </div>

      {/* Comentarios */}
      <section>
        <h2 className="text-[--size-heading-sm] font-semibold font-serif text-[--color-text] mb-6">
          Comentarios ({comentarios.length})
        </h2>

        <ComentarioList comentarios={comentarios} />

        {isAuthenticated && (
          <div className="mt-8 pt-6 border-t border-[--color-border]">
            <h3 className="text-sm font-semibold text-[--color-text] mb-3">
              Dejá tu comentario
            </h3>
            <ComentarioForm publicacionId={id} />
          </div>
        )}

        {!isAuthenticated && (
          <p className="mt-6 text-sm text-[--color-text-muted]">
            <Link href="/login" className="text-[--color-primary] hover:underline">
              Iniciá sesión
            </Link>{' '}
            para comentar.
          </p>
        )}
      </section>
    </article>
  )
}
