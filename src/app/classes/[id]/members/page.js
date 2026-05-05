import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import ClassMembersClient from './ClassMembersClient'
export const metadata = { title: 'Class Members' }

export default async function ClassMembersPage({ params }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: cls }, { data: members }] = await Promise.all([
    supabase.from('classes').select('*').eq('id', params.id).single(),
    supabase.from('class_members').select('*, profiles(id,full_name,email,role)').eq('class_id', params.id).order('joined_at'),
  ])

  if (!cls) notFound()
  if (cls.instructor_id !== user.id) redirect('/instructor')

  return <ClassMembersClient cls={cls} members={members || []} />
}
