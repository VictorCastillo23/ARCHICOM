'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import EmptyState from '@/components/ui/EmptyState'
import { ApiError, apiClient } from '@/lib/api/client'
import type { RevistaConEditor } from '@/lib/data/revistas'

interface Props {
  revistas: RevistaConEditor[]
}

export default function RevistasListClient({ revistas }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [volumen, setVolumen] = useState('')
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) {
      setFormError('El título es requerido.')
      return
    }
    setCreating(true)
    setFormError('')
    try {
      await apiClient('/api/revistas', {
        method: 'POST',
        body: JSON.stringify({
          titulo: titulo.trim(),
          volumen: volumen ? Number(volumen) : undefined,
        }),
      })
      setTitulo('')
      setVolumen('')
      setShowForm(false)
      router.refresh()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Error al crear la revista.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Revistas</h1>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : 'Nueva revista'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <h2 className="font-medium">Nueva revista</h2>
            <div className="flex gap-4">
              <div className="flex-1">
                <Field
                  label="Título"
                  name="titulo"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej. Ciencia y Territorio"
                  error={formError}
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
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" loading={creating}>
                Crear
              </Button>
            </div>
          </form>
        </Card>
      )}

      {revistas.length === 0 ? (
        <EmptyState
          title="Sin revistas"
          description="Creá la primera revista para empezar."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {revistas.map((rev) => (
            <Link key={rev.id} href={`/admin/revistas/${rev.id}`} className="block group">
              <Card className="group-hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-medium truncate">{rev.titulo}</h2>
                    {rev.volumen && (
                      <p className="text-sm text-[--color-text-muted]">Vol. {rev.volumen}</p>
                    )}
                    {rev.editor && (
                      <p className="text-xs text-[--color-text-muted] mt-0.5">
                        Editor: {rev.editor.nombre}
                      </p>
                    )}
                  </div>
                  <Badge tone={rev.estado === 'publicada' ? 'success' : 'neutral'}>
                    {rev.estado}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
