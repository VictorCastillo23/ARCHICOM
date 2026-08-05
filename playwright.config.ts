import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import { USER_STORAGE_STATE } from './e2e/support/storage-state'

// Playwright Test does not auto-load .env files (unlike `next dev`/`next build`,
// which load .env.local for the webServer's own child process). Without this,
// E2E_TEST_* stays undefined in the `playwright test` process even when set in
// .env.local — a missing file is a silent no-op, so this stays safe in CI,
// where those vars already come from real job-level secrets.
dotenv.config({ path: '.env.local' })

/**
 * v1: chromium-only. Cross-browser coverage is deferred until the suite is
 * actually running green in CI against real (unbanned) test accounts — see
 * task 4.2 / the design's "Blocking Prerequisites" section.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Real browser E2E against a live backend is inherently flake-prone
  // (network timing, transient session-refresh races); retrying on CI only
  // is the standard Playwright idiom, and matters more here now that this
  // job is expected to eventually become a required/blocking check.
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  // Builds and starts the real production server rather than `next dev`, so
  // the suite exercises the same artifact CI would ship. `reuseExistingServer`
  // lets local runs attach to an already-running `pnpm dev`/`pnpm start`.
  webServer: {
    command: 'pnpm build && pnpm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    // Default Playwright webServer timeout is 60s, and it must cover the
    // ENTIRE `pnpm build && pnpm start` sequence for this ~90-route-file
    // Next.js 16 Turbopack app. Measured locally: a cold production build
    // (no .next cache, same placeholder env vars as CI's `build` job) took
    // ~30s wall-clock. CI runners are typically slower/more contended than
    // local dev hardware, so this pads that measurement to a generous ~6x
    // margin rather than leaving the 60s default, which could plausibly
    // abort the whole suite before a single test runs.
    timeout: 180_000,
  },
  projects: [
    // Playwright's documented `setup` project pattern (https://playwright.dev/docs/auth):
    // runs every *.setup.ts once, before any dependent project.
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      // auth.spec.ts runs in its own project below — excluded here so it
      // never races the specs that stay in this project.
      testIgnore: /auth\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: USER_STORAGE_STATE,
      },
      dependencies: ['setup'],
    },
    {
      // auth.spec.ts owns a full real login+logout cycle for the SAME
      // account (E2E_TEST_USER_EMAIL) whose storageState the `chromium`
      // project's other specs (e.g. publicar.spec.ts) reuse via
      // e2e/.auth/user.json. `app/api/auth/logout/route.ts` calls
      // `supabase.auth.signOut()` with the default `scope: 'global'`, which
      // revokes ALL of that user's sessions — including the one baked into
      // that storageState file — not only auth.spec.ts's own separate
      // login. Changing the logout's scope is out of scope here (that's
      // real product/security behavior, not a test concern); instead this
      // project's `dependencies` guarantee Playwright runs every test in
      // `chromium` to completion BEFORE this project starts, so the global
      // sign-out can never invalidate a session another spec still needs.
      // `workers: 1` would NOT reliably fix this on its own: Playwright's
      // default file-discovery order is alphabetical, so `auth.spec.ts`
      // would still run before `publicar.spec.ts` even serially — project
      // dependencies are the documented mechanism for cross-file ordering
      // (https://playwright.dev/docs/test-projects#dependencies).
      name: 'chromium-auth-lifecycle',
      testMatch: /auth\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup', 'chromium'],
    },
  ],
})
