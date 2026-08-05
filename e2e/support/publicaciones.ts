import type { Page } from '@playwright/test'

export interface PublicacionCreada {
  id: string
  titulo: string
}

/**
 * Fills and submits the real `/publicar` form for the simplest publication
 * shape — tipo "Artículo" (categoria "texto": no file upload required, no
 * recomendacion-only fields) with an external link so the "at least one of
 * {archivo, enlace}" rule is satisfied — then captures the created id
 * straight from the `POST /api/publicaciones` response body.
 *
 * Deliberately NOT derived from the post-submit redirect URL. The row is
 * committed server-side by that POST (components/publicar/PublicarForm.tsx
 * `crearPublicacion()`) *before* a separate tag-attach step; if that step
 * fails, the form intentionally does NOT redirect (it shows an inline
 * warning instead, so the user doesn't think the publication was lost — see
 * PublicarForm.tsx's `problemas`/`setTagWarning` branch). Waiting on the
 * redirect URL here would leave the returned id (and therefore any caller's
 * cleanup) hostage to that unrelated step, permanently orphaning the row on
 * any comparable stall/timeout — this repo has no separate test/staging DB.
 * Reading the id from the response is independent of whatever happens
 * afterwards (tag-attach, redirect, or a slow RSC transition).
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

  // Register the response listener BEFORE the click that triggers it — the
  // standard Playwright pattern for tying a wait to an action
  // (https://playwright.dev/docs/api/class-page#page-wait-for-response),
  // so the create request can never resolve before we start listening.
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => new URL(res.url()).pathname === '/api/publicaciones' && res.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Publicar', exact: true }).click(),
  ])

  const body = (await response.json()) as { data?: { publicacion?: { id?: string } } }
  const id = body.data?.publicacion?.id
  if (!id) {
    throw new Error(
      `POST /api/publicaciones (status ${response.status()}) did not return a publicacion id`,
    )
  }

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
