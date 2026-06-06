import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL] To: ${to} | Subject: ${subject}`)
    return true
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || 'Quicademy Press <press@quicademy.com>', to, subject, html }),
    })
    return res.ok
  } catch { return false }
}

function template(title, body, ctaLabel, ctaUrl) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f5f0ff;padding:40px 20px;margin:0">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;overflow:hidden">
    <div style="background:#1a1035;padding:28px 32px">
      <p style="color:#f5c842;font-size:20px;font-weight:700;margin:0;font-family:Georgia,serif">Quicademy Press</p>
    </div>
    <div style="padding:32px">
      <h2 style="color:#1a1035;font-size:18px;margin:0 0 12px;font-family:Georgia,serif">${title}</h2>
      <div style="color:#475569;font-size:14px;line-height:1.7;margin-bottom:24px">${body}</div>
      ${ctaUrl ? `<a href="${ctaUrl}" style="display:inline-block;background:#5b3fa8;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${ctaLabel}</a>` : ''}
    </div>
    <div style="background:#f5f0ff;padding:16px 32px;font-size:12px;color:#94a3b8">Quicademy Press · quicademy.com/press</div>
  </div>
</body></html>`
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { type, authorName, authorEmail, bookTitle, status, rejectionReason } = body
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quicademy.com'

    // ── New submission: notify admins + confirm to author ──
    if (type === 'book_submission') {
      const cookieStore = cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { cookies: { get(n) { return cookieStore.get(n)?.value }, set(){}, remove(){} } }
      )
      const { data: admins } = await supabase.from('profiles').select('email').eq('role', 'admin')
      for (const admin of (admins || [])) {
        if (!admin.email) continue
        await sendEmail({
          to: admin.email,
          subject: `New book submission: "${bookTitle}"`,
          html: template(
            'New Book Submission',
            `<p><strong>${authorName}</strong> has submitted a book for review:</p>
            <p style="background:#f5f0ff;padding:12px 16px;border-radius:8px;font-weight:600;font-size:16px">"${bookTitle}"</p>`,
            'Review submission', `${siteUrl}/press/admin`
          ),
        })
      }
      await sendEmail({
        to: authorEmail,
        subject: `We received your submission — "${bookTitle}"`,
        html: template(
          'Submission received!',
          `<p>Hi ${authorName},</p>
          <p>Thank you for submitting <strong>"${bookTitle}"</strong> to Quicademy Press. Our editorial team will review it carefully and respond within <strong>2–3 weeks</strong>.</p>`,
          'Browse our books', `${siteUrl}/press`
        ),
      })
    }

    // ── Decision: notify author of approval or rejection ──
    if (type === 'book_decision') {
      if (status === 'approved') {
        await sendEmail({
          to: authorEmail,
          subject: `Great news — your submission has been approved!`,
          html: template(
            'Your book has been approved!',
            `<p>Hi ${authorName},</p>
            <p>We're delighted to let you know that <strong>"${bookTitle}"</strong> has been approved for publication by Quicademy Press.</p>
            <p>Our editorial team will be in touch shortly to discuss next steps, including the publishing agreement, timeline, and cover design.</p>
            <p>Congratulations, and welcome to Quicademy Press!</p>`,
            'Browse our books', `${siteUrl}/press`
          ),
        })
      }
      if (status === 'rejected') {
        await sendEmail({
          to: authorEmail,
          subject: `Update on your Quicademy Press submission`,
          html: template(
            'An update on your submission',
            `<p>Hi ${authorName},</p>
            <p>Thank you for submitting <strong>"${bookTitle}"</strong> to Quicademy Press. After careful review, we are unable to move forward with this manuscript at this time.</p>
            ${rejectionReason ? `<p><strong>Feedback from our editorial team:</strong></p><p style="background:#f5f0ff;padding:12px 16px;border-radius:8px">${rejectionReason}</p>` : ''}
            <p>We appreciate you thinking of Quicademy Press and wish you the best with your writing.</p>`,
            null, null
          ),
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Notify submission error:', err)
    return NextResponse.json({ ok: false })
  }
}
