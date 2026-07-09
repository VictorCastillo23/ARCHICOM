'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import { apiClient, ApiError } from '@/lib/api/client'
import type { Coleccion, VisibilidadColeccion } from '@/lib/types/database'

export interface ColeccionCardProps {
  coleccion: Coleccion
}

const VISIBILIDAD_LABELS: Record<VisibilidadColeccion, string> = {
  publica: 'Pública',
  privada: 'Privada',
}

/**
 * Owner card for /perfil/colecciones: view + inline edit (titulo/descripcion/
 * visibilidad) + delete (confirm modal, mirrors ConfirmDeleteModal's shape).
 * Self-contained: owns its own local state so the page above stays a plain
 * Server Component (same split as LinkRow / useLinks, minus the shared hook
 * since a single card doesn't need list-level state like reordering).
 */
export default function ColeccionCard({ coleccion: initial }: ColeccionCardProps) {
  const router = useRouter()
  const [coleccion, setColeccion] = useState<Coleccion>(initial)
  const [isDeleted, setIsDeleted] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [titulo, setTitulo] = useState(initial.titulo)
  const [descripcion, setDescripcion] = useState(initial.descripcion ?? '')
  const [visibilidad, setVisibilidad] = useState<VisibilidadColeccion>(initial.visibilidad)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function startEdit() {
    setTitulo(coleccion.titulo)
    setDescripcion(coleccion.descripcion ?? '')
    setVisibilidad(coleccion.visibilidad)
    setSaveError(null)
    setIsEditing(true)
  }

  function cancelEdit() {
    setIsEditing(false)
    setSaveError(null)
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmedTitulo = titulo.trim()
    if (!trimmedTitulo) {
      setSaveError('El título no puede estar vacío.')
      return
    }

    setSaving(true)
    setSaveError(null)

    try {
      const updated = await apiClient<Coleccion>(
        `/api/colecciones/${encodeURIComponent(coleccion.id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            titulo: trimmedTitulo,
            descripcion: descripcion.trim() || null,
            visibilidad,
          }),
        }
      )
      setColeccion(updated)
      setIsEditing(false)
      router.refresh()
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : 'No se pudo actualizar la colección.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)

    try {
      await apiClient(`/api/colecciones/${encodeURIComponent(coleccion.id)}`, {
        method: 'DELETE',
      })
      // Optimistic local hide — router.refresh() re-syncs the SSR list, but the
      // card disappears immediately instead of waiting on the RSC round trip.
      setIsDeleted(true)
      router.refresh()
    } catch (err) {
      setDeleteError(
        err instanceof ApiError ? err.message : 'No se pudo eliminar la colección.'
      )
      setDeleting(false)
    }
  }

  if (isDeleted) return null

  if (isEditing) {
    return (
      <li className="flex flex-col gap-3 p-4 border border-border rounded-md bg-surface">
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Field
            label="Título"
            name={`coleccion-titulo-${coleccion.id}`}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={100}
            required
            disabled={saving}
          />
          <Field
            label="Descripción"
            name={`coleccion-descripcion-${coleccion.id}`}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={500}
            multiline
            disabled={saving}
            placeholder="Opcional"
          />
          <div>
            <label
              htmlFor={`coleccion-visibilidad-${coleccion.id}`}
              className="block text-sm font-medium text-text mb-1"
            >
              Visibilidad
            </label>
            <select
              id={`coleccion-visibilidad-${coleccion.id}`}
              value={visibilidad}
              onChange={(e) => setVisibilidad(e.target.value as VisibilidadColeccion)}
              disabled={saving}
              className="w-full rounded-sm border border-input bg-surface-muted px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="privada">Privada</option>
              <option value="publica">Pública</option>
            </select>
          </div>

          {saveError && (
            <p className="text-sm text-danger" role="alert">
              {saveError}
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="primary" size="sm" type="submit" loading={saving}>
              Guardar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={cancelEdit}
              disabled={saving}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="flex flex-col gap-3 p-4 border border-border rounded-md bg-surface">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/coleccion/${coleccion.id}`}
              className="truncate text-sm font-medium text-text hover:text-primary transition-colors"
            >
              {coleccion.titulo}
            </Link>
            <Badge tone={coleccion.visibilidad === 'publica' ? 'info' : 'neutral'}>
              {VISIBILIDAD_LABELS[coleccion.visibilidad]}
            </Badge>
          </div>
          {coleccion.descripcion && (
            <p className="mt-1 text-sm text-text-muted line-clamp-2 break-words">
              {coleccion.descripcion}
            </p>
          )}
        </div>

        <div className="flex gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={startEdit}
            aria-label={`Editar ${coleccion.titulo}`}
          >
            Editar
          </Button>
          <Button
            variant="danger"
            size="sm"
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            aria-label={`Eliminar ${coleccion.titulo}`}
          >
            Eliminar
          </Button>
        </div>
      </div>

      <Modal
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        labelledById={`delete-coleccion-${coleccion.id}-title`}
      >
        <div>
          <h2
            id={`delete-coleccion-${coleccion.id}-title`}
            className="text-base font-semibold text-text mb-3"
          >
            ¿Eliminar &ldquo;{coleccion.titulo}&rdquo;?
          </h2>

          <p className="text-sm text-text-muted mb-2">
            Esta acción no se puede deshacer. Las publicaciones que agregaste no se
            eliminan, solo se quitan de esta colección.
          </p>

          {deleteError && (
            <p className="text-sm text-danger mt-2 mb-2" role="alert">
              {deleteError}
            </p>
          )}

          <div className="flex justify-end gap-3 mt-5">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setIsDeleteOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              type="button"
              onClick={handleDelete}
              loading={deleting}
              disabled={deleting}
            >
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </li>
  )
}
