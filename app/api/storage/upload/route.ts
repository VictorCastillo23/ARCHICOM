import { createClient } from '@/lib/supabase/server'
import {
  handleError,
  jsonOk,
  unauthorized,
  validationError,
} from '@/lib/supabase/handleError'

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
