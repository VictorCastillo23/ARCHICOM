import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { jsonOk, unauthorized, validationError } from '@/lib/supabase/handleError'
import { getStoragePathFromPublicUrl, removeOwnStorageObject } from '@/lib/supabase/storage'

/**
 * Removes a file the caller previously uploaded. Used by the publish form to
 * clean up after a replaced file (edit) or a failed save (rollback), so the
 * bucket doesn't accumulate orphaned, publicly-readable objects.
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const body = await request.json().catch(() => null)
  const url = body?.url

  if (!url || typeof url !== 'string') return validationError('Se requiere url')

  const path = getStoragePathFromPublicUrl(url)
  if (!path) return validationError('url de Storage inválida')

  // Defense in depth: only allow deleting from the caller's own folder. The
  // bucket RLS enforces this too, but reject early with a clear 403.
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json(
      { error: { code: 'forbidden', message: 'No puedes borrar este archivo' } },
      { status: 403 },
    )
  }

  await removeOwnStorageObject(supabase, url)
  return jsonOk(null)
}
