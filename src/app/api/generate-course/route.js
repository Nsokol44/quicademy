import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { GoogleGenAI } from '@google/genai'

export const runtime = 'nodejs'
export const maxDuration = 120

const MAX_PDF_BYTES = 20 * 1024 * 1024 // Gemini's inline-data limit

// Mirrors the shape GeneratePdfClient.jsx maps onto courses/sections/modules.
// Gemini's structured-output schema is a restricted OpenAPI subset (no
// unions), so `day` is a plain integer.
const curriculumSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    short_desc: { type: 'STRING' },
    description: { type: 'STRING' },
    days: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          day: { type: 'INTEGER' },
          title: { type: 'STRING' },
          steps: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { text: { type: 'STRING' } },
              required: ['text'],
            },
          },
          doneWhen: { type: 'STRING' },
          recall: { type: 'STRING' },
        },
        required: ['day', 'title', 'steps', 'doneWhen', 'recall'],
      },
    },
    troubleshooting: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          symptom: { type: 'STRING' },
          cause: { type: 'STRING' },
          fix: { type: 'STRING' },
        },
        required: ['symptom', 'cause', 'fix'],
      },
    },
    hotkeys: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { key: { type: 'STRING' }, action: { type: 'STRING' } },
        required: ['key', 'action'],
      },
    },
  },
  required: ['title', 'short_desc', 'description', 'days', 'troubleshooting'],
}

function buildPrompt({ days, focus, sourceTitle }) {
  return `You are an instructional designer building a course for Quicademy, an online learning platform. Read the attached PDF and turn it into a ${days}-day, checklist-based curriculum that teaches the material to someone starting from what the document assumes as a baseline.

Source material title/context given by the instructor: "${sourceTitle || '(untitled — infer from the PDF itself)'}"
${focus ? `The instructor wants the curriculum to emphasize: ${focus}` : ''}

Rules:
- Produce exactly ${days} sequential days, numbered 1 to ${days}, covering the material roughly in the order it builds on itself (fundamentals first).
- Each day needs 3-7 concrete, actionable steps — actual things a student does (read section X, practice Y, solve Z), not vague restatements of a heading. Each step becomes its own checkable item for the student.
- Each day needs a "doneWhen" line: an observable, checkable criterion for having finished that day.
- Each day needs a "recall" line: a short question or prompt the student answers from memory at the start of the *next* day, to reinforce retention.
- Fill "troubleshooting" with realistic sticking points a learner would hit with this specific material (misconceptions, common errors, confusing terminology) and how to resolve each — at least 3 entries if the material supports it, an empty array only if it genuinely doesn't.
- Fill "hotkeys" only if the source material is software/tool-based and has real keyboard shortcuts or command references worth memorizing; omit entirely otherwise.
- Write "short_desc" as one line (course-card subtitle) and "description" as 2-4 sentences (course detail page).
- Base everything on the actual content of the PDF. Do not invent facts not supported by or reasonably inferable from the document.`
}

export async function POST(request) {
  // ── Auth: must be an approved instructor, same gate as /instructor/import ──
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { get(name) { return cookieStore.get(name)?.value }, set() {}, remove() {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role,instructor_status').eq('id', user.id).single()
  if (profile?.role !== 'instructor' || profile?.instructor_status !== 'approved') {
    return NextResponse.json({ error: 'Instructor access required' }, { status: 403 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server.' }, { status: 500 })
  }

  let form
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 })
  }

  const file = form.get('file')
  const title = String(form.get('title') || '')
  const focus = String(form.get('focus') || '')
  const daysRaw = Number(form.get('days') || 30)
  const days = Number.isFinite(daysRaw) ? Math.min(Math.max(Math.round(daysRaw), 3), 60) : 30

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No PDF file was uploaded.' }, { status: 400 })
  }
  if (file.type && file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are supported.' }, { status: 400 })
  }
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json(
      { error: `PDF is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Limit is 20MB.` },
      { status: 400 }
    )
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')
  const ai = new GoogleGenAI({ apiKey })

  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_COURSE_MODEL || 'gemini-flash-latest',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: base64 } },
          { text: buildPrompt({ days, focus, sourceTitle: title }) },
        ],
      }],
      config: { responseMimeType: 'application/json', responseSchema: curriculumSchema, temperature: 0.4 },
    })

    const text = response.text
    if (!text) return NextResponse.json({ error: 'Gemini returned an empty response.' }, { status: 502 })

    let curriculum
    try {
      curriculum = JSON.parse(text)
    } catch {
      return NextResponse.json(
        { error: "Gemini's response wasn't valid JSON. Try again, or try a shorter PDF." },
        { status: 502 }
      )
    }

    if (title) curriculum.title = title
    return NextResponse.json({ curriculum })
  } catch (err) {
    console.error('[generate-course] Gemini error:', err)
    return NextResponse.json({ error: `Generation failed: ${err.message || 'unknown error'}` }, { status: 502 })
  }
}
