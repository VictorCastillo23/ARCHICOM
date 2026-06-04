'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Badge from '@/components/ui/Badge'
import { ApiError, apiClient } from '@/lib/api/client'
import type { RevistaDetalle } from '@/lib/types/database'

interface Props {
  revista: RevistaDetalle
}

export default function RevistaPatchForm({ revista }: Props) {
  const router = useRouter()
  const [titulo, setTitulo] = useState(revista.titulo)
  const [volumen, setVolumen] = useState(revista.volumen?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [publishError, setPublishError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) {
      setSaveError('El título es requerido.')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      await apiClient(`/api/revistas/${revista.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          titulo: titulo.trim(),
          volumen: volumen ? Number(volumen) : undefined,
        }),
      })
      router.refresh()
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    setPublishing(true)
    setPublishError('')
    try {
      await apiClient(`/api/revistas/${revista.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: 'publicada' }),
      })
      router.refresh()
    } catch (err) {
      setPublishError(err instanceof ApiError ? err.message : 'Error al publicar.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Card className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-medium flex-1">Datos de la revista</h2>
        <Badge tone={revista.estado === 'publicada' ? 'success' : 'neutral'}>
          {revista.estado}
        </Badge>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Field
              label="Título"
              name="titulo"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              error={saveError}
            />
          </div>
          <div className="w-28">
            <Field
              label="Volumen"
              name="volumen"
              type="number"
              min={1}
              value={volumen}
              onChange={(e) => setVolumen(e.target.value)}
              placeholder="1"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" loading={saving}>
            Guardar
          </Button>

          {revista.estado === 'borrador' && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={publishing}
                onClick={handlePublish}
              >
                Publicar revista
              </Button>
              {publishError && (
                <p className="text-sm text-[--color-danger]">{publishError}</p>
              )}
            </>
          )}

          {revista.estado === 'publicada' && revista.publicada_en && (
            <p className="text-xs text-[--color-text-muted]">
              Publicada el{' '}
              {new Date(revista.publicada_en).toLocaleDateString('es-AR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
        </div>
      </form>
    </Card>
  )
}
