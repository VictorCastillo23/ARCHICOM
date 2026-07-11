// Pure validation for the admin bulk-email form (Fase 4b). Mirrors the shape
// of `supabase/functions/enviar-correo-masivo/validate-payload.ts` — that
// file lives in the Deno program under `supabase/functions/**` and can't
// resolve the Next.js `@/*` alias, so this is a deliberate small duplication
// across the runtime boundary (same D9 pattern already documented in
// Vitrina_BD_Conexion_Backend.md §3.21). Within Next.js itself, both new
// Route Handlers (`app/api/admin/correos/route.ts` and `.../contar/route.ts`)
// import from here instead of duplicating again.
import type { DestinatariosCriterio } from '@/lib/types/database'

export const ASUNTO_MAX = 200
export const CUERPO_MIN = 10
export const CUERPO_MAX = 5000
// Mirrors the Edge Function's LIMITE_DESTINATARIOS — surfaced client-side so
// the preview step can warn before a send is attempted and rejected.
export const LIMITE_DESTINATARIOS = 500

export function validateAsunto(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length < 1 || trimmed.length > ASUNTO_MAX) return null
  return trimmed
}

export function validateCuerpo(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (value.length < CUERPO_MIN || value.length > CUERPO_MAX) return null
  return value
}

export function validateDestinatariosCriterio(value: unknown): DestinatariosCriterio | null {
  if (!value || typeof value !== 'object') return null
  const c = value as Record<string, unknown>

  if (c.tipo === 'todos') return { tipo: 'todos' }
  if (c.tipo === 'ciudad') {
    return typeof c.valor === 'string' && c.valor.length > 0
      ? { tipo: 'ciudad', valor: c.valor }
      : null
  }
  if (c.tipo === 'ids') {
    return Array.isArray(c.valor) && c.valor.length > 0 && c.valor.every((v) => typeof v === 'string')
      ? { tipo: 'ids', valor: c.valor }
      : null
  }
  return null
}
