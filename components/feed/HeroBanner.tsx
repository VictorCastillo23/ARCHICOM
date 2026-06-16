import Link from 'next/link'

export default function HeroBanner() {
  return (
    <div
      id="hero"
      className="mb-10 rounded-[--radius-lg] bg-[--color-surface-muted] border border-[--color-border] px-8 py-10 flex flex-col items-center text-center gap-5"
      style={{ minHeight: '280px', justifyContent: 'center' }}
    >
      <h1 className="text-[length:var(--size-heading-lg)] font-normal font-display text-[--color-text] leading-tight max-w-xl">
        Tu trabajo merece un mejor lugar que un chat
      </h1>
      <p className="text-sm text-[--color-text-muted] max-w-lg">
        Es Vitrina es el portafolio digital para jovenes. Publicá tus obras, recibe
        retroalimentación y participá en la revista semanal de la comunidad.
      </p>
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        <Link
          href="/signup"
          className="inline-flex items-center rounded-[--radius-md] bg-[--color-primary] px-5 py-2 text-sm font-medium text-black hover:bg-[--color-primary-hover] transition-colors"
        >
          Crea tu cuenta gratis
        </Link>
        <a
          href="#feed"
          className="inline-flex items-center rounded-[--radius-md] border border-[--color-border] bg-[--color-surface] px-5 py-2 text-sm font-medium text-[--color-text] hover:bg-[--color-surface-muted] transition-colors"
        >
          Explorar publicaciones
        </a>
      </div>
    </div>
  )
}
