import * as Sentry from '@sentry/nextjs'

// Loaded by instrumentation.ts's NEXT_RUNTIME === 'edge' branch. Forward-compat:
// proxy.ts is pinned to the nodejs runtime today (Next 16 requires it for
// @supabase/ssr session refresh), so this currently covers only edge API
// routes/middleware if any are added later.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.VERCEL_ENV ?? 'development',
})
