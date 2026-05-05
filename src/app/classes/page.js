import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ClassesClient from './ClassesClient'
export const metadata = { title: 'My Classes' }

export default async function ClassesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const isInstructor = profile?.role === 'instructor'

  const [{ data: memberships }, { data: ownedClasses }] = await Promise.all([
    // Classes I'm a member of
    supabase.from('class_members')
      .select('*, classes(*, instructor:instructor_id(full_name), courses(title))')
      .eq('user_id', user.id),

    // Classes I own (if instructor)
    isInstructor
      ? supabase.from('classes')
          .select('*, courses(title), class_members(count)')
          .eq('instructor_id', user.id)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  return (
    <ClassesClient
      profile={profile}
      memberships={memberships || []}
      ownedClasses={ownedClasses || []}
      isInstructor={isInstructor}
    />
  )
}
