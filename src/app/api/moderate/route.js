import { NextResponse } from 'next/server'

const MODERATION_PROMPT = `You are a content moderator for an educational platform.
Analyze the following message and respond with ONLY a JSON object, no other text.

Rules - flag as inappropriate if the message contains:
- Profanity, slurs, or hate speech
- Bullying, harassment, or personal attacks on other students
- Sexual content
- Threats or violent language
- Spam or completely off-topic promotional content

Academic debate, disagreement with ideas, frustration with coursework, and strong opinions about topics are ALL acceptable and should NOT be flagged.

Respond with exactly this JSON format:
{"allowed": true, "reason": null}
or
{"allowed": false, "reason": "brief reason why"}

Message to moderate: `

export async function POST(request) {
  try {
    const { message } = await request.json()

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ allowed: false, reason: 'Empty message' })
    }

    // Very short messages (< 3 chars) skip moderation
    if (message.trim().length < 3) {
      return NextResponse.json({ allowed: true, reason: null })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', // Fast + cheap for moderation
        max_tokens: 60,
        messages: [{
          role: 'user',
          content: MODERATION_PROMPT + JSON.stringify(message),
        }],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text?.trim() || '{"allowed": true}'

    try {
      const result = JSON.parse(text)
      return NextResponse.json(result)
    } catch {
      // If Claude returns unparseable response, allow the message
      return NextResponse.json({ allowed: true, reason: null })
    }
  } catch (err) {
    console.error('Moderation error:', err)
    // Fail open — don't block messages if moderation service is down
    return NextResponse.json({ allowed: true, reason: null })
  }
}
