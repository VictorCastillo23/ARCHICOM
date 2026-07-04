'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { apiClient, ApiError } from '@/lib/api/client'

interface EliminarRevistaButtonProps {
  revistaId: string
  titulo: string
  esBorrador: boolean
}

export default function EliminarRevistaButton({
  revistaId,
  titulo,
  esBorrador,
}: EliminarRevistaButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      await apiClient(`/api/revistas/${revistaId}`, { method: 'DELETE' })
      router.push('/admin/revistas')
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo eliminar la revista. Intenta de nuevo.'
      )
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setIsOpen(true)}>
        Eliminar revista
      </Button>

      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        labelledById="confirm-delete-revista-title"
      >
        <div>
            <h2
              id="confirm-delete-revista-title"
              className="text-base font-semibold text-text mb-3"
            >
              ¿Eliminar &ldquo;{titulo}&rdquo;?
            </h2>

            <p className="text-sm text-text-muted mb-2">
              Esta acción no se puede deshacer. Se eliminarán los artículos curados y
              las solicitudes asociadas a esta revista.
            </p>

            {esBorrador && (
              <p className="text-sm text-text-muted mb-2">
                Es la edición en borrador (activa): al borrarla, no habrá edición del
                mes hasta que el ciclo cree la siguiente.
              </p>
            )}

            {error && (
              <p className="text-sm text-danger mt-2 mb-2" role="alert">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 mt-5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={loading}
              >
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
    </>
  )
}
