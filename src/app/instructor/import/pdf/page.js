import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import GeneratePdfClient from './GeneratePdfClient'
export const metadata = { title: 'Generate Course from PDF' }

export default async function GeneratePdfPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('role,instructor_status').eq('id', user.id).single()
  if (profile?.role !== 'instructor' || profile?.instructor_status !== 'approved') redirect('/instructor')
  return <GeneratePdfClient profileId={user.id} />
}
