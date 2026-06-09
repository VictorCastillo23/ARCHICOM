import Link from 'next/link'
import { getRevistas } from '@/lib/data/revistas'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'

function truncate(text: string, maxLen = 200): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen).trimEnd() + '…'
}

export default async function RevistasPage() {
  const { data: revistas } = await getRevistas({ estado: 'publicada' })

  if (!revistas || revistas.length === 0) {
    return (
      <div className="animate-page">
        <h1 className="text-[length:var(--size-heading-lg)] font-normal font-display text-[--color-text] leading-tight mb-8">
          Revistas
        </h1>
        <EmptyState
          title="Sin revistas publicadas"
          description="Todavía no hay revistas publicadas. Volvé pronto."
        />
      </div>
    )
  }

  return (
    <div className="animate-page">
      <div className="mb-8">
        <h1 className="text-[length:var(--size-heading-lg)] font-normal font-display text-[--color-text] leading-tight">
          Revistas
        </h1>
        <p className="mt-2 text-sm text-[--color-text-muted]">
          Ediciones semanales de la comunidad.
        </p>
      </div>

      <ul className="animate-stagger grid grid-cols-1 md:grid-cols-2 gap-6 list-none p-0">
        {revistas.map((revista) => (
          <li key={revista.id}>
            <Card as="article" className="hover:shadow-md transition-shadow h-full">
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <Badge tone="info">
                    {revista.volumen ? `Vol. ${revista.volumen}` : 'Publicada'}
                  </Badge>
                </div>

                <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display">
                  <Link
                    href={`/revistas/${revista.id}`}
                    className="text-[--color-text] hover:text-[--color-primary] transition-colors"
                  >
                    {revista.titulo}
                  </Link>
                </h2>

                {revista.descripcion && (
                  <p className="text-sm text-[--color-text-muted] leading-relaxed">
                    {truncate(revista.descripcion)}
                  </p>
                )}

              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
