import { createClient } from '@/lib/supabase/server'
import { handleError, jsonOk, unauthorized } from '@/lib/supabase/handleError'
import { NextResponse } from 'next/server'

type Context = { params: Promise<{ id: string; pubId: string }> }

// Owner check is enforced by RLS (coleccion_publicacion_write). A non-owner
// or nonexistent (coleccion_id, publicacion_id) pair deletes 0 rows without
// erroring — the explicit check below turns that into a real 404.
export async function DELETE(_request: Request, ctx: Context) {
  const { id: coleccion_id, pubId: publicacion_id } = await ctx.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { data: deleted, error } = await supabase
    .from('coleccion_publicacion')
    .delete()
    .eq('coleccion_id', coleccion_id)
    .eq('publicacion_id', publicacion_id)
    .select('coleccion_id')
    .maybeSingle()

  if (error) return handleError(error)

  if (!deleted) {
    return NextResponse.json(
      {
        error: {
          code: 'not_found',
          message: 'Esta publicación no está en la colección',
        },
      },
      { status: 404 }
    )
  }

  return jsonOk(null)
}
