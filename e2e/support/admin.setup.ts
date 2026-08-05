import { test as setup, expect } from '@playwright/test'
import { requireEnv } from './env'
import { ADMIN_STORAGE_STATE } from './storage-state'

// Second setup file for the same `setup` project (testMatch: /.*\.setup\.ts/),
// producing a second, independent storageState for the admin test account.
// Only `e2e/admin-solicitud.spec.ts` opts into ADMIN_STORAGE_STATE today, but
// keeping it as its own setup file (rather than branching inside auth.setup.ts)
// matches Playwright's documented "multiple signed in roles" pattern.
setup('authenticate as admin test user', async ({ page }) => {
  const email = requireEnv('E2E_TEST_ADMIN_EMAIL')
  const password = requireEnv('E2E_TEST_ADMIN_PASSWORD')

  await page.goto('/login')
  // See e2e/support/auth.setup.ts for why this is getByRole('textbox', ...)
  // and not getByLabel(): getByLabel() matches raw label textContent
  // (includes the required-field "*"), so `{ exact: true }` on it never
  // resolves — getByRole uses the properly-computed accessible name instead.
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email)
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()

  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()

  await page.context().storageState({ path: ADMIN_STORAGE_STATE })
})
