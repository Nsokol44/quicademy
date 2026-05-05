'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Upload, FileArchive, CheckCircle, AlertTriangle, ArrowRight, BookOpen, X, Loader } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ── CourseForge ZIP structure (update if format differs) ──────────────
// Expected zip contents:
//   course.json          — main course metadata
//   modules/             — folder of module files (optional)
//   modules/01-*.json    — individual module data (optional)
//
// course.json expected shape:
// {
//   "title": "...",
//   "description": "...",
//   "category": "...",
//   "level": "beginner|intermediate|advanced",
//   "duration_hours": 8,
//   "modules": [
//     {
//       "title": "...",
//       "description": "...",
//       "content_type": "video|text|quiz|interactive|scenario",
//       "content_body": "...",   // markdown or HTML
//       "duration_mins": 30
//     }
//   ]
// }
// ─────────────────────────────────────────────────────────────────────

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now()
}

async function parseZip(file) {
  // Dynamically import JSZip from CDN via script injection (no npm install needed)
  if (!window.JSZip) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
      s.onload = resolve; s.onerror = reject
      document.head.appendChild(s)
    })
  }

  const zip = await window.JSZip.loadAsync(file)
  const files = Object.keys(zip.files)

  // Try to find course.json at root or one level deep
  let courseJson = null
  const courseFile = files.find(f => f.endsWith('course.json') || f.endsWith('course-data.json') || f.endsWith('manifest.json'))

  if (courseFile) {
    const text = await zip.files[courseFile].async('text')
    courseJson = JSON.parse(text)
  } else {
    // Try any .json file at root
    const rootJson = files.find(f => !f.includes('/') && f.endsWith('.json'))
    if (rootJson) {
      const text = await zip.files[rootJson].async('text')
      courseJson = JSON.parse(text)
    }
  }

  if (!courseJson) throw new Error('No course.json found in zip. Please check the CourseForge export format.')

  // Normalise the data — handle different possible shapes
  const course = normalizeCourse(courseJson)

  // Also check for separate module files if modules array is empty
  if (course.modules.length === 0) {
    const moduleFiles = files
      .filter(f => f.includes('module') && f.endsWith('.json'))
      .sort()
    for (const mf of moduleFiles) {
      const text = await zip.files[mf].async('text')
      try {
        const mod = JSON.parse(text)
        course.modules.push(normalizeModule(mod))
      } catch {}
    }
  }

  return course
}

function normalizeCourse(data) {
  // Support multiple possible key names from different export formats
  return {
    title:          data.title || data.name || data.courseName || 'Imported Course',
    description:    data.description || data.overview || data.summary || '',
    short_desc:     data.short_desc || data.shortDescription || data.tagline || '',
    category:       data.category || data.subject || data.topic || 'Other',
    level:          normalizeLevel(data.level || data.difficulty || 'beginner'),
    duration_hours: parseFloat(data.duration_hours || data.durationHours || data.hours || 0),
    tags:           data.tags || data.keywords || [],
    modules:        (data.modules || data.lessons || data.sections || []).map(normalizeModule),
  }
}

function normalizeModule(m) {
  return {
    title:         m.title || m.name || 'Untitled Module',
    description:   m.description || m.overview || '',
    content_type:  normalizeContentType(m.content_type || m.type || m.contentType || 'text'),
    content_body:  m.content_body || m.content || m.body || m.text || m.html || '',
    content_url:   m.content_url || m.url || m.video_url || m.videoUrl || '',
    duration_mins: parseInt(m.duration_mins || m.duration || m.minutes || 0),
    sort_order:    m.sort_order || m.order || m.index || 0,
  }
}

function normalizeLevel(level) {
  const l = (level || '').toLowerCase()
  if (l.includes('inter') || l.includes('mid'))    return 'intermediate'
  if (l.includes('adv') || l.includes('expert'))   return 'advanced'
  return 'beginner'
}

function normalizeContentType(type) {
  const t = (type || '').toLowerCase()
  if (t.includes('video') || t.includes('vimeo') || t.includes('youtube')) return 'video'
  if (t.includes('quiz') || t.includes('test') || t.includes('assess'))    return 'quiz'
  if (t.includes('interact'))                                               return 'interactive'
  if (t.includes('scenario') || t.includes('case'))                        return 'scenario'
  return 'text'
}

