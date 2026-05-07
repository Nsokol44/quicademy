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

async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL - no key set] To: ${to} | Subject: ${subject}`)
    return true
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Quicademy <notifications@quicademy.com>',
        to, subject, html,
      }),
    })
    return res.ok
  } catch (err) {
    console.error('Email send error:', err)
    return false
  }
}

function emailTemplate(title, body, ctaLabel, ctaUrl) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f0ff;padding:40px 20px;margin:0">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(91,63,168,0.1)">
    <div style="background:#1a1035;padding:28px 32px">
      <p style="color:#f5c842;font-size:20px;font-weight:700;margin:0;font-family:Georgia,serif">Quicademy</p>
    </div>
    <div style="padding:32px">
      <h2 style="color:#1a1035;font-size:18px;margin:0 0 12px;font-family:Georgia,serif">${title}</h2>
      <div style="color:#475569;font-size:14px;line-height:1.7;margin-bottom:24px">${body}</div>
      ${ctaUrl ? `<a href="${ctaUrl}" style="display:inline-block;background:#5b3fa8;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${ctaLabel || 'View'}</a>` : ''}
    </div>
    <div style="background:#f5f0ff;padding:16px 32px;font-size:12px;color:#94a3b8">
      You're receiving this because you have an account on Quicademy.
    </div>
  </div>
</body></html>`
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { type, roomId, classId, senderName, messagePreview, studentEmail, courseTitle } = body
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quicademy.com'
    const notifications = []
    const emails = []

    // ── New question in class chat ──────────────────────────
    if (type === 'new_question' && classId) {
      const { data: staff } = await supabase
        .from('class_members')
        .select('user_id, profiles(email, full_name)')
        .eq('class_id', classId)
        .in('role', ['instructor', 'ta'])
        .neq('user_id', user.id)

      staff?.forEach(m => {
        notifications.push({
          user_id: m.user_id, type: 'new_question',
          title: 'New question in class',
          body: `${senderName}: "${messagePreview?.slice(0, 80)}${messagePreview?.length > 80 ? '…' : ''}"`,
          link: `/classroom/${roomId}`,
        })
        if (m.profiles?.email) {
          emails.push({
            to: m.profiles.email,
            subject: `New student question — ${courseTitle || 'your class'}`,
            html: emailTemplate(
              'A student asked a question',
              `<p><strong>${senderName}</strong> posted in your class chat:</p>
              <blockquote style="border-left:3px solid #5b3fa8;margin:12px 0;padding:8px 16px;background:#f5f0ff;border-radius:0 6px 6px 0;font-style:italic">"${messagePreview?.slice(0, 200)}"</blockquote>`,
              'View classroom', `${siteUrl}/classroom/${roomId}`
            ),
          })
        }
      })
    }

    // ── Private session requested ───────────────────────────
    if (type === 'private_request') {
      const { data: room } = await supabase
        .from('live_rooms')
        .select('instructor_id, secondary_instructor_id, title, instructor:instructor_id(email)')
        .eq('id', roomId).single()

      if (room) {
        [room.instructor_id, room.secondary_instructor_id].filter(Boolean).forEach(uid => {
          notifications.push({
            user_id: uid, type: 'private_request',
            title: 'Private session requested',
            body: `${senderName} wants a 1-on-1: "${room.title?.replace('1-on-1: ', '')}"`,
            link: '/instructor',
          })
        })
        if (room.instructor?.email) {
          emails.push({
            to: room.instructor.email,
            subject: `Private session request from ${senderName}`,
            html: emailTemplate(
              `${senderName} wants to meet 1-on-1`,
              `<p>A student has requested a private session:</p>
              <p style="background:#f5f0ff;padding:12px 16px;border-radius:8px;font-weight:600">"${room.title?.replace('1-on-1: ','')}"</p>`,
              'Review request', `${siteUrl}/instructor`
            ),
          })
        }
        // Confirm to student
        if (studentEmail) {
          emails.push({
            to: studentEmail,
            subject: 'Session request received',
            html: emailTemplate(
              'Request sent!',
              `<p>Your request for a private session has been sent to your instructor. You'll be notified when they respond.</p>`,
              'Go to dashboard', `${siteUrl}/dashboard`
            ),
          })
        }
      }
    }

    // ── Session accepted ────────────────────────────────────
    if (type === 'private_accepted') {
      const { data: room } = await supabase.from('live_rooms').select('student_id').eq('id', roomId).single()
      if (room?.student_id) {
        notifications.push({
          user_id: room.student_id, type: 'private_request',
          title: 'Session accepted!',
          body: 'Your instructor accepted your 1-on-1 request. Click to join.',
          link: `/live-room/${roomId}`,
        })
      }
      if (studentEmail) {
        emails.push({
          to: studentEmail,
          subject: 'Your session request was accepted!',
          html: emailTemplate(
            'Your instructor is ready',
            `<p>Your instructor has accepted your session request. You can join now.</p>`,
            'Join session', `${siteUrl}/live-room/${roomId}`
          ),
        })
      }
    }

    // ── Live class started ──────────────────────────────────
    if (type === 'room_started' && classId) {
      const { data: students } = await supabase
        .from('class_members')
        .select('user_id, profiles(email)')
        .eq('class_id', classId)
        .eq('role', 'student')

      students?.forEach(m => {
        notifications.push({
          user_id: m.user_id, type: 'room_started',
          title: 'Class session is live',
          body: 'Your instructor has started a live session.',
          link: `/classroom/${roomId}`,
        })
        if (m.profiles?.email) {
          emails.push({
            to: m.profiles.email,
            subject: 'Live class session started — join now',
            html: emailTemplate(
              'Your class is live!',
              `<p>Your instructor has opened a live session. Join now to participate.</p>`,
              'Join live session', `${siteUrl}/classroom/${roomId}`
            ),
          })
        }
      })
    }

    // Insert in-app notifications
    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications)
    }

    // Fire-and-forget emails
    emails.forEach(e => sendEmail(e).catch(console.error))

    return NextResponse.json({ sent: notifications.length, emails: emails.length })
  } catch (err) {
    console.error('Notify error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
