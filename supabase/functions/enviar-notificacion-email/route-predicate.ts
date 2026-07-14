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

export type EmailTemplateTipo =
  | 'nueva_solicitud_mensaje'
  | 'solicitud_revista_aceptada'
  | 'solicitud_revista_rechazada'
  | 'recordatorio_cierre_revista'

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
    // No `notif_app_revista` check here: this rail is driven by the UPDATE
    // itself (fires for both human `rechazar_solicitud` and automatic
    // `publicar_revista_mensual` discards), independent of the in-app
    // preference — the only real gate for this email is
    // `notif_email_habilitado`, evaluated downstream by
    // `resolver_destinatario_notificacion()`, same as `aceptada` above.
    if (estado === 'rechazada' && oldEstado !== 'rechazada') {
      const solicitanteId = asString(record.solicitante_id)
      if (!solicitanteId) return null
      return { usuarioId: solicitanteId, template: 'solicitud_revista_rechazada' }
    }
    return null
  }

  // GOTCHA: this webhook fires for EVERY `notificacion` INSERT (likes,
  // comments, aceptada, etc.) — only route the recordatorio tipo here, else
  // `null`, to avoid double-sending emails already handled by the
  // `solicitud_revista` UPDATE webhook above (or by no email at all for the
  // other in-app-only tipos).
  if (table === 'notificacion' && type === 'INSERT') {
    if (record.tipo === 'recordatorio_cierre_revista') {
      const usuarioId = asString(record.usuario_id)
      if (!usuarioId) return null
      return { usuarioId, template: 'recordatorio_cierre_revista' }
    }
    return null
  }

  return null
}
