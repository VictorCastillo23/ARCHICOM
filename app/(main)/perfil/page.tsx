import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPerfil, getPerfilStats } from '@/lib/data/perfil'
import { getMisPublicaciones } from '@/lib/data/publicaciones'
import { getMisSolicitudes } from '@/lib/data/solicitudes'
import { getLinksUsuario } from '@/lib/data/links'
import { getConteos } from '@/lib/data/seguidores'
import Link from 'next/link'
import PerfilView from '@/components/perfil/PerfilView'
import PerfilStats from '@/components/perfil/PerfilStats'
import FeedList from '@/components/feed/FeedList'
import SolicitudesHistorial from '@/components/perfil/SolicitudesHistorial'
import EmptyState from '@/components/ui/EmptyState'
import type { PublicacionCardData, SolicitudConDetalle } from '@/lib/types/database'

export const metadata = { title: 'Mi perfil — Vitrina' }

export default async function PerfilPage() {
  // Defensive redirect — proxy.ts already guards this route
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfil } = await getPerfil(user.id)

  if (!perfil) {
    redirect('/login')
  }

  const [
    { data: publicaciones },
    { data: solicitudes },
    stats,
    { data: links },
    { data: conteos },
  ] = await Promise.all([
    getMisPublicaciones(user.id),
    getMisSolicitudes(user.id),
    getPerfilStats(user.id),
    getLinksUsuario(user.id),
    getConteos(user.id),
  ])

  const sols: SolicitudConDetalle[] = (solicitudes ?? []) as SolicitudConDetalle[]

  const pubs: PublicacionCardData[] = (publicaciones ?? []).map((p) => ({
    id: p.id,
    titulo: p.titulo,
    resumen: p.resumen,
    tipo: p.tipo,
    nombre_autor: perfil.nombre,
    autor_id: perfil.id,
    creado_en: p.creado_en,
  }))

  return (
    <div className="animate-page flex flex-col gap-10">
      {/* Profile header */}
      <section aria-label="Datos del perfil">
        <div className="flex items-start justify-between gap-4">
          <PerfilView perfil={perfil} esPropio email={user.email ?? undefined} links={links ?? []} />
          <Link
            href="/perfil/ajustes"
            className="shrink-0 inline-flex items-center rounded-md bg-surface text-text border border-border h-8 px-3 text-sm font-medium hover:bg-surface-muted transition-colors"
          >
            Ajustes
          </Link>
        </div>
        <div className="mt-4">
          <PerfilStats
            totalPublicaciones={stats.totalPublicaciones}
            totalEnRevistas={stats.totalEnRevistas}
            totalLikes={stats.totalLikes}
            usuarioId={perfil.id}
            seguidores={conteos?.n_seguidores ?? 0}
            seguidos={conteos?.n_seguidos ?? 0}
          />
        </div>
      </section>

      {/* Solicitations history — collapsed by default (native <details>, no JS) */}
      <details className="group" aria-label="Mis postulaciones">
        <summary className="flex items-center gap-2 cursor-pointer list-none select-none">
          <svg
            className="w-4 h-4 text-text-muted transition-transform group-open:rotate-90"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <h2 className="text-(length:--size-heading-sm) font-normal font-display text-text">
            Mis postulaciones ({sols.length})
          </h2>
        </summary>
        <div className="mt-6">
          <SolicitudesHistorial solicitudes={sols} />
        </div>
      </details>

      {/* Own publications */}
      <section aria-label="Mis publicaciones">
        <h2 className="text-(length:--size-heading-sm) font-normal font-display text-text mb-6">
          Mis publicaciones
        </h2>
        {pubs.length === 0 ? (
          <EmptyState
            title={`Tu portafolio está vacío, ${perfil.nombre}`}
            description="Compartí tu primera obra con la comunidad. Puede ser una investigación, un poema, un dibujo… lo que vos creás."
            action={{ label: 'Publicar mi primera obra', href: '/publicar' }}
          />
        ) : (
          <FeedList publicaciones={pubs} />
        )}
      </section>
    </div>
  )
}
