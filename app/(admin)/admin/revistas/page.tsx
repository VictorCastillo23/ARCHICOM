import { getRevistas } from '@/lib/data/revistas'
import RevistasListClient from '@/components/admin/revistas/RevistasListClient'

export const metadata = { title: 'Revistas — Admin' }

export default async function RevistasPage() {
  const { data: revistas } = await getRevistas()

  return <RevistasListClient revistas={revistas ?? []} />
}
