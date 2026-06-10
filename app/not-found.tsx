import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-[--color-text-muted] mb-2">
        404
      </p>
      <h1 className="text-[--text-display] font-bold text-[--color-text] mb-3">
        Página no encontrada
      </h1>
      <p className="text-[--color-text-muted] max-w-sm mb-8">
        El recurso que buscás no existe o fue movido.
      </p>
      <Link
        href="/"
        className="inline-flex items-center rounded-[--radius-md] bg-[--color-primary] px-5 py-2.5 text-sm font-medium text-black hover:bg-[--color-primary-hover] transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  )
}
