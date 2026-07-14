// The publicacion record does not store a mime type, so the only reliable
// signal for a Storage URL is its file extension. The bucket only accepts
// PDF/JPG/PNG (see app/api/storage/upload/route.ts).
export type TipoArchivo = 'imagen' | 'pdf' | 'otro'

export function getTipoArchivo(url: string): TipoArchivo {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') return 'imagen'
  if (ext === 'pdf') return 'pdf'
  return 'otro'
}
