import * as Sentry from '@sentry/nextjs'
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

// Logs only the fields needed to diagnose an error — never the raw object,
// which for Postgres/PostgREST errors can carry `details`/`hint` with query
// values or row data (N-8, SECURITY_AUDIT.md 2026-07-04). Same discipline
// applies to the Sentry event: `extra` carries `code`/`status` only, never
// the raw error or its `message`/`details`/`hint`.
function logServerError(tag: string, error: unknown): void {
  const e = error as { code?: string; message?: string; status?: number }
  console.error(tag, { code: e?.code, status: e?.status, message: e?.message })
  Sentry.captureException(error, { extra: { code: e?.code, status: e?.status } })
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
        logServerError('[handleError] AuthError', error)
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
      logServerError('[handleError]', error)
      return err('internal_error', 'Error interno', 500)
  }
}
