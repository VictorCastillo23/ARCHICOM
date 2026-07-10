// Leading-byte signatures per allowed MIME type (F-003, SECURITY_AUDIT.md
// 2026-07-04): the declared `file.type` is client-controlled, so it is
// cross-checked against the file's actual magic bytes before upload.
export const MAGIC_BYTES: Record<string, number[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
}

export const MIME_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

export function extensionForMime(mime: string): string | null {
  return MIME_EXT[mime] ?? null
}

export function matchesMagicBytes(header: Uint8Array, mime: string): boolean {
  const signature = MAGIC_BYTES[mime]
  if (!signature) return false
  return signature.every((byte, i) => header[i] === byte)
}
