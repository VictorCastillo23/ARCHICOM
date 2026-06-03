import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleError, unauthorized } from '@/lib/supabase/handleError'

type Context = { params: Promise<{ id: string }> }

export async function DELETE(_req: Request, ctx: Context) {
  const { id } = await ctx.params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  // RLS enforces that only the comment author can delete
  const { error } = await supabase
    .from('comentario')
    .delete()
    .eq('id', id)

  if (error) return handleError(error)

  return new NextResponse(null, { status: 204 })
}
