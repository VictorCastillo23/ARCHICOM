// Pure helper — converts the admin's untrusted plain-text `cuerpo` (a plain
// `<textarea>`, no rich-text editor, per the product prompt §5.1) into safe
// HTML: escapes the 5 HTML-significant characters, then newlines → `<br>`.
// `renderEmail` (`_shared/email-template.ts`) does NOT escape `cuerpoHtml` by
// design (fine for trusted hardcoded templates, wrong for raw admin input) —
// this is the one place that closes that gap, so it holds regardless of caller.
//
// `escapeHtml` is DUPLICATED from `_shared/email-template.ts`, not imported:
// this file is tsc-checked (needs Vitest, unlike the Deno-excluded
// `index.ts`), and tsc rejects explicit `.ts`-extension relative imports
// while Deno's runtime requires them — a cross-file import would satisfy one
// and break the other. Duplicating this ~6-line function avoids the conflict.
//
// Plain TypeScript (no Deno-only APIs) so it can run directly under Vitest.

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function plainTextToHtml(texto: string): string {
  return escapeHtml(texto).replace(/\r\n|\r|\n/g, '<br>')
}
