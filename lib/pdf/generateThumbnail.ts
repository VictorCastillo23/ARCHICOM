// Client-side PDF thumbnail generation for the publish/edit form.
//
// Renders page 1 of a PDF `File` to a JPEG `Blob` entirely in the browser via
// `pdfjs-dist`, so the app never depends on a native PDF-rendering binary on
// the server (real risk on Vercel's runtime). Call sites must be Client
// Components — this module touches `document`/`canvas` and must never run
// during SSR.
//
// `pdfjs-dist` is imported dynamically so it only ever enters the client
// bundle at the point it's actually used (file picked), not on initial page
// load. The worker is resolved via the `new URL(..., import.meta.url)`
// bundler idiom, which both Webpack 5 and Turbopack understand: it emits
// `pdf.worker.min.mjs` as a static asset and rewrites the URL to it.
//
// Any failure (corrupt PDF, render error/timeout, canvas unsupported)
// resolves to `null` instead of throwing — the caller treats that as "no
// thumbnail" and still uploads the main file. A missing thumbnail is an
// accepted, visible fallback (generic PDF icon in the card), not a
// publish-blocking error.

const THUMBNAIL_MAX_WIDTH = 400
const THUMBNAIL_MAX_HEIGHT = 500
// Much smaller retry pass for pages that time out at full size — a resource-
// heavy PDF (huge embedded images, many objects) is often cheap enough to
// render at a fraction of the resolution even when the full-size attempt
// isn't.
const RETRY_MAX_WIDTH = 120
const RETRY_MAX_HEIGHT = 150
const THUMBNAIL_JPEG_QUALITY = 0.8
const RENDER_TIMEOUT_MS = 8000
const RETRY_TIMEOUT_MS = 5000

// Races `promise` against a timer. Doesn't cancel the underlying pdf.js work
// (there's no comprehensive AbortController support across getDocument/
// getPage/render) — a very slow render keeps running in the background after
// this "gives up", but that's a one-off per publish action, not a hot path,
// so the wasted work isn't worth the extra complexity of wiring real
// cancellation through pdf.js.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('pdf-thumbnail-timeout')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

async function renderPage1ToBlob(
  file: File,
  maxWidth: number,
  maxHeight: number,
): Promise<Blob | null> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(1)

  const baseViewport = page.getViewport({ scale: 1 })
  // Fit within BOTH ceilings, not just width — scaling to width alone can
  // still produce a canvas taller than the browser's max canvas size for an
  // unusually narrow/tall page (Safari/iOS has the tightest limit). Taking
  // the smaller of the two ratios guarantees the render never exceeds either.
  const scale = Math.min(maxWidth / baseViewport.width, maxHeight / baseViewport.height)
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(viewport.width))
  canvas.height = Math.max(1, Math.round(viewport.height))
  const canvasContext = canvas.getContext('2d')
  if (!canvasContext) return null

  await page.render({ canvas, canvasContext, viewport }).promise

  return await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', THUMBNAIL_JPEG_QUALITY)
  })
}

export async function generatePdfThumbnail(file: File): Promise<Blob | null> {
  try {
    return await withTimeout(
      renderPage1ToBlob(file, THUMBNAIL_MAX_WIDTH, THUMBNAIL_MAX_HEIGHT),
      RENDER_TIMEOUT_MS,
    )
  } catch {
    // Full-size attempt failed or timed out — retry once, much smaller and
    // with a shorter budget, before giving up entirely.
    try {
      return await withTimeout(
        renderPage1ToBlob(file, RETRY_MAX_WIDTH, RETRY_MAX_HEIGHT),
        RETRY_TIMEOUT_MS,
      )
    } catch {
      return null
    }
  }
}
