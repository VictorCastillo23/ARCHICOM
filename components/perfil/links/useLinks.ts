'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient, ApiError } from '@/lib/api/client'
import { LINK_LIMIT } from '@/lib/constants/links'
import type { UsuarioLink } from '@/lib/types/database'

/**
 * Owns all profile-links state and the four API calls (add / edit / delete / reorder).
 * Behavior is identical to the previous monolithic LinksEditor: same routes, same error
 * messages, same optimistic reorder with rollback. Form-input state lives in the form
 * components (LinkAddForm / LinkRow), not here.
 */
export function useLinks(initialLinks: UsuarioLink[]) {
  const router = useRouter()
  const [links, setLinks] = useState<UsuarioLink[]>(initialLinks)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [globalError, setGlobalError] = useState('')

  const atLimit = links.length >= LINK_LIMIT

  function startEdit(id: string) {
    setEditingId(id)
    setGlobalError('')
  }

  function cancelEdit() {
    setEditingId(null)
  }

  /** Returns true on success so the form can reset/close itself. */
  async function addLink(etiqueta: string, url: string): Promise<boolean> {
    setAdding(true)
    setGlobalError('')
    try {
      const link = await apiClient<UsuarioLink>('/api/perfil/links', {
        method: 'POST',
        body: JSON.stringify({ etiqueta, url }),
      })
      setLinks((prev) => [...prev, link])
      router.refresh()
      return true
    } catch (err) {
      setGlobalError(err instanceof ApiError ? err.message : 'Error al agregar enlace')
      return false
    } finally {
      setAdding(false)
    }
  }

  async function saveEdit(id: string, etiqueta: string, url: string): Promise<boolean> {
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
      return true
    } catch (err) {
      setGlobalError(err instanceof ApiError ? err.message : 'Error al guardar enlace')
      return false
    } finally {
      setLoadingId(null)
    }
  }

  async function deleteLink(id: string) {
    setLoadingId(id)
    setGlobalError('')
    try {
      await apiClient(`/api/perfil/links/${id}`, { method: 'DELETE' })
      setLinks((prev) => prev.filter((l) => l.id !== id))
      router.refresh()
    } catch (err) {
      setGlobalError(err instanceof ApiError ? err.message : 'Error al eliminar enlace')
    } finally {
      setLoadingId(null)
    }
  }

  /** Optimistic reorder with rollback on failure. */
  async function move(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= links.length) return

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
      setLinks(prevLinks)
      setGlobalError(err instanceof ApiError ? err.message : 'Error al reordenar enlaces')
    }
  }

  return {
    links,
    editingId,
    loadingId,
    adding,
    globalError,
    atLimit,
    startEdit,
    cancelEdit,
    addLink,
    saveEdit,
    deleteLink,
    move,
  }
}
