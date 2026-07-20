import * as Sentry from '@sentry/nextjs'

// Client-side bundle can only read NEXT_PUBLIC_* env vars. NEXT_PUBLIC_SENTRY_DSN
// is undefined until the DSN is provisioned — Sentry.init() no-ops safely without
// a DSN (confirmed: `dsn` is optional on the SDK's client options, and a missing
// DSN disables the client rather than throwing).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  // NEXT_PUBLIC_VERCEL_ENV is only populated when the Vercel project has
  // "Automatically expose System Environment Variables" enabled (Project
  // Settings > Environment Variables). VERCEL_ENV itself is server-only and
  // not readable from this client bundle.
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
})

// Records client-side route transitions as Sentry navigation spans.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
