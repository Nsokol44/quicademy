import { NextResponse } from 'next/server'
import twilio from 'twilio'
import { createAdminClient } from '@/lib/supabase-admin'
import { composeReminderText } from '@/lib/reminder-message'

export const runtime = 'nodejs'
export const maxDuration = 60

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false // refuse to run wide open
  return request.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized. Set CRON_SECRET and call with a matching Authorization header.' },
      { status: 401 }
    )
  }

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase service role key not configured.' }, { status: 500 })

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_FROM_NUMBER
  if (!accountSid || !authToken || !fromNumber) {
    return NextResponse.json({ error: 'Twilio env vars not configured.' }, { status: 500 })
  }
  const twilioClient = twilio(accountSid, authToken)

  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select('id, student_id, course_id, courses(title), profiles:student_id(phone)')
    .eq('sms_reminders_enabled', true)

  if (error) {
    console.error('[reminders/send] failed to load enrollments:', error)
    return NextResponse.json({ error: 'Could not load subscriptions.' }, { status: 500 })
  }

  let sent = 0
  const failures = []

  for (const enrollment of enrollments || []) {
    const phone = enrollment.profiles?.phone
    if (!phone) {
      failures.push({ enrollment: enrollment.id, reason: 'no phone number on profile' })
      continue
    }

    const [{ data: sections }, { data: modules }, { data: progress }] = await Promise.all([
      supabase.from('sections').select('id, title, overview, sort_order').eq('course_id', enrollment.course_id),
      supabase.from('modules').select('id, section_id, title, sort_order').eq('course_id', enrollment.course_id),
      supabase.from('module_progress').select('module_id').eq('student_id', enrollment.student_id).eq('completed', true),
    ])

    const completedIds = new Set((progress || []).map(p => p.module_id))
    const text = composeReminderText(enrollment.courses, sections || [], modules || [], completedIds)
    if (!text) {
      failures.push({ enrollment: enrollment.id, reason: 'course has no sections yet' })
      continue
    }

    try {
      await twilioClient.messages.create({ body: text, from: fromNumber, to: phone })
      await supabase.from('enrollments').update({ reminder_last_sent_at: new Date().toISOString() }).eq('id', enrollment.id)
      sent += 1
    } catch (err) {
      failures.push({ enrollment: enrollment.id, reason: err.message || 'send failed' })
    }
  }

  return NextResponse.json({ sent, failed: failures.length, failures })
}
