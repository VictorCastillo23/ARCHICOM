import { getTags } from '@/lib/data/tags'
import TagsManager from '@/components/admin/tags/TagsManager'

export const metadata = { title: 'Tags — Admin' }

export default async function TagsPage() {
  const { data: tags } = await getTags()

  return <TagsManager initialTags={tags ?? []} />
}
