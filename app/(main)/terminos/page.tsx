import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Términos de servicio',
  description: 'Términos de Servicio de Vitrina: condiciones de uso de la plataforma.',
}

export default function TerminosPage() {
  return (
    <div className="animate-page">
      <div className="mb-8">
        <h1 className="text-[length:var(--size-heading-lg)] font-normal font-display text-text leading-tight">
          Términos de servicio
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Versión 1.3 · Última actualización: 12 de julio de 2026.
        </p>
      </div>

      <section className="max-w-2xl space-y-4">
        <p className="text-text-muted leading-relaxed">
          Lee estos Términos de Servicio (&laquo;Términos&raquo;) con atención antes de
          registrarte o usar Vitrina. Al crear una cuenta o utilizar la plataforma, aceptas
          quedar vinculado por estos Términos. Si no estás de acuerdo, no debes usar el servicio.
        </p>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-text mb-4">
          1. Descripción del servicio
        </h2>
        <div className="space-y-4">
          <p className="text-text-muted leading-relaxed">
            Vitrina es un portafolio digital y red de difusión académica que permite a sus
            usuarios publicar, compartir y descubrir creaciones de carácter académico, artístico
            y de investigación —libros, artículos, investigaciones, poemas, dibujos,
            recomendaciones de obras de terceros y otros formatos.
          </p>
          <p className="text-text-muted leading-relaxed">
            El servicio incluye, entre otras, las siguientes funcionalidades:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-text-muted leading-relaxed">
            <li>Publicación de obras propias con archivos adjuntos (PDF e imágenes).</li>
            <li>
              Recomendación de obras de terceros con la debida atribución a su autor original.
            </li>
            <li>
              Interacción social mediante comentarios, &laquo;me gusta&raquo; y seguimiento de
              otros usuarios.
            </li>
            <li>
              Mensajería privada entre usuarios que se siguen mutuamente, incluida la posibilidad
              de enviar una solicitud de mensaje para iniciar la conversación.
            </li>
            <li>Postulación de obras a la revista mensual curada de la comunidad.</li>
            <li>
              Búsqueda de publicaciones y perfiles, incluida la búsqueda por el contenido de los
              documentos PDF publicados, y gestión de enlaces de perfil.
            </li>
            <li>
              Un asistente de preguntas y respuestas que, a partir del contenido de un documento PDF
              publicado, responde consultas sobre dicho documento.
            </li>
          </ul>
          <p className="text-text-muted leading-relaxed">
            Vitrina se ofrece &laquo;tal cual&raquo; y puede modificarse, suspenderse o
            discontinuarse total o parcialmente en cualquier momento.
          </p>
        </div>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-text mb-4">
          2. Elegibilidad y cuentas
        </h2>
        <div className="space-y-4">
          <p className="text-text-muted leading-relaxed">
            <span className="font-semibold text-text">Registro.</span> Para acceder a
            las funciones interactivas debes crear una cuenta proporcionando un nombre, un correo
            electrónico válido y una contraseña. Eres responsable de la veracidad de los datos que
            proporcionas.
          </p>
          <p className="text-text-muted leading-relaxed">
            <span className="font-semibold text-text">Seguridad de la cuenta.</span> Tu
            contraseña debe tener entre 8 y 72 caracteres. Eres el único responsable de mantener la
            confidencialidad de tus credenciales y de toda actividad que ocurra bajo tu cuenta, y
            debes notificar de inmediato cualquier uso no autorizado.
          </p>
          <p className="text-text-muted leading-relaxed">
            <span className="font-semibold text-text">Roles.</span> Existen dos tipos de
            cuenta: usuario (rol por defecto al registrarse) y administrador. Los administradores
            cuentan con facultades adicionales de moderación y curación descritas en estos
            Términos. La asignación del rol de administrador queda a discreción de Vitrina.
          </p>
        </div>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-text mb-4">
          3. Contenido del usuario
        </h2>
        <div className="space-y-4">
          <p className="text-text-muted leading-relaxed">
            <span className="font-semibold text-text">Titularidad.</span> Conservas
            todos los derechos de propiedad intelectual sobre las obras originales que publiques.
            Vitrina no reclama la propiedad de tu contenido.
          </p>
          <p className="text-text-muted leading-relaxed">
            <span className="font-semibold text-text">Licencia que nos otorgas.</span>{' '}
            Al publicar contenido, concedes a Vitrina una licencia mundial, no exclusiva y libre de
            regalías para alojar, almacenar, reproducir, mostrar, distribuir y <span className="font-semibold text-text">procesar</span>{' '}
            dicho contenido con el único fin de operar y ofrecer el servicio (por ejemplo, mostrar tu
            obra en el feed, en tu perfil o en la revista mensual, e indexar el contenido de tus
            documentos PDF para habilitar la búsqueda y el asistente descritos en la cláusula 9).
            Esta licencia termina cuando eliminas el contenido, salvo por copias residuales en
            respaldos.
          </p>
          <p className="text-text-muted leading-relaxed">
            <span className="font-semibold text-text">Tus declaraciones.</span> Al
            publicar declaras y garantizas que:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-text-muted leading-relaxed">
            <li>
              Eres el autor de la obra, o cuentas con los derechos o permisos necesarios para
              publicarla.
            </li>
            <li>
              Cuando publiques una recomendación de obra de terceros, atribuirás correctamente al
              autor original y, cuando corresponda, enlazarás a la fuente. La función de
              recomendación no transfiere la autoría de la obra recomendada.
            </li>
            <li>
              Tu contenido no infringe derechos de autor, marcas, privacidad ni otros derechos de
              terceros.
            </li>
          </ul>
          <p className="text-text-muted leading-relaxed">
            <span className="font-semibold text-text">Archivos.</span> Los archivos
            adjuntos se limitan a formatos PDF e imágenes (JPG, PNG), con un tamaño máximo de 10 MB
            por archivo. Eres responsable del contenido de los archivos que subas.
          </p>
        </div>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-text mb-4">
          4. Conducta aceptable
        </h2>
        <div className="space-y-4">
          <p className="text-text-muted leading-relaxed">
            Te comprometes a no usar Vitrina para:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-text-muted leading-relaxed">
            <li>
              Publicar contenido ilegal, difamatorio, fraudulento, que incite al odio o que sea
              sexualmente explícito.
            </li>
            <li>
              Infringir derechos de propiedad intelectual de terceros o cometer plagio.
            </li>
            <li>Distribuir spam, malware o contenido engañoso.</li>
            <li>Acosar, suplantar o vulnerar la privacidad de otras personas.</li>
            <li>
              Utilizar la mensajería privada para acosar, enviar spam, contenido no solicitado o
              cualquier material prohibido por estos Términos.
            </li>
            <li>
              Intentar acceder sin autorización a la plataforma, a las cuentas de otros usuarios o
              a la infraestructura subyacente.
            </li>
            <li>
              Eludir o interferir con los mecanismos de seguridad, moderación o control de acceso
              del servicio.
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-text mb-4">
          5. Moderación y reportes
        </h2>
        <div className="space-y-4">
          <p className="text-text-muted leading-relaxed">
            <span className="font-semibold text-text">Reportes.</span> Cualquier usuario
            autenticado puede reportar una publicación que considere inapropiada, indicando un
            motivo (contenido inapropiado, plagio, spam u otro) y un detalle opcional. Cada usuario
            puede reportar una misma publicación una sola vez.
          </p>
          <p className="text-text-muted leading-relaxed">
            <span className="font-semibold text-text">Decisiones de moderación.</span>{' '}
            Los administradores revisan los reportes y pueden bloquear una publicación (ocultándola
            del público) o descartar el reporte. Una publicación bloqueada deja de ser visible para
            el resto de los usuarios, aunque su autor puede seguir viéndola.
          </p>
          <p className="text-text-muted leading-relaxed">
            <span className="font-semibold text-text">Eliminación.</span> Los
            administradores pueden eliminar cualquier publicación que infrinja estos Términos. El
            usuario autor también puede eliminar sus propias publicaciones en cualquier momento. La
            eliminación de una publicación arrastra de forma irreversible sus comentarios,
            &laquo;me gusta&raquo;, etiquetas y postulaciones asociadas.
          </p>
          <p className="text-text-muted leading-relaxed">
            Vitrina no garantiza revisar todo el contenido, pero se reserva el derecho de hacerlo y
            de actuar a su discreción.
          </p>
        </div>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-text mb-4">
          6. Revista mensual
        </h2>
        <div className="space-y-4">
          <p className="text-text-muted leading-relaxed">
            Vitrina publica una revista temática que se renueva cada mes. El funcionamiento es
            el siguiente:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-text-muted leading-relaxed">
            <li>Solo el autor de una obra puede postularla a la edición activa del mes.</li>
            <li>
              La curación de las solicitudes (aceptar o rechazar) corresponde a los
              administradores.
            </li>
            <li>
              El cierre y la publicación de cada edición se realizan de forma automática el primer
              día de cada mes (13:00, hora de México); las solicitudes que sigan pendientes al
              cierre se rechazan automáticamente y se abre una nueva edición para el mes siguiente.
            </li>
            <li>
              La inclusión de una obra en la revista no genera contraprestación económica ni
              transfiere derechos sobre la obra más allá de la licencia descrita en la cláusula 3.
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-text mb-4">
          7. Mensajería privada
        </h2>
        <div className="space-y-4">
          <p className="text-text-muted leading-relaxed">
            <span className="font-semibold text-text">Quién puede escribirte.</span> La mensajería
            directa entre dos usuarios solo se habilita cuando ambos se siguen mutuamente. Mientras
            no exista seguimiento mutuo no es posible enviar ni recibir mensajes con esa persona.
          </p>
          <p className="text-text-muted leading-relaxed">
            <span className="font-semibold text-text">Solicitudes de mensaje.</span> Si todavía no
            se siguen mutuamente, puedes enviar una solicitud de mensaje. Al hacerlo comenzarás a
            seguir automáticamente a esa persona y le llegará tu solicitud. Si la acepta, comenzará
            a seguirte de vuelta y quedará habilitada la conversación; si la rechaza, no se inicia
            ninguna conversación.
          </p>
          <p className="text-text-muted leading-relaxed">
            <span className="font-semibold text-text">Privacidad de los mensajes.</span> Tus
            conversaciones privadas solo son visibles para los participantes; el control de acceso a
            nivel de base de datos impide que terceros las lean. Los mensajes no están cifrados de
            extremo a extremo y se almacenan en la infraestructura del servicio. Vitrina no revisa
            de forma rutinaria los mensajes privados, pero podrá acceder a ellos cuando sea
            estrictamente necesario para cumplir la ley, atender un requerimiento de autoridad
            competente, investigar abusos o hacer cumplir estos Términos.
          </p>
          <p className="text-text-muted leading-relaxed">
            <span className="font-semibold text-text">Conducta.</span> Las normas de la cláusula 4
            se aplican íntegramente a la mensajería privada. El uso indebido puede derivar en la
            suspensión o cancelación de tu cuenta.
          </p>
        </div>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-text mb-4">
          8. Colecciones
        </h2>
        <div className="space-y-4">
          <p className="text-text-muted leading-relaxed">
            Puedes crear colecciones para organizar publicaciones propias o de otros usuarios, con
            visibilidad &laquo;pública&raquo; o &laquo;privada&raquo;.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-text-muted leading-relaxed">
            <li>Las colecciones privadas solo son visibles para ti.</li>
            <li>
              Las colecciones públicas —incluidos su título, descripción y las publicaciones que
              contienen— son visibles para cualquier visitante, incluso sin sesión iniciada.
            </li>
            <li>
              Agregar una publicación a una colección no te transfiere ningún derecho sobre ella ni
              modifica su visibilidad original: una publicación bloqueada o eliminada deja de
              aparecer en las colecciones que la incluían.
            </li>
            <li>
              Puedes eliminar tus colecciones en cualquier momento; esto no elimina las
              publicaciones que contenían, solo la lista que las agrupaba.
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-text mb-4">
          9. Indexado, búsqueda y asistente de documentos
        </h2>
        <div className="space-y-4">
          <p className="text-text-muted leading-relaxed">
            <span className="font-semibold text-text">Indexado automático.</span> Cuando publicas o
            editas una obra con un archivo PDF, la plataforma procesa automáticamente su contenido:
            extrae el texto y genera representaciones numéricas (&laquo;embeddings&raquo;) que se
            almacenan para habilitar la búsqueda por contenido y el asistente de preguntas y
            respuestas. Este procesamiento ocurre sin intervención manual y puede repetirse cuando
            guardas cambios en la publicación o reemplazas el archivo.
          </p>
          <p className="text-text-muted leading-relaxed">
            <span className="font-semibold text-text">Asistente de preguntas y respuestas —
            opcional.</span> El asistente de preguntas y respuestas es una función que el autor de la
            obra activa o desactiva de forma independiente para cada publicación con PDF; está
            desactivada de forma predeterminada en las publicaciones nuevas. El indexado automático
            descrito arriba ocurre igualmente, esté o no activado el asistente, para que el autor
            pueda habilitarlo en cualquier momento sin demora. Cuando está activado, los usuarios con
            sesión iniciada pueden formular preguntas sobre ese documento; las respuestas las genera
            un modelo de inteligencia artificial a partir del contenido de ese documento (título,
            resumen y fragmentos recuperados), no del conocimiento general del modelo. Para generar
            cada respuesta, los fragmentos pertinentes y tu pregunta se envían a un proveedor de
            modelos de inteligencia artificial con el único fin de producir la respuesta.
          </p>
          <p className="text-text-muted leading-relaxed">
            <span className="font-semibold text-text">Uso limitado.</span> El contenido que publicas
            y las preguntas que formulas se utilizan únicamente para operar el servicio (búsqueda y
            asistente). <span className="font-semibold text-text">No se emplean para entrenar modelos
            de inteligencia artificial.</span>
          </p>
          <p className="text-text-muted leading-relaxed">
            <span className="font-semibold text-text">Límites y exactitud.</span> El asistente puede
            cometer errores, omitir información o malinterpretar el documento; sus respuestas no
            constituyen asesoría profesional y no deben tomarse como definitivas. Para prevenir
            abusos y controlar costos, la cantidad de preguntas por cuenta está limitada por hora.
          </p>
        </div>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-text mb-4">
          10. Notificaciones por correo electrónico
        </h2>
        <div className="space-y-4">
          <p className="text-text-muted leading-relaxed">
            Vitrina puede enviarte comunicaciones a la dirección de correo electrónico con la que
            te registraste. Distinguimos dos tipos:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-text-muted leading-relaxed">
            <li>
              <span className="font-semibold text-text">Notificaciones transaccionales</span>{' '}
              ligadas a tu actividad en la plataforma —por ejemplo, cuando recibes una solicitud de
              mensaje o cuando una obra tuya es aceptada en la revista mensual.
            </li>
            <li>
              <span className="font-semibold text-text">Comunicaciones de los administradores</span>{' '}
              dirigidas a la comunidad de usuarios, que pueden enviarse a todos los usuarios, a un
              subconjunto por ciudad o a usuarios seleccionados individualmente.
            </li>
          </ul>
          <p className="text-text-muted leading-relaxed">
            Puedes desactivar la recepción de ambos tipos de correo en cualquier momento desde
            Ajustes de tu perfil (<span className="font-semibold text-text">/perfil/ajustes</span>
            ); un mismo interruptor controla las dos categorías. Esta preferencia no afecta a los
            correos estrictamente necesarios para el funcionamiento de tu cuenta (por ejemplo,
            confirmación de registro o recuperación de acceso), que gestiona directamente nuestro
            proveedor de autenticación y no puede desactivarse.
          </p>
        </div>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-text mb-4">
          11. Privacidad y datos personales
        </h2>
        <div className="space-y-4">
          <ul className="list-disc pl-5 space-y-1 text-text-muted leading-relaxed">
            <li>
              Recopilamos los datos necesarios para operar el servicio: nombre, correo electrónico
              y, opcionalmente, institución, carrera, ciudad y enlaces de perfil.
            </li>
            <li>
              Tu correo electrónico no se muestra públicamente a otros usuarios; se utiliza para
              autenticación y para las comunicaciones descritas en la cláusula 10.
            </li>
            <li>
              Cierta información de tu perfil (nombre, institución, carrera, publicaciones, enlaces
              y conteos de seguidores) es de carácter público y visible para cualquier visitante,
              incluso sin sesión iniciada.
            </li>
            <li>
              El contenido de tus mensajes privados solo es accesible para los participantes de la
              conversación; se almacena en el servicio (sin cifrado de extremo a extremo) y no se
              comparte públicamente.
            </li>
            <li>
              El contenido de tus documentos PDF se procesa de forma automatizada (extracción de
              texto y generación de &laquo;embeddings&raquo;) para habilitar la búsqueda por
              contenido y el asistente de documentos, conforme a la cláusula 9. Este procesamiento no
              se utiliza para entrenar modelos de inteligencia artificial.
            </li>
            <li>
              Aplicamos medidas técnicas razonables para proteger tus datos, incluido el control de
              acceso a nivel de base de datos. Sin embargo, ningún sistema es completamente seguro y
              no podemos garantizar seguridad absoluta.
            </li>
          </ul>
          <p className="text-text-muted leading-relaxed">
            El tratamiento de tus datos se rige por la legislación aplicable en materia de
            protección de datos personales en México.
          </p>
        </div>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-text mb-4">
          12. Propiedad intelectual de la plataforma
        </h2>
        <p className="text-text-muted leading-relaxed">
          El software, el diseño, la marca &laquo;Vitrina&raquo;, los logotipos y los demás
          elementos de la plataforma son propiedad de Vitrina o de sus licenciantes y están
          protegidos por las leyes de propiedad intelectual. No se te otorga ningún derecho sobre
          ellos salvo el uso del servicio conforme a estos Términos.
        </p>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-text mb-4">
          13. Terminación
        </h2>
        <ul className="list-disc pl-5 space-y-1 text-text-muted leading-relaxed">
          <li>
            Puedes dejar de usar el servicio en cualquier momento. Para eliminar tu cuenta,
            comunícate con el equipo de soporte de la plataforma; al ejecutarse la baja se eliminan
            en cascada tus publicaciones, comentarios, &laquo;me gusta&raquo;, enlaces, relaciones
            de seguimiento, conversaciones y mensajes, colecciones y postulaciones.
          </li>
          <li>
            Podemos suspender o cancelar tu cuenta, con o sin aviso previo, si incumples estos
            Términos o si tu conducta perjudica a otros usuarios o al servicio.
          </li>
        </ul>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-text mb-4">
          14. Exención de garantías
        </h2>
        <p className="text-text-muted leading-relaxed">
          El servicio se proporciona &laquo;tal cual&raquo; y &laquo;según disponibilidad&raquo;,
          sin garantías de ningún tipo, expresas o implícitas, incluyendo —sin limitarse a—
          garantías de comerciabilidad, idoneidad para un fin particular, disponibilidad
          ininterrumpida o ausencia de errores. No garantizamos que el contenido publicado por
          otros usuarios sea exacto, legal o adecuado, ni que las respuestas del asistente de
          documentos (generadas por inteligencia artificial) sean exactas, completas o libres de
          errores; no debes basarte en ellas como única fuente.
        </p>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-text mb-4">
          15. Limitación de responsabilidad
        </h2>
        <p className="text-text-muted leading-relaxed">
          En la máxima medida permitida por la ley, Vitrina no será responsable por daños
          indirectos, incidentales, especiales o consecuentes derivados del uso o la imposibilidad
          de uso del servicio, ni por la pérdida de contenido, datos o beneficios. Eres responsable
          de mantener tus propios respaldos de las obras que consideres importantes.
        </p>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-text mb-4">
          16. Modificaciones a los Términos
        </h2>
        <p className="text-text-muted leading-relaxed">
          Podemos actualizar estos Términos en cualquier momento. Cuando los cambios sean
          sustanciales, lo notificaremos por medios razonables dentro de la plataforma. El uso
          continuado del servicio tras la entrada en vigor de los cambios constituye tu aceptación
          de los Términos modificados.
        </p>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-text mb-4">
          17. Ley aplicable
        </h2>
        <p className="text-text-muted leading-relaxed">
          Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier
          controversia se someterá a los tribunales competentes correspondientes, sin perjuicio de
          los derechos que la ley reconozca a los consumidores.
        </p>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-[length:var(--size-heading-sm)] font-normal font-display text-text mb-4">
          18. Contacto
        </h2>
        <p className="text-text-muted leading-relaxed">
          Para preguntas sobre estos Términos, reportes o solicitudes relacionadas con tu cuenta,
          comunícate con el equipo de Vitrina a través de los canales de soporte de la plataforma.
        </p>
      </section>
    </div>
  )
}
