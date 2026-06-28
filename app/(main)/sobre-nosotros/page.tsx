import type { Metadata } from 'next'
import Card from '@/components/ui/Card'

export const metadata: Metadata = {
  title: 'Sobre nosotros',
  description: 'Conoce Vitrina: nuestra misión, visión, valores y cómo contactarnos.',
}

export default function SobreNosotrosPage() {
  return (
    <div className="animate-page">
      <div className="mb-8">
        <h1 className="text-[length:var(--size-heading-lg)] font-normal font-display text-text leading-tight">
          Sobre nosotros
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Conoce el proyecto y cómo contactarnos.
        </p>
      </div>

      <section className="max-w-2xl space-y-4">
        <p className="text-text-muted leading-relaxed">
          <span className="font-semibold text-text">Vitrina</span> es un
          portafolio digital académico. Aquí los jóvenes
          publican sus creaciones — investigaciones, artículos, tesis, trabajos académicos, 
          proyectos tecnológicos, libros, escritos literarios, ilustraciones, arte visual, 
          poesía y revistas — y también recomiendan obras de terceros que vale la pena difundir.
        </p>
        <p className="text-text-muted leading-relaxed">
          La comunidad explora las obras por disciplina, las comenta y las apoya con likes.
          Los usuarios postulan sus publicaciones para componer revistas temáticas
          que se publican cada mes. Nuestra meta es darle a cada joven un espacio
          serio para mostrar su trabajo y descubrir el de sus pares.
        </p>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-text mb-4">
          Nuestra misión
        </h2>
        <p className="text-text-muted leading-relaxed">
          Democratizar la difusión del conocimiento académico y creativo de la comunidad
          juvenil, ofreciendo una plataforma digital donde jóvenes de la región
          publiquen, compartan y descubran obras de todo tipo —investigaciones, artículos, libros,
          poemas, dibujos y recomendaciones— en un espacio abierto, accesible y curado con rigor.
        </p>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-text mb-4">
          Nuestra visión
        </h2>
        <p className="text-text-muted leading-relaxed">
          Ser el portafolio digital de referencia para la comunidad académica de la región,
          reconocido por conectar talento entre instituciones, dar visibilidad al trabajo
          intelectual y artístico de cada autor, y construir una red de conocimiento colaborativa
          donde las mejores creaciones encuentren a su audiencia a través de revistas temáticas
          mensuales.
        </p>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-text mb-4">
          Nuestros valores
        </h2>
        <div className="space-y-4">
          <p className="text-text-muted leading-relaxed">
            <span className="font-semibold text-text">Apertura del conocimiento.</span>{' '}
            Creemos que el trabajo académico y creativo gana valor al compartirse. El contenido es
            de lectura pública para que cualquier persona pueda descubrir y aprender.
          </p>
          <p className="text-text-muted leading-relaxed">
            <span className="font-semibold text-text">Autoría e integridad.</span> Cada
            obra reconoce a su autor. Respetamos la propiedad intelectual, atribuimos correctamente
            las recomendaciones de terceros y moderamos activamente el plagio y el contenido
            inapropiado.
          </p>
          <p className="text-text-muted leading-relaxed">
            <span className="font-semibold text-text">Comunidad y colaboración.</span>{' '}
            Impulsamos el seguimiento entre usuarios, los comentarios y la curaduría compartida para
            que el conocimiento circule y se enriquezca colectivamente.
          </p>
          <p className="text-text-muted leading-relaxed">
            <span className="font-semibold text-text">Calidad curada.</span> A través de
            revistas temáticas y un proceso de selección transparente, destacamos las contribuciones
            más relevantes sin cerrar las puertas a nadie.
          </p>
          <p className="text-text-muted leading-relaxed">
            <span className="font-semibold text-text">Confianza y seguridad.</span>{' '}
            Protegemos los datos y la privacidad de cada usuario, garantizamos que cada quien
            controle su propia información y mantenemos un entorno respetuoso mediante herramientas
            de moderación.
          </p>
          <p className="text-text-muted leading-relaxed">
            <span className="font-semibold text-text">Equidad institucional.</span> Damos
            el mismo espacio a jóvenes de cualquier universidad o disciplina, tendiendo puentes
            entre instituciones, áreas del saber y formas de expresión.
          </p>
        </div>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-text mb-4">
          Contacto
        </h2>
        <Card as="section">
          <dl className="space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
              <dt className="text-sm text-text-muted sm:w-24">Email</dt>
              <dd>
                <a
                  href="mailto:contacto@esvitrina.com"
                  className="text-primary hover:text-primary-hover transition-colors"
                >
                  contacto@esvitrina.com
                </a>
              </dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
              <dt className="text-sm text-text-muted sm:w-24">LinkedIn</dt>
              <dd>
                <a
                  href="https://www.linkedin.com/in/dev-victor-castillo-olivetto"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-hover transition-colors"
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
