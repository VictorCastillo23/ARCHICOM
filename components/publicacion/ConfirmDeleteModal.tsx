'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  onCancel: () => void
  titulo: string
  publicacionId: string
  tieneRevista: boolean
  tieneSolicitudPendiente: boolean
}

export default function ConfirmDeleteModal({
  isOpen,
  onCancel,
  titulo,
  publicacionId,
  tieneRevista,
  tieneSolicitudPendiente,
}: ConfirmDeleteModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/publicaciones/${publicacionId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error?.message ?? 'No se pudo eliminar la publicación.')
        setLoading(false)
        return
      }
      router.push('/perfil')
    } catch {
      setError('Error de red. Intentá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
    >
      <div className="w-full max-w-md rounded-[--radius-lg] border border-[--color-border] bg-[--color-surface] p-6 shadow-lg">
        <h2
          id="confirm-delete-title"
          className="text-base font-semibold text-[--color-text] mb-3"
        >
          ¿Eliminar &ldquo;{titulo}&rdquo;?
        </h2>

        <p className="text-sm text-[--color-text-muted] mb-2">
          Esta acción no se puede deshacer. Se perderán los comentarios y likes asociados.
        </p>

        {tieneRevista && (
          <p className="text-sm text-[--color-text-muted] mb-2">
            Esta obra aparece en una revista publicada y será removida de ella.
          </p>
        )}

        {tieneSolicitudPendiente && (
          <p className="text-sm text-[--color-text-muted] mb-2">
            Tenés una solicitud pendiente para la revista de esta semana; también se eliminará.
          </p>
        )}

        {error && (
          <p className="text-sm text-red-600 mt-2 mb-2" role="alert">
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
    </div>
  )
}
