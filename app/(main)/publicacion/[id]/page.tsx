import { notFound } from 'next/navigation'
import { getPublicacion, getLikesInfo } from '@/lib/data/publicaciones'
import { getRevistaActiva } from '@/lib/data/revistas'
import { getSolicitudParaEdicion } from '@/lib/data/solicitudes'
import { createClient } from '@/lib/supabase/server'
import TipoBadge from '@/components/ui/TipoBadge'
import ErrorState from '@/components/ui/ErrorState'
import TagList from '@/components/publicacion/TagList'
import ComentarioList from '@/components/publicacion/ComentarioList'
import ComentarioForm from '@/components/publicacion/ComentarioForm'
import LikeButton from '@/components/publicacion/LikeButton'
import SolicitarRevistaButton from '@/components/publicacion/SolicitarRevistaButton'
import EliminarPublicacionButton from '@/components/publicacion/EliminarPublicacionButton'
import PublicacionesRelacionadas from '@/components/publicacion/PublicacionesRelacionadas'
import Link from 'next/link'
import type { Comentario, Tag, PublicacionTag, TipoPublicacion, Usuario } from '@/lib/types/database'

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

  // Resolve session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthenticated = Boolean(user)
  const isAuthor = Boolean(user && user.id === data.autor_id)

  // Resolve like state: public total count + whether the current user liked it
  const { count: likeCount } = await supabase
    .from('like')
    .select('*', { count: 'exact', head: true })
    .eq('publicacion_id', id)

  let userLiked = false
  if (user) {
    const { count: ownLike } = await supabase
      .from('like')
      .select('*', { count: 'exact', head: true })
      .eq('publicacion_id', id)
      .eq('usuario_id', user.id)
    userLiked = (ownLike ?? 0) > 0
  }

  // Resolve postulation state (only needed when user is the author)
  const { data: revistaActiva } = await getRevistaActiva()
  const { data: solicitudExistente } = isAuthor && revistaActiva
    ? await getSolicitudParaEdicion(id, revistaActiva.id)
    : { data: null }

  // Resolve delete confirmation data (only for the author)
  let tieneRevista = false
  let tieneSolicitudPendiente = false
  if (isAuthor) {
    const [{ count: revistaCount }, { count: solicitudCount }] = await Promise.all([
      supabase
        .from('revista_articulo')
        .select('revista!inner(estado)', { count: 'exact', head: true })
        .eq('publicacion_id', id)
        .eq('revista.estado', 'publicada'),
      supabase
        .from('solicitud_revista')
        .select('*', { count: 'exact', head: true })
        .eq('publicacion_id', id)
        .eq('estado', 'pendiente'),
    ])
    tieneRevista = (revistaCount ?? 0) > 0
    tieneSolicitudPendiente = (solicitudCount ?? 0) > 0
  }

  return (
    <article className="animate-page max-w-[68ch] mx-auto">
      <div className="mb-6 pb-4 border-b border-border">
        <Link
          href="/"
          className="text-xs uppercase tracking-wider text-text-muted hover:text-primary transition-colors"
        >
          ← Publicaciones
        </Link>
      </div>

      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <TipoBadge tipo={data.tipo} />
          <time
            dateTime={data.creado_en}
            className="text-sm text-text-muted"
          >
            {new Date(data.creado_en).toLocaleDateString('es-AR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        </div>

        <h1 className="text-(length:--size-heading-lg) font-normal font-display text-text leading-tight mb-4 break-words">
          {data.titulo}
        </h1>

        {autor && (
          <p className="text-sm text-text-muted">
            Por{' '}
            <Link
              href={`/usuario/${autor.id}`}
              className="font-medium text-text hover:text-primary transition-colors"
            >
              {autor.nombre}
            </Link>
          </p>
        )}
      </header>

      {/* Resumen */}
      <section className="mb-8">
        <p className="text-base text-text leading-relaxed break-words">{data.resumen}</p>
      </section>

      {/* Obra recomendada: atribución externa */}
      {data.tipo === 'recomendacion' && (data.obra_autor_externo || data.url_externa) && (
        <section className="mb-8 rounded-md border border-border bg-surface p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
            Obra recomendada
          </h2>
          {data.obra_autor_externo && (
            <p className="text-sm text-text">
              Autor original: <span className="font-medium">{data.obra_autor_externo}</span>
            </p>
          )}
          {data.url_externa && (
            <a
              href={data.url_externa}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline break-all"
            >
              Ver obra original ↗
            </a>
          )}
        </section>
      )}

      {/* Archivo */}
      {data.archivo_url && (
        <div className="mb-8">
          <a
            href={data.archivo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:border-primary hover:text-primary transition-colors"
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
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
            Etiquetas
          </h2>
          <TagList tags={tags} />
        </div>
      )}

      {/* Acciones del autor */}
      {isAuthor && (
        <div className="mb-8 flex items-center gap-3">
          <SolicitarRevistaButton
            publicacionId={id}
            isAuthor={isAuthor}
            revistaActiva={revistaActiva ? { id: revistaActiva.id, titulo: revistaActiva.titulo } : null}
            solicitudExistente={solicitudExistente}
          />
          <EliminarPublicacionButton
            publicacionId={id}
            titulo={data.titulo}
            tieneRevista={tieneRevista}
            tieneSolicitudPendiente={tieneSolicitudPendiente}
          />
        </div>
      )}

      {/* Acciones de administración */}
      {isAdmin && !isAuthor && (
        <div className="mb-8 flex items-center gap-3 rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-muted] p-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[--color-text-muted]">
            Administración
          </span>
          <EliminarPublicacionButton
            publicacionId={id}
            titulo={data.titulo}
            tieneRevista={false}
            tieneSolicitudPendiente={false}
            redirectTo="/"
          />
        </div>
      )}

      {/* Like */}
      <div className="mb-10 pb-8 border-b border-border">
        <LikeButton
          publicacionId={id}
          initialLiked={userLiked}
          initialCount={likeCount ?? 0}
          isAuthenticated={isAuthenticated}
        />
      </div>

      {/* Comentarios */}
      <section>
        <h2 className="text-(length:--size-heading-sm) font-normal font-display text-text mb-6">
          Comentarios ({comentarios.length})
        </h2>

        <ComentarioList comentarios={comentarios} />

        {isAuthenticated && (
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-sm font-semibold text-text mb-3">
              Dejá tu comentario
            </h3>
            <ComentarioForm publicacionId={id} />
          </div>
        )}

        {!isAuthenticated && (
          <p className="mt-6 text-sm text-text-muted">
            <Link href="/login" className="text-primary hover:underline">
              Iniciá sesión
            </Link>{' '}
            para comentar.
          </p>
        )}
      </section>

      <PublicacionesRelacionadas
        publicacionId={id}
        tagIds={tags.map((t) => t.id)}
        tipo={data.tipo as TipoPublicacion}
      />
    </article>
  )
}
