'use client'

import { useState } from 'react'
import { LINK_LIMIT } from '@/lib/constants/links'
import Button from '@/components/ui/Button'
import LinkAddForm from '@/components/perfil/links/LinkAddForm'
import LinkRow from '@/components/perfil/links/LinkRow'
import { useLinks } from '@/components/perfil/links/useLinks'
import type { UsuarioLink } from '@/lib/types/database'

interface LinksEditorProps {
  initialLinks: UsuarioLink[]
}

export default function LinksEditor({ initialLinks }: LinksEditorProps) {
  const {
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
  } = useLinks(initialLinks)
  const [showAddForm, setShowAddForm] = useState(false)

  async function handleAdd(etiqueta: string, url: string) {
    const ok = await addLink(etiqueta, url)
    if (ok) setShowAddForm(false)
    return ok
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

      {showAddForm && (
        <LinkAddForm onAdd={handleAdd} onCancel={() => setShowAddForm(false)} loading={adding} />
      )}

      {links.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Tus enlaces">
          {links.map((link, index) => (
            <LinkRow
              key={link.id}
              link={link}
              index={index}
              total={links.length}
              isEditing={editingId === link.id}
              isLoading={loadingId === link.id}
              anyLoading={!!loadingId}
              onMove={move}
              onStartEdit={startEdit}
              onCancelEdit={cancelEdit}
              onSaveEdit={saveEdit}
              onDelete={deleteLink}
            />
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
