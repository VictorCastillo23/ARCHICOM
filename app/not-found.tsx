import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-text-muted mb-2">
        404
      </p>
      <h1 className="text-display font-bold text-text mb-3">
        Página no encontrada
      </h1>
      <p className="text-text-muted max-w-sm mb-8">
        El recurso que buscas no existe o fue movido.
      </p>
      <Link
        href="/"
        className="inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-fg hover:bg-primary-hover transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  )
}
