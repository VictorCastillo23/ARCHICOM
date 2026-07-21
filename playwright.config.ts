import { defineConfig, devices } from '@playwright/test'
import { USER_STORAGE_STATE } from './e2e/support/storage-state'

/**
 * v1: chromium-only. Cross-browser coverage is deferred until the suite is
 * actually running green in CI against real (unbanned) test accounts — see
 * task 4.2 / the design's "Blocking Prerequisites" section.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
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
      use: {
        ...devices['Desktop Chrome'],
        storageState: USER_STORAGE_STATE,
      },
      dependencies: ['setup'],
    },
  ],
})
