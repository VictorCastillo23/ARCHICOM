import { getPublicacionesRelacionadas } from '@/lib/data/publicaciones'
import PublicacionCard from '@/components/feed/PublicacionCard'
import type { TipoPublicacion } from '@/lib/types/database'

interface PublicacionesRelacionadasProps {
  publicacionId: string
  tagIds: string[]
  tipo: TipoPublicacion
}

export default async function PublicacionesRelacionadas({
  publicacionId,
  tagIds,
  tipo,
}: PublicacionesRelacionadasProps) {
  const relacionadas = await getPublicacionesRelacionadas(publicacionId, tagIds, tipo)

  if (relacionadas.length === 0) return null

  return (
    <section className="mt-12 pt-8 border-t border-border">
      <h2 className="text-(length:--size-heading-sm) font-normal font-display text-text mb-6">
        También te puede interesar
      </h2>
      <div className="flex flex-col gap-4">
        {relacionadas.map((pub) => (
          <PublicacionCard key={pub.id} pub={pub} />
        ))}
      </div>
    </section>
  )
}
