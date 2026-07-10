// Deno Edge Function — runs on Supabase's Deno runtime, NOT Node/Next.js.
// `verify_jwt:false` (set at deploy time): the caller is a DB Webhook with no
// user JWT, so authorization is a shared secret compared against
// `NOTIF_WEBHOOK_SECRET` (see below), not `es_admin()`.
//
// This file is intentionally thin: all pure/branching logic lives in the
// Vitest-covered siblings `./route-predicate.ts` and `../_shared/email-template.ts`.
// Excluded from `tsc --noEmit` via the `supabase/functions/**/index.ts`
// tsconfig exclude (it targets the Deno runtime — Deno.serve, Deno.env,
// npm: specifiers — not Node, so `tsc` cannot resolve it). This file is NOT
// excluded from ESLint — `eslint-config-next/typescript` lints it normally
// and it passes clean; no `eslint.config.mjs` exclusion exists or is needed.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4'
import { resolveRecipient, type WebhookPayload } from './route-predicate.ts'
import { renderEmail } from '../_shared/email-template.ts'

type PlantillaEmail = {
  titulo: string
  cuerpoHtml: () => string
}

const PLANTILLAS: Record<string, PlantillaEmail> = {
  nueva_solicitud_mensaje: {
    titulo: 'Tienes una nueva solicitud de mensaje',
    cuerpoHtml: () =>
      '<p>Alguien quiere iniciar una conversación contigo en Vitrina. Ingresa a tu bandeja de mensajes para responder.</p>',
  },
  solicitud_revista_aceptada: {
    titulo: 'Tu obra fue aceptada en una revista',
    cuerpoHtml: () =>
      '<p>Tu solicitud para publicar en una revista temática fue aceptada. Ingresa a la revista para ver tu obra publicada.</p>',
  },
}

Deno.serve(async (req: Request) => {
  const secret = Deno.env.get('NOTIF_WEBHOOK_SECRET')
  const headerSecret = req.headers.get('x-webhook-secret')
  if (!secret || headerSecret !== secret) {
    return new Response('No autorizado', { status: 401 })
  }

  let payload: WebhookPayload
  try {
    payload = await req.json()
  } catch {
    return new Response('Payload inválido', { status: 400 })
  }

  const resolution = resolveRecipient(payload)
  if (!resolution) {
    return new Response(null, { status: 204 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response('Configuración incompleta', { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data, error } = await supabase.rpc('resolver_destinatario_notificacion', {
    p_secret: secret,
    p_usuario_id: resolution.usuarioId,
  })

  if (error) {
    // Anyone holding the shared secret can reach this endpoint (verify_jwt:
    // false), so never leak the raw Postgres error in the response body —
    // log it server-side (never the secret itself) and return a fixed message.
    console.error('[enviar-notificacion-email] resolver_destinatario_notificacion RPC error', error)
    return new Response('Error al resolver destinatario', { status: 500 })
  }

  const destinatario = Array.isArray(data) ? data[0] : data
  if (!destinatario || !destinatario.notif_email_habilitado || !destinatario.email) {
    // Usuario no encontrado, opt-out, o sin email — no es un error, se omite.
    return new Response(null, { status: 204 })
  }

  const plantilla = PLANTILLAS[resolution.template]
  const html = renderEmail({
    titulo: plantilla.titulo,
    cuerpoHtml: plantilla.cuerpoHtml(),
  })

  const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
  const { error: resendError } = await resend.emails.send({
    from: Deno.env.get('NOTIF_FROM_EMAIL') ?? '',
    to: destinatario.email,
    subject: plantilla.titulo,
    html,
  })

  if (resendError) {
    // Same rationale as above: generic message out, real detail logged only.
    console.error('[enviar-notificacion-email] Resend send error', resendError)
    return new Response('Error al enviar el correo', { status: 500 })
  }

  return new Response(null, { status: 200 })
})
