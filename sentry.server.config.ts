import * as Sentry from '@sentry/nextjs'

// Server-only env vars: VERCEL_ENV/SENTRY_DSN are never exposed to the
// browser bundle. Sentry.init() no-ops safely without a DSN.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.VERCEL_ENV ?? 'development',
})
