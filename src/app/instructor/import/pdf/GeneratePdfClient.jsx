'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { CATEGORIES } from '@/lib/constants'
import { Sparkles, FileText, CheckCircle, AlertTriangle, ArrowRight, BookOpen, X, Loader, ListChecks } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const LEVELS = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
]

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now()
}

// Renders the troubleshooting table + hotkey reference as one HTML module,
// since neither has a dedicated column in the schema.
function referenceHtml(troubleshooting, hotkeys) {
  const rows = (troubleshooting || [])
    .map(t => `<tr><td><strong>${t.symptom}</strong></td><td>${t.cause}</td><td>${t.fix}</td></tr>`)
    .join('')
  const table = rows
    ? `<h3>Troubleshooting</h3><table><thead><tr><th>Symptom</th><th>Likely cause</th><th>Fix</th></tr></thead><tbody>${rows}</tbody></table>`
    : ''
  const hk = (hotkeys || []).length
    ? `<h3>Reference</h3><ul>${hotkeys.map(h => `<li><code>${h.key}</code> — ${h.action}</li>`).join('')}</ul>`
    : ''
  return table + hk
}

export default function GeneratePdfClient({ profileId }) {
  const supabase = createClient()
  const fileRef = useRef(null)

  const [stage, setStage] = useState('upload') // upload | generating | preview | importing | done
  const [error, setError] = useState(null)
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [days, setDays] = useState(30)
  const [focus, setFocus] = useState('')

  const [curriculum, setCurriculum] = useState(null)
  const [editCategory, setEditCategory] = useState('Other')
  const [editLevel, setEditLevel] = useState('intermediate')
  const [result, setResult] = useState(null)

  const handleGenerate = async () => {
    if (!file) { setError('Choose a PDF first.'); return }
    setError(null)
    setStage('generating')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('title', title)
      form.append('days', String(days))
      form.append('focus', focus)
      const res = await fetch('/api/generate-course', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
      setCurriculum(data.curriculum)
      setStage('preview')
    } catch (err) {
      setError(err.message)
      setStage('upload')
    }
  }

  const handleImport = async () => {
    if (!curriculum) return
    setStage('importing')
    try {
      // 1. Create the course (draft, same convention as the CourseForge import)
      const totalSteps = curriculum.days.reduce((n, d) => n + d.steps.length, 0)
      const { data: course, error: ce } = await supabase.from('courses').insert({
        instructor_id: profileId,
        title: curriculum.title,
        slug: slugify(curriculum.title),
        description: curriculum.description,
        short_desc: curriculum.short_desc || curriculum.title,
        category: editCategory,
        level: editLevel,
        duration_hours: curriculum.days.length ? parseFloat((curriculum.days.length * 0.75).toFixed(1)) : null,
        tags: ['AI-generated'],
        is_free: false, published: false, approved: false,
      }).select().single()
      if (ce) throw ce

      // 2. One section per day, one module per step within it
      for (let i = 0; i < curriculum.days.length; i++) {
        const d = curriculum.days[i]
        const overview = [
          d.doneWhen ? `Done when: ${d.doneWhen}` : null,
          d.recall ? `Recall first (next session): ${d.recall}` : null,
        ].filter(Boolean).join('\n')

        const { data: section, error: se } = await supabase.from('sections').insert({
          course_id: course.id, title: `Day ${d.day} — ${d.title}`,
          overview, sort_order: i,
        }).select().single()
        if (se) throw se

        for (let j = 0; j < d.steps.length; j++) {
          const { error: me } = await supabase.from('modules').insert({
            course_id: course.id, section_id: section.id,
            title: d.steps[j].text, content_type: 'text',
            duration_mins: 20, sort_order: j,
          })
          if (me) throw me
        }
      }

      // 3. Troubleshooting + hotkeys as one trailing reference module
      const refHtml = referenceHtml(curriculum.troubleshooting, curriculum.hotkeys)
      if (refHtml) {
        await supabase.from('modules').insert({
          course_id: course.id, section_id: null,
          title: 'Troubleshooting & Reference', content_type: 'text',
          content_body: refHtml, duration_mins: 15, sort_order: 999,
        })
      }

      setResult({ courseId: course.id, title: course.title, days: curriculum.days.length, steps: totalSteps })
      setStage('done')
      toast.success(`"${course.title}" created!`)
    } catch (err) {
      toast.error(err.message)
      setStage('preview')
    }
  }

  const reset = () => {
    setStage('upload'); setError(null); setFile(null); setTitle(''); setDays(30); setFocus('')
    setCurriculum(null); setResult(null)
  }

  return (
    <div className="min-h-screen bg-violet-50 py-10 px-5">
      <div className="max-w-3xl mx-auto">
        <Link href="/instructor" className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-800 font-sans text-sm mb-6 transition-colors">
          ← Back to portal
        </Link>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-violet-900 mb-2">Generate course from PDF</h1>
          <p className="font-sans text-sm text-muted leading-relaxed">
            Upload any PDF and AI turns it into a day-by-day checklist course — steps, "done when" criteria,
            recall prompts, and a troubleshooting reference. Review before it's published.
          </p>
        </div>

        {/* Upload */}
        {stage === 'upload' && (
          <div className="space-y-5">
            <div onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-violet-300 rounded-2xl p-12 text-center cursor-pointer hover:border-violet-500 hover:bg-white transition-all">
              <FileText size={40} className="text-violet-300 mx-auto mb-4" />
              <p className="font-display text-xl font-semibold text-violet-900 mb-2">
                {file ? file.name : 'Drop a PDF here'}
              </p>
              <p className="font-sans text-sm text-muted mb-5">or click to browse</p>
              <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>

            <div className="card p-6 space-y-4">
              <div>
                <label className="field-label">Title (optional — AI infers one if left blank)</label>
                <input className="input" placeholder="e.g. Intro to Statistical Mechanics"
                  value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Length (days)</label>
                  <input type="number" min={3} max={60} className="input" value={days}
                    onChange={e => setDays(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="field-label">Focus areas (optional)</label>
                <textarea className="input resize-none" rows={2}
                  placeholder="e.g. skip the first two chapters, emphasize the proofs"
                  value={focus} onChange={e => setFocus(e.target.value)} />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="font-sans text-sm text-red-700">{error}</p>
              </div>
            )}

            <button onClick={handleGenerate} disabled={!file} className="btn-primary w-full justify-center py-3 disabled:opacity-50">
              <Sparkles size={14} /> Generate curriculum
            </button>
          </div>
        )}

        {/* Generating */}
        {stage === 'generating' && (
          <div className="card p-16 text-center">
            <Loader size={32} className="text-violet-400 mx-auto mb-4 animate-spin" />
            <p className="font-display text-lg font-semibold text-violet-900 mb-1">Reading the PDF…</p>
            <p className="font-sans text-sm text-muted">This can take a minute for longer documents.</p>
          </div>
        )}

        {/* Preview */}
        {stage === 'preview' && curriculum && (
          <div className="space-y-5">
            <div className="card p-7">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <p className="font-mono text-xs text-violet-500 uppercase tracking-wider mb-1">Ready to create</p>
                  <h2 className="font-display text-2xl font-bold text-violet-900">{curriculum.title}</h2>
                  {curriculum.short_desc && <p className="font-mono text-xs text-violet-500 mt-1">{curriculum.short_desc}</p>}
                </div>
                <button onClick={reset} className="text-muted hover:text-violet-700 p-1 transition-colors flex-shrink-0"><X size={17} /></button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: 'Days', value: curriculum.days.length },
                  { label: 'Steps', value: curriculum.days.reduce((n, d) => n + d.steps.length, 0) },
                  { label: 'Troubleshooting', value: (curriculum.troubleshooting || []).length },
                ].map(s => (
                  <div key={s.label} className="bg-violet-50 rounded-lg p-3 text-center">
                    <p className="font-display text-2xl font-bold text-violet-900">{s.value}</p>
                    <p className="font-mono text-xs text-muted mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Category</label>
                  <select className="input" value={editCategory} onChange={e => setEditCategory(e.target.value)}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Level</label>
                  <select className="input" value={editLevel} onChange={e => setEditLevel(e.target.value)}>
                    {LEVELS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-display text-lg font-semibold text-violet-900 mb-4">{curriculum.days.length} days to be created</h3>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {curriculum.days.map((d, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border/60 last:border-0">
                    <span className="font-mono text-xs text-muted w-6 flex-shrink-0">{String(d.day).padStart(2, '0')}</span>
                    <p className="font-sans text-sm text-violet-900 flex-1 truncate">{d.title}</p>
                    <span className="text-xs flex-shrink-0 badge-violet flex items-center gap-1"><ListChecks size={11} />{d.steps.length}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleImport} disabled={stage === 'importing'} className="btn-primary">
                {stage === 'importing'
                  ? <><Loader size={14} className="animate-spin" /> Creating…</>
                  : <><BookOpen size={14} /> Create course</>}
              </button>
              <button onClick={reset} className="btn-ghost">Start over</button>
            </div>
            <p className="font-sans text-xs text-muted">Saved as a draft — review and publish when ready.</p>
          </div>
        )}

        {/* Done */}
        {stage === 'done' && result && (
          <div className="card p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={28} className="text-green-600" />
            </div>
            <h2 className="font-display text-2xl font-bold text-violet-900 mb-2">Course created!</h2>
            <p className="font-sans text-sm text-muted mb-2"><strong className="text-violet-900">"{result.title}"</strong> was created as a draft.</p>
            <div className="flex justify-center gap-4 text-sm font-mono text-muted mb-7">
              <span>{result.days} days</span>
              <span>·</span>
              <span>{result.steps} steps</span>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href={`/courses/${result.courseId}`} className="btn-outline">Preview course</Link>
              <Link href="/instructor" className="btn-primary">Go to instructor portal <ArrowRight size={14} /></Link>
            </div>
            <button onClick={reset} className="mt-5 font-sans text-xs text-muted hover:text-violet-700 transition-colors block mx-auto">
              Generate another
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
