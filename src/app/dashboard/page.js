import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
export const metadata = { title: 'My Dashboard' }

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role === 'instructor') redirect('/instructor')
  if (!profile?.onboarded) redirect('/onboarding')

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('*, courses(id,title,category,level,thumbnail_url,duration_hours,is_free,short_desc)')
    .eq('student_id', user.id)

  // Enrolled course IDs to exclude from suggestions
  const enrolledIds = (enrollments || []).map(e => e.courses?.id).filter(Boolean)

  const [
    { data: suggestedCourses },
    { data: groupRooms },
    { data: courseGroupRooms },
    { data: privateRooms },
    { data: instructors },
  ] = await Promise.all([
    // Exclude already-enrolled courses
    supabase.from('courses')
      .select('id,title,category,level,short_desc,duration_hours,is_free,tags')
      .eq('published', true).eq('approved', true)
      .not('id', 'in', enrolledIds.length > 0 ? `(${enrolledIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)')
      .limit(6),

    // Active group rooms (not course-specific)
    supabase.from('live_rooms')
      .select('*, courses(title), instructor:instructor_id(id,full_name)')
      .eq('room_type', 'group')
      .eq('is_active', true)
      .is('course_id', null)
      .limit(4),

    // Active group rooms for courses the student is enrolled in
    enrolledIds.length > 0
      ? supabase.from('live_rooms')
          .select('*, courses(id,title), instructor:instructor_id(id,full_name)')
          .eq('room_type', 'group')
          .eq('is_active', true)
          .in('course_id', enrolledIds)
      : Promise.resolve({ data: [] }),

    // This student's private rooms
    supabase.from('live_rooms')
      .select('*, courses(title), instructor:instructor_id(id,full_name)')
      .eq('room_type', 'private')
      .eq('student_id', user.id)
      .in('status', ['pending', 'active'])
      .order('created_at', { ascending: false }),

    // Approved instructors
    supabase.from('profiles')
      .select('id, full_name')
      .eq('role', 'instructor')
      .eq('instructor_status', 'approved'),
  ])

  // Merge all group rooms
  const allGroupRooms = [...(groupRooms || []), ...(courseGroupRooms || [])]

  return (
    <DashboardClient
      profile={profile}
      enrollments={enrollments || []}
      suggestedCourses={suggestedCourses || []}
      groupRooms={allGroupRooms}
      privateRooms={privateRooms || []}
      instructors={instructors || []}
    />
  )
}
