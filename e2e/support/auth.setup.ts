import { test as setup, expect } from '@playwright/test'
import { requireEnv } from './env'
import { USER_STORAGE_STATE } from './storage-state'

// Playwright's documented `setup` project pattern (https://playwright.dev/docs/auth):
// this file matches the `setup` project in playwright.config.ts and runs once
// before the `chromium` project (which `dependsOn` it). It performs ONE real UI
// login and persists the resulting storageState so every other spec in the
// `chromium` project starts already authenticated, instead of repeating the
// full login flow per spec.
setup('authenticate as regular test user', async ({ page }) => {
  const email = requireEnv('E2E_TEST_USER_EMAIL')
  const password = requireEnv('E2E_TEST_USER_PASSWORD')

  await page.goto('/login')
  // getByRole('textbox', { name, exact: true }) — NOT getByLabel(). Confirmed
  // live: getByLabel() matches a <label>'s raw text content, which here
  // includes the visually-rendered required-field "*" (it sits in an
  // aria-hidden span, but aria-hidden only affects accessible-name
  // computation, not textContent) — so `{ exact: true }` on getByLabel('Email')
  // matches ZERO elements ("Email" !== "Email*"), hanging forever waiting for
  // a locator that will never resolve. getByRole('textbox', { name }) uses the
  // properly-computed accessible name (aria-hidden content excluded), so
  // 'Email' matches exactly, and scoping to role=textbox also excludes the
  // password field's own "Mostrar contraseña" show/hide <button>, whose
  // aria-label otherwise collides with a loose 'Contraseña' match.
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email)
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()

  // LoginForm redirects to '/' and Nav re-renders with the authenticated
  // links once the session cookie is actually set server-side. Waiting for
  // the real "Cerrar sesión" (logout) button — not just a URL change —
  // proves the login succeeded rather than just that the form submitted.
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()

  await page.context().storageState({ path: USER_STORAGE_STATE })
})
