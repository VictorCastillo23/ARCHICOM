// Constants for the RAG (Retrieval-Augmented Generation) feature.
// See sdd/rag-publicacion design: chunking, retrieval and chat model config.

/** Chunk size in characters (~512 tokens). */
export const CHUNK_SIZE = 2000

/** Sliding-window overlap in characters between consecutive chunks. */
export const CHUNK_OVERLAP = 200

/**
 * Number of top-K chunks retrieved via match_publicacion_chunks. Set to 8
 * (not 3) for better recall on longer documents: with gte-small embeddings
 * and cross-language queries (Spanish question over an English paper), a small
 * top-K often misses the relevant section. 8 chunks (~16k chars) stays well
 * within the chat model's context budget while covering a large share of a
 * typical academic PDF.
 */
export const SIMILARITY_TOP_K = 8

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
  'Eres un asistente que responde preguntas SOBRE UN DOCUMENTO ACADÉMICO. ' +
  'Responde ÚNICAMENTE con la información del contexto provisto (título, resumen y ' +
  'fragmentos del documento). Si la respuesta no está en el contexto, di ' +
  'claramente que esa información no está en el documento. No inventes, no uses ' +
  'conocimiento externo, no completes con suposiciones. Responde en español, ' +
  'de forma breve y precisa.'

/** How many previous messages the chat sends/uses as conversational memory. */
export const MAX_HISTORIAL = 5

/**
 * Condense prompt: given the recent conversation and a follow-up question,
 * rewrite the follow-up as a standalone question that makes sense without the
 * history (so it embeds well for retrieval). The model must return ONLY the
 * rewritten question — no explanations, no prefixes.
 */
export const CONDENSE_PROMPT =
  'Dada la conversación previa y una pregunta de seguimiento, reformula la ' +
  'pregunta de seguimiento como una pregunta autónoma que se entienda sin el ' +
  'historial (resolviendo referencias como "eso", "lo anterior", pronombres, etc.). ' +
  'Responde ÚNICAMENTE con la pregunta reformulada, sin explicaciones ni prefijos. ' +
  'Si ya es autónoma, devuélvela igual. Mantén el idioma original de la pregunta.'

/**
 * Max chat questions per user per hour, account-wide. Enforcement is atomic in
 * the `consumir_cuota_rag` RPC; this constant only feeds the 429 message shown
 * to the user, so it must stay in sync with the limit hardcoded in the RPC.
 */
export const RATE_LIMIT_MAX = 15

// --- Hybrid search (semantic layer over the buscador) ---

/** Top-K chunks (deduped to publications) retrieved by match_publicacion_chunks_global. */
export const SEARCH_SEMANTIC_TOP_K = 20

/** How many FTS rows to pull for the fusion (ranked list feeding RRF). */
export const SEARCH_FTS_TOP_K = 20

/**
 * Reciprocal Rank Fusion constant. score(id) = Σ 1/(RRF_K + rank_in_list).
 * The standard k≈60 damps the weight of any single list's top positions so the
 * fusion favours items that rank well across BOTH lexical and semantic lists.
 */
export const RRF_K = 60

/** Publications shown on the first (hybrid-ranked) page of /buscar. */
export const SEARCH_HYBRID_PAGE = 12
