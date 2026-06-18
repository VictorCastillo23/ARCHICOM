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

/**
 * Returns true only for well-formed https:// URLs.
 * Rejects http:, javascript:, data:, relative paths, and empty string.
 * Uses the WHATWG URL parser for robustness over raw regex.
 */
export function isHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'https:'
  } catch {
    return false
  }
}
