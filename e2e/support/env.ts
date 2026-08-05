/**
 * Reads a required environment variable, failing fast with a clear message
 * instead of letting Playwright fill a login form with `undefined`.
 *
 * These vars (E2E_TEST_USER_EMAIL/PASSWORD, E2E_TEST_ADMIN_EMAIL/PASSWORD)
 * must point at dedicated test accounts, separate from (not the same as)
 * the 3 seeded accounts documented in CLAUDE.md, which may remain banned
 * (`banned_until`). Provisioning those dedicated accounts is an external,
 * owner-driven prerequisite — see the design's "Blocking Prerequisites"
 * section and .github/workflows/ci.yml's `e2e` job comment.
 */
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required env var "${name}". Set it locally (.env.local, not committed) ` +
        'or as a GitHub Actions secret before running the e2e suite.',
    )
  }
  return value
}
