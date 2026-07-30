/**
 * Canonical slug↔area mapping for SEO landing pages.
 *
 * CURATED — bootstrapped from real `tag.area` values in the DB.
 * Keys are EXACT strings as they appear in the `tag.area` column.
 * Slugs are stable, lowercase, accent-stripped, hyphenated.
 *
 * IMPORTANT: Do NOT derive slugs dynamically from DB values at runtime.
 * If an admin edits a `tag.area` string, the DB value changes but the
 * canonical SEO URL must NOT silently change. Unmapped areas simply get
 * no landing page (they are excluded by SLUG_TO_AREA lookup → notFound()).
 *
 * Junk/test area values (e.g. "matikanetannhauser") are intentionally
 * excluded from this map.
 */

/**
 * Normalize an area string to a URL-safe slug.
 * Used as a fallback / bootstrap helper — AREA_TO_SLUG is the source of truth.
 */
export function slugifyArea(area: string): string {
  return area
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/[^a-z0-9]+/g, '-')     // non-alnum → hyphen
    .replace(/^-+|-+$/g, '')         // trim leading/trailing hyphens
}

/**
 * Source of truth for canonical area slugs.
 * Derived from real `tag.area` values on the Vitrina DB (ref fdfbyhjwnbteccagulxb).
 */
export const AREA_TO_SLUG: Readonly<Record<string, string>> = {
  'Ingeniería y Tecnología':           'ingenieria-y-tecnologia',
  'Artes y Literatura':                'artes-y-literatura',
  'Ciencias sociales y Humanidades':   'ciencias-sociales-y-humanidades',
  'Educación':                         'educacion',
  'Economía y Administración':         'economia-y-administracion',
  'Ciencias':                          'ciencias',
  'Salud':                             'salud',
}

/**
 * Inverse map: slug → area name.
 * Derived from AREA_TO_SLUG — do not edit manually.
 */
export const SLUG_TO_AREA: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(AREA_TO_SLUG).map(([area, slug]) => [slug, area])
)
