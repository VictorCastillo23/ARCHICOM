import Link from 'next/link'
import { getRevistas } from '@/lib/data/revistas'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'

export default async function RevistasPage() {
  const { data: revistas } = await getRevistas({ estado: 'publicada' })

  if (!revistas || revistas.length === 0) {
    return (
      <div className="animate-page">
        <h1 className="text-(length:--size-heading-lg) font-normal font-display text-text leading-tight mb-8">
          Revistas
        </h1>
        <EmptyState
          title="Sin revistas publicadas"
          description="Todavía no hay revistas publicadas. Vuelve pronto."
        />
      </div>
    )
  }

  return (
    <div className="animate-page">
      <div className="mb-8">
        <h1 className="text-(length:--size-heading-lg) font-normal font-display text-text leading-tight">
          Revistas
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Ediciones mensuales de la comunidad.
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

                <h2 className="text-(length:--size-heading-sm) font-normal font-display">
                  <Link
                    href={`/revistas/${revista.id}`}
                    className="text-text hover:text-primary transition-colors"
                  >
                    {revista.titulo}
                  </Link>
                </h2>

              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
