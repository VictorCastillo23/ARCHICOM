'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import ArchivoPreview from './ArchivoPreview'
import { apiClient, ApiError } from '@/lib/api/client'
import type { TipoPublicacion, Publicacion } from '@/lib/types/database'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024

const TIPO_OPTIONS: { value: TipoPublicacion; label: string }[] = [
  { value: 'libro', label: 'Libro' },
  { value: 'articulo', label: 'Artículo' },
  { value: 'investigacion', label: 'Investigación' },
  { value: 'poema', label: 'Poema' },
  { value: 'dibujo', label: 'Dibujo' },
  { value: 'otro', label: 'Otro' },
]

const SELECT_CLASSES =
  'w-full rounded-[--radius-md] border border-[--color-border] bg-[--color-surface] px-3 py-2 text-[--color-text] text-sm focus:outline-none focus:ring-2 focus:ring-[--color-border-focus] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed'

const FILE_CLASSES =
  'w-full rounded-[--radius-md] border border-[--color-border] bg-[--color-surface] px-3 py-2 text-[--color-text] text-sm file:mr-4 file:py-0 file:px-3 file:rounded-[--radius-sm] file:border-0 file:bg-[--color-surface-muted] file:text-sm file:font-medium file:text-[--color-text] hover:file:bg-[--color-surface-muted] disabled:opacity-50 disabled:cursor-not-allowed'

export default function PublicarForm() {
  const router = useRouter()

  const [titulo, setTitulo] = useState('')
  const [resumen, setResumen] = useState('')
  const [tipo, setTipo] = useState<TipoPublicacion>('libro')
  const [archivo, setArchivo] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) {
      setArchivo(null)
      return
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Solo se permiten archivos PDF, JPG o PNG.')
      e.target.value = ''
      setArchivo(null)
      return
    }
    if (file.size > MAX_SIZE) {
      setError('El archivo no puede superar 10 MB.')
      e.target.value = ''
      setArchivo(null)
      return
    }
    setError(null)
    setArchivo(file)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      let archivoUrl: string | undefined

      if (archivo) {
        const formData = new FormData()
        formData.append('file', archivo)
        const res = await fetch('/api/storage/upload', { method: 'POST', body: formData })
        const json = await res.json()
        if (!res.ok || json?.error) {
          setError(json?.error?.message ?? 'Error al subir el archivo.')
          return
        }
        archivoUrl = json.data.url
      }

      const { publicacion } = await apiClient<{ publicacion: Publicacion }>(
        '/api/publicaciones',
        {
          method: 'POST',
          body: JSON.stringify({ titulo, resumen, tipo, archivo_url: archivoUrl }),
        },
      )

      router.refresh()
      router.push(`/publicacion/${publicacion.id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Error inesperado. Intentá de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field
        label="Título"
        name="titulo"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        required
        disabled={loading}
        placeholder="Título de tu publicación"
        maxLength={150}
      />

      <Field
        label="Resumen"
        name="resumen"
        multiline
        value={resumen}
        onChange={(e) => setResumen(e.target.value)}
        required
        disabled={loading}
        placeholder="Breve descripción del contenido"
        maxLength={250}
      />

      <div className="flex flex-col gap-1">
        <label htmlFor="tipo" className="text-sm font-medium text-[--color-text]">
          Tipo
          <span className="ml-1 text-[--color-danger]" aria-hidden="true">
            *
          </span>
        </label>
        <select
          id="tipo"
          name="tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoPublicacion)}
          required
          disabled={loading}
          className={SELECT_CLASSES}
        >
          {TIPO_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="archivo" className="text-sm font-medium text-[--color-text]">
          Archivo{' '}
          <span className="font-normal text-xs text-[--color-text-muted]">
            (opcional — PDF, JPG o PNG, máx. 10 MB)
          </span>
        </label>
        <input
          id="archivo"
          name="archivo"
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          disabled={loading}
          onChange={handleFileChange}
          ref={fileInputRef}
          className={FILE_CLASSES}
        />
        <ArchivoPreview
          file={archivo}
          onClear={() => {
            setArchivo(null)
            if (fileInputRef.current) fileInputRef.current.value = ''
          }}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-[--color-danger]">
          {error}
        </p>
      )}

      <Button type="submit" loading={loading} className="self-start">
        Publicar
      </Button>
    </form>
  )
}
