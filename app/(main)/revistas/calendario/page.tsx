import type { Metadata } from 'next'
import Link from 'next/link'
import { getRevista, getRevistaActiva } from '@/lib/data/revistas'
import { buttonClasses } from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'

export const metadata: Metadata = {
  title: 'Calendario editorial',
  description:
    'Cómo funciona el ciclo mensual de revistas de Vitrina: apertura, postulaciones y curación.',
}

const CICLO_ETAPAS = [
  {
    n: 1,
    titulo: 'Apertura y publicación',
    desc:
      'Al inicio de cada mes se publica la edición anterior y se abre una nueva edición en preparación.',
  },
  {
    n: 2,
    titulo: 'Postulaciones abiertas',
    desc:
      'Los autores postulan sus obras a la edición en preparación hasta el día 25 del mes.',
  },
  {
    n: 3,
    titulo: 'Curación editorial',
    desc:
      'Del día 26 al fin de mes, el equipo editorial revisa las postulaciones y arma la edición.',
  },
] as const

export default async function CalendarioRevistasPage() {
  const { data: activa, error: errorActiva } = await getRevistaActiva()

  let obrasCuradas: number | null = null
  if (activa && !errorActiva) {
    const { data: detalle } = await getRevista(activa.id)
    obrasCuradas = detalle?.revista_articulo?.length ?? 0
  }

  const mostrarEdicionActiva = Boolean(activa) && !errorActiva

  return (
    <div className="animate-page">
      <div className="mb-8">
        <h1 className="text-(length:--size-heading-lg) font-normal font-display text-text leading-tight">
          Calendario editorial
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Así funciona el ciclo mensual de las revistas temáticas.
        </p>
      </div>

      <section className="mb-10">
        <ol className="animate-stagger grid grid-cols-1 md:grid-cols-3 gap-6 list-none p-0">
          {CICLO_ETAPAS.map((etapa) => (
            <li key={etapa.n}>
              <Card as="article" className="h-full">
                <div className="flex items-start gap-3 mb-3">
                  <Badge tone="neutral">Paso {etapa.n}</Badge>
                </div>
                <h2 className="text-(length:--size-heading-sm) font-normal font-display text-text mb-2">
                  {etapa.titulo}
                </h2>
                <p className="text-sm text-text-muted leading-relaxed">{etapa.desc}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-10 max-w-2xl">
        <h2 className="text-(length:--size-heading-sm) font-normal font-display text-text mb-4">
          Edición actual
        </h2>

        {mostrarEdicionActiva && activa ? (
          <Card as="section">
            <div className="flex items-center gap-3 mb-3">
              <Badge tone="info">Edición en preparación</Badge>
              <span className="text-xs font-medium uppercase tracking-widest text-text-muted">
                {activa.volumen ? `Vol. ${activa.volumen}` : 'Volumen pendiente'}
              </span>
            </div>
            <h3 className="text-base font-normal font-display text-text mb-2">
              {activa.titulo}
            </h3>
            <p className="text-sm text-text-muted">
              {obrasCuradas === 0
                ? 'Aún sin obras curadas.'
                : `${obrasCuradas} ${obrasCuradas === 1 ? 'obra curada' : 'obras curadas'}.`}
            </p>
          </Card>
        ) : (
          <Card as="section" className="text-text-muted">
            <p className="text-sm">
              No hay ninguna edición abierta en este momento. Vuelve pronto.
            </p>
          </Card>
        )}
      </section>

      <Link href="/revistas" className={buttonClasses({ variant: 'secondary' })}>
        Ver revistas publicadas
      </Link>
    </div>
  )
}
