import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ImportClient from './ImportClient'
export const metadata = { title: 'Import Course' }

export default async function ImportPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('role,instructor_status').eq('id', user.id).single()
  if (profile?.role !== 'instructor' || profile?.instructor_status !== 'approved') redirect('/instructor')
  return <ImportClient profileId={user.id} />
}
