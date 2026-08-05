import PdfViewer from '@/components/publicacion/PdfViewer'

interface ArchivoVistaPreviaProps {
  url: string
  titulo: string
}

type TipoArchivo = 'imagen' | 'pdf' | 'otro'

// The publicacion record does not store a mime type, so the only reliable
// signal is the file extension of the public Storage URL. The bucket only
// accepts PDF/JPG/PNG (see app/api/storage/upload/route.ts).
function getTipoArchivo(url: string): TipoArchivo {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') return 'imagen'
  if (ext === 'pdf') return 'pdf'
  return 'otro'
}

const verArchivoClasses =
  'inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:border-primary hover:text-primary transition-colors'

function VerArchivoButton({ url, label }: { url: string; label: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={verArchivoClasses}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {label}
    </a>
  )
}

export default function ArchivoVistaPrevia({ url, titulo }: ArchivoVistaPreviaProps) {
  const tipo = getTipoArchivo(url)

  if (tipo === 'imagen') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Ver imagen de «${titulo}» en otra pestaña`}
        className="block rounded-md border border-border bg-surface-muted p-3 transition-colors hover:border-primary"
      >
        {/* Remote user-uploaded image; raw <img> mirrors components/publicar/ArchivoPreview.tsx. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={`Vista previa de ${titulo}`}
          className="w-full rounded object-contain"
          style={{ maxHeight: '480px' }}
        />
        <p className="mt-2 text-xs text-text-muted">Haz clic para abrir en otra pestaña ↗</p>
      </a>
    )
  }

  if (tipo === 'pdf') {
    return (
      <div className="rounded-md border border-border bg-surface-muted p-3">
        <PdfViewer source={url} title={titulo} />
        <div className="mt-3">
          <VerArchivoButton url={url} label="Abrir en nueva pestaña ↗" />
        </div>
      </div>
    )
  }

  return <VerArchivoButton url={url} label="Ver archivo" />
}
