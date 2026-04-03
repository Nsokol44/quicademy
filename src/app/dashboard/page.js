import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
export const metadata = { title: 'My Dashboard' }

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [
    { data: profile },
    { data: enrollments },
    { data: suggestedCourses },
    { data: groupRooms },
    { data: privateRooms },
    { data: instructors },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),

    supabase.from('enrollments')
      .select('*, courses(id,title,category,level,thumbnail_url,duration_hours,is_free,short_desc)')
      .eq('student_id', user.id),

    supabase.from('courses')
      .select('id,title,category,level,short_desc,duration_hours,is_free,tags')
      .eq('published', true).eq('approved', true)
      .limit(6),

    // Active group rooms only
    supabase.from('live_rooms')
      .select('*, courses(title), instructor:instructor_id(id,full_name)')
      .eq('room_type', 'group')
      .eq('is_active', true)
      .limit(4),

    // This student's private rooms (pending or active)
    supabase.from('live_rooms')
      .select('*, courses(title), instructor:instructor_id(id,full_name)')
      .eq('room_type', 'private')
      .eq('student_id', user.id)
      .in('status', ['pending', 'active'])
      .order('created_at', { ascending: false }),

    // Approved instructors the student can request a session with
    supabase.from('profiles')
      .select('id, full_name')
      .eq('role', 'instructor')
      .eq('instructor_status', 'approved'),
  ])

  if (profile?.role === 'instructor') redirect('/instructor')
  if (!profile?.onboarded) redirect('/onboarding')

  return (
    <DashboardClient
      profile={profile}
      enrollments={enrollments || []}
      suggestedCourses={suggestedCourses || []}
      groupRooms={groupRooms || []}
      privateRooms={privateRooms || []}
      instructors={instructors || []}
    />
  )
}
