import { test, expect } from '@playwright/test'
import { crearPublicacionViaUI, eliminarPublicacion, type PublicacionCreada } from './support/publicaciones'
import { ADMIN_STORAGE_STATE } from './support/storage-state'

// Uses the admin test account's storageState (e2e/support/admin.setup.ts) for
// the ENTIRE flow. The admin account is also a `usuario` row (rol=administrador
// — CLAUDE.md), so the same session can both postulate its own publicación
// (the public "solicitar" flow) and resolve it from /admin/revistas — no
// second login is needed.
test.use({ storageState: ADMIN_STORAGE_STATE })

let created: PublicacionCreada | undefined

test.afterEach(async ({ page }) => {
  // All FKs to `publicacion` are ON DELETE CASCADE (see support/publicaciones.ts),
  // so deleting the publicación also removes the solicitud_revista row this
  // test created (whatever its estado ended up in) — no separate cleanup
  // needed for it. The REJECT path (used below) never creates a
  // revista_articulo row, unlike ACCEPT, so there's nothing else to undo.
  if (created) {
    await eliminarPublicacion(page, created.id)
    created = undefined
  }
})

test('admin creates its own solicitud via the public flow, then rejects it as admin', async ({
  page,
}) => {
  created = await crearPublicacionViaUI(page)

  // This flow depends on two real business-rule preconditions that are NOT
  // under this test's control: (1) a revista with estado='borrador' must
  // exist (getRevistaActiva — lib/data/revistas.ts), and (2) today's MX-local
  // calendar day must fall in the día 2–25 postulation window
  // (lib/utils/revistaCiclo.ts). Skip (not fail) when either is unmet — this
  // is expected environment/business-rule state, not a bug in this spec.
  const noRevistaMsg = page.getByText('No hay una revista abierta este mes.')
  const ventanaCerradaMsg = page.getByText(/postulaciones.*cerradas/i)
  const postularBtn = page.getByRole('button', { name: /^Postular a /i })

  await expect(noRevistaMsg.or(ventanaCerradaMsg).or(postularBtn)).toBeVisible()

  if (await noRevistaMsg.isVisible()) {
    test.skip(
      true,
      'No revista with estado=borrador exists in this environment right now — cannot create a solicitud without one.',
    )
  }
  if (await ventanaCerradaMsg.isVisible()) {
    test.skip(
      true,
      'Postulation window is closed for the current MX-local calendar day (lib/utils/revistaCiclo.ts) — expected business-rule behavior, not a bug.',
    )
  }

  await postularBtn.click()
  await expect(page.getByText('pendiente', { exact: true })).toBeVisible()

  // Resolve as admin. Navigate via the "Edición activa" badge on the admin
  // revistas list rather than hardcoding an id — only one revista can have
  // estado=borrador at a time (partial unique index, docs §3c).
  await page.goto('/admin/revistas')
  await page.getByText('Edición activa').locator('xpath=ancestor::a[1]').click()

  // Scope to the specific pending-solicitud row for OUR publicación (the
  // seeded pendiente request — CLAUDE.md — likely also renders in this same
  // list; scoping by título avoids touching it). `rounded-md` is the class
  // unique to this row's own container in components/admin/revistas/SolicitudesList.tsx,
  // used here only to find the nearest ancestor row, not to assert styling.
  const solicitudRow = page
    .getByRole('link', { name: created.titulo })
    .locator('xpath=ancestor::div[contains(@class, "rounded-md")][1]')

  await expect(solicitudRow).toBeVisible()
  await solicitudRow.getByRole('button', { name: 'Rechazar' }).click()
  await solicitudRow
    .getByLabel(/Motivo del rechazo/)
    .fill('Rechazo automático de la suite e2e — sin relación con el contenido.')
  await solicitudRow.getByRole('button', { name: 'Confirmar rechazo' }).click()

  // A successful reject removes the row from the pending list client-side.
  await expect(solicitudRow).toHaveCount(0)
})
