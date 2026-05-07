import { NextResponse } from 'next/server'

// Proxies to the central /api/ai route which uses Gemini server-side
export async function POST(request) {
  try {
    const { message } = await request.json()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const res = await fetch(`${siteUrl}/api/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'moderate', message }),
    })

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('Moderation error:', err)
    return NextResponse.json({ allowed: true, reason: null }) // fail open
  }
}
