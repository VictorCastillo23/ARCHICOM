import { describe, expect, it } from 'vitest'
import { MAGIC_BYTES, extensionForMime, matchesMagicBytes } from './validateFile'

function header(mime: string, ...extraBytes: number[]): Uint8Array {
  return new Uint8Array([...MAGIC_BYTES[mime], ...extraBytes])
}

describe('extensionForMime', () => {
  it('maps application/pdf to pdf', () => {
    expect(extensionForMime('application/pdf')).toBe('pdf')
  })

  it('maps image/jpeg to jpg', () => {
    expect(extensionForMime('image/jpeg')).toBe('jpg')
  })

  it('maps image/png to png', () => {
    expect(extensionForMime('image/png')).toBe('png')
  })

  it('returns null for a disallowed mimetype', () => {
    expect(extensionForMime('application/zip')).toBeNull()
  })
})

describe('matchesMagicBytes', () => {
  it('accepts a valid pdf header', () => {
    expect(matchesMagicBytes(header('application/pdf'), 'application/pdf')).toBe(true)
  })

  it('accepts a valid jpeg header (3-byte signature)', () => {
    expect(matchesMagicBytes(header('image/jpeg'), 'image/jpeg')).toBe(true)
  })

  it('accepts a valid png header', () => {
    expect(matchesMagicBytes(header('image/png'), 'image/png')).toBe(true)
  })

  it('rejects a buffer whose bytes do not match the declared mimetype', () => {
    // Declares png but sends pdf's actual magic bytes.
    expect(matchesMagicBytes(header('application/pdf'), 'image/png')).toBe(false)
  })

  it('rejects a jpeg-declared buffer carrying png bytes', () => {
    expect(matchesMagicBytes(header('image/png'), 'image/jpeg')).toBe(false)
  })

  it('rejects an empty buffer without throwing', () => {
    expect(() => matchesMagicBytes(new Uint8Array(), 'application/pdf')).not.toThrow()
    expect(matchesMagicBytes(new Uint8Array(), 'application/pdf')).toBe(false)
  })

  it('rejects a truncated buffer shorter than the signature length without throwing', () => {
    const truncated = header('application/pdf').slice(0, 2)
    expect(() => matchesMagicBytes(truncated, 'application/pdf')).not.toThrow()
    expect(matchesMagicBytes(truncated, 'application/pdf')).toBe(false)
  })

  it('rejects a disallowed/unrecognized mimetype', () => {
    expect(matchesMagicBytes(header('application/pdf'), 'application/zip')).toBe(false)
  })
})
