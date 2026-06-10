'use client'

import { useEffect, useRef, useState } from 'react'
import Button from '@/components/ui/Button'

interface ArchivoPreviewProps {
  file: File | null
  onClear: () => void
}

export default function ArchivoPreview({ file, onClear }: ArchivoPreviewProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const prevUrl = useRef<string | null>(null)

  useEffect(() => {
    if (prevUrl.current) {
      URL.revokeObjectURL(prevUrl.current)
      prevUrl.current = null
    }
    if (file) {
      const url = URL.createObjectURL(file)
      prevUrl.current = url
      setObjectUrl(url)
    } else {
      setObjectUrl(null)
    }
    return () => {
      if (prevUrl.current) {
        URL.revokeObjectURL(prevUrl.current)
        prevUrl.current = null
      }
    }
  }, [file])

  if (!file || !objectUrl) return null

  const isImage = file.type === 'image/jpeg' || file.type === 'image/png'
  const isPdf = file.type === 'application/pdf'

  return (
    <div className="mt-3 rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-muted] p-3">
      {isImage && (
        <img
          src={objectUrl}
          alt="Vista previa del archivo"
          className="w-full rounded object-contain"
          style={{ maxHeight: '300px' }}
        />
      )}

      {isPdf && (
        <div>
          <iframe
            src={objectUrl}
            title="Vista previa del PDF"
            className="w-full rounded border-0"
            style={{ height: '400px' }}
            onError={() => {}}
          />
          <p className="mt-2 text-xs text-[--color-text-muted]">
            <span className="inline-flex items-center gap-1 rounded bg-[--color-surface] border border-[--color-border] px-2 py-0.5 text-xs font-medium">
              PDF
            </span>{' '}
            {file.name} — listo para subir
          </p>
        </div>
      )}

      <div className="mt-3">
        <Button variant="secondary" size="sm" onClick={onClear} type="button">
          Quitar archivo
        </Button>
      </div>
    </div>
  )
}
