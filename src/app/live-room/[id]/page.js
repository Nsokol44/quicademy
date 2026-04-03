import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import LiveRoomClient from './LiveRoomClient'

export const metadata = { title: 'Live Room' }

export default async function LiveRoomPage({ params }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: room }, { data: profile }, { data: messages }] = await Promise.all([
    supabase
      .from('live_rooms')
      .select('*, courses(title, category), instructor:instructor_id(id, full_name), student:student_id(id, full_name)')
      .eq('id', params.id)
      .single(),
    supabase.from('profiles').select('id, full_name, role').eq('id', user.id).single(),
    supabase
      .from('room_messages')
      .select('*')
      .eq('room_id', params.id)
      .order('created_at', { ascending: true })
      .limit(200),
  ])

  if (!room) notFound()

  // Access control: private rooms only for the two participants
  if (room.room_type === 'private') {
    const isParticipant = room.instructor_id === user.id || room.student_id === user.id
    if (!isParticipant) redirect('/dashboard')
  }

  return (
    <LiveRoomClient
      room={room}
      profile={profile}
      initialMessages={messages || []}
    />
  )
}
