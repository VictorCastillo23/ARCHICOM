'use client'

import { useEffect, useRef, useState } from 'react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { copyToClipboard } from '@/lib/clipboard'
import { TIPO_META } from '@/lib/constants/publicaciones'
import type { TipoPublicacion } from '@/lib/types/database'

export interface CitarButtonProps {
  titulo: string
  autorNombre: string
  tipo: string
  creadoEn: string
  path: string
}

function tipoToLabelCorchetes(tipo: string): string {
  if (tipo === 'recomendacion' || tipo === 'otro') return '[Publicación]'
  const meta = TIPO_META[tipo as TipoPublicacion]
  return meta ? `[${meta.label}]` : '[Publicación]'
}

export default function CitarButton({ titulo, autorNombre, tipo, creadoEn, path }: CitarButtonProps) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const anio = new Date(creadoEn).getFullYear()
  const tipoLabel = tipoToLabelCorchetes(tipo)

  function handleOpen() {
    setUrl(`${window.location.origin}${path}`)
    setOpen(true)
  }

  async function handleCopy() {
    const cita = `${autorNombre} (${anio}). ${titulo} ${tipoLabel}. Vitrina. ${url}`
    const ok = await copyToClipboard(cita)
    if (!ok) return
    setCopied(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Citar esta publicación"
        className={[
          'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
          'border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'bg-surface text-text border-border hover:border-primary hover:text-primary',
        ].join(' ')}
      >
        <span>Citar</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} labelledById="citar-modal-title">
        <h2 id="citar-modal-title" className="text-base font-semibold text-text mb-3">
          Citar esta publicación
        </h2>

        <div role="note" className="mb-4 rounded-md border border-warning bg-warning-bg p-3 text-sm text-warning">
          Nota académica: Vitrina es una plataforma de difusión y no un repositorio académico revisado por pares ni asigna DOI. Antes de citar esta obra en un trabajo formal, verifica con tu asesor de tesis o comité que acepta una fuente alojada aquí como referencia válida.
        </div>

        <blockquote className="mb-4 rounded-md border border-border bg-surface-muted p-3 text-sm text-text select-all">
          {autorNombre} ({anio}). <em>{titulo}</em> {tipoLabel}. Vitrina. {url}
        </blockquote>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? 'Cita copiada al portapapeles' : 'Copiar cita'}
            className={[
              'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
              'border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              copied
                ? 'bg-surface text-primary border-primary'
                : 'bg-surface text-text border-border hover:border-primary hover:text-primary',
            ].join(' ')}
          >
            <span aria-live="polite">{copied ? '¡Copiado!' : 'Copiar cita'}</span>
          </button>
        </div>
      </Modal>
    </>
  )
}
