import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/data/perfil'
import { getLinksUsuario } from '@/lib/data/links'
import PerfilEditForm from '@/components/perfil/PerfilEditForm'
import ChangePasswordForm from '@/components/perfil/ChangePasswordForm'
import LinksEditor from '@/components/perfil/LinksEditor'

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
