// Postulation window for the monthly revista cycle. Días 2-25 (inclusive) of
// the month, evaluated in Mexico City local time, are "open"; día 1 and día
// 26 through month-end are "closed" (editorial curation).
//
// Día 1 is excluded unconditionally, not just as a "pre-cron" special case:
// `public.revista` has no `creado_en` column, so there is no schema-safe way
// to detect whether the monthly rotation cron (día 1, 13:00 MX) already ran.
// Closing all of día 1 avoids that ambiguity without a schema change.
export const TIME_ZONE = 'America/Mexico_City'
export const DIA_APERTURA_VENTANA = 2
export const DIA_CIERRE_VENTANA = 25

export interface EstadoVentana {
  abierta: boolean
  diaActual: number
  /** `null` (never `0`) when closed — makes "closed" impossible to confuse with "open, zero days left". */
  diasRestantes: number | null
}

/**
 * Derives the current postulation window from the MX-local calendar day.
 * Pure function — accepts an optional `now` for testability, never reads
 * the system clock internally beyond the default parameter.
 */
export function getEstadoVentanaPostulacion(now: Date = new Date()): EstadoVentana {
  // Only the Intl timeZone path is correct near the UTC/MX boundary —
  // `Date.getUTCDate()`/`Date.getDate()` would misclassify the day for
  // several hours around midnight MX.
  const diaActual = Number(
    new Intl.DateTimeFormat('es-MX', { timeZone: TIME_ZONE, day: 'numeric' }).format(now)
  )

  const abierta = diaActual >= DIA_APERTURA_VENTANA && diaActual <= DIA_CIERRE_VENTANA
  const diasRestantes = abierta ? DIA_CIERRE_VENTANA - diaActual + 1 : null

  return { abierta, diaActual, diasRestantes }
}

/** UI label for `diasRestantes` — never renders a numeric zero. */
export function labelDiasRestantes(diasRestantes: number | null): string {
  if (diasRestantes === null) return 'En curación editorial'
  if (diasRestantes === 1) return 'Último día'
  return `${diasRestantes} días restantes`
}
