import { notFound } from 'next/navigation'
import { getPublicacion, getLikesInfo, getEstadoEliminacion } from '@/lib/data/publicaciones'
import { getIsGuardado } from '@/lib/data/guardados'
import { getComentariosArbol } from '@/lib/data/comentarios'
import { esAdmin } from '@/lib/data/perfil'
import { getRevistaActiva } from '@/lib/data/revistas'
import { getSolicitudParaEdicion } from '@/lib/data/solicitudes'
import { createClient } from '@/lib/supabase/server'
import TipoBadge from '@/components/ui/TipoBadge'
import ErrorState from '@/components/ui/ErrorState'
import TagList from '@/components/publicacion/TagList'
import ComentarioList from '@/components/publicacion/ComentarioList'
import ComentarioForm from '@/components/publicacion/ComentarioForm'
import LikeButton from '@/components/publicacion/LikeButton'
import GuardarButton from '@/components/publicacion/GuardarButton'
import SolicitarRevistaButton from '@/components/publicacion/SolicitarRevistaButton'
import EliminarPublicacionButton from '@/components/publicacion/EliminarPublicacionButton'
import ReportarButton from '@/components/publicacion/ReportarButton'
import PublicacionesRelacionadas from '@/components/publicacion/PublicacionesRelacionadas'
import ArchivoVistaPrevia from '@/components/publicacion/ArchivoVistaPrevia'
import AnonFollowCTA from '@/components/publicacion/AnonFollowCTA'
import AnonViewBanner from '@/components/publicacion/AnonViewBanner'
import CompartirButton from '@/components/ui/CompartirButton'
import Link from 'next/link'
import type { Tag, PublicacionTag, TipoPublicacion, Usuario } from '@/lib/types/database'

interface PublicacionPageProps {
  params: Promise<{ id: string }>
}

export default async function PublicacionPage({ params }: PublicacionPageProps) {
  const { id } = await params

  const { data, error } = await getPublicacion(id)

  if (error) {
    return <ErrorState title="Error al cargar la publicación" description="Intenta de nuevo más tarde." />
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

  // Resolve session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthenticated = Boolean(user)
  const isAuthor = Boolean(user && user.id === data.autor_id)

  // Resolve independent fetches in parallel (no waterfall)
  const [
    { count: likeCount, liked: likedByUser },
    { data: guardadoByUser },
    { data: comentariosData },
  ] = await Promise.all([
    getLikesInfo(id, user?.id),
    getIsGuardado(id, user?.id),
    getComentariosArbol(id),
  ])

  const arbol = comentariosData?.arbol ?? []
  const totalComentarios = comentariosData?.total ?? 0

  // Admin moderation: a non-author admin can delete any publicacion (RLS: admin_elimina)
  const isAdmin = user && !isAuthor ? await esAdmin(user.id) : false

  // Resolve postulation state (only needed when user is the author)
  const { data: revistaActiva } = await getRevistaActiva()
  const { data: solicitudExistente } = isAuthor && revistaActiva
    ? await getSolicitudParaEdicion(id, revistaActiva.id)
    : { data: null }

  // Resolve delete confirmation data (only for the author)
  const { tieneRevista, tieneSolicitudPendiente } = isAuthor
    ? await getEstadoEliminacion(id)
    : { tieneRevista: false, tieneSolicitudPendiente: false }

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

      {/* Enlace externo: publicación normal (no recomendación) con enlace */}
      {data.tipo !== 'recomendacion' && data.url_externa && (
        <section className="mb-8 rounded-md border border-border bg-surface p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
            Enlace
          </h2>
          <a
            href={data.url_externa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline break-all"
          >
            Ver enlace ↗
          </a>
        </section>
      )}

      {/* Archivo */}
      {data.archivo_url && (
        <div className="mb-8">
          <ArchivoVistaPrevia url={data.archivo_url} titulo={data.titulo} />
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
          <Link
            href={`/publicacion/${id}/editar`}
            className="inline-flex items-center justify-center rounded-md font-medium transition-colors h-8 px-3 text-sm bg-surface text-text border border-border hover:bg-surface-muted"
          >
            Editar
          </Link>
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
        <div className="mb-8 flex items-center gap-3 rounded-md border border-border bg-surface-muted p-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
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

      {/* Like + save + report */}
      <div className="mb-10 pb-8 border-b border-border">
        <div className="flex flex-wrap items-center gap-3">
          <LikeButton
            publicacionId={id}
            initialLiked={likedByUser}
            initialCount={likeCount}
            isAuthenticated={isAuthenticated}
          />
          <GuardarButton
            publicacionId={id}
            initialSaved={guardadoByUser}
            isAuthenticated={isAuthenticated}
          />
          <CompartirButton path={`/publicacion/${id}`} label="Compartir" />
        </div>
        {isAuthenticated && !isAuthor && (
          <div className="mt-3">
            <ReportarButton publicacionId={id} isAuthenticated={isAuthenticated} />
          </div>
        )}
      </div>

      {/* Anon follow CTA: shown only to unauthenticated visitors when an author exists */}
      {!isAuthenticated && autor && (
        <AnonFollowCTA autorNombre={autor.nombre} />
      )}

      {/* Comentarios */}
      <section>
        <h2 className="text-(length:--size-heading-sm) font-normal font-display text-text mb-6">
          Comentarios ({totalComentarios})
        </h2>

        <ComentarioList
          comentarios={arbol}
          publicacionId={id}
          isAuthenticated={isAuthenticated}
        />

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

      {/* Anon view banner: fixed bottom, self-gates via POST /api/view-count.
          Shown only to unauthenticated visitors. Never blocks reading. */}
      {!isAuthenticated && <AnonViewBanner />}
    </article>
  )
}
