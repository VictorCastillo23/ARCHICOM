// Constants for the RAG (Retrieval-Augmented Generation) feature.
// See sdd/rag-publicacion design: chunking, retrieval and chat model config.

/** Chunk size in characters (~512 tokens). */
export const CHUNK_SIZE = 2000

/** Sliding-window overlap in characters between consecutive chunks. */
export const CHUNK_OVERLAP = 200

/** Number of top-K chunks retrieved via match_publicacion_chunks. */
export const SIMILARITY_TOP_K = 3

/** Embedding vector dimensionality (gte-small, edge function `embed`). */
export const EMBEDDING_DIM = 384

/** Chat model used for grounded Q&A. */
export const CHAT_MODEL = 'claude-haiku-4-5'

/** Max allowed length (chars) for a chat question. */
export const MAX_PREGUNTA = 500

/**
 * System prompt enforcing strict grounding: answer only from the provided
 * context (título + resumen + retrieved document fragments). Refuse to
 * answer or invent content outside that context.
 */
export const SYSTEM_PROMPT =
  'Sos un asistente que responde preguntas SOBRE UN DOCUMENTO ACADÉMICO. ' +
  'Respondé ÚNICAMENTE con la información del contexto provisto (título, resumen y ' +
  'fragmentos del documento). Si la respuesta no está en el contexto, decí ' +
  'claramente que esa información no está en el documento. No inventes, no uses ' +
  'conocimiento externo, no completes con suposiciones. Respondé en español, ' +
  'de forma breve y precisa.'
