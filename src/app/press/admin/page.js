import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import PressAdminClient from './PressAdminClient'
export const metadata = { title: 'Press Admin' }

export default async function PressAdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: books }, { data: authors }] = await Promise.all([
    supabase.from('books')
      .select('*, author:author_id(full_name)')
      .order('created_at', { ascending: false }),
    supabase.from('profiles')
      .select('id, full_name')
      .eq('role', 'instructor')
      .eq('instructor_status', 'approved'),
  ])

  return <PressAdminClient books={books || []} authors={authors || []} userId={user.id} />
}
