/**
 * Reads a required environment variable, failing fast with a clear message
 * instead of letting Playwright fill a login form with `undefined`.
 *
 * The 3 seeded Supabase Auth accounts are currently banned (`banned_until`
 * set — see CLAUDE.md and .claude/skills/verify/SKILL.md), so these vars
 * point at a dedicated, unbanned test account that must exist separately.
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
