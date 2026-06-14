/**
 * Returns true if value is a well-formed http or https URL.
 * Uses the WHATWG URL parser — no regex.
 */
export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
