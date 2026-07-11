import { describe, expect, it } from 'vitest'
import {
  ASUNTO_MAX,
  CUERPO_MAX,
  CUERPO_MIN,
  validateAsunto,
  validateCuerpo,
  validateDestinatariosCriterio,
} from './correoAdmin'

describe('validateAsunto', () => {
  it('accepts a normal subject and trims it', () => {
    expect(validateAsunto('  Nuevo número de la revista  ')).toBe('Nuevo número de la revista')
  })

  it('rejects empty/whitespace-only', () => {
    expect(validateAsunto('')).toBeNull()
    expect(validateAsunto('   ')).toBeNull()
  })

  it('rejects over the max length', () => {
    expect(validateAsunto('a'.repeat(ASUNTO_MAX + 1))).toBeNull()
  })

  it('accepts exactly the max length', () => {
    expect(validateAsunto('a'.repeat(ASUNTO_MAX))).toBe('a'.repeat(ASUNTO_MAX))
  })

  it('rejects non-strings', () => {
    expect(validateAsunto(123)).toBeNull()
    expect(validateAsunto(undefined)).toBeNull()
  })
})

describe('validateCuerpo', () => {
  it('rejects under the minimum length', () => {
    expect(validateCuerpo('a'.repeat(CUERPO_MIN - 1))).toBeNull()
  })

  it('accepts exactly the minimum length', () => {
    expect(validateCuerpo('a'.repeat(CUERPO_MIN))).toBe('a'.repeat(CUERPO_MIN))
  })

  it('rejects over the max length', () => {
    expect(validateCuerpo('a'.repeat(CUERPO_MAX + 1))).toBeNull()
  })

  it('does not trim (plain text is sent as-is; HTML-escaping happens in the Edge Function)', () => {
    const body = `  ${'a'.repeat(CUERPO_MIN)}  `
    expect(validateCuerpo(body)).toBe(body)
  })
})

describe('validateDestinatariosCriterio', () => {
  it('accepts tipo: todos', () => {
    expect(validateDestinatariosCriterio({ tipo: 'todos' })).toEqual({ tipo: 'todos' })
  })

  it('accepts tipo: ciudad with a non-empty valor', () => {
    expect(validateDestinatariosCriterio({ tipo: 'ciudad', valor: 'León' })).toEqual({
      tipo: 'ciudad',
      valor: 'León',
    })
  })

  it('rejects tipo: ciudad with an empty valor', () => {
    expect(validateDestinatariosCriterio({ tipo: 'ciudad', valor: '' })).toBeNull()
  })

  it('accepts tipo: ids with a non-empty string array', () => {
    expect(validateDestinatariosCriterio({ tipo: 'ids', valor: ['a', 'b'] })).toEqual({
      tipo: 'ids',
      valor: ['a', 'b'],
    })
  })

  it('rejects tipo: ids with an empty array', () => {
    expect(validateDestinatariosCriterio({ tipo: 'ids', valor: [] })).toBeNull()
  })

  it('rejects tipo: ids with non-string entries', () => {
    expect(validateDestinatariosCriterio({ tipo: 'ids', valor: [1, 2] })).toBeNull()
  })

  it('rejects an unknown tipo', () => {
    expect(validateDestinatariosCriterio({ tipo: 'todos_menos_uno' })).toBeNull()
  })

  it('rejects non-objects', () => {
    expect(validateDestinatariosCriterio(null)).toBeNull()
    expect(validateDestinatariosCriterio('todos')).toBeNull()
  })
})
