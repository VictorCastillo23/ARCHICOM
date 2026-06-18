/**
 * Maximum number of profile links a single user may create.
 * Enforced server-side (POST /api/perfil/links) and mirrored client-side
 * (LinksEditor disables the add button at this threshold).
 */
export const LINK_LIMIT = 10
