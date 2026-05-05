import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set(name, value, options) { try { cookieStore.set({ name, value, ...options }) } catch {} },
        remove(name, options) { try { cookieStore.set({ name, value: '', ...options }) } catch {} },
      },
    }
  )
}

export async function POST(request) {
  try {
    const { type, roomId, classId, senderName, messagePreview } = await request.json()
    const supabase = getSupabase()

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const notifications = []

    if (type === 'new_question' && classId) {
      // Notify instructor + all TAs in the class
      const { data: staff } = await supabase
        .from('class_members')
        .select('user_id')
        .eq('class_id', classId)
        .in('role', ['instructor', 'ta'])
        .neq('user_id', user.id) // Don't notify yourself

      if (staff?.length) {
        staff.forEach(m => {
          notifications.push({
            user_id: m.user_id,
            type: 'new_question',
            title: 'New question in class',
            body: `${senderName}: "${messagePreview?.slice(0, 80)}${messagePreview?.length > 80 ? '…' : ''}"`,
            link: `/classroom/${roomId}`,
          })
        })
      }
    }

    if (type === 'private_request') {
      // Notify the instructor of a 1-on-1 request
      const { data: room } = await supabase
        .from('live_rooms')
        .select('instructor_id, secondary_instructor_id')
        .eq('id', roomId)
        .single()

      if (room) {
        const recipients = [room.instructor_id, room.secondary_instructor_id].filter(Boolean)
        recipients.forEach(uid => {
          notifications.push({
            user_id: uid,
            type: 'private_request',
            title: 'Private session requested',
            body: `${senderName} is requesting a 1-on-1 session`,
            link: `/instructor`,
          })
        })
      }
    }

    if (type === 'room_started' && classId) {
      // Notify all students in the class
      const { data: students } = await supabase
        .from('class_members')
        .select('user_id')
        .eq('class_id', classId)
        .eq('role', 'student')

      if (students?.length) {
        students.forEach(m => {
          notifications.push({
            user_id: m.user_id,
            type: 'room_started',
            title: 'Class session is live',
            body: `Your instructor has opened a live session`,
            link: `/classroom/${roomId}`,
          })
        })
      }
    }

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications)
    }

    return NextResponse.json({ sent: notifications.length })
  } catch (err) {
    console.error('Notification error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
