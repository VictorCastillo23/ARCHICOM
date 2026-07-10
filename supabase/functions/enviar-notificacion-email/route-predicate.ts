// Pure routing logic for the `enviar-notificacion-email` Edge Function.
// Plain TypeScript (no Deno-only APIs) so it can run directly under Vitest —
// the Deno entrypoint (./index.ts) imports this file to decide who gets
// notified and with which template, without touching the network itself.

/** Native Supabase Database Webhook payload shape. */
export type WebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: Record<string, unknown> | null
  old_record?: Record<string, unknown> | null
}

export type EmailTemplateTipo = 'nueva_solicitud_mensaje' | 'solicitud_revista_aceptada'

export type RecipientResolution = {
  usuarioId: string
  template: EmailTemplateTipo
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

/**
 * Decides who (if anyone) should be notified for a given DB webhook event,
 * and which template to use. Returns `null` when the event should be ignored.
 */
export function resolveRecipient(payload: WebhookPayload): RecipientResolution | null {
  const { type, table, record, old_record } = payload

  if (!record) return null

  if (table === 'solicitud_mensaje' && type === 'INSERT') {
    const receptorId = asString(record.receptor_id)
    if (!receptorId) return null
    return { usuarioId: receptorId, template: 'nueva_solicitud_mensaje' }
  }

  if (table === 'solicitud_revista' && type === 'UPDATE') {
    const estado = record.estado
    const oldEstado = old_record?.estado ?? null
    if (estado === 'aceptada' && oldEstado !== 'aceptada') {
      const solicitanteId = asString(record.solicitante_id)
      if (!solicitanteId) return null
      return { usuarioId: solicitanteId, template: 'solicitud_revista_aceptada' }
    }
    return null
  }

  return null
}
