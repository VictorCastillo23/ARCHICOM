// Pure validation for the `enviar-correo-masivo` request body. Plain
// TypeScript so it can run under Vitest — `./index.ts` imports this to
// reject malformed payloads before calling `resolver_destinatarios_correo`.
//
// `DestinatariosCriterio` is duplicated from `lib/types/database.ts`, not
// imported: this file is in the Deno program under `supabase/functions/**`,
// which can't resolve the Next.js `@/*` alias — a small, documented cost.

export type DestinatariosCriterio =
  | { tipo: 'todos' }
  | { tipo: 'ciudad'; valor: string }
  | { tipo: 'ids'; valor: string[] }

export type EnviarCorreoMasivoPayload = {
  asunto: string
  cuerpo: string
  destinatarios_criterio: DestinatariosCriterio
}

function isValidCriterio(value: unknown): value is DestinatariosCriterio {
  if (!value || typeof value !== 'object') return false
  const c = value as Record<string, unknown>

  if (c.tipo === 'todos') return true
  if (c.tipo === 'ciudad') return typeof c.valor === 'string' && c.valor.length > 0
  if (c.tipo === 'ids') {
    return Array.isArray(c.valor) && c.valor.length > 0 && c.valor.every((v) => typeof v === 'string')
  }
  return false
}

export function validatePayload(value: unknown): EnviarCorreoMasivoPayload | null {
  if (!value || typeof value !== 'object') return null
  const p = value as Record<string, unknown>

  if (typeof p.asunto !== 'string' || p.asunto.length === 0) return null
  if (typeof p.cuerpo !== 'string' || p.cuerpo.length === 0) return null
  if (!isValidCriterio(p.destinatarios_criterio)) return null

  return {
    asunto: p.asunto,
    cuerpo: p.cuerpo,
    destinatarios_criterio: p.destinatarios_criterio,
  }
}
