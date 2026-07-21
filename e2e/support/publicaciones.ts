import type { Page } from '@playwright/test'

export interface PublicacionCreada {
  id: string
  titulo: string
}

/**
 * Fills and submits the real `/publicar` form for the simplest publication
 * shape — tipo "Artículo" (categoria "texto": no file upload required, no
 * recomendacion-only fields) with an external link so the "at least one of
 * {archivo, enlace}" rule is satisfied — and waits for the redirect to the
 * new publication's detail page.
 *
 * Shared by publicar.spec.ts and admin-solicitud.spec.ts so both exercise the
 * same real form instead of duplicating field-by-field selectors.
 */
export async function crearPublicacionViaUI(
  page: Page,
  overrides: { titulo?: string; resumen?: string; urlExterna?: string } = {},
): Promise<PublicacionCreada> {
  const titulo = overrides.titulo ?? `E2E artículo ${Date.now()}`
  const resumen = overrides.resumen ?? 'Publicación creada por la suite e2e de Playwright.'
  const urlExterna = overrides.urlExterna ?? 'https://example.com/e2e'

  await page.goto('/publicar')
  // getByRole('textbox', { name, exact: true }), not getByLabel() — Título and
  // Resumen are both `required` Fields, so their <label> textContent is
  // "Título*"/"Resumen*" (the "*" sits in an aria-hidden span, which excludes
  // it from the computed accessible name but NOT from raw textContent).
  // getByLabel() compares against that raw text, so exact matching on it
  // never resolves; getByRole('textbox', ...) uses the real accessible name.
  // See e2e/support/auth.setup.ts for the live-verified root cause.
  await page.getByRole('radio', { name: 'Artículo', exact: true }).click()
  await page.getByRole('textbox', { name: 'Título', exact: true }).fill(titulo)
  await page.getByRole('textbox', { name: 'Resumen', exact: true }).fill(resumen)
  await page.getByRole('textbox', { name: 'Enlace a la obra (opcional)', exact: true }).fill(urlExterna)
  await page.getByRole('button', { name: 'Publicar', exact: true }).click()

  await page.waitForURL(/\/publicacion\/[^/]+$/)
  const id = new URL(page.url()).pathname.split('/').filter(Boolean).pop()
  if (!id) throw new Error('Could not extract publicacion id from the post-submit URL')

  return { id, titulo }
}

/**
 * Deletes a publicación via the app's own DELETE route
 * (app/api/publicaciones/[id]/route.ts), relying on the author's own RLS
 * self-delete policy (`eliminar_propio`) — no service_role, no admin bypass.
 * Uses `page.request`, which shares the browser context's authenticated
 * cookies, so the delete runs as whichever user created the row.
 *
 * All FKs to `publicacion` are ON DELETE CASCADE (docs/Vitrina_BD_Conexion_Backend.md
 * §3.6), so this also removes any `solicitud_revista`/`comentario`/`like`/
 * `publicacion_tag` rows the test created along the way — no separate cleanup
 * is needed for those.
 */
export async function eliminarPublicacion(page: Page, id: string): Promise<void> {
  const response = await page.request.delete(`/api/publicaciones/${id}`)
  if (!response.ok()) {
    throw new Error(
      `Cleanup failed: DELETE /api/publicaciones/${id} returned ${response.status()}`,
    )
  }
}
