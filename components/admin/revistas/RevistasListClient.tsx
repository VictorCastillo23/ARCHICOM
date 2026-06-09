'use client'

import Link from 'next/link'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import type { Revista } from '@/lib/types/database'

interface Props {
  revistas: Revista[]
}

export default function RevistasListClient({ revistas }: Props) {
  return (
    <div className="animate-page">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[--color-border]">
        <h1 className="text-[length:var(--size-heading-md)] font-display font-normal">Revistas</h1>
      </div>

      {revistas.length === 0 ? (
        <EmptyState
          title="Sin revistas"
          description="Todavía no hay revistas. La primera edición se abrirá automáticamente."
        />
      ) : (
        <div className="flex flex-col gap-3 animate-stagger">
          {revistas.map((rev) => {
            const isActiva = rev.estado === 'borrador'
            return (
              <Link key={rev.id} href={`/admin/revistas/${rev.id}`} className="block group">
                <Card
                  className={`group-hover:shadow-md transition-shadow border-l-4 ${
                    isActiva
                      ? 'border-l-[--color-primary]'
                      : 'border-l-transparent group-hover:border-l-[--color-primary]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-display font-normal text-[length:var(--size-heading-sm)] truncate">
                        {rev.titulo}
                      </h2>
                      {rev.volumen && (
                        <p className="text-sm text-[--color-text-muted]">Vol. {rev.volumen}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isActiva && (
                        <Badge tone="accent">Edición activa</Badge>
                      )}
                      <Badge tone={rev.estado === 'publicada' ? 'success' : 'neutral'}>
                        {rev.estado}
                      </Badge>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
