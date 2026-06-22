/**
 * Maximum number of profile links a single user may create.
 * Enforced server-side (POST /api/perfil/links) and mirrored client-side
 * (LinksEditor disables the add button at this threshold).
 */
export const LINK_LIMIT = 10

/**
 * Maximum length of a profile link label.
 * Mirrored client-side via the link form inputs' maxLength.
 */
export const LINK_LABEL_MAX_LENGTH = 50
