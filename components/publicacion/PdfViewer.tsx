'use client'

import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist'

interface PdfViewerProps {
  source: string | File
  title: string
}

type Status = 'loading' | 'ready' | 'error'

// Mobile browsers (Chrome Android, Safari iOS) don't render PDFs inside an
// <iframe> — the native PDF plugin desktop relies on only kicks in when
// navigating to the file directly in a tab. Rendering to a <canvas> via
// pdf.js sidesteps that entirely: it's the same rendering path regardless of
// platform, so this component replaces the iframe-based preview.
export default function PdfViewer({ source, title }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [pageNumber, setPageNumber] = useState(1)
  const [pageCount, setPageCount] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)

  const pdfRef = useRef<PDFDocumentProxy | null>(null)
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null)

  // Resetting state on a prop change belongs in render, not in an effect
  // (react-hooks/set-state-in-effect) — this is React's documented "adjust
  // state when a prop changes" idiom: comparing against the previous value
  // and calling setState during render bails out before paint instead of
  // committing a stale frame first.
  const [loadedSource, setLoadedSource] = useState(source)
  if (source !== loadedSource) {
    setLoadedSource(source)
    setStatus('loading')
    setPageNumber(1)
    setPageCount(0)
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) setContainerWidth(width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString()

      const loadingTask =
        typeof source === 'string'
          ? pdfjsLib.getDocument({ url: source })
          : pdfjsLib.getDocument({ data: await source.arrayBuffer() })
      // pdfjs-dist v6 only exposes `destroy()` on the loading task (it tears
      // down both the transport and the worker) — the resolved
      // `PDFDocumentProxy` has no `destroy()` of its own, unlike older
      // pdf.js versions.
      loadingTaskRef.current = loadingTask

      try {
        const pdf = await loadingTask.promise
        if (cancelled) {
          loadingTask.destroy()
          return
        }
        pdfRef.current = pdf
        setPageCount(pdf.numPages)
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    load()

    return () => {
      cancelled = true
      loadingTaskRef.current?.destroy()
      loadingTaskRef.current = null
      pdfRef.current = null
    }
  }, [source])

  useEffect(() => {
    if (status !== 'ready') return
    const pdf = pdfRef.current
    const canvas = canvasRef.current
    if (!pdf || !canvas || containerWidth === 0) return

    let cancelled = false
    let renderTask: ReturnType<
      Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']
    > | null = null

    async function renderPage() {
      const page = await pdf!.getPage(pageNumber)
      if (cancelled) return

      const baseViewport = page.getViewport({ scale: 1 })
      const scale = containerWidth / baseViewport.width
      const viewport = page.getViewport({ scale })

      const canvasContext = canvas!.getContext('2d')
      if (!canvasContext) return

      canvas!.width = Math.max(1, Math.round(viewport.width))
      canvas!.height = Math.max(1, Math.round(viewport.height))

      renderTask = page.render({ canvas: canvas!, canvasContext, viewport })
      try {
        await renderTask.promise
      } catch {
        // Cancelled render tasks reject by design — not a real error, and a
        // stale/unmounted render shouldn't flip the UI into the error state.
      }
    }

    renderPage()

    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [status, pageNumber, containerWidth])

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-2 rounded border border-border bg-surface p-6 text-center">
        <p className="text-sm text-text-muted">No se pudo mostrar la vista previa del PDF.</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full">
      {status === 'loading' && (
        <div
          className="flex w-full animate-pulse items-center justify-center rounded border border-border bg-surface"
          style={{ height: '520px' }}
          role="status"
          aria-label={`Cargando vista previa de ${title}`}
        >
          <span className="text-sm text-text-muted">Cargando PDF…</span>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className={status === 'ready' ? 'w-full rounded border border-border' : 'hidden'}
        aria-label={`Página ${pageNumber} de ${title}`}
      />

      {status === 'ready' && pageCount > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="inline-flex items-center rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text hover:border-primary hover:text-primary transition-colors disabled:pointer-events-none disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-sm text-text-muted">
            Página {pageNumber} de {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.min(pageCount, p + 1))}
            disabled={pageNumber >= pageCount}
            className="inline-flex items-center rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text hover:border-primary hover:text-primary transition-colors disabled:pointer-events-none disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}
