import * as Sentry from '@sentry/nextjs'

// Runs once per server instance. Loads the runtime-specific Sentry config
// (Node vs Edge) so both `sentry.server.config.ts` and `sentry.edge.config.ts`
// stay no-ops when SENTRY_DSN is unset (local/dev), per @sentry/nextjs's own
// DSN-guard behavior.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Captures errors from nested React Server Components (the render pipeline
// Next.js exposes via this hook, distinct from app/error.tsx boundaries).
export const onRequestError = Sentry.captureRequestError
