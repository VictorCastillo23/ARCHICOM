import Link from 'next/link'

export default function HeroBanner() {
  return (
    <div
      id="hero"
      className="mb-10 rounded-lg bg-surface-muted border border-border px-8 py-10 flex flex-col items-center text-center gap-5"
      style={{ minHeight: '280px', justifyContent: 'center' }}
    >
      <h1 className="text-(length:--size-heading-lg) font-normal font-display text-text leading-tight max-w-xl">
        Tu trabajo merece un mejor lugar que un chat
      </h1>
      <p className="text-sm text-[--color-text-muted] max-w-lg">
        Es Vitrina es el portafolio digital para jovenes. Publicá tus obras, recibe
        retroalimentación y participá en la revista semanal de la comunidad.
      </p>
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        <Link
          href="/signup"
          className="inline-flex items-center rounded-md bg-primary px-5 py-2 text-sm font-medium text-black hover:bg-primary-hover transition-colors"
        >
          Crea tu cuenta gratis
        </Link>
        <a
          href="#feed"
          className="inline-flex items-center rounded-md border border-border bg-surface px-5 py-2 text-sm font-medium text-text hover:bg-surface-muted transition-colors"
        >
          Explorar publicaciones
        </a>
      </div>
    </div>
  )
}
