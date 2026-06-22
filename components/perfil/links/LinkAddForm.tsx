'use client'

import { useState } from 'react'
import { isHttpsUrl } from '@/lib/validation/url'
import { LINK_LABEL_MAX_LENGTH } from '@/lib/constants/links'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'

interface LinkAddFormProps {
  /** Returns true when the link was created, so the form can reset and close. */
  onAdd: (etiqueta: string, url: string) => Promise<boolean>
  onCancel: () => void
  loading: boolean
}

export default function LinkAddForm({ onAdd, onCancel, loading }: LinkAddFormProps) {
  const [etiqueta, setEtiqueta] = useState('')
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState('')

  async function handleSubmit() {
    const trimmedEtiqueta = etiqueta.trim()
    const trimmedUrl = url.trim()

    if (!trimmedEtiqueta) return
    if (!isHttpsUrl(trimmedUrl)) {
      setUrlError('La URL debe comenzar con https://')
      return
    }

    const ok = await onAdd(trimmedEtiqueta, trimmedUrl)
    if (ok) {
      setEtiqueta('')
      setUrl('')
      setUrlError('')
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4 border border-border rounded-md bg-surface">
      <Field
        label="Etiqueta"
        name="add-etiqueta"
        value={etiqueta}
        onChange={(e) => setEtiqueta(e.target.value)}
        maxLength={LINK_LABEL_MAX_LENGTH}
        placeholder="Mi GitHub"
        required
      />
      <Field
        label="URL"
        name="add-url"
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
        placeholder="https://github.com/usuario"
        required
      />
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={handleSubmit} loading={loading}>
          Guardar
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
