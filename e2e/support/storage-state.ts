import path from 'node:path'

// Absolute paths (built from process.cwd(), which Playwright always sets to
// the repo root) so the same constants can be imported from playwright.config.ts,
// the *.setup.ts files that write them, and any spec that needs to override
// `storageState` for a different role (e.g. admin-solicitud.spec.ts). Gitignored
// under /e2e/.auth/ — these files hold live session cookies.
export const USER_STORAGE_STATE = path.join(process.cwd(), 'e2e/.auth/user.json')
export const ADMIN_STORAGE_STATE = path.join(process.cwd(), 'e2e/.auth/admin.json')
