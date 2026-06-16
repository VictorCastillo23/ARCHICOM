'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

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
      const res = await fetch(`/api/revistas/${revistaId}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error?.message ?? 'No se pudo eliminar la revista.')
        setLoading(false)
        return
      }
      router.push('/admin/revistas')
    } catch {
      setError('Error de red. Intentá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setIsOpen(true)}>
        Eliminar revista
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-revista-title"
        >
          <div className="w-full max-w-md rounded-[--radius-lg] border border-[--color-border] bg-[--color-surface] p-6 shadow-lg">
            <h2
              id="confirm-delete-revista-title"
              className="text-base font-semibold text-[--color-text] mb-3"
            >
              ¿Eliminar &ldquo;{titulo}&rdquo;?
            </h2>

            <p className="text-sm text-[--color-text-muted] mb-2">
              Esta acción no se puede deshacer. Se eliminarán los artículos curados y
              las solicitudes asociadas a esta revista.
            </p>

            {esBorrador && (
              <p className="text-sm text-[--color-text-muted] mb-2">
                Es la edición en borrador (activa): al borrarla, no habrá edición de la
                semana hasta que el ciclo cree la siguiente.
              </p>
            )}

            {error && (
              <p className="text-sm text-red-600 mt-2 mb-2" role="alert">
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
        </div>
      )}
    </>
  )
}
