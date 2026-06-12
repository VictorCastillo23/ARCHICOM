import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPerfil, getPerfilStats } from '@/lib/data/perfil'
import { getMisPublicaciones } from '@/lib/data/publicaciones'
import { getMisSolicitudes } from '@/lib/data/solicitudes'
import PerfilView from '@/components/perfil/PerfilView'
import PerfilEditForm from '@/components/perfil/PerfilEditForm'
import PerfilStats from '@/components/perfil/PerfilStats'
import FeedList from '@/components/feed/FeedList'
import SolicitudesHistorial from '@/components/perfil/SolicitudesHistorial'
import EmptyState from '@/components/ui/EmptyState'
import type { PublicacionCardData, SolicitudConDetalle } from '@/lib/types/database'

export const metadata = { title: 'Mi perfil — Es Vitrina' }

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
  ] = await Promise.all([
    getMisPublicaciones(user.id),
    getMisSolicitudes(user.id),
    getPerfilStats(user.id),
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
        <PerfilView perfil={perfil} esPropio email={user.email ?? undefined} />
        <div className="mt-4">
          <PerfilStats
            totalPublicaciones={stats.totalPublicaciones}
            totalEnRevistas={stats.totalEnRevistas}
            totalLikes={stats.totalLikes}
          />
        </div>
      </section>

      {/* Edit form */}
      <section
        aria-label="Editar perfil"
        className="border border-[--color-border] rounded-[--radius-lg] p-6 bg-[--color-surface]"
      >
        <PerfilEditForm
          perfil={{
            nombre: perfil.nombre,
            institucion: perfil.institucion,
            carrera: perfil.carrera,
          }}
        />
      </section>

      {/* Solicitations history */}
      <section aria-label="Mis postulaciones">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-[--color-text] mb-6">
          Mis postulaciones ({sols.length})
        </h2>
        <SolicitudesHistorial solicitudes={sols} />
      </section>

      {/* Own publications */}
      <section aria-label="Mis publicaciones">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-[--color-text] mb-6">
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
