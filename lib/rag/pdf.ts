import { extractText, getDocumentProxy } from 'unpdf'

import { CHUNK_OVERLAP, CHUNK_SIZE } from './config'

/**
 * Extracts and normalizes the full text of a PDF from its raw bytes.
 * Uses `unpdf` (serverless-friendly, no worker hacks under Turbopack).
 */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes)
  const { text } = await extractText(pdf, { mergePages: true })
  return text.replace(/\s+\n/g, '\n').trim()
}

/**
 * Splits text into overlapping chunks (~CHUNK_SIZE chars, CHUNK_OVERLAP
 * overlap), preferring word boundaries and dropping empty chunks.
 */
export function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []

  const chunks: string[] = []
  let start = 0
  while (start < clean.length) {
    let end = Math.min(start + CHUNK_SIZE, clean.length)
    if (end < clean.length) {
      const lastSpace = clean.lastIndexOf(' ', end)
      if (lastSpace > start + CHUNK_SIZE * 0.6) end = lastSpace
    }
    chunks.push(clean.slice(start, end).trim())
    if (end >= clean.length) break
    start = end - CHUNK_OVERLAP
    if (start < 0) start = 0
  }
  return chunks.filter(Boolean)
}
