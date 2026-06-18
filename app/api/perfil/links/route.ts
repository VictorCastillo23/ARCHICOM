import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleError, jsonOk, unauthorized, validationError } from '@/lib/supabase/handleError'
import { isHttpsUrl } from '@/lib/validation/url'
import { LINK_LIMIT } from '@/lib/constants/links'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return unauthorized()

  const body = await request.json()
  const { etiqueta, url, orden } = body as {
    etiqueta?: string
    url?: string
    orden?: number
  }

  // Validation — etiqueta
  if (!etiqueta || !etiqueta.trim()) {
    return validationError('etiqueta es requerida')
  }
  if (etiqueta.trim().length > 50) {
    return validationError('etiqueta no puede superar 50 caracteres')
  }

  // Validation — url (https-only, server authoritative)
  if (!url || !isHttpsUrl(url)) {
    return validationError('La URL debe comenzar con https://')
  }

  // Enforce per-user link limit
  const { count, error: countError } = await supabase
    .from('usuario_link')
    .select('*', { count: 'exact', head: true })
    .eq('usuario_id', user.id)

  if (countError) return handleError(countError)

  if ((count ?? 0) >= LINK_LIMIT) {
    return validationError(`Alcanzaste el límite de ${LINK_LIMIT} enlaces`)
  }

  const { data, error } = await supabase
    .from('usuario_link')
    .insert({
      etiqueta: etiqueta.trim(),
      url,
      orden: typeof orden === 'number' ? orden : 0,
      usuario_id: user.id,
    })
    .select('id, usuario_id, etiqueta, url, orden, creado_en')
    .single()

  if (error) return handleError(error)

  return jsonOk(data, 201)
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return unauthorized()

  const body = await request.json()
  const { orden } = body as { orden?: string[] }

  // Validate the reorder payload
  if (!Array.isArray(orden)) {
    return validationError('orden debe ser un arreglo de IDs')
  }
  if (orden.length > LINK_LIMIT) {
    return validationError(`orden no puede tener más de ${LINK_LIMIT} elementos`)
  }
  if (!orden.every((id) => typeof id === 'string')) {
    return validationError('Todos los elementos de orden deben ser strings')
  }

  // Apply sequential updates scoped by RLS (owner only)
  const errors: unknown[] = []
  for (let i = 0; i < orden.length; i++) {
    const { error } = await supabase
      .from('usuario_link')
      .update({ orden: i })
      .eq('id', orden[i])
      .eq('usuario_id', user.id)

    if (error) {
      errors.push(error)
    }
  }

  if (errors.length > 0) return handleError(errors[0])

  // Return the updated links in new order
  const { data: links, error: fetchError } = await supabase
    .from('usuario_link')
    .select('id, usuario_id, etiqueta, url, orden, creado_en')
    .eq('usuario_id', user.id)
    .order('orden')
    .order('creado_en')

  if (fetchError) return handleError(fetchError)

  return jsonOk({ links })
}
