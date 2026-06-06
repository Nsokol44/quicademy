import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const GEMINI_MODELS = {
  chat:       'gemini-2.5-flash-preview-04-17',
  moderation: 'gemini-2.5-flash-preview-04-17',
}
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// ── In-memory rate limiter (per IP, resets per process lifecycle) ──
const rateLimitMap = new Map()
const RATE_WINDOW_MS = 60_000  // 1 minute
const MAX_REQUESTS   = 30       // 30 AI calls per IP per minute

function checkRateLimit(ip) {
  const now = Date.now()
  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_WINDOW_MS }
  if (now > entry.resetAt) {
    entry.count = 0
    entry.resetAt = now + RATE_WINDOW_MS
  }
  entry.count++
  rateLimitMap.set(ip, entry)
  return entry.count <= MAX_REQUESTS
}

// Clean up old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) rateLimitMap.delete(ip)
  }
}, 300_000)

async function callGemini(model, systemPrompt, userMessage, maxTokens = 800) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const status = res.status
    if (status === 429) throw new Error('AI service is busy — please try again in a moment')
    if (status === 503) throw new Error('AI service temporarily unavailable')
    throw new Error(err.error?.message || `Gemini API error: ${status}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function handleChat(body) {
  const { message, context, roomType, courseTitle, courseCategory, isPrivate } = body

  if (!message?.trim()) throw new Error('Message is required')
  if (message.length > 2000) throw new Error('Message too long')

  const systemPrompt = `You are an expert AI teaching assistant inside Quicademy, an education platform.
${isPrivate
  ? 'This is a PRIVATE 1-on-1 session. Tailor responses closely to this individual student.'
  : 'This is a CLASS session. Keep answers broadly useful for all students present.'
}
${courseTitle ? `Course: "${courseTitle}"${courseCategory ? ` (${courseCategory})` : ''}` : ''}

Rules:
- Answer questions clearly and accurately
- Be concise but thorough
- Use practical examples and real-world scenarios
- For complex judgment calls, note the instructor can provide further guidance
- Keep responses under ${isPrivate ? '200' : '150'} words unless the question genuinely requires more`

  const userContent = context
    ? `Recent conversation:\n${context}\n\nNew question: ${message}`
    : message

  const text = await callGemini(GEMINI_MODELS.chat, systemPrompt, userContent, 500)
  return { text }
}

async function handleModeration(body) {
  const { message } = body
  if (!message || message.trim().length < 3) return { allowed: true, reason: null }
  if (message.length > 5000) return { allowed: false, reason: 'Message too long' }

  const systemPrompt = `You are a content moderator for an educational platform.
Respond with ONLY a JSON object, no other text.

Flag ONLY: profanity/slurs, harassment, sexual content, threats, spam.
Allow: academic debate, frustration, strong opinions, criticism of ideas.

Format: {"allowed": true, "reason": null} or {"allowed": false, "reason": "brief reason"}`

  const raw = await callGemini(GEMINI_MODELS.moderation, systemPrompt, message, 60)
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim())
  } catch {
    return { allowed: true, reason: null }
  }
}

export async function POST(request) {
  try {
    // Auth check — must be logged in to use AI
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value },
          set() {}, remove() {},
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting by user ID (more reliable than IP for auth'd requests)
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Too many requests — slow down a little' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    const body = await request.json()
    const { type } = body

    if (type === 'moderate') return NextResponse.json(await handleModeration(body))
    if (type === 'chat')     return NextResponse.json(await handleChat(body))

    return NextResponse.json({ error: 'Unknown request type' }, { status: 400 })
  } catch (err) {
    console.error('[AI route error]', err.message)
    // Don't leak internal errors to client
    const safe = err.message.includes('busy') || err.message.includes('unavailable') || err.message.includes('too long')
      ? err.message
      : 'AI service error — please try again'
    return NextResponse.json({ error: safe }, { status: 500 })
  }
}
