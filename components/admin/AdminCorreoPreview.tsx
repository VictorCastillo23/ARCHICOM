'use client'

import { useId, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { LIMITE_DESTINATARIOS } from '@/lib/validation/correoAdmin'
import type { DestinatarioResuelto } from '@/lib/types/database'

export interface AdminCorreoPreviewProps {
  open: boolean
  asunto: string
  cuerpo: string
  cantidad: number
  destinatarios: DestinatarioResuelto[]
  sending: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function AdminCorreoPreview({
  open,
  asunto,
  cuerpo,
  cantidad,
  destinatarios,
  sending,
  onConfirm,
  onClose,
}: AdminCorreoPreviewProps) {
  const titleId = useId()
  const listId = useId()
  const [listaAbierta, setListaAbierta] = useState(false)
  const excedeLimite = cantidad > LIMITE_DESTINATARIOS

  return (
    <Modal open={open} onClose={onClose} labelledById={titleId} className="max-w-lg">
      <h2 id={titleId} className="text-(length:--size-heading-sm) font-normal font-display text-text">
        Vista previa
      </h2>

      <div className="mt-4 rounded-md border border-border bg-surface-muted p-4">
        <p className="text-sm font-medium text-text">{asunto}</p>
        <p className="mt-2 text-sm text-text whitespace-pre-wrap">{cuerpo}</p>
      </div>

      <p className="mt-4 text-sm text-text" aria-live="polite">
        {excedeLimite ? (
          <span className="text-danger">
            Se resolvieron {cantidad} destinatarios — supera el máximo de {LIMITE_DESTINATARIOS} por envío.
          </span>
        ) : (
          <>
            ¿Enviar a <strong>{cantidad}</strong> {cantidad === 1 ? 'usuario' : 'usuarios'}? No se
            puede deshacer.
          </>
        )}
      </p>

      {cantidad > 0 && (
        <div className="mt-3">
          <button
            type="button"
            aria-expanded={listaAbierta}
            aria-controls={listId}
            onClick={() => setListaAbierta((v) => !v)}
            className="text-sm font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded"
          >
            {listaAbierta ? 'Ocultar' : 'Ver'} lista de destinatarios ({cantidad})
          </button>

          {listaAbierta && (
            <ul
              id={listId}
              className="mt-2 max-h-48 overflow-y-auto rounded-md border border-border divide-y divide-border list-none m-0"
            >
              {destinatarios.map((d) => (
                <li key={d.id} className="px-3 py-1.5 text-sm">
                  <span className="text-text">{d.nombre}</span>{' '}
                  <span className="text-text-muted">({d.email})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={sending}>
          Cancelar
        </Button>
        <Button onClick={onConfirm} loading={sending} disabled={excedeLimite}>
          Confirmar envío
        </Button>
      </div>
    </Modal>
  )
}
