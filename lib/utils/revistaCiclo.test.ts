import { describe, expect, it } from 'vitest'
import {
  DIA_CIERRE_VENTANA,
  getEstadoVentanaPostulacion,
  labelDiasRestantes,
} from './revistaCiclo'

// Builds a UTC Date whose Mexico City (fixed UTC-6, DST abolished 2022)
// local day is exactly `dia`, at a MX-local hour that stays clear of the
// day boundary.
function mxDate(month: number, dia: number, mxHour = 12): Date {
  return new Date(Date.UTC(2026, month - 1, dia, mxHour + 6, 0, 0))
}

describe('getEstadoVentanaPostulacion', () => {
  it('día 1 is closed unconditionally', () => {
    expect(getEstadoVentanaPostulacion(mxDate(7, 1))).toEqual({
      abierta: false,
      diaActual: 1,
      diasRestantes: null,
    })
  })

  it('día 2 is the first open day', () => {
    const estado = getEstadoVentanaPostulacion(mxDate(7, 2))
    expect(estado.abierta).toBe(true)
    expect(estado.diasRestantes).toBe(DIA_CIERRE_VENTANA - 2 + 1) // 24
  })

  it('día 25 is the last open day, with 1 día restante', () => {
    expect(getEstadoVentanaPostulacion(mxDate(7, 25))).toEqual({
      abierta: true,
      diaActual: 25,
      diasRestantes: 1,
    })
  })

  it('día 26 closes the window', () => {
    expect(getEstadoVentanaPostulacion(mxDate(7, 26))).toEqual({
      abierta: false,
      diaActual: 26,
      diasRestantes: null,
    })
  })

  it('día 31 (real 31-day month) stays closed', () => {
    expect(getEstadoVentanaPostulacion(mxDate(7, 31))).toEqual({
      abierta: false,
      diaActual: 31,
      diasRestantes: null,
    })
  })

  it('resolves the MX-local day, not the raw UTC day, near the UTC/MX boundary', () => {
    // 2026-07-26T04:00:00Z is 2026-07-25 22:00 in Mexico City (UTC-6) — día 25, still open.
    const estado = getEstadoVentanaPostulacion(new Date('2026-07-26T04:00:00Z'))
    expect(estado.diaActual).toBe(25)
    expect(estado.abierta).toBe(true)
    expect(estado.diasRestantes).toBe(1)
  })
})

describe('labelDiasRestantes', () => {
  it('returns the curation label for null (never a numeric zero)', () => {
    expect(labelDiasRestantes(null)).toBe('En curación editorial')
  })

  it('returns "Último día" for 1', () => {
    expect(labelDiasRestantes(1)).toBe('Último día')
  })

  it('returns "N días restantes" for other values', () => {
    expect(labelDiasRestantes(24)).toBe('24 días restantes')
  })
})
