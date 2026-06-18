'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import { ApiError, apiClient } from '@/lib/api/client'
import { MOTIVOS_REPORTE } from '@/lib/types/database'
import type { MotivoReporte } from '@/lib/types/database'

const MOTIVO_LABELS: Record<MotivoReporte, string> = {
  contenido_inapropiado: 'Contenido inapropiado',
  plagio: 'Plagio',
  spam: 'Spam',
  otro: 'Otro',
}

interface ReportarButtonProps {
  publicacionId: string
  isAuthenticated: boolean
}

export default function ReportarButton({
  publicacionId,
  isAuthenticated,
}: ReportarButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [motivo, setMotivo] = useState<MotivoReporte>(MOTIVOS_REPORTE[0])
  const [detalle, setDetalle] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isAuthenticated) return null

  function handleOpen() {
    setMotivo(MOTIVOS_REPORTE[0])
    setDetalle('')
    setSuccessMsg(null)
    setNoticeMsg(null)
    setErrorMsg(null)
    setIsOpen(true)
  }

  function handleClose() {
    setIsOpen(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setNoticeMsg(null)
    setSuccessMsg(null)

    try {
      await apiClient('/api/reportes', {
        method: 'POST',
        body: JSON.stringify({
          publicacion_id: publicacionId,
          motivo,
          detalle: detalle.trim() || undefined,
        }),
      })
      setSuccessMsg('Gracias, recibimos tu reporte.')
      // Close after a brief moment so the user sees the confirmation
      setTimeout(() => setIsOpen(false), 1500)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Not a real error: the user already reported this publication.
        setNoticeMsg('Ya habías reportado esta publicación. ¡Gracias!')
        setTimeout(() => setIsOpen(false), 1500)
      } else {
        setErrorMsg('No se pudo enviar el reporte. Intentá de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="text-xs text-text-muted hover:text-danger transition-colors underline-offset-2 hover:underline"
      >
        Reportar publicación
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reportar-title"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-lg">
            <h2
              id="reportar-title"
              className="text-base font-semibold text-text mb-4"
            >
              Reportar publicación
            </h2>

            {successMsg || noticeMsg ? (
              <p className="text-sm text-text-muted" role="status">
                {successMsg ?? noticeMsg}
              </p>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label
                    htmlFor="motivo-select"
                    className="block text-sm font-medium text-text mb-1"
                  >
                    Motivo <span className="text-danger">*</span>
                  </label>
                  <select
                    id="motivo-select"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value as MotivoReporte)}
                    className="w-full rounded-sm border border-border bg-surface-muted px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    {MOTIVOS_REPORTE.map((m) => (
                      <option key={m} value={m}>
                        {MOTIVO_LABELS[m]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label
                    htmlFor="detalle-textarea"
                    className="block text-sm font-medium text-text mb-1"
                  >
                    Detalle{' '}
                    <span className="text-text-muted font-normal">(opcional)</span>
                  </label>
                  <textarea
                    id="detalle-textarea"
                    value={detalle}
                    onChange={(e) => setDetalle(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Describí brevemente el problema…"
                    className="w-full rounded-sm border border-border bg-surface-muted px-3 py-2 text-sm text-text resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-text-muted mt-0.5 text-right">
                    {detalle.length}/500
                  </p>
                </div>

                {errorMsg && (
                  <p className="text-sm text-danger mb-3" role="alert">
                    {errorMsg}
                  </p>
                )}

                <div className="flex justify-end gap-3 mt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    type="submit"
                    loading={loading}
                    disabled={loading}
                  >
                    Enviar reporte
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
