import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getRevista } from '@/lib/data/revistas'
import RevistaPatchForm from '@/components/admin/revistas/RevistaPatchForm'
import ArticulosList from '@/components/admin/revistas/ArticulosList'
import SolicitudesList from '@/components/admin/revistas/SolicitudesList'
type Props = { params: Promise<{ id: string }> }

export async function generateMetadata(props: Props) {
  const { id } = await props.params
  const { data } = await getRevista(id)
  return { title: data ? `${data.titulo} — Admin` : 'Revista — Admin' }
}

export default async function RevistaDetailPage(props: Props) {
  const { id } = await props.params
  const { data: revista } = await getRevista(id)

  if (!revista) notFound()

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/revistas"
          className="text-sm text-[--color-text-muted] hover:text-[--color-primary] transition-colors"
        >
          ← Revistas
        </Link>
        <h1 className="text-2xl font-semibold mt-1">{revista.titulo}</h1>
      </div>

      <RevistaPatchForm revista={revista} />

      <ArticulosList
        revistaId={revista.id}
        articulos={revista.revista_articulo ?? []}
      />

      <SolicitudesList revistaId={revista.id} />
    </div>
  )
}
