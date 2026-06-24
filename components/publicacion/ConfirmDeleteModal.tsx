'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { apiClient, ApiError } from '@/lib/api/client'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  onCancel: () => void
  titulo: string
  publicacionId: string
  tieneRevista: boolean
  tieneSolicitudPendiente: boolean
  redirectTo?: string
}

export default function ConfirmDeleteModal({
  isOpen,
  onCancel,
  titulo,
  publicacionId,
  tieneRevista,
  tieneSolicitudPendiente,
  redirectTo = '/perfil',
}: ConfirmDeleteModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      await apiClient(`/api/publicaciones/${publicacionId}`, {
        method: 'DELETE',
      })
      router.push(redirectTo)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo eliminar la publicación. Intentá de nuevo.'
      )
      setLoading(false)
    }
  }

  return (
    <Modal open={isOpen} onClose={onCancel} labelledById="confirm-delete-title">
      <div>
        <h2
          id="confirm-delete-title"
          className="text-base font-semibold text-text mb-3"
        >
          ¿Eliminar &ldquo;{titulo}&rdquo;?
        </h2>

        <p className="text-sm text-text-muted mb-2">
          Esta acción no se puede deshacer. Se perderán los comentarios y likes asociados.
        </p>

        {tieneRevista && (
          <p className="text-sm text-text-muted mb-2">
            Esta obra aparece en una revista publicada y será removida de ella.
          </p>
        )}

        {tieneSolicitudPendiente && (
          <p className="text-sm text-text-muted mb-2">
            Tenés una solicitud pendiente para la revista de esta semana; también se eliminará.
          </p>
        )}

        {error && (
          <p className="text-sm text-danger mt-2 mb-2" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 mt-5">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleConfirm}
            loading={loading}
            disabled={loading}
          >
            Eliminar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
