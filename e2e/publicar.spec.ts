import { test, expect } from '@playwright/test'
import { crearPublicacionViaUI, eliminarPublicacion, type PublicacionCreada } from './support/publicaciones'

// Reuses the storageState written by e2e/support/auth.setup.ts (the
// `chromium` project's default) — no login flow repeated here.

let created: PublicacionCreada | undefined

test.afterEach(async ({ page }) => {
  // Cleanup runs even when the test body throws mid-way (afterEach always
  // runs), so a failed assertion never leaves an orphan row behind for the
  // next CI run.
  if (created) {
    await eliminarPublicacion(page, created.id)
    created = undefined
  }
})

test('publishing a new publicación makes it appear on the author’s own profile', async ({ page }) => {
  created = await crearPublicacionViaUI(page)

  // crearPublicacionViaUI already waits for the redirect to /publicacion/{id}
  // — assert the real page rendered the title, not just that the URL changed.
  await expect(page.getByRole('heading', { level: 1, name: created.titulo })).toBeVisible()

  // The stronger assertion the task calls for: the publication is queryable
  // and rendered elsewhere too, not only reachable via the redirect target.
  await page.goto('/perfil')
  await expect(page.getByRole('heading', { level: 2, name: created.titulo })).toBeVisible()
})
