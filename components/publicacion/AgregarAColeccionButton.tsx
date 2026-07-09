'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import { ApiError, apiClient } from '@/lib/api/client'
import type { Coleccion, ColeccionConMembership, VisibilidadColeccion } from '@/lib/types/database'

export interface AgregarAColeccionButtonProps {
  publicacionId: string
  isAuthenticated?: boolean
}

type FetchStatus = 'idle' | 'loading' | 'error'

const VISIBILIDAD_LABELS: Record<VisibilidadColeccion, string> = {
  publica: 'Pública',
  privada: 'Privada',
}

export default function AgregarAColeccionButton({
  publicacionId,
  isAuthenticated = false,
}: AgregarAColeccionButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<FetchStatus>('idle')
  const [fetchErrorMsg, setFetchErrorMsg] = useState<string | null>(null)
  const [collections, setCollections] = useState<ColeccionConMembership[] | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [listErrorMsg, setListErrorMsg] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTitulo, setNewTitulo] = useState('')
  const [newVisibilidad, setNewVisibilidad] = useState<VisibilidadColeccion>('privada')
  const [creating, setCreating] = useState(false)
  const [createErrorMsg, setCreateErrorMsg] = useState<string | null>(null)

  // Fetch the user's collections every time the modal opens, along with which
  // of them already contain this publication (`?publicacion_id=`) — otherwise
  // reopening the modal would show every collection as "not added" again.
  useEffect(() => {
    if (!isOpen) return

    let cancelled = false

    async function load() {
      setStatus('loading')
      setFetchErrorMsg(null)
      try {
        const data = await apiClient<ColeccionConMembership[]>(
          `/api/colecciones?publicacion_id=${encodeURIComponent(publicacionId)}`
        )
        if (cancelled) return
        setCollections(data)
        setAddedIds(new Set(data.filter((c) => c.agregada).map((c) => c.id)))
        setStatus('idle')
      } catch (err) {
        if (cancelled) return
        setFetchErrorMsg(
          err instanceof ApiError ? err.message : 'No se pudieron cargar tus colecciones.'
        )
        setStatus('error')
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [isOpen, publicacionId])

  function handleOpen() {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    setCollections(null)
    setAddedIds(new Set())
    setListErrorMsg(null)
    setShowCreateForm(false)
    setNewTitulo('')
    setNewVisibilidad('privada')
    setCreateErrorMsg(null)
    setIsOpen(true)
  }

  function handleClose() {
    setIsOpen(false)
  }

  async function handleAdd(coleccionId: string) {
    setPendingId(coleccionId)
    setListErrorMsg(null)

    try {
      await apiClient(
        `/api/colecciones/${encodeURIComponent(coleccionId)}/publicaciones`,
        {
          method: 'POST',
          body: JSON.stringify({ publicacion_id: publicacionId }),
        }
      )
      setAddedIds((prev) => new Set(prev).add(coleccionId))
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Not a real error: the publication is already in that collection.
        setAddedIds((prev) => new Set(prev).add(coleccionId))
      } else {
        setListErrorMsg('No se pudo agregar la publicación. Intenta de nuevo.')
      }
    } finally {
      setPendingId(null)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const titulo = newTitulo.trim()
    if (!titulo) return

    setCreating(true)
    setCreateErrorMsg(null)

    try {
      const nueva = await apiClient<Coleccion>('/api/colecciones', {
        method: 'POST',
        body: JSON.stringify({ titulo, visibilidad: newVisibilidad }),
      })

      const nuevaConMembership: ColeccionConMembership = { ...nueva, agregada: false }
      setCollections((prev) =>
        prev ? [nuevaConMembership, ...prev] : [nuevaConMembership]
      )
      setShowCreateForm(false)
      setNewTitulo('')
      setNewVisibilidad('privada')

      try {
        await apiClient(
          `/api/colecciones/${encodeURIComponent(nueva.id)}/publicaciones`,
          {
            method: 'POST',
            body: JSON.stringify({ publicacion_id: publicacionId }),
          }
        )
        setAddedIds((prev) => new Set(prev).add(nueva.id))
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          setAddedIds((prev) => new Set(prev).add(nueva.id))
        } else {
          setListErrorMsg(
            'La colección se creó, pero no se pudo agregar la publicación. Intenta desde la lista.'
          )
        }
      }
    } catch (err) {
      setCreateErrorMsg(
        err instanceof ApiError ? err.message : 'No se pudo crear la colección.'
      )
    } finally {
      setCreating(false)
    }
  }

  if (!isAuthenticated) return null

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium border border-border bg-surface text-text transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Agregar a colección</span>
      </button>

      <Modal open={isOpen} onClose={handleClose} labelledById="agregar-coleccion-title">
        <div>
          <h2
            id="agregar-coleccion-title"
            className="text-base font-semibold text-text mb-4"
          >
            Agregar a colección
          </h2>

          {status === 'loading' && (
            <div className="flex items-center justify-center gap-2 py-8">
              <Spinner size="sm" />
              <span className="text-sm text-text-muted">Cargando tus colecciones…</span>
            </div>
          )}

          {status === 'error' && (
            <div className="py-4">
              <p className="text-sm text-danger" role="alert">
                {fetchErrorMsg}
              </p>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                className="mt-3"
                onClick={handleOpen}
              >
                Reintentar
              </Button>
            </div>
          )}

          {status === 'idle' && collections !== null && (
            <>
              {collections.length === 0 && !showCreateForm && (
                <p className="text-sm text-text-muted mb-4">
                  Aún no tienes colecciones. Crea la primera para empezar a guardar publicaciones.
                </p>
              )}

              {collections.length > 0 && (
                <ul className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                  {collections.map((c) => {
                    const isAdded = addedIds.has(c.id)
                    const isPending = pendingId === c.id
                    return (
                      <li
                        key={c.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-text">
                            {c.titulo}
                          </p>
                          <Badge tone={c.visibilidad === 'publica' ? 'info' : 'neutral'}>
                            {VISIBILIDAD_LABELS[c.visibilidad]}
                          </Badge>
                        </div>
                        <Button
                          variant={isAdded ? 'secondary' : 'primary'}
                          size="sm"
                          type="button"
                          disabled={isAdded || isPending}
                          loading={isPending}
                          onClick={() => handleAdd(c.id)}
                        >
                          {isAdded ? 'Agregada' : 'Agregar'}
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}

              {listErrorMsg && (
                <p className="text-sm text-danger mt-3" role="alert">
                  {listErrorMsg}
                </p>
              )}

              {!showCreateForm && (
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className="mt-4"
                  onClick={() => setShowCreateForm(true)}
                >
                  + Nueva colección
                </Button>
              )}

              {showCreateForm && (
                <form
                  onSubmit={handleCreate}
                  className="mt-4 border-t border-border pt-4"
                >
                  <Field
                    label="Nombre de la colección"
                    name="nueva-coleccion-titulo"
                    value={newTitulo}
                    onChange={(e) => setNewTitulo(e.target.value)}
                    maxLength={100}
                    required
                    placeholder="Ej. Lecturas de biología"
                  />

                  <div className="mt-3">
                    <label
                      htmlFor="nueva-coleccion-visibilidad"
                      className="block text-sm font-medium text-text mb-1"
                    >
                      Visibilidad
                    </label>
                    <select
                      id="nueva-coleccion-visibilidad"
                      value={newVisibilidad}
                      onChange={(e) =>
                        setNewVisibilidad(e.target.value as VisibilidadColeccion)
                      }
                      className="w-full rounded-sm border border-input bg-surface-muted px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="privada">Privada</option>
                      <option value="publica">Pública</option>
                    </select>
                  </div>

                  {createErrorMsg && (
                    <p className="text-sm text-danger mt-3" role="alert">
                      {createErrorMsg}
                    </p>
                  )}

                  <div className="flex justify-end gap-3 mt-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      disabled={creating}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      type="submit"
                      loading={creating}
                      disabled={creating}
                    >
                      Crear y agregar
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  )
}
