import { createClient } from '@/lib/supabase/server'
import { forbidden, unauthorized } from '@/lib/supabase/handleError'
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

type AdminOk = { error: null; user: User; supabase: SupabaseClient }
type AdminFail = { error: NextResponse; user: null; supabase: null }
type AdminResult = AdminOk | AdminFail

export async function requireAdmin(): Promise<AdminResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: unauthorized(), user: null, supabase: null }
  }

  const { data: perfil } = await supabase
    .from('usuario')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'administrador') {
    return { error: forbidden(), user: null, supabase: null }
  }

  return { error: null, user, supabase }
}
