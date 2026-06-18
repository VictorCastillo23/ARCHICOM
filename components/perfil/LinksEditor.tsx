'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient, ApiError } from '@/lib/api/client'
import { isHttpsUrl } from '@/lib/validation/url'
import { LINK_LIMIT } from '@/lib/constants/links'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import type { UsuarioLink } from '@/lib/types/database'

interface LinksEditorProps {
  initialLinks: UsuarioLink[]
}

interface EditState {
  etiqueta: string
  url: string
  urlError: string
}

export default function LinksEditor({ initialLinks }: LinksEditorProps) {
  const router = useRouter()
  const [links, setLinks] = useState<UsuarioLink[]>(initialLinks)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ etiqueta: '', url: '', urlError: '' })
  const [addState, setAddState] = useState<EditState>({ etiqueta: '', url: '', urlError: '' })
  const [showAddForm, setShowAddForm] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [globalError, setGlobalError] = useState('')

  const atLimit = links.length >= LINK_LIMIT

  // --- Add link ---
  async function handleAdd() {
    const etiqueta = addState.etiqueta.trim()
    const url = addState.url.trim()

    if (!etiqueta) {
      setAddState((s) => ({ ...s, urlError: '' }))
      return
    }
    if (!isHttpsUrl(url)) {
      setAddState((s) => ({ ...s, urlError: 'La URL debe comenzar con https://' }))
      return
    }

    setAdding(true)
    setGlobalError('')
    try {
      const link = await apiClient<UsuarioLink>('/api/perfil/links', {
        method: 'POST',
        body: JSON.stringify({ etiqueta, url }),
      })
      setLinks((prev) => [...prev, link])
      setAddState({ etiqueta: '', url: '', urlError: '' })
      setShowAddForm(false)
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError) {
        setGlobalError(err.message)
      } else {
        setGlobalError('Error al agregar enlace')
      }
    } finally {
      setAdding(false)
    }
  }

  // --- Edit link ---
  function startEdit(link: UsuarioLink) {
    setEditingId(link.id)
    setEditState({ etiqueta: link.etiqueta, url: link.url, urlError: '' })
    setGlobalError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditState({ etiqueta: '', url: '', urlError: '' })
  }

  async function handleSaveEdit(id: string) {
    const etiqueta = editState.etiqueta.trim()
    const url = editState.url.trim()

    if (!isHttpsUrl(url)) {
      setEditState((s) => ({ ...s, urlError: 'La URL debe comenzar con https://' }))
      return
    }

    setLoadingId(id)
    setGlobalError('')
    try {
      const link = await apiClient<UsuarioLink>(`/api/perfil/links/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ etiqueta, url }),
      })
      setLinks((prev) => prev.map((l) => (l.id === id ? link : l)))
      setEditingId(null)
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError) {
        setGlobalError(err.message)
      } else {
        setGlobalError('Error al guardar enlace')
      }
    } finally {
      setLoadingId(null)
    }
  }

  // --- Delete link ---
  async function handleDelete(id: string) {
    setLoadingId(id)
    setGlobalError('')
    try {
      await apiClient(`/api/perfil/links/${id}`, { method: 'DELETE' })
      setLinks((prev) => prev.filter((l) => l.id !== id))
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError) {
        setGlobalError(err.message)
      } else {
        setGlobalError('Error al eliminar enlace')
      }
    } finally {
      setLoadingId(null)
    }
  }

  // --- Reorder: move item up or down ---
  async function handleMove(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= links.length) return

    // Optimistic update
    const prevLinks = links
    const newLinks = [...links]
    ;[newLinks[index], newLinks[targetIndex]] = [newLinks[targetIndex], newLinks[index]]
    setLinks(newLinks)
    setGlobalError('')

    try {
      await apiClient('/api/perfil/links', {
        method: 'PATCH',
        body: JSON.stringify({ orden: newLinks.map((l) => l.id) }),
      })
      router.refresh()
    } catch (err) {
      // Rollback optimistic update
      setLinks(prevLinks)
      if (err instanceof ApiError) {
        setGlobalError(err.message)
      } else {
        setGlobalError('Error al reordenar enlaces')
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text">
          Mis enlaces ({links.length}/{LINK_LIMIT})
        </h3>
        {!showAddForm && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAddForm(true)}
            disabled={atLimit}
            title={atLimit ? `Límite de ${LINK_LIMIT} enlaces alcanzado` : undefined}
          >
            + Agregar enlace
          </Button>
        )}
      </div>

      {globalError && (
        <p role="alert" className="text-xs text-danger">
          {globalError}
        </p>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="flex flex-col gap-3 p-4 border border-border rounded-md bg-surface">
          <Field
            label="Etiqueta"
            name="add-etiqueta"
            value={addState.etiqueta}
            onChange={(e) => setAddState((s) => ({ ...s, etiqueta: e.target.value }))}
            maxLength={50}
            placeholder="Mi GitHub"
            required
          />
          <Field
            label="URL"
            name="add-url"
            type="url"
            value={addState.url}
            onChange={(e) => setAddState((s) => ({ ...s, url: e.target.value, urlError: '' }))}
            onBlur={() => {
              if (addState.url && !isHttpsUrl(addState.url)) {
                setAddState((s) => ({ ...s, urlError: 'La URL debe comenzar con https://' }))
              }
            }}
            error={addState.urlError}
            placeholder="https://github.com/usuario"
            required
          />
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleAdd} loading={adding}>
              Guardar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddForm(false)
                setAddState({ etiqueta: '', url: '', urlError: '' })
              }}
              disabled={adding}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Link list */}
      {links.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Tus enlaces">
          {links.map((link, index) => (
            <li
              key={link.id}
              className="flex flex-col gap-3 p-3 border border-border rounded-md bg-surface"
            >
              {editingId === link.id ? (
                /* Edit form */
                <div className="flex flex-col gap-3">
                  <Field
                    label="Etiqueta"
                    name={`edit-etiqueta-${link.id}`}
                    value={editState.etiqueta}
                    onChange={(e) => setEditState((s) => ({ ...s, etiqueta: e.target.value }))}
                    maxLength={50}
                    required
                  />
                  <Field
                    label="URL"
                    name={`edit-url-${link.id}`}
                    type="url"
                    value={editState.url}
                    onChange={(e) =>
                      setEditState((s) => ({ ...s, url: e.target.value, urlError: '' }))
                    }
                    onBlur={() => {
                      if (editState.url && !isHttpsUrl(editState.url)) {
                        setEditState((s) => ({
                          ...s,
                          urlError: 'La URL debe comenzar con https://',
                        }))
                      }
                    }}
                    error={editState.urlError}
                    required
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSaveEdit(link.id)}
                      loading={loadingId === link.id}
                    >
                      Guardar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelEdit}
                      disabled={loadingId === link.id}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                /* Display row */
                <div className="flex items-center gap-2">
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMove(index, 'up')}
                      disabled={index === 0}
                      aria-label={`Mover ${link.etiqueta} hacia arriba`}
                      className="p-0.5 text-text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(index, 'down')}
                      disabled={index === links.length - 1}
                      aria-label={`Mover ${link.etiqueta} hacia abajo`}
                      className="p-0.5 text-text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Link info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{link.etiqueta}</p>
                    <p className="text-xs text-text-muted truncate">{link.url}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(link)}
                      disabled={!!loadingId}
                      aria-label={`Editar ${link.etiqueta}`}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(link.id)}
                      loading={loadingId === link.id}
                      disabled={!!loadingId}
                      aria-label={`Eliminar ${link.etiqueta}`}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {links.length === 0 && !showAddForm && (
        <p className="text-sm text-text-muted">
          No tenés enlaces todavía. Agregá hasta {LINK_LIMIT} para que aparezcan en tu perfil.
        </p>
      )}
    </div>
  )
}
