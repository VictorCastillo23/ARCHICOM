import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPerfil, getPreferenciasNotificacion } from '@/lib/data/perfil'
import { getLinksUsuario } from '@/lib/data/links'
import PerfilEditForm from '@/components/perfil/PerfilEditForm'
import ChangePasswordForm from '@/components/perfil/ChangePasswordForm'
import LinksEditor from '@/components/perfil/LinksEditor'
import NotificacionesForm from '@/components/perfil/NotificacionesForm'
import ErrorState from '@/components/ui/ErrorState'

export const metadata = { title: 'Ajustes — Vitrina' }

export default async function AjustesPage() {
  // Defensive redirect — proxy.ts already guards /perfil* (prefix match)
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

  const { data: links } = await getLinksUsuario(user.id)
  const { data: notifEmailHabilitado, error: notifError } = await getPreferenciasNotificacion()

  if (notifError) {
    // Never default a privacy preference to `true` on a failed read — that
    // silently re-enables emails the user may have opted out of. Surface the
    // failure instead of guessing (matches usuario/[id]/page.tsx's
    // if (error) return <ErrorState/> convention for getPerfil).
    console.error('[perfil/ajustes] getPreferenciasNotificacion', notifError)
  }

  return (
    <div className="animate-page flex flex-col gap-10">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <Link
          href="/perfil"
          className="text-xs uppercase tracking-wider text-text-muted hover:text-primary transition-colors self-start"
        >
          ← Volver al perfil
        </Link>
        <h1 className="text-(length:--size-heading-md) font-normal font-display text-text">
          Ajustes de cuenta
        </h1>
      </header>

      {/* Edit profile */}
      <section
        aria-label="Editar perfil"
        className="border border-border rounded-lg p-6 bg-surface"
      >
        <PerfilEditForm
          perfil={{
            nombre: perfil.nombre,
            institucion: perfil.institucion,
            carrera: perfil.carrera,
            ciudad: perfil.ciudad,
          }}
        />
      </section>

      {/* Links management */}
      <section
        aria-label="Mis enlaces"
        className="border border-border rounded-lg p-6 bg-surface"
      >
        <LinksEditor initialLinks={links ?? []} />
      </section>

      {/* Notification preferences */}
      <section
        aria-label="Notificaciones"
        className="border border-border rounded-lg p-6 bg-surface"
      >
        {notifError || notifEmailHabilitado === null ? (
          <ErrorState
            title="No se pudo cargar tu preferencia de notificaciones"
            description="Intenta de nuevo más tarde."
          />
        ) : (
          <NotificacionesForm perfil={{ notif_email_habilitado: notifEmailHabilitado }} />
        )}
      </section>

      {/* Security — lowest frequency, last */}
      <section
        aria-label="Seguridad"
        className="border border-border rounded-lg p-6 bg-surface"
      >
        <ChangePasswordForm />
      </section>
    </div>
  )
}
