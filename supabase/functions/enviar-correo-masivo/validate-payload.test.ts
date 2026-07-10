import { describe, expect, it } from 'vitest'
import { validatePayload } from './validate-payload'

describe('validatePayload', () => {
  it('accepts a valid tipo:todos payload', () => {
    const payload = { asunto: 'Aviso', cuerpo: 'Contenido del correo.', destinatarios_criterio: { tipo: 'todos' } }

    expect(validatePayload(payload)).toEqual(payload)
  })

  it('accepts a valid tipo:ciudad payload', () => {
    const payload = {
      asunto: 'Aviso',
      cuerpo: 'Contenido del correo.',
      destinatarios_criterio: { tipo: 'ciudad', valor: 'León' },
    }

    expect(validatePayload(payload)).toEqual(payload)
  })

  it('accepts a valid tipo:ids payload', () => {
    const payload = {
      asunto: 'Aviso',
      cuerpo: 'Contenido del correo.',
      destinatarios_criterio: { tipo: 'ids', valor: ['11111111-1111-1111-1111-111111111111'] },
    }

    expect(validatePayload(payload)).toEqual(payload)
  })

  it('rejects a missing or empty asunto', () => {
    expect(
      validatePayload({ cuerpo: 'Contenido.', destinatarios_criterio: { tipo: 'todos' } })
    ).toBeNull()
    expect(
      validatePayload({ asunto: '', cuerpo: 'Contenido.', destinatarios_criterio: { tipo: 'todos' } })
    ).toBeNull()
  })

  it('rejects a missing or empty cuerpo', () => {
    expect(
      validatePayload({ asunto: 'Aviso', destinatarios_criterio: { tipo: 'todos' } })
    ).toBeNull()
    expect(
      validatePayload({ asunto: 'Aviso', cuerpo: '', destinatarios_criterio: { tipo: 'todos' } })
    ).toBeNull()
  })

  it('rejects an unknown destinatarios_criterio.tipo', () => {
    expect(
      validatePayload({
        asunto: 'Aviso',
        cuerpo: 'Contenido.',
        destinatarios_criterio: { tipo: 'inexistente' },
      })
    ).toBeNull()
  })

  it('rejects tipo:ciudad with an empty or missing valor', () => {
    expect(
      validatePayload({
        asunto: 'Aviso',
        cuerpo: 'Contenido.',
        destinatarios_criterio: { tipo: 'ciudad', valor: '' },
      })
    ).toBeNull()
    expect(
      validatePayload({ asunto: 'Aviso', cuerpo: 'Contenido.', destinatarios_criterio: { tipo: 'ciudad' } })
    ).toBeNull()
  })

  it('rejects tipo:ids with an empty array or non-string entries', () => {
    expect(
      validatePayload({
        asunto: 'Aviso',
        cuerpo: 'Contenido.',
        destinatarios_criterio: { tipo: 'ids', valor: [] },
      })
    ).toBeNull()
    expect(
      validatePayload({
        asunto: 'Aviso',
        cuerpo: 'Contenido.',
        destinatarios_criterio: { tipo: 'ids', valor: [123] },
      })
    ).toBeNull()
  })

  it('rejects malformed top-level input (null, non-object)', () => {
    expect(validatePayload(null)).toBeNull()
    expect(validatePayload('not an object')).toBeNull()
    expect(validatePayload(undefined)).toBeNull()
  })
})
