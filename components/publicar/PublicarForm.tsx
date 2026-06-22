'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import ArchivoPreview from './ArchivoPreview'
import TipoPicker from './TipoPicker'
import { apiClient, ApiError } from '@/lib/api/client'
import type { TipoPublicacion, Publicacion, Tag } from '@/lib/types/database'
import { TIPO_META } from '@/lib/constants/publicaciones'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024

const FILE_CLASSES =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-text text-sm file:mr-4 file:py-0 file:px-3 file:rounded-sm file:border-0 file:bg-surface-muted file:text-sm file:font-medium file:text-text hover:file:bg-surface-muted disabled:opacity-50 disabled:cursor-not-allowed'

export default function PublicarForm({ tags }: { tags: Tag[] }) {
  const router = useRouter()

  const [titulo, setTitulo] = useState('')
  const [resumen, setResumen] = useState('')
  const [tipo, setTipo] = useState<TipoPublicacion | null>(null)
  const [obraAutorExterno, setObraAutorExterno] = useState('')
  const [urlExterna, setUrlExterna] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)

  const categoria = tipo ? TIPO_META[tipo].categoria : null
  const esRecomendacion = categoria === 'recomendacion'
  const esVisual = categoria === 'visual'

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Soft warning: publication created, but some tags failed to attach. Carries a link.
  const [tagWarning, setTagWarning] = useState<{ message: string; publicacionId: string } | null>(
    null,
  )

  const tagsByArea = tags.reduce<Record<string, Tag[]>>((acc, tag) => {
    if (!acc[tag.area]) acc[tag.area] = []
    acc[tag.area].push(tag)
    return acc
  }, {})

  function toggleTag(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    )
  }

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
    setTagWarning(null)

    if (!tipo) {
      setError('Elige qué quieres publicar.')
      return
    }
    if (esVisual && !archivo) {
      setError('Sube la imagen de tu obra.')
      return
    }

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
          body: JSON.stringify({
            titulo,
            resumen,
            tipo,
            archivo_url: archivoUrl,
            ...(esRecomendacion
              ? { obra_autor_externo: obraAutorExterno, url_externa: urlExterna }
              : {}),
          }),
        },
      )

      // Attach tags, checking each response so silent failures surface.
      const results = await Promise.all(
        selectedTagIds.map((tag_id) =>
          fetch(`/api/publicaciones/${publicacion.id}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tag_id }),
          })
            .then((res) => res.ok)
            .catch(() => false),
        ),
      )
      const failed = results.filter((ok) => !ok).length

      if (failed > 0) {
        // Publication exists — don't lose it. Surface the partial failure with a link
        // instead of auto-redirecting (re-submitting would create a duplicate).
        setTagWarning({
          message: `La publicación se creó, pero ${failed} ${failed === 1 ? 'área no se asoció' : 'áreas no se asociaron'}.`,
          publicacionId: publicacion.id,
        })
        return
      }

      router.refresh()
      router.push(`/publicacion/${publicacion.id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Error inesperado. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* Type-first: pick what you're publishing before anything else */}
      <TipoPicker value={tipo} onChange={setTipo} disabled={loading} />

      {/* The rest of the form appears only after a type is chosen */}
      {tipo && (
        <>
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

          {esRecomendacion && (
            <>
              <Field
                label="Autor original de la obra"
                name="obra_autor_externo"
                value={obraAutorExterno}
                onChange={(e) => setObraAutorExterno(e.target.value)}
                required
                disabled={loading}
                placeholder="Nombre del autor de la obra que recomiendas"
              />
              <Field
                label="Enlace a la obra"
                name="url_externa"
                type="url"
                value={urlExterna}
                onChange={(e) => setUrlExterna(e.target.value)}
                required
                disabled={loading}
                placeholder="https://..."
              />
            </>
          )}

          {tags.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text">
                Áreas{' '}
                <span className="font-normal text-xs text-text-muted">(opcional)</span>
              </span>
              <div className="rounded-md border border-border bg-surface p-3 flex flex-col gap-3">
                {Object.entries(tagsByArea).map(([area, areaTags]) => (
                  <div key={area}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                      {area}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                      {areaTags.map((tag) => (
                        <label
                          key={tag.id}
                          className="flex items-center gap-1.5 cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTagIds.includes(tag.id)}
                            onChange={() => toggleTag(tag.id)}
                            disabled={loading}
                            className="accent-primary w-3.5 h-3.5"
                          />
                          <span className="text-sm text-text">{tag.nombre}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File section — adaptive: required image for visual art, no file for recommendations */}
          {!esRecomendacion && (
            <div className="flex flex-col gap-1">
              <label htmlFor="archivo" className="text-sm font-medium text-text">
                {esVisual ? (
                  <>
                    Imagen de la obra
                    <span className="ml-1 text-danger" aria-hidden="true">
                      *
                    </span>{' '}
                    <span className="font-normal text-xs text-text-muted">
                      (JPG o PNG, máx. 10 MB)
                    </span>
                  </>
                ) : (
                  <>
                    Archivo{' '}
                    <span className="font-normal text-xs text-text-muted">
                      (opcional — PDF, JPG o PNG, máx. 10 MB)
                    </span>
                  </>
                )}
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
          )}

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          {tagWarning && (
            <p role="alert" className="text-sm text-text-muted">
              {tagWarning.message}{' '}
              <Link
                href={`/publicacion/${tagWarning.publicacionId}`}
                className="text-primary hover:underline"
              >
                Ver publicación →
              </Link>
            </p>
          )}

          <Button type="submit" loading={loading} className="self-start">
            Publicar
          </Button>
        </>
      )}
    </form>
  )
}
