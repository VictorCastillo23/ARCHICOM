import type { MetadataRoute } from 'next'
import { getAreasConMinimo } from '@/lib/data/areas'
import { AREA_TO_SLUG } from '@/lib/constants/areas'

// Fallback base URL — set NEXT_PUBLIC_SITE_URL in your environment.
// Add this variable to .env.local.example if it does not exist yet.
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vitrina.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,              lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE_URL}/areas`,         lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE_URL}/sobre-nosotros`,lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/terminos`,      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/revistas`,      lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.6 },
  ]

  // Dynamic area pages — guard against build-time Supabase unavailability
  let areaRoutes: MetadataRoute.Sitemap = []
  try {
    const areas = await getAreasConMinimo(3)
    areaRoutes = areas
      .filter((a) => AREA_TO_SLUG[a.area])
      .map((a) => ({
        url: `${BASE_URL}/area/${AREA_TO_SLUG[a.area]}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
  } catch {
    // Supabase unreachable at build time — area pages will be served via SSR
  }

  return [...staticRoutes, ...areaRoutes]
}
