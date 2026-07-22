// Deno Edge Function — runs on Supabase's Deno runtime, NOT Node/Next.js.
// `verify_jwt:true` (set at deploy time): the caller is the admin Route
// Handler (`app/api/admin/correos/route.ts`, PR4b) via
// `admin.functions.invoke(...)`, which forwards the admin's JWT — no
// `service_role` anywhere.
//
// SECURITY CONTRACT (revised after a risk review, see BD §3.21 for the full
// rationale): this function does NOT accept a pre-resolved recipient list —
// that would let any admin bypass the `notif_email_habilitado` opt-out
// filter by hand-constructing `destinatarios`, or relay to arbitrary
// addresses. It receives `{asunto, cuerpo, destinatarios_criterio}` and
// resolves recipients ITSELF via `resolver_destinatarios_correo`, which is
// also that RPC's own `es_admin()` gate — so no separate `rpc('es_admin')`
// check is needed. Never queries `usuario` directly.
//
// Intentionally thin: pure/branching logic lives in the Vitest-covered
// siblings `./validate-payload.ts`, `./chunk.ts`, and
// `./plain-text-to-html.ts` (turns the admin's untrusted plain-text `cuerpo`
// into safe HTML before `../_shared/email-template.ts`'s `renderEmail`,
// which does NOT escape `cuerpoHtml` by design).
//
// Excluded from `tsc --noEmit` via the `supabase/functions/**/index.ts`
// tsconfig exclude (targets Deno, not Node). NOT excluded from ESLint —
// `eslint-config-next/typescript` lints it normally and it passes clean.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4'
import { chunk } from './chunk.ts'
import { plainTextToHtml } from './plain-text-to-html.ts'
import { validatePayload } from './validate-payload.ts'
import { renderEmail, renderEmailText } from '../_shared/email-template.ts'

const LOTE_MAX = 50
// MVP mitigation, not full queueing/checkpointing (out of scope for this
// MVP): an unbounded 'todos' send with no progress tracking could leave
// `correo_admin.estado` stuck at 'pendiente' forever if the runtime is
// killed mid-send. Rejecting oversized sends upfront bounds the worst case.
const LIMITE_DESTINATARIOS = 500

type Destinatario = { id: string; email: string; nombre: string }
type DetalleEnvio = { email: string; error?: string }

Deno.serve(async (req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response('Configuración incompleta', { status: 500 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('No autorizado', { status: 401 })
  }

  // Scoped to the forwarded admin JWT, never service_role.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  let rawPayload: unknown
  try {
    rawPayload = await req.json()
  } catch {
    return new Response('Payload inválido', { status: 400 })
  }

  const payload = validatePayload(rawPayload)
  if (!payload) {
    return new Response('Payload inválido', { status: 400 })
  }

  const { asunto, cuerpo, destinatarios_criterio: criterio } = payload

  const { data: resueltos, error: rpcError } = await supabase.rpc('resolver_destinatarios_correo', {
    p_tipo: criterio.tipo,
    p_ciudad: criterio.tipo === 'ciudad' ? criterio.valor : null,
    p_ids: criterio.tipo === 'ids' ? criterio.valor : null,
  })

  if (rpcError) {
    if (rpcError.code === 'P0001') {
      // The RPC's own admin gate rejected the caller — same fixed message
      // regardless of the RPC's exact text, no internal detail to leak.
      return new Response('Solo un administrador puede enviar correos masivos', { status: 403 })
    }
    console.error('[enviar-correo-masivo] resolver_destinatarios_correo RPC error', rpcError)
    return new Response('Error al resolver destinatarios', { status: 500 })
  }

  const destinatarios = (resueltos ?? []) as Destinatario[]

  if (destinatarios.length === 0) {
    // Not an error — nobody matched, or everybody matched is opted out.
    return new Response(JSON.stringify({ enviados: 0, fallidos: 0, detalles: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (destinatarios.length > LIMITE_DESTINATARIOS) {
    return new Response(
      `Demasiados destinatarios resueltos (${destinatarios.length}); el máximo por envío es ${LIMITE_DESTINATARIOS}`,
      { status: 400 }
    )
  }

  const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
  const from = Deno.env.get('NOTIF_FROM_EMAIL') ?? ''
  // Untrusted admin free-text → safe HTML, computed once (same for everyone).
  const cuerpoHtmlSeguro = plainTextToHtml(cuerpo)

  const detalles: DetalleEnvio[] = []
  let enviados = 0
  let fallidos = 0

  for (const lote of chunk(destinatarios, LOTE_MAX)) {
    const resultadosLote = await Promise.all(
      lote.map(async (destinatario): Promise<DetalleEnvio> => {
        try {
          const html = renderEmail({
            titulo: asunto,
            cuerpoHtml: cuerpoHtmlSeguro,
            nombre: destinatario.nombre,
          })
          // Plain-text alternative alongside the HTML part — mail providers
          // treat HTML-only bulk mail as a promotional signal; `cuerpo` is
          // already plain text, so this is free.
          const text = renderEmailText({
            cuerpoTexto: cuerpo,
            nombre: destinatario.nombre,
          })

          const { error } = await resend.emails.send({
            from,
            to: destinatario.email,
            subject: asunto,
            html,
            text,
          })

          if (error) {
            console.error('[enviar-correo-masivo] Resend send error', destinatario.email, error)
            // Admin-only surface — Resend's per-recipient message is low-risk here.
            return { email: destinatario.email, error: error.message ?? 'Error al enviar' }
          }
          return { email: destinatario.email }
        } catch (err) {
          console.error('[enviar-correo-masivo] unexpected send error', destinatario.email, err)
          return { email: destinatario.email, error: 'Error inesperado al enviar' }
        }
      })
    )

    for (const resultado of resultadosLote) {
      detalles.push(resultado)
      if (resultado.error) fallidos++
      else enviados++
    }
  }

  return new Response(JSON.stringify({ enviados, fallidos, detalles }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
