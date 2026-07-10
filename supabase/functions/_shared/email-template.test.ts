import { describe, expect, it } from 'vitest'
import { renderEmail } from './email-template'

describe('renderEmail', () => {
  it('includes the given titulo and cuerpoHtml verbatim', () => {
    const html = renderEmail({
      titulo: 'Tienes una nueva solicitud de mensaje',
      cuerpoHtml: '<p>Alguien quiere hablar contigo.</p>',
    })

    expect(html).toContain('Tienes una nueva solicitud de mensaje')
    expect(html).toContain('<p>Alguien quiere hablar contigo.</p>')
  })

  it('greets by name when nombre is provided', () => {
    const html = renderEmail({
      titulo: 'Aviso',
      cuerpoHtml: '<p>Contenido.</p>',
      nombre: 'Ana',
    })

    expect(html).toContain('Hola, Ana.')
  })

  it('falls back to a generic greeting when nombre is omitted', () => {
    const html = renderEmail({
      titulo: 'Aviso',
      cuerpoHtml: '<p>Contenido.</p>',
    })

    expect(html).toContain('Hola.')
    expect(html).not.toContain('Hola, ')
  })

  it('produces a full HTML document', () => {
    const html = renderEmail({ titulo: 'Aviso', cuerpoHtml: '<p>Contenido.</p>' })

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html')
  })

  it('never includes an unsubscribe footer (locked MVP decision)', () => {
    const html = renderEmail({ titulo: 'Aviso', cuerpoHtml: '<p>Contenido.</p>' })

    const lower = html.toLowerCase()
    expect(lower).not.toContain('unsubscrib')
    expect(lower).not.toContain('darse de baja')
    expect(lower).not.toContain('cancelar suscripci')
  })

  it('escapes HTML-significant characters in titulo and nombre (XSS-in-email hardening — both fields will be admin/user free-text once PR4a lands)', () => {
    const html = renderEmail({
      titulo: '<script>alert(1)</script>',
      cuerpoHtml: '<p>Contenido de confianza.</p>',
      nombre: '<b>Ana</b>',
    })

    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('Hola, <b>Ana</b>.')
    expect(html).toContain('Hola, &lt;b&gt;Ana&lt;/b&gt;.')
  })
})
