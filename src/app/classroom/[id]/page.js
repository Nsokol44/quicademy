import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import ClassroomClient from './ClassroomClient'

export const metadata = { title: 'Classroom' }

export default async function ClassroomPage({ params }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: room }, { data: profile }, { data: messages }] = await Promise.all([
    supabase
      .from('live_rooms')
      .select('*, courses(title,category), instructor:instructor_id(id,full_name), classes(id,name)')
      .eq('id', params.id)
      .single(),
    supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', user.id)
      .single(),
    supabase
      .from('room_messages')
      .select('*')
      .eq('room_id', params.id)
      .order('created_at', { ascending: true })
      .limit(200),
  ])

  if (!room) notFound()

  // Get this user's class membership (for anon name)
  let membership = null
  if (room.class_id) {
    const { data } = await supabase
      .from('class_members')
      .select('role, anon_name')
      .eq('class_id', room.class_id)
      .eq('user_id', user.id)
      .single()
    membership = data
  }

  const effectiveRole = membership?.role || profile?.role || 'student'
  const isStaff = ['instructor', 'ta', 'admin'].includes(effectiveRole)

  return (
    <ClassroomClient
      room={room}
      profile={profile}
      membership={membership}
      isStaff={isStaff}
      initialMessages={messages || []}
    />
  )
}