export default function ImportClient({ profileId }) {
  const supabase = createClient()
  const fileRef = useRef(null)

  const [stage, setStage]     = useState('upload') // upload | parsing | preview | importing | done
  const [error, setError]     = useState(null)
  const [parsed, setParsed]   = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult]   = useState(null)

  const handleFile = async (file) => {
    if (!file) return
    if (!file.name.endsWith('.zip')) {
      setError('Please upload a .zip file exported from CourseForge.')
      return
    }
    setError(null)
    setStage('parsing')
    try {
      const course = await parseZip(file)
      setParsed(course)
      setStage('preview')
    } catch (err) {
      setError(err.message)
      setStage('upload')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0])
  }

  const handleImport = async () => {
    if (!parsed) return
    setImporting(true)
    try {
      const slug = slugify(parsed.title)

      // Insert course
      const { data: course, error: courseErr } = await supabase.from('courses').insert({
        instructor_id:  profileId,
        title:          parsed.title,
        slug:           slug,
        description:    parsed.description,
        short_desc:     parsed.short_desc || parsed.description?.slice(0, 120),
        category:       parsed.category,
        level:          parsed.level,
        duration_hours: parsed.duration_hours || null,
        tags:           parsed.tags || [],
        is_free:        false,
        published:      false, // drafts — instructor reviews before publishing
        approved:       false,
      }).select().single()

      if (courseErr) throw courseErr

      // Insert modules
      if (parsed.modules?.length > 0) {
        const moduleRows = parsed.modules.map((m, i) => ({
          course_id:    course.id,
          title:        m.title,
          description:  m.description,
          content_type: m.content_type,
          content_body: m.content_body,
          content_url:  m.content_url,
          duration_mins:m.duration_mins || null,
          sort_order:   m.sort_order || i,
        }))
        const { error: modErr } = await supabase.from('modules').insert(moduleRows)
        if (modErr) throw modErr
      }

      setResult({ courseId: course.id, title: course.title, moduleCount: parsed.modules?.length || 0 })
      setStage('done')
      toast.success(`"${course.title}" imported as draft!`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setImporting(false)
    }
  }

  const reset = () => { setStage('upload'); setParsed(null); setError(null); setResult(null) }

  const LEVEL_LABEL = { beginner:'Beginner', intermediate:'Intermediate', advanced:'Advanced' }

  return (
    <div className="min-h-screen bg-violet-50 py-10 px-5">
      <div className="max-w-3xl mx-auto">
        <Link href="/instructor" className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-800 font-sans text-sm mb-6 transition-colors">
          ← Back to portal
        </Link>

        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-violet-900 mb-2">Import from CourseForge</h1>
          <p className="font-sans text-sm text-muted leading-relaxed">
            Upload a .zip export from CourseForge to automatically create a course with all its modules. Imported courses are saved as drafts for you to review before publishing.
          </p>
        </div>

        {/* Upload stage */}
        {stage === 'upload' && (
          <div>
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-violet-300 rounded-2xl p-16 text-center cursor-pointer hover:border-violet-500 hover:bg-white transition-all"
            >
              <FileArchive size={40} className="text-violet-300 mx-auto mb-4" />
              <p className="font-display text-xl font-semibold text-violet-900 mb-2">Drop your CourseForge .zip here</p>
              <p className="font-sans text-sm text-muted mb-5">or click to browse files</p>
              <span className="btn-primary mx-auto">
                <Upload size={14}/> Select .zip file
              </span>
              <input ref={fileRef} type="file" accept=".zip" className="hidden"
                onChange={e => handleFile(e.target.files?.[0])} />
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-sans text-sm text-red-700 font-medium">Import failed</p>
                  <p className="font-sans text-xs text-red-600 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Format guide */}
            <div className="mt-8 card p-6">
              <h3 className="font-display text-base font-semibold text-violet-900 mb-3">Expected zip format</h3>
              <div className="bg-violet-50 rounded-lg p-4 font-mono text-xs text-violet-700 leading-relaxed">
                <p>your-export.zip</p>
                <p className="ml-4">├── course.json   <span className="text-muted">(required)</span></p>
                <p className="ml-4">└── modules/      <span className="text-muted">(optional)</span></p>
                <p className="ml-8">├── 01-intro.json</p>
                <p className="ml-8">└── 02-basics.json</p>
              </div>
              <p className="font-sans text-xs text-muted mt-3 leading-relaxed">
                The importer also handles flat module arrays inside course.json. If your export has a different structure, share it and we'll update the parser.
              </p>
            </div>
          </div>
        )}

        {/* Parsing */}
        {stage === 'parsing' && (
          <div className="card p-16 text-center">
            <Loader size={32} className="text-violet-400 mx-auto mb-4 animate-spin" />
            <p className="font-display text-lg font-semibold text-violet-900">Reading zip file…</p>
          </div>
        )}

        {/* Preview */}
        {stage === 'preview' && parsed && (
          <div className="space-y-5">
            <div className="card p-7">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <p className="font-mono text-xs text-violet-500 uppercase tracking-wider mb-1">Course preview</p>
                  <h2 className="font-display text-2xl font-bold text-violet-900">{parsed.title}</h2>
                </div>
                <button onClick={reset} className="text-muted hover:text-violet-700 transition-colors p-1">
                  <X size={18}/>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="bg-violet-50 rounded-lg p-3">
                  <p className="font-mono text-xs text-muted mb-1">Category</p>
                  <p className="font-sans text-sm font-semibold text-violet-900">{parsed.category}</p>
                </div>
                <div className="bg-violet-50 rounded-lg p-3">
                  <p className="font-mono text-xs text-muted mb-1">Level</p>
                  <p className="font-sans text-sm font-semibold text-violet-900">{LEVEL_LABEL[parsed.level]}</p>
                </div>
                <div className="bg-violet-50 rounded-lg p-3">
                  <p className="font-mono text-xs text-muted mb-1">Duration</p>
                  <p className="font-sans text-sm font-semibold text-violet-900">{parsed.duration_hours || '—'}h</p>
                </div>
              </div>
              {parsed.description && (
                <p className="font-sans text-sm text-muted leading-relaxed mb-5">{parsed.description}</p>
              )}
              {parsed.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {parsed.tags.map(t => <span key={t} className="badge-violet text-xs">{t}</span>)}
                </div>
              )}
            </div>

            {/* Modules preview */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-semibold text-violet-900">
                  {parsed.modules?.length || 0} modules detected
                </h3>
              </div>
              {parsed.modules?.length === 0 ? (
                <div className="text-center py-6">
                  <p className="font-sans text-sm text-muted">No modules found in export. The course will be created empty.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {parsed.modules.slice(0, 10).map((m, i) => (
                    <div key={i} className="flex items-center gap-4 py-2.5 border-b border-border last:border-0">
                      <span className="font-mono text-xs text-muted w-7 flex-shrink-0">{String(i+1).padStart(2,'0')}</span>
                      <p className="font-sans text-sm text-violet-900 flex-1 truncate">{m.title}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {m.content_type && <span className="badge-violet text-xs">{m.content_type}</span>}
                        {m.duration_mins > 0 && <span className="font-mono text-xs text-muted">{m.duration_mins}m</span>}
                      </div>
                    </div>
                  ))}
                  {parsed.modules.length > 10 && (
                    <p className="font-mono text-xs text-muted text-center pt-2">+{parsed.modules.length - 10} more modules</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={handleImport} disabled={importing}
                className="btn-primary">
                {importing
                  ? <><Loader size={14} className="animate-spin"/> Importing…</>
                  : <><BookOpen size={14}/> Import as draft course</>
                }
              </button>
              <button onClick={reset} className="btn-ghost">Start over</button>
            </div>
            <p className="font-sans text-xs text-muted">The course will be saved as a draft. You can review and edit it before publishing.</p>
          </div>
        )}

        {/* Done */}
        {stage === 'done' && result && (
          <div className="card p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={28} className="text-green-600" />
            </div>
            <h2 className="font-display text-2xl font-bold text-violet-900 mb-2">Import successful!</h2>
            <p className="font-sans text-sm text-muted mb-1">
              <strong className="text-violet-900">"{result.title}"</strong> was created as a draft.
            </p>
            <p className="font-sans text-sm text-muted mb-7">
              {result.moduleCount} module{result.moduleCount !== 1 ? 's' : ''} imported. Review the course and publish when ready.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href={`/courses/${result.courseId}`} className="btn-outline">
                Preview course
              </Link>
              <Link href="/instructor" className="btn-primary">
                Go to instructor portal <ArrowRight size={14}/>
              </Link>
            </div>
            <button onClick={reset} className="mt-4 font-sans text-xs text-muted hover:text-violet-700 transition-colors block mx-auto">
              Import another course
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
