import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getPublicacion } from '@/lib/data/publicaciones'
import { getTags } from '@/lib/data/tags'
import PublicarForm from '@/components/publicar/PublicarForm'
import type { PublicacionTag } from '@/lib/types/database'

export const metadata: Metadata = { title: 'Editar publicación' }

interface EditarPublicacionPageProps {
  params: Promise<{ id: string }>
}

export default async function EditarPublicacionPage({ params }: EditarPublicacionPageProps) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data, error } = await getPublicacion(id)
  if (error || !data) notFound()

  // Owner-only. RLS (editar_propio) is the real guard on write; this just keeps
  // a non-author out of the edit UI / SSR prefill.
  if (data.autor_id !== user.id) notFound()

  const { data: tags } = await getTags()

  const initialTagIds = (data.publicacion_tag ?? []).map((pt: PublicacionTag) => pt.tag_id)

  return (
    <div className="animate-page max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-(length:--size-heading-lg) font-normal font-display text-text leading-tight">
          Editar publicación
        </h1>
        <p className="mt-2 text-sm text-text-muted">Actualiza los datos de tu publicación.</p>
      </div>
      <section
        aria-label="Formulario de edición"
        className="border border-border rounded-lg p-6 bg-surface"
      >
        <PublicarForm
          tags={tags ?? []}
          publicacionId={id}
          lockTipo
          initialTagIds={initialTagIds}
          initialValues={{
            titulo: data.titulo,
            resumen: data.resumen,
            tipo: data.tipo,
            obraAutorExterno: data.obra_autor_externo ?? '',
            urlExterna: data.url_externa ?? '',
            archivoUrl: data.archivo_url ?? undefined,
            archivoThumbnailUrl: data.archivo_thumbnail_url ?? undefined,
          }}
        />
      </section>
    </div>
  )
}
