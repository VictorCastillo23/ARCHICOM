// Shared HTML wrapper for all outbound transactional/bulk emails.
// Plain TypeScript (no Deno-only APIs) so it can run directly under Vitest;
// imported by both Edge Function entrypoints (enviar-notificacion-email,
// enviar-correo-masivo). No unsubscribe footer — locked MVP decision
// (notif_email_habilitado is the sole opt-out, see design D-notif-email).

// Fixed production domain — hardcoded (not an env var) to match how the rest
// of the codebase already treats it as a constant (README.md's live badge,
// the "contacto@esvitrina.com" mailto in /sobre-nosotros). Edge Functions run
// on Deno, outside the Next.js app, so NEXT_PUBLIC_SITE_URL isn't reachable
// here even if we wanted to parametrize it.
const SITE_URL = 'https://esvitrina.com'

export type RenderEmailParams = {
  titulo: string
  cuerpoHtml: string
  nombre?: string
}

/**
 * Escapes the 5 HTML-significant characters. Not a sanitizer — only safe for
 * plain-text values. NOT exported/shared with
 * `enviar-correo-masivo/plain-text-to-html.ts` (duplicated there instead) —
 * that file is tsc-checked and can't use a `.ts`-extension relative import
 * (tsc rejects it) that Deno's runtime also requires; see that file's header.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderEmail({ titulo, cuerpoHtml, nombre }: RenderEmailParams): string {
  // titulo/nombre are always plain-text (subject line, profile name) →
  // escaped unconditionally (PR4a's admin panel will pass free-text here).
  // cuerpoHtml is deliberately NOT escaped — the name signals pre-built
  // HTML; callers own producing/sanitizing it before calling this function.
  const tituloSeguro = escapeHtml(titulo)
  const saludo = nombre ? `Hola, ${escapeHtml(nombre)}.` : 'Hola.'

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${tituloSeguro}</title>
  </head>
  <body style="margin:0;padding:24px;background-color:#f5f5f5;font-family:sans-serif;color:#1a1a1a;">
    <div style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:8px;padding:32px;">
      <p style="margin:0 0 16px;">${saludo}</p>
      <div>${cuerpoHtml}</div>
      <p style="margin:24px 0 0;"><a href="${SITE_URL}" style="color:#1a6b5e;">Visitar Vitrina</a></p>
      <hr style="margin-top:16px;border:none;border-top:1px solid #e5e5e5;" />
      <p style="font-size:12px;color:#737373;margin-top:16px;">Vitrina — portafolio digital académico</p>
    </div>
  </body>
</html>`
}
