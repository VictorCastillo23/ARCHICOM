import type { NextConfig } from "next";

const SUPABASE_HOST = 'https://fdfbyhjwnbteccagulxb.supabase.co'
// Supabase Realtime uses a WebSocket; connect-src must allow the wss:// origin too.
const SUPABASE_WSS = 'wss://fdfbyhjwnbteccagulxb.supabase.co'

// React + Turbopack require 'unsafe-eval' in development (dev-only debugging such as
// callstack reconstruction). Production keeps the stricter policy without it.
const isDev = process.env.NODE_ENV === 'development'
const scriptSrc = `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `img-src 'self' data: blob: ${SUPABASE_HOST}`,
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      `frame-src 'self' blob: ${SUPABASE_HOST}`,
      `connect-src 'self' ${SUPABASE_HOST} ${SUPABASE_WSS}`,
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join('; '),
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig;
