import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleError, jsonOk, unauthorized, validationError } from '@/lib/supabase/handleError'

type Context = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: Context) {
  const { id } = await ctx.params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return unauthorized()

  const body = await request.json()
  const { tag_id } = body as { tag_id?: string }

  if (!tag_id) {
    return validationError('tag_id es requerido')
  }

  const { data, error } = await supabase
    .from('publicacion_tag')
    .insert({ publicacion_id: id, tag_id })
    .select()
    .single()

  if (error) return handleError(error)

  return jsonOk(data, 201)
}

export async function DELETE(request: NextRequest, ctx: Context) {
  const { id } = await ctx.params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return unauthorized()

  const { searchParams } = request.nextUrl
  const tag_id = searchParams.get('tag_id')

  if (!tag_id) {
    return validationError('tag_id es requerido como query param')
  }

  const { error } = await supabase
    .from('publicacion_tag')
    .delete()
    .eq('publicacion_id', id)
    .eq('tag_id', tag_id)

  if (error) return handleError(error)

  return jsonOk(null)
}
