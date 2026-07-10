import { describe, expect, it } from 'vitest'
import { plainTextToHtml } from './plain-text-to-html'

describe('plainTextToHtml', () => {
  it('escapes HTML-significant characters (admin cuerpo is untrusted free-text, not HTML)', () => {
    expect(plainTextToHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    )
  })

  it('converts a single newline into a <br>', () => {
    expect(plainTextToHtml('Línea uno\nLínea dos')).toBe('Línea uno<br>Línea dos')
  })

  it('converts CRLF newlines into a single <br> each (no doubled breaks)', () => {
    expect(plainTextToHtml('Línea uno\r\nLínea dos')).toBe('Línea uno<br>Línea dos')
  })

  it('leaves plain text without newlines or special characters unchanged', () => {
    expect(plainTextToHtml('Aviso simple sin saltos de línea.')).toBe(
      'Aviso simple sin saltos de línea.'
    )
  })
})
