import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import InstructorClient from './InstructorClient'
export const metadata = { title: 'Instructor Portal' }

export default async function InstructorPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: courses }, { data: groupRooms }, { data: privateRooms }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),

    supabase.from('courses')
      .select('*')
      .eq('instructor_id', user.id)
      .order('created_at', { ascending: false }),

    // Group rooms this instructor owns
    supabase.from('live_rooms')
      .select('*, courses(title)')
      .eq('instructor_id', user.id)
      .eq('room_type', 'group')
      .order('created_at', { ascending: false })
      .limit(10),

    // Private sessions: pending and active
    supabase.from('live_rooms')
      .select('*, courses(title), student:student_id(id, full_name, email)')
      .eq('instructor_id', user.id)
      .eq('room_type', 'private')
      .in('status', ['pending', 'active'])
      .order('created_at', { ascending: false }),
  ])

  if (profile?.role !== 'instructor') redirect('/dashboard')
  if (profile?.instructor_status === 'pending') redirect('/instructor/pending')

  return (
    <InstructorClient
      profile={profile}
      courses={courses || []}
      groupRooms={groupRooms || []}
      privateRooms={privateRooms || []}
    />
  )
}
