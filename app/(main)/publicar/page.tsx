import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTags } from '@/lib/data/tags'
import PublicarForm from '@/components/publicar/PublicarForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Nueva publicación' }

export default async function PublicarPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: tags } = await getTags()

  return (
    <div className="animate-page max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-(length:--size-heading-lg) font-normal font-display text-text leading-tight">
          Nueva publicación
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Compartí tu trabajo con la comunidad.
        </p>
      </div>
      <section
        aria-label="Formulario de publicación"
        className="border border-border rounded-lg p-6 bg-surface"
      >
        <PublicarForm tags={tags ?? []} />
      </section>
    </div>
  )
}
