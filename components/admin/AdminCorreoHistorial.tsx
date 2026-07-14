'use client'

// Rows already carry every field the detail view needs (the list query
// selects the same columns as GET /api/admin/correos/[id]), so expanding a
// row is a local state toggle — no second network round trip. The [id] route
// stays available for direct API/deep-link use.
import { useState } from 'react'
import Badge, { type BadgeTone } from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import type { CorreoAdminDetalle, EstadoCorreoAdmin } from '@/lib/types/database'

const ESTADO_LABELS: Record<EstadoCorreoAdmin, string> = {
  pendiente: 'Pendiente',
  completado: 'Completado',
  fallido: 'Fallido',
}

const ESTADO_TONES: Record<EstadoCorreoAdmin, BadgeTone> = {
  pendiente: 'warning',
  completado: 'success',
  fallido: 'danger',
}

function describirDestinatarios(correo: CorreoAdminDetalle): string {
  const c = correo.destinatarios_criterio
  if (c.tipo === 'todos') return 'Todos los usuarios'
  if (c.tipo === 'ciudad') return `Ciudad: ${c.valor}`
  if (c.tipo === 'sin_publicacion') return 'Usuarios sin publicaciones'
  return `${c.valor.length} usuario${c.valor.length === 1 ? '' : 's'} específico${c.valor.length === 1 ? '' : 's'}`
}

export default function AdminCorreoHistorial({ correos }: { correos: CorreoAdminDetalle[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (correos.length === 0) {
    return (
      <EmptyState
        title="Sin envíos todavía"
        description="El historial de correos masivos aparecerá aquí."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {correos.map((correo) => {
        const expanded = expandedId === correo.id
        return (
          <div key={correo.id} className="rounded-md border border-border bg-surface">
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : correo.id)}
              aria-expanded={expanded}
              className="w-full flex items-start gap-3 p-4 text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-text truncate">{correo.asunto}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge tone={ESTADO_TONES[correo.estado]}>{ESTADO_LABELS[correo.estado]}</Badge>
                  <span className="text-xs text-text-muted">{describirDestinatarios(correo)}</span>
                </div>
              </div>
              <span className="text-xs text-text-muted shrink-0">
                {new Date(correo.enviado_en).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </button>

            {expanded && (
              <div className="px-4 pb-4 border-t border-border pt-3 flex flex-col gap-2">
                <p className="text-sm text-text whitespace-pre-wrap">{correo.cuerpo}</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-text-muted mt-2">
                  <dt>Enviado por</dt>
                  <dd className="text-text">{correo.admin?.nombre ?? 'Cuenta eliminada'}</dd>
                  <dt>Destinatarios resueltos</dt>
                  <dd className="text-text">{correo.cantidad_destinatarios}</dd>
                  <dt>Entregados</dt>
                  <dd className="text-text">{correo.cantidad_enviados}</dd>
                  <dt>Fallidos</dt>
                  <dd className="text-text">{correo.cantidad_fallidos}</dd>
                </dl>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
