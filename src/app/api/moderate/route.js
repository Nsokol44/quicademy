import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { message } = await request.json()
    if (!message) return NextResponse.json({ allowed: true, reason: null })

    const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const res = await fetch(`${base}/api/ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies so auth check in /api/ai passes
        Cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify({ type: 'moderate', message }),
    })

    if (!res.ok) return NextResponse.json({ allowed: true, reason: null })
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ allowed: true, reason: null }) // fail open
  }
}
