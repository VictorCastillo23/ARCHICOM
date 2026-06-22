'use client'

import { useState } from 'react'
import { isHttpsUrl } from '@/lib/validation/url'
import { LINK_LABEL_MAX_LENGTH } from '@/lib/constants/links'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import type { UsuarioLink } from '@/lib/types/database'

interface LinkRowProps {
  link: UsuarioLink
  index: number
  total: number
  isEditing: boolean
  isLoading: boolean
  /** Any row in this list is mid-request — used to disable actions across the list. */
  anyLoading: boolean
  onMove: (index: number, direction: 'up' | 'down') => void
  onStartEdit: (id: string) => void
  onCancelEdit: () => void
  onSaveEdit: (id: string, etiqueta: string, url: string) => Promise<boolean>
  onDelete: (id: string) => void
}

export default function LinkRow({
  link,
  index,
  total,
  isEditing,
  isLoading,
  anyLoading,
  onMove,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: LinkRowProps) {
  return (
    <li className="flex flex-col gap-3 p-3 border border-border rounded-md bg-surface">
      {isEditing ? (
        <LinkEditForm
          link={link}
          isLoading={isLoading}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
        />
      ) : (
        <div className="flex items-center gap-2">
          {/* Reorder buttons */}
          <div className="flex flex-col gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => onMove(index, 'up')}
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
              onClick={() => onMove(index, 'down')}
              disabled={index === total - 1}
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
              onClick={() => onStartEdit(link.id)}
              disabled={anyLoading}
              aria-label={`Editar ${link.etiqueta}`}
            >
              Editar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(link.id)}
              loading={isLoading}
              disabled={anyLoading}
              aria-label={`Eliminar ${link.etiqueta}`}
            >
              Eliminar
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}

interface LinkEditFormProps {
  link: UsuarioLink
  isLoading: boolean
  onSave: (id: string, etiqueta: string, url: string) => Promise<boolean>
  onCancel: () => void
}

/**
 * Mounted only while the row is in edit mode, so its state is seeded fresh from `link`
 * each time editing opens (replaces the parent-owned `editState` of the old monolith).
 */
function LinkEditForm({ link, isLoading, onSave, onCancel }: LinkEditFormProps) {
  const [etiqueta, setEtiqueta] = useState(link.etiqueta)
  const [url, setUrl] = useState(link.url)
  const [urlError, setUrlError] = useState('')

  async function handleSave() {
    const trimmedEtiqueta = etiqueta.trim()
    const trimmedUrl = url.trim()

    if (!isHttpsUrl(trimmedUrl)) {
      setUrlError('La URL debe comenzar con https://')
      return
    }

    await onSave(link.id, trimmedEtiqueta, trimmedUrl)
  }

  return (
    <div className="flex flex-col gap-3">
      <Field
        label="Etiqueta"
        name={`edit-etiqueta-${link.id}`}
        value={etiqueta}
        onChange={(e) => setEtiqueta(e.target.value)}
        maxLength={LINK_LABEL_MAX_LENGTH}
        required
      />
      <Field
        label="URL"
        name={`edit-url-${link.id}`}
        type="url"
        value={url}
        onChange={(e) => {
          setUrl(e.target.value)
          setUrlError('')
        }}
        onBlur={() => {
          if (url && !isHttpsUrl(url)) {
            setUrlError('La URL debe comenzar con https://')
          }
        }}
        error={urlError}
        required
      />
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={handleSave} loading={isLoading}>
          Guardar
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
