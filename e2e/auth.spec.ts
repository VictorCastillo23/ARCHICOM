import { test, expect } from '@playwright/test'
import { requireEnv } from './support/env'

// This spec owns the full login → reload → logout → redirect lifecycle for
// real, independent of the shared `setup` project's storageState that other
// specs (publicar.spec.ts, admin-solicitud.spec.ts) reuse to skip repeating
// the UI login. Resetting storageState here (Playwright's documented
// "avoid authentication in some tests" recipe) means every test in this file
// starts from a clean, logged-out browser context.
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('auth session lifecycle', () => {
  test('a session survives a reload of a protected page, and logout actually clears it', async ({
    page,
  }) => {
    const email = requireEnv('E2E_TEST_USER_EMAIL')
    const password = requireEnv('E2E_TEST_USER_PASSWORD')

    await page.goto('/login')
    // getByRole('textbox', ...), not getByLabel() — see e2e/support/auth.setup.ts
    // for why: getByLabel() compares against the <label>'s raw textContent
    // (which includes the required-field "*"), so exact matching against it
    // never resolves. getByRole computes the real accessible name instead.
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email)
    await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(password)
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()

    // /perfil is guarded by proxy.ts, which calls supabase.auth.getUser() on
    // every matched request to refresh the session token. The meaningful
    // assertion isn't "the page didn't crash" — it's that the protected
    // route stays reachable (no redirect to /login) after a real reload.
    await page.goto('/perfil')
    await expect(page).toHaveURL(/\/perfil$/)
    await page.reload()
    await expect(page).toHaveURL(/\/perfil$/)
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()

    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toHaveCount(0)

    // Session actually cleared server-side (not just client-side UI state) —
    // a fresh navigation to /perfil must now redirect to /login via proxy.ts.
    await page.goto('/perfil')
    await expect(page).toHaveURL(/\/login$/)
  })
})
