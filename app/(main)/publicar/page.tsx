import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PublicarForm from '@/components/publicar/PublicarForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Nueva publicación' }

export default async function PublicarPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="animate-page max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-[length:var(--size-heading-lg)] font-normal font-display text-[--color-text] leading-tight">
          Nueva publicación
        </h1>
        <p className="mt-2 text-sm text-[--color-text-muted]">
          Compartí tu trabajo con la comunidad.
        </p>
      </div>
      <section
        aria-label="Formulario de publicación"
        className="border border-[--color-border] rounded-[--radius-lg] p-6 bg-[--color-surface]"
      >
        <PublicarForm />
      </section>
    </div>
  )
}
