import { NextResponse } from 'next/server'

type ErrorEnvelope = { error: { code: string; message: string } }

function err(code: string, message: string, status: number): NextResponse {
  return NextResponse.json<ErrorEnvelope>({ error: { code, message } }, { status })
}

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status })
}

export function unauthorized(): NextResponse {
  return err('unauthorized', 'No autenticado', 401)
}

export function forbidden(): NextResponse {
  return err('forbidden', 'Acceso restringido a administradores', 403)
}

export function validationError(message: string): NextResponse {
  return err('validation_error', message, 400)
}

export function handleError(error: unknown): NextResponse {
  const e = error as {
    code?: string
    message?: string
    status?: number
    __isAuthError?: boolean
  }

  // Supabase Auth errors (AuthApiError / AuthRetryableFetchError)
  if (e?.__isAuthError) {
    switch (e.status) {
      case 400:
        return err('auth_error', e.message ?? 'Solicitud inválida', 400)
      case 422:
        return err('validation_error', e.message ?? 'Datos inválidos', 400)
      case 429:
        return err('rate_limit', 'Demasiados intentos. Intenta más tarde', 429)
      default:
        console.error('[handleError] AuthError', error)
        return err('internal_error', 'Error interno', 500)
    }
  }

  // PostgREST: missing or invalid JWT → 401 (must come before Postgres switch)
  if (e?.code === 'PGRST301') return err('unauthorized', 'No autenticado', 401)

  // Postgres errors (from data-layer / RPC)
  switch (e?.code) {
    case '23505':
      return err('23505', 'Recurso duplicado', 409)
    case '42501':
      return err('42501', 'No tienes permiso para esta operación', 403)
    case 'P0001':
      return err('P0001', e.message ?? 'Solicitud inválida', 400)
    case '23514':
      return err('validation_error', 'Operación no permitida', 400)
    default:
      console.error('[handleError]', error)
      return err('internal_error', 'Error interno', 500)
  }
}
