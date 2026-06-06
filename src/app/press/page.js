import { createClient } from '@/lib/supabase-server'
import PressClient from './PressClient'

export const metadata = {
  title: 'Quicademy Press',
  description: 'Books and publications from Quicademy authors — expert knowledge you can read anywhere.',
}

export const revalidate = 60

export default async function PressPage() {
  const supabase = createClient()

  const [{ data: books }, { data: authors }] = await Promise.all([
    supabase.from('books')
      .select('*, author:author_id(id, full_name, credentials, bio)')
      .eq('published', true)
      .order('featured', { ascending: false })
      .order('sort_order')
      .order('publish_date', { ascending: false }),
    supabase.from('profiles')
      .select('id, full_name, credentials, bio')
      .eq('role', 'instructor')
      .eq('instructor_status', 'approved'),
  ])

  return <PressClient books={books || []} authors={authors || []} />
}
