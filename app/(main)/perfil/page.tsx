import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/data/perfil'
import { getMisPublicaciones } from '@/lib/data/publicaciones'
import { getMisSolicitudes } from '@/lib/data/solicitudes'
import PerfilView from '@/components/perfil/PerfilView'
import PerfilEditForm from '@/components/perfil/PerfilEditForm'
import FeedList from '@/components/feed/FeedList'
import MisSolicitudes from '@/components/perfil/MisSolicitudes'
import EmptyState from '@/components/ui/EmptyState'
import type { PublicacionCardData, SolicitudRevistaDetalle } from '@/lib/types/database'

export const metadata = { title: 'Mi perfil — Archicom' }

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

  const { data: publicaciones } = await getMisPublicaciones(user.id)
  const { data: solicitudes } = await getMisSolicitudes(user.id)

  const sols: SolicitudRevistaDetalle[] = (solicitudes ?? [])

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
      {/* Profile header — PerfilView already has font fixes from Phase 2 */}
      <section aria-label="Datos del perfil">
        <PerfilView perfil={perfil} esPropio />
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

      {/* Own publications */}
      <section aria-label="Mis publicaciones">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-[--color-text] mb-6">
          Mis publicaciones
        </h2>
        {pubs.length === 0 ? (
          <EmptyState
            title="Todavía no publicaste nada"
            description="Compartí tu trabajo con la comunidad."
            action={{ label: 'Publicar ahora', href: '/publicar' }}
          />
        ) : (
          <FeedList publicaciones={pubs} />
        )}
      </section>

      <section aria-label="Mis solicitudes">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-[--color-text] mb-6">
          Mis solicitudes
        </h2>
        <MisSolicitudes solicitudes={sols} />
      </section>
    </div>
  )
}
