export class ApiError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

/**
 * Generic fetch wrapper that handles the { data } / { error } envelope.
 * - Attaches Content-Type: application/json by default.
 * - Handles 204 (no body) without throwing.
 * - Throws ApiError when !res.ok or body contains { error }.
 * - Returns (body as { data: T }).data on success.
 *
 * ONLY for use in Client Components ('use client').
 * Never call from Server Components or lib/data/*.
 */
export async function apiClient<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })

  let body: unknown = null
  if (res.status !== 204) {
    try {
      body = await res.json()
    } catch {
      // empty body — treat as null
    }
  }

  if (
    !res.ok ||
    (body !== null &&
      typeof body === 'object' &&
      'error' in (body as object))
  ) {
    const err = (body as { error?: { code?: string; message?: string } })?.error
    throw new ApiError(
      err?.code ?? 'unknown',
      err?.message ?? 'Error inesperado',
      res.status,
    )
  }

  return body !== null ? (body as { data: T }).data : (undefined as T)
}
