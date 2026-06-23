import type { SupabaseClient } from '@supabase/supabase-js'

export const PUBLICACIONES_BUCKET = 'publicaciones'

// Public Storage URLs look like `.../storage/v1/object/public/publicaciones/{path}`.
const PUBLIC_MARKER = `/object/public/${PUBLICACIONES_BUCKET}/`

/**
 * Extracts the bucket-relative object path (e.g. `{user.id}/{uuid}.png`) from a
 * public Storage URL. Returns null if the URL isn't a publicaciones public URL.
 * Uses the WHATWG URL parser (no fragile regex), mirroring lib/validation/url.ts.
 */
export function getStoragePathFromPublicUrl(url: string): string | null {
  try {
    const { pathname } = new URL(url)
    const i = pathname.indexOf(PUBLIC_MARKER)
    if (i === -1) return null
    const path = pathname.slice(i + PUBLIC_MARKER.length)
    return path ? decodeURIComponent(path) : null
  } catch {
    return null
  }
}

/**
 * Best-effort removal of an object from the publicaciones bucket. Runs under the
 * caller's JWT, so it only succeeds for files in the caller's own `{user.id}/...`
 * folder (bucket RLS). Swallows all errors: Storage cleanup must NEVER turn a
 * successful create/edit/delete into a failure.
 */
export async function removeOwnStorageObject(
  supabase: SupabaseClient,
  url: string,
): Promise<void> {
  const path = getStoragePathFromPublicUrl(url)
  if (!path) return
  try {
    await supabase.storage.from(PUBLICACIONES_BUCKET).remove([path])
  } catch {
    // best-effort — ignore
  }
}
