import type { Metadata } from 'next'
import Card from '@/components/ui/Card'

export const metadata: Metadata = {
  title: 'Sobre nosotros',
  description: 'Conocé Vitrina y cómo contactarnos.',
}

export default function SobreNosotrosPage() {
  return (
    <div className="animate-page">
      <div className="mb-8">
        <h1 className="text-[length:var(--size-heading-lg)] font-normal font-display text-[--color-text] leading-tight">
          Sobre nosotros
        </h1>
        <p className="mt-2 text-sm text-[--color-text-muted]">
          Conocé el proyecto y cómo contactarnos.
        </p>
      </div>

      <section className="max-w-2xl space-y-4">
        <p className="text-[--color-text-muted] leading-relaxed">
          <span className="font-semibold text-[--color-text]">Vitrina</span> es un
          portafolio digital académico para la comunidad universitaria. Acá los estudiantes
          publican sus creaciones — investigaciones, artículos, tesis, trabajos académicos, 
          proyectos tecnológicos, libros, escritos literarios, ilustraciones, arte visual, 
          poesía y revistas — y también recomiendan obras de terceros que vale la pena difundir.
        </p>
        <p className="text-[--color-text-muted] leading-relaxed">
          La comunidad explora las obras por disciplina, las comenta y las apoya con likes.
          Los administradores seleccionan las más destacadas para componer revistas temáticas
          que se publican cada semana. Nuestra meta es darle a cada estudiante un espacio
          serio para mostrar su trabajo y descubrir el de sus pares.
        </p>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-[--color-text] mb-4">
          Contacto
        </h2>
        <Card as="section">
          <dl className="space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
              <dt className="text-sm text-[--color-text-muted] sm:w-24">Email</dt>
              <dd>
                <a
                  href="mailto:contacto@esvitrina.com"
                  className="text-[--color-primary] hover:text-[--color-primary-hover] transition-colors"
                >
                  contacto@esvitrina.com
                </a>
              </dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
              <dt className="text-sm text-[--color-text-muted] sm:w-24">LinkedIn</dt>
              <dd>
                <a
                  href="https://www.linkedin.com/in/dev-victor-castillo-olivetto"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[--color-primary] hover:text-[--color-primary-hover] transition-colors"
                >
                  Victor Castillo Olivetto
                </a>
              </dd>
            </div>
          </dl>
        </Card>
      </section>
    </div>
  )
}
