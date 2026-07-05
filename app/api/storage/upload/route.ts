import { createClient } from '@/lib/supabase/server'
import {
  handleError,
  jsonOk,
  unauthorized,
  validationError,
} from '@/lib/supabase/handleError'

// Leading-byte signatures per allowed MIME type (F-003, SECURITY_AUDIT.md
// 2026-07-04): the declared `file.type` is client-controlled, so it is
// cross-checked against the file's actual magic bytes before upload.
const MAGIC_BYTES: Record<string, number[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
}

async function matchesMagicBytes(file: File, mime: string): Promise<boolean> {
  const signature = MAGIC_BYTES[mime]
  if (!signature) return false
  const header = new Uint8Array(await file.slice(0, signature.length).arrayBuffer())
  return signature.every((byte, i) => header[i] === byte)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) return validationError('Se requiere un archivo')

  // 1. Validate MIME type and derive safe extension
  const MIME_EXT: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
  }
  const ext = MIME_EXT[file.type]
  if (!ext) {
    return validationError('Solo se permiten archivos PDF, JPG o PNG')
  }

  // 1b. Validate the file's actual signature matches the declared MIME type
  if (!(await matchesMagicBytes(file, file.type))) {
    return validationError('El contenido del archivo no coincide con el tipo declarado')
  }

  // 2. Validate size (max 10 MB)
  const MAX_SIZE = 10 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return validationError('El archivo no puede superar 10 MB')
  }

  // 3. Build path from UUID + MIME-derived extension; discard original filename entirely
  const fileName = `${crypto.randomUUID()}.${ext}`
  const path = `${user.id}/${fileName}`

  // 4. Upload to bucket 'publicaciones'
  const { error: uploadError } = await supabase.storage
    .from('publicaciones')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) return handleError(uploadError)

  // 5. Get public URL
  const { data: urlData } = supabase.storage
    .from('publicaciones')
    .getPublicUrl(path)

  return jsonOk({ url: urlData.publicUrl }, 201)
}
