'use client'

import { useId } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { LIMITE_DESTINATARIOS } from '@/lib/validation/correoAdmin'

export interface AdminCorreoPreviewProps {
  open: boolean
  asunto: string
  cuerpo: string
  cantidad: number
  sending: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function AdminCorreoPreview({
  open,
  asunto,
  cuerpo,
  cantidad,
  sending,
  onConfirm,
  onClose,
}: AdminCorreoPreviewProps) {
  const titleId = useId()
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
