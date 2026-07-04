'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { apiClient, ApiError } from '@/lib/api/client'

interface IndexarButtonProps {
  publicacionId: string
  yaIndexado: boolean
}

export default function IndexarButton({ publicacionId, yaIndexado }: IndexarButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleClick() {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await apiClient(`/api/publicaciones/${publicacionId}/index`, {
        method: 'POST',
      })
      setSuccess(true)
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Error al indexar el documento. Intentá de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" size="sm" loading={loading} onClick={handleClick}>
        {yaIndexado ? 'Reindexar documento' : 'Preparar para preguntas'}
      </Button>
      {success && (
        <p role="status" className="text-sm text-text-muted">
          Documento indexado ✓
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  )
}
