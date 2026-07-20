import * as Sentry from '@sentry/nextjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  forbidden,
  handleError,
  jsonOk,
  unauthorized,
  validationError,
} from './handleError'

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

async function body(res: Response) {
  return res.json() as Promise<{
    data?: unknown
    error?: { code: string; message: string }
  }>
}

describe('handleError', () => {
  describe('auth errors (__isAuthError)', () => {
    it('maps status 400 to 400 auth_error', async () => {
      const res = handleError({
        __isAuthError: true,
        status: 400,
        message: 'Bad request',
      })
      expect(res.status).toBe(400)
      const json = await body(res)
      expect(json.error).toEqual({ code: 'auth_error', message: 'Bad request' })
    })

    it('maps status 422 to 400 validation_error', async () => {
      const res = handleError({
        __isAuthError: true,
        status: 422,
        message: 'Invalid data',
      })
      expect(res.status).toBe(400)
      const json = await body(res)
      expect(json.error).toEqual({ code: 'validation_error', message: 'Invalid data' })
    })

    it('maps status 429 to 429 rate_limit', async () => {
      const res = handleError({ __isAuthError: true, status: 429, message: 'Too many' })
      expect(res.status).toBe(429)
      const json = await body(res)
      expect(json.error?.code).toBe('rate_limit')
    })

    it('maps any other status to 500 internal_error', async () => {
      const res = handleError({ __isAuthError: true, status: 503, message: 'Down' })
      expect(res.status).toBe(500)
      const json = await body(res)
      expect(json.error?.code).toBe('internal_error')
    })

    it('sends only { code, status } to Sentry on the default path, never the raw message', () => {
      const rawError = {
        __isAuthError: true,
        status: 503,
        message: 'Down',
        details: 'sensitive internal detail',
      }
      handleError(rawError)
      expect(Sentry.captureException).toHaveBeenCalledWith(rawError, {
        extra: { code: undefined, status: 503 },
      })
    })
  })

  describe('Postgres/PostgREST error codes', () => {
    it('maps PGRST301 to 401', async () => {
      const res = handleError({ code: 'PGRST301' })
      expect(res.status).toBe(401)
      const json = await body(res)
      expect(json.error?.code).toBe('unauthorized')
    })

    it('maps 23505 to 409', async () => {
      const res = handleError({ code: '23505' })
      expect(res.status).toBe(409)
      const json = await body(res)
      expect(json.error?.code).toBe('23505')
    })

    it('maps 42501 to 403', async () => {
      const res = handleError({ code: '42501' })
      expect(res.status).toBe(403)
      const json = await body(res)
      expect(json.error?.code).toBe('42501')
    })

    it('maps P0001 to 400 preserving the message verbatim', async () => {
      const res = handleError({ code: 'P0001', message: 'Solicitud no encontrada' })
      expect(res.status).toBe(400)
      const json = await body(res)
      expect(json.error).toEqual({ code: 'P0001', message: 'Solicitud no encontrada' })
    })

    it('maps 23514 to 400', async () => {
      const res = handleError({ code: '23514' })
      expect(res.status).toBe(400)
      const json = await body(res)
      expect(json.error?.code).toBe('validation_error')
    })

    it('maps an unrecognized code to 500', async () => {
      const res = handleError({ code: 'UNKNOWN' })
      expect(res.status).toBe(500)
      const json = await body(res)
      expect(json.error?.code).toBe('internal_error')
    })

    it('maps a code-less error to 500', async () => {
      const res = handleError(new Error('boom'))
      expect(res.status).toBe(500)
      const json = await body(res)
      expect(json.error?.code).toBe('internal_error')
    })

    it('sends only { code, status } to Sentry for an unrecognized code, never message/details/hint', () => {
      const rawError = {
        code: 'UNKNOWN',
        message: 'boom',
        details: 'row data leak',
        hint: 'try again',
      }
      handleError(rawError)
      expect(Sentry.captureException).toHaveBeenCalledWith(rawError, {
        extra: { code: 'UNKNOWN', status: undefined },
      })
    })
  })
})

describe('response helpers', () => {
  it('jsonOk returns {data} at the given status', async () => {
    const res = jsonOk({ foo: 'bar' }, 201)
    expect(res.status).toBe(201)
    const json = await body(res)
    expect(json.data).toEqual({ foo: 'bar' })
  })

  it('jsonOk defaults to status 200', async () => {
    const res = jsonOk({ foo: 'bar' })
    expect(res.status).toBe(200)
  })

  it('unauthorized returns {error} at 401', async () => {
    const res = unauthorized()
    expect(res.status).toBe(401)
    const json = await body(res)
    expect(json.error).toEqual({ code: 'unauthorized', message: 'No autenticado' })
  })

  it('forbidden returns {error} at 403', async () => {
    const res = forbidden()
    expect(res.status).toBe(403)
    const json = await body(res)
    expect(json.error).toEqual({
      code: 'forbidden',
      message: 'Acceso restringido a administradores',
    })
  })

  it('validationError returns {error} at 400 with the given message', async () => {
    const res = validationError('Campo requerido')
    expect(res.status).toBe(400)
    const json = await body(res)
    expect(json.error).toEqual({ code: 'validation_error', message: 'Campo requerido' })
  })
})
