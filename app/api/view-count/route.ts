// POST /api/view-count
// Tracks anonymous publication views via an HttpOnly session cookie.
// Returns { data: { showBanner: boolean } } — true when anon has viewed ≥2 pages.
//
// proxy.ts passes /api/* through untouched (matcher is broad but only redirects
// /perfil, /publicar, /admin, and /publicacion/*/editar). No matcher change needed.
// robots.ts disallows /api for crawlers, so this endpoint is not indexed.

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { jsonOk, handleError } from '@/lib/supabase/handleError'

export async function POST() {
  try {
    const cookieStore = await cookies() // Next 16 async cookies()
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Authenticated users: never increment count, never nudge toward signup
    if (user) {
      return jsonOk({ showBanner: false })
    }

    // Anon visitor: increment the view counter
    const raw = cookieStore.get('vitrina_views')?.value
    const current = Number.isFinite(Number(raw)) ? Number(raw) : 0
    const next = current + 1

    // HttpOnly session cookie — no Max-Age → cleared when browser session ends
    cookieStore.set('vitrina_views', String(next), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      // No maxAge — session cookie per spec (clears on browser close)
    })

    return jsonOk({ showBanner: next >= 2 })
  } catch (error) {
    return handleError(error)
  }
}
