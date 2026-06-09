'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import EmptyState from '@/components/ui/EmptyState'
import { ApiError, apiClient } from '@/lib/api/client'
import type { Tag } from '@/lib/types/database'

interface Props {
  initialTags: Tag[]
}

interface EditState {
  nombre: string
  area: string
}

export default function TagsManager({ initialTags }: Props) {
  const router = useRouter()
  const [tags, setTags] = useState<Tag[]>(initialTags)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ nombre: '', area: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Create form state
  const [showCreate, setShowCreate] = useState(false)
  const [newNombre, setNewNombre] = useState('')
  const [newArea, setNewArea] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newNombre.trim() || !newArea.trim()) {
      setCreateError('Nombre y área son requeridos.')
      return
    }
    setCreating(true)
    setCreateError('')
    try {
      const result = await apiClient<{ tag: Tag }>('/api/tags', {
        method: 'POST',
        body: JSON.stringify({ nombre: newNombre.trim(), area: newArea.trim() }),
      })
      setTags((prev) => [...prev, result.tag].sort((a, b) => a.area.localeCompare(b.area) || a.nombre.localeCompare(b.nombre)))
      setNewNombre('')
      setNewArea('')
      setShowCreate(false)
      router.refresh()
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Error al crear el tag.')
    } finally {
      setCreating(false)
    }
  }

  function startEdit(tag: Tag) {
    setEditingId(tag.id)
    setEditState({ nombre: tag.nombre, area: tag.area })
  }

  async function handleSave(tagId: string) {
    if (!editState.nombre.trim() || !editState.area.trim()) return
    setSaving(true)
    try {
      const result = await apiClient<{ tag: Tag }>(`/api/tags/${tagId}`, {
        method: 'PATCH',
        body: JSON.stringify({ nombre: editState.nombre.trim(), area: editState.area.trim() }),
      })
      setTags((prev) =>
        prev
          .map((t) => (t.id === tagId ? result.tag : t))
          .sort((a, b) => a.area.localeCompare(b.area) || a.nombre.localeCompare(b.nombre)),
      )
      setEditingId(null)
      router.refresh()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(tagId: string) {
    setDeletingId(tagId)
    try {
      await apiClient(`/api/tags/${tagId}`, { method: 'DELETE' })
      setTags((prev) => prev.filter((t) => t.id !== tagId))
      router.refresh()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error al eliminar.')
    } finally {
      setDeletingId(null)
    }
  }

  const grouped = tags.reduce<Record<string, Tag[]>>((acc, tag) => {
    if (!acc[tag.area]) acc[tag.area] = []
    acc[tag.area].push(tag)
    return acc
  }, {})

  return (
    <div className="animate-page">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[--color-border]">
        <h1 className="text-[length:var(--size-heading-md)] font-display font-normal">Tags</h1>
        <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Cancelar' : 'Nuevo tag'}
        </Button>
      </div>

      {showCreate && (
        <div className="border border-[--color-border] rounded-[--radius-md] p-4 mb-6 bg-[--color-surface]">
          <form onSubmit={handleCreate} className="flex gap-3 items-end">
            <div className="flex-1">
              <Field
                label="Nombre"
                name="newNombre"
                required
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                placeholder="Ej. Biología molecular"
                error={createError}
              />
            </div>
            <div className="flex-1">
              <Field
                label="Área"
                name="newArea"
                required
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                placeholder="Ej. Biología"
              />
            </div>
            <div className="flex gap-2 pb-[1px]">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowCreate(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" loading={creating}>
                Crear
              </Button>
            </div>
          </form>
        </div>
      )}

      {tags.length === 0 ? (
        <EmptyState title="Sin tags" description="Creá el primer tag del catálogo." />
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped).map(([area, areaTags]) => (
            <div key={area}>
              <h2 className="text-xs font-medium text-[--color-primary] uppercase tracking-widest mb-2 pl-2 border-l-2 border-[--color-primary]">
                {area}
              </h2>
              <div className="border border-[--color-border] rounded-[--radius-md] overflow-hidden">
                {areaTags.map((tag, idx) => {
                  const isEditing = editingId === tag.id
                  const isDeleting = deletingId === tag.id
                  const isLast = idx === areaTags.length - 1

                  return (
                    <div
                      key={tag.id}
                      className={[
                        'flex items-center gap-3 px-4 py-3 bg-[--color-surface]',
                        !isLast ? 'border-b border-[--color-border]' : '',
                      ].join(' ')}
                    >
                      {isEditing ? (
                        <>
                          <input
                            className="flex-1 border border-[--color-border] rounded-[--radius-sm] px-2 py-1 text-sm bg-[--color-surface]"
                            value={editState.nombre}
                            onChange={(e) =>
                              setEditState((s) => ({ ...s, nombre: e.target.value }))
                            }
                            placeholder="Nombre"
                            autoFocus
                          />
                          <input
                            className="w-36 border border-[--color-border] rounded-[--radius-sm] px-2 py-1 text-sm bg-[--color-surface]"
                            value={editState.area}
                            onChange={(e) =>
                              setEditState((s) => ({ ...s, area: e.target.value }))
                            }
                            placeholder="Área"
                          />
                          <Button
                            size="sm"
                            loading={saving}
                            onClick={() => handleSave(tag.id)}
                          >
                            Guardar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                          >
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm font-medium">{tag.nombre}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={editingId !== null || deletingId !== null}
                            onClick={() => startEdit(tag)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            loading={isDeleting}
                            disabled={editingId !== null || deletingId !== null}
                            onClick={() => handleDelete(tag.id)}
                          >
                            Eliminar
                          </Button>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
