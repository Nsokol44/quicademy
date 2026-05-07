import { NextResponse } from 'next/server'

const GEMINI_MODELS = {
  chat:       'gemini-3.1-flash-lite-preview', // Fast, capable — for live room Q&A
  moderation: 'gemini-3.1-flash-lite-preview', // Same model, different prompt
}

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

async function callGemini(model, systemPrompt, userMessage, maxTokens = 800) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in environment variables')

  const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        { role: 'user', parts: [{ text: userMessage }] },
      ],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || `Gemini API error: ${res.status}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// ── Chat handler ──────────────────────────────────────────
async function handleChat(body) {
  const { message, context, roomType, courseTitle, courseCategory, isPrivate } = body

  const systemPrompt = `You are an expert AI teaching assistant inside Quicademy, an education platform.
${isPrivate
  ? 'This is a PRIVATE 1-on-1 session between a student and their instructor. Tailor responses closely to this individual student.'
  : roomType === 'class'
    ? 'This is a CLASS-WIDE session. Multiple students are present. Keep answers broadly useful.'
    : 'This is a LIVE GROUP session with an instructor present.'
}
${courseTitle ? `Course: "${courseTitle}"${courseCategory ? ` (${courseCategory})` : ''}` : ''}

Your role:
- Answer questions clearly and accurately
- Be concise but thorough — students need to apply this knowledge
- Use practical examples and real-world scenarios  
- For complex judgment calls, note the instructor can provide further guidance
- Format with short paragraphs; use numbered steps for processes

Keep responses under ${isPrivate ? '200' : '150'} words unless the question genuinely requires more detail.`

  const userContent = context
    ? `Recent conversation:\n${context}\n\nNew question: ${message}`
    : message

  const text = await callGemini(GEMINI_MODELS.chat, systemPrompt, userContent, 500)
  return { text }
}

// ── Moderation handler ────────────────────────────────────
async function handleModeration(body) {
  const { message } = body

  if (!message || message.trim().length < 3) {
    return { allowed: true, reason: null }
  }

  const systemPrompt = `You are a content moderator for an educational platform.
Analyze the following message and respond with ONLY a JSON object — no other text, no markdown, no backticks.

Flag as inappropriate ONLY if the message contains:
- Profanity, slurs, or hate speech
- Bullying, harassment, or personal attacks on other students
- Sexual content
- Threats or violent language
- Spam or promotional content completely unrelated to learning

Academic debate, frustration with coursework, strong opinions on topics, and criticism of ideas are ALL acceptable.

Respond with exactly this format:
{"allowed": true, "reason": null}
or
{"allowed": false, "reason": "brief reason"}`

  const raw = await callGemini(GEMINI_MODELS.moderation, systemPrompt, message, 60)

  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return { allowed: true, reason: null } // fail open
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { type } = body

    if (type === 'moderate') {
      const result = await handleModeration(body)
      return NextResponse.json(result)
    }

    if (type === 'chat') {
      const result = await handleChat(body)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (err) {
    console.error('AI route error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
