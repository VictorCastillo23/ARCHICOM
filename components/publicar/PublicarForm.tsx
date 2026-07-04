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
import { isHttpUrl } from '@/lib/validation/url'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024

const FILE_CLASSES =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-text text-sm file:mr-4 file:py-0 file:px-3 file:rounded-sm file:border-0 file:bg-surface-muted file:text-sm file:font-medium file:text-text hover:file:bg-surface-muted disabled:opacity-50 disabled:cursor-not-allowed'

// Seed values for edit mode. Absent → create mode (the original behaviour).
export type PublicarFormInitialValues = {
  titulo: string
  resumen: string
  tipo: TipoPublicacion
  obraAutorExterno: string
  urlExterna: string
  archivoUrl?: string
}

type PublicarFormProps = {
  tags: Tag[]
  // Edit mode: when set, the form PATCHes this publication instead of creating one.
  publicacionId?: string
  initialValues?: PublicarFormInitialValues
  initialTagIds?: string[]
  // Edit mode locks the type (changing category would invalidate conditional fields).
  lockTipo?: boolean
}

export default function PublicarForm({
  tags,
  publicacionId,
  initialValues,
  initialTagIds,
  lockTipo = false,
}: PublicarFormProps) {
  const router = useRouter()
  const isEdit = Boolean(publicacionId)

  const [titulo, setTitulo] = useState(initialValues?.titulo ?? '')
  const [resumen, setResumen] = useState(initialValues?.resumen ?? '')
  const [tipo, setTipo] = useState<TipoPublicacion | null>(initialValues?.tipo ?? null)
  const [obraAutorExterno, setObraAutorExterno] = useState(initialValues?.obraAutorExterno ?? '')
  const [urlExterna, setUrlExterna] = useState(initialValues?.urlExterna ?? '')
  const [archivo, setArchivo] = useState<File | null>(null)
  // The file already attached to the publication (edit mode). Kept unless a new
  // file is chosen; satisfies the "at least one" rule without re-uploading.
  const existingArchivoUrl = initialValues?.archivoUrl
  const hasExistingArchivo = Boolean(existingArchivoUrl)

  const categoria = tipo ? TIPO_META[tipo].categoria : null
  const esRecomendacion = categoria === 'recomendacion'
  const esVisual = categoria === 'visual'

  // The RAG chat can only be enabled for PDFs (the effective file: new or existing).
  const puedeIndexar = archivo
    ? archivo.type === 'application/pdf'
    : (existingArchivoUrl?.toLowerCase().endsWith('.pdf') ?? false)

  const baseTagIds = initialTagIds ?? []
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(baseTagIds)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Opt-in: index the PDF on save so the RAG chat works right away.
  const [habilitarChat, setHabilitarChat] = useState(false)
  const [indexando, setIndexando] = useState(false)
  // Soft warning: publication saved, but some tags failed to attach/detach. Carries a link.
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
    if (esVisual && !archivo && !hasExistingArchivo) {
      setError('Sube la imagen de tu obra.')
      return
    }

    // Normal publications (not recommendations): a link is optional, but at least
    // one of {archivo, enlace} is required. An already-attached file counts.
    const urlTrim = urlExterna.trim()
    if (!esRecomendacion && urlTrim && !isHttpUrl(urlTrim)) {
      setError('El enlace debe ser una URL http(s) válida.')
      return
    }
    if (!esRecomendacion && !esVisual && !archivo && !hasExistingArchivo && !urlTrim) {
      setError('Agrega un archivo o un enlace (al menos uno).')
      return
    }

    setLoading(true)
    // Track the file uploaded in THIS submit so we can roll it back if the save fails.
    let uploadedUrl: string | undefined

    try {
      // Upload only when a new file was chosen; otherwise keep the existing one.
      if (archivo) {
        const formData = new FormData()
        formData.append('file', archivo)
        const res = await fetch('/api/storage/upload', { method: 'POST', body: formData })
        const json = await res.json()
        if (!res.ok || json?.error) {
          setError(json?.error?.message ?? 'Error al subir el archivo.')
          return
        }
        uploadedUrl = json.data.url
      }

      if (isEdit && publicacionId) {
        await editarPublicacion(publicacionId, urlTrim, uploadedUrl)
        return
      }

      await crearPublicacion(urlTrim, uploadedUrl)
    } catch (err) {
      // The save failed after the file was uploaded → don't leave it orphaned.
      if (uploadedUrl) await removeUploadedFile(uploadedUrl)
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Error inesperado. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Index the publication's PDF so the chat works, when the author opted in.
  // Best-effort: returns true if it failed (the publication itself is fine and
  // can be indexed later from its detail page).
  async function indexarSiCorresponde(id: string): Promise<boolean> {
    if (!habilitarChat || !puedeIndexar) return false
    setIndexando(true)
    try {
      await apiClient(`/api/publicaciones/${id}/index`, { method: 'POST' })
      return false
    } catch {
      return true
    } finally {
      setIndexando(false)
    }
  }

  // --- Create ---------------------------------------------------------------
  async function crearPublicacion(urlTrim: string, archivoUrl: string | undefined) {
    const { publicacion } = await apiClient<{ publicacion: Publicacion }>('/api/publicaciones', {
      method: 'POST',
      body: JSON.stringify({
        titulo,
        resumen,
        tipo,
        archivo_url: archivoUrl,
        ...(esRecomendacion
          ? { obra_autor_externo: obraAutorExterno, url_externa: urlExterna }
          : urlTrim
            ? { url_externa: urlTrim }
            : {}),
      }),
    })

    // Attach tags, checking each response so silent failures surface.
    const results = await Promise.all(
      selectedTagIds.map((tag_id) => postTag(publicacion.id, tag_id)),
    )
    const failed = results.filter((ok) => !ok).length

    // Enable chat: index the PDF now if the author opted in (best-effort).
    const indexFailed = await indexarSiCorresponde(publicacion.id)

    const problemas: string[] = []
    if (failed > 0)
      problemas.push(failed === 1 ? '1 área no se asoció' : `${failed} áreas no se asociaron`)
    if (indexFailed) problemas.push('no se pudo preparar el chat del documento')

    if (problemas.length > 0) {
      // Publication exists — don't lose it. Surface the partial failure with a link
      // instead of auto-redirecting (re-submitting would create a duplicate).
      setTagWarning({
        message: `La publicación se creó, pero ${problemas.join(' y ')}. Podés resolverlo desde la publicación.`,
        publicacionId: publicacion.id,
      })
      return
    }

    router.refresh()
    router.push(`/publicacion/${publicacion.id}`)
  }

  // --- Edit -----------------------------------------------------------------
  async function editarPublicacion(
    id: string,
    urlTrim: string,
    archivoUrl: string | undefined,
  ) {
    // tipo is locked on edit → not sent (the PATCH leaves it untouched).
    await apiClient(`/api/publicaciones/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        titulo,
        resumen,
        ...(archivoUrl ? { archivo_url: archivoUrl } : {}),
        ...(esRecomendacion
          ? { obra_autor_externo: obraAutorExterno, url_externa: urlExterna }
          : { url_externa: urlTrim ? urlTrim : null }),
      }),
    })

    // A new file replaced the old one → remove the now-unreferenced old file.
    if (archivoUrl && existingArchivoUrl && existingArchivoUrl !== archivoUrl) {
      await removeUploadedFile(existingArchivoUrl)
    }

    // Tag diff: add the newly-selected, remove the deselected.
    const toAdd = selectedTagIds.filter((t) => !baseTagIds.includes(t))
    const toRemove = baseTagIds.filter((t) => !selectedTagIds.includes(t))
    const results = await Promise.all([
      ...toAdd.map((tag_id) => postTag(id, tag_id)),
      ...toRemove.map((tag_id) => deleteTag(id, tag_id)),
    ])
    const failed = results.filter((ok) => !ok).length

    const indexFailed = await indexarSiCorresponde(id)

    const problemas: string[] = []
    if (failed > 0)
      problemas.push(failed === 1 ? '1 área no se actualizó' : `${failed} áreas no se actualizaron`)
    if (indexFailed) problemas.push('no se pudo preparar el chat del documento')

    if (problemas.length > 0) {
      setTagWarning({
        message: `Se guardaron los cambios, pero ${problemas.join(' y ')}. Podés resolverlo desde la publicación.`,
        publicacionId: id,
      })
      return
    }

    router.refresh()
    router.push(`/publicacion/${id}`)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* Type-first: pick what you're publishing before anything else.
          Locked on edit (changing category would invalidate conditional fields). */}
      <TipoPicker value={tipo} onChange={setTipo} disabled={loading || lockTipo} />

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
            maxLength={700}
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
              {isEdit && hasExistingArchivo && !archivo && (
                <p className="text-xs text-text-muted">
                  Ya hay un archivo cargado. Elige uno nuevo para reemplazarlo.
                </p>
              )}
              <ArchivoPreview
                file={archivo}
                onClear={() => {
                  setArchivo(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
              />
            </div>
          )}

          {/* Opt-in RAG chat — only for PDFs (the effective file). */}
          {puedeIndexar && (
            <label className="flex items-start gap-2 cursor-pointer select-none rounded-md border border-border bg-surface p-3">
              <input
                type="checkbox"
                checked={habilitarChat}
                onChange={(e) => setHabilitarChat(e.target.checked)}
                disabled={loading}
                className="accent-primary w-3.5 h-3.5 mt-0.5"
              />
              <span className="text-sm text-text">
                Habilitar chat sobre el documento
                <span className="block text-xs text-text-muted">
                  Indexa el PDF para que se le puedan hacer preguntas. Podés cambiarlo luego desde la publicación.
                </span>
              </span>
            </label>
          )}

          {/* External link — optional on any normal type. For texto/otro it's the
              alternative to the file (at least one is required). */}
          {!esRecomendacion && (
            <Field
              label={
                esVisual ? 'Enlace (opcional)' : 'Enlace a la obra (opcional)'
              }
              name="url_externa"
              type="url"
              value={urlExterna}
              onChange={(e) => setUrlExterna(e.target.value)}
              disabled={loading}
              placeholder="https://..."
            />
          )}

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          {indexando && (
            <p className="text-sm text-text-muted">Preparando el chat sobre el documento…</p>
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
            {isEdit ? 'Guardar cambios' : 'Publicar'}
          </Button>
        </>
      )}
    </form>
  )
}

// --- Tag helpers ------------------------------------------------------------
function postTag(publicacionId: string, tag_id: string): Promise<boolean> {
  return fetch(`/api/publicaciones/${publicacionId}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag_id }),
  })
    .then((res) => res.ok)
    .catch(() => false)
}

function deleteTag(publicacionId: string, tag_id: string): Promise<boolean> {
  return fetch(`/api/publicaciones/${publicacionId}/tags?tag_id=${tag_id}`, {
    method: 'DELETE',
  })
    .then((res) => res.ok)
    .catch(() => false)
}

// Best-effort Storage cleanup from the client (replaced file on edit, or rollback
// after a failed save). Never throws — orphan cleanup must not break the flow.
function removeUploadedFile(url: string): Promise<void> {
  return fetch('/api/storage', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
    .then(() => undefined)
    .catch(() => undefined)
}
