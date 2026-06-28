'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { ApiError, apiClient } from '@/lib/api/client'
import type { EstadoSolicitud } from '@/lib/types/database'

interface Props {
  publicacionId: string
  isAuthor: boolean
  revistaActiva: { id: string; titulo: string } | null
  solicitudExistente: { id: string; estado: EstadoSolicitud } | null
}

const estadoTone: Record<EstadoSolicitud, 'neutral' | 'success' | 'danger'> = {
  pendiente: 'neutral',
  aceptada: 'success',
  rechazada: 'danger',
  retirada: 'danger',
}

export default function SolicitarRevistaButton({
  publicacionId,
  isAuthor,
  revistaActiva,
  solicitudExistente,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isAuthor) return null

  if (!revistaActiva) {
    return (
      <p className="text-sm text-text-muted">No hay una revista abierta este mes.</p>
    )
  }

  if (solicitudExistente) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-muted">Postulación:</span>
        <Badge tone={estadoTone[solicitudExistente.estado]}>{solicitudExistente.estado}</Badge>
      </div>
    )
  }

  async function handlePostular() {
    setLoading(true)
    setError('')
    try {
      await apiClient('/api/solicitudes', {
        method: 'POST',
        body: JSON.stringify({ publicacion_id: publicacionId }),
      })
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('Ya postulaste esta obra a la edición de este mes.')
        } else if (err.status === 404) {
          setError('No hay una revista abierta este mes.')
        } else {
          setError(err.message)
        }
      } else {
        setError('Error al postular.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button size="sm" loading={loading} onClick={handlePostular}>
        Postular a {revistaActiva.titulo}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
