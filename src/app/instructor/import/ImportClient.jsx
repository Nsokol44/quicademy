'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Upload, FileArchive, CheckCircle, AlertTriangle, ArrowRight, BookOpen, X, Loader, Calendar, MessageSquare, Star } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ── CourseForge ZIP structure ─────────────────────────────────────────
// README.txt          — course title, number, term, weeks, points
// Week N/             — one folder per week, each with one .html file
// Assignments/        — lab assignments (.html, includes points + week)
// Discussions/        — discussion prompts (.html, includes points + week)
// Real-World Examples/ — supplementary reading (.html)
// ─────────────────────────────────────────────────────────────────────

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now()
}

// Extract text content from an HTML string
function extractFromHtml(html) {
  // Title from <title> tag
  const titleMatch = html.match(/<title>([^<]+)<\/title>/)
  const title = titleMatch ? titleMatch[1].trim() : 'Untitled'

  // Meta line — e.g. "<strong>Lab</strong> · 100 pts · Week 2 · Due: End of Week 2"
  const metaMatch = html.match(/class="meta">([\s\S]*?)<\/p>/)
  const meta = metaMatch ? metaMatch[1].replace(/<[^>]+>/g, '').trim() : ''

  // Extract points from meta
  const ptsMatch = meta.match(/(\d+)\s*pts?/i)
  const points = ptsMatch ? parseInt(ptsMatch[1]) : null

  // Extract week number from meta
  const weekMatch = meta.match(/Week\s*(\d+)/i)
  const weekNum = weekMatch ? parseInt(weekMatch[1]) : null

  // Extract type (Lab, Discussion, etc.)
  const typeMatch = meta.match(/^([^·]+)·/)
  const type = typeMatch ? typeMatch[1].trim() : null

  // Get body content (strip all HTML tags for storage as content_body)
  // Keep the full HTML for content_html
  const bodyMatch = html.match(/<body>([\s\S]*)<\/body>/)
  const bodyHtml = bodyMatch ? bodyMatch[1].trim() : html

  // Strip style tag content for cleaner storage
  const cleanHtml = bodyHtml.replace(/<style>[\s\S]*?<\/style>/g, '')

  return { title, meta, points, weekNum, type, bodyHtml: cleanHtml }
}

// Parse README.txt
function parseReadme(text) {
  const lines = text.split('\n')
  const get = (key) => {
    const line = lines.find(l => l.toLowerCase().startsWith(key.toLowerCase() + ':'))
    return line ? line.split(':').slice(1).join(':').trim() : null
  }
  return {
    courseName: get('Course'),
    courseNumber: get('Number'),
    term: get('Term'),
    totalPoints: get('Total Points'),
    weeks: parseInt(get('Weeks') || '0'),
    assignments: parseInt(get('Assignments') || '0'),
  }
}

async function parseZip(file) {
  // Load JSZip from CDN
  if (!window.JSZip) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
      s.onload = resolve
      s.onerror = () => reject(new Error('Failed to load JSZip'))
      document.head.appendChild(s)
    })
  }

  const zip = await window.JSZip.loadAsync(file)
  const files = Object.keys(zip.files).filter(f => !zip.files[f].dir)

  // ── Parse README ──────────────────────────────────────────
  const readmeFile = files.find(f => f.endsWith('README.txt'))
  let meta = { courseName: 'Imported Course', courseNumber: '', term: '', weeks: 0 }
  if (readmeFile) {
    const text = await zip.files[readmeFile].async('text')
    meta = parseReadme(text)
  }

  const modules = []
  let sortOrder = 0

  // ── Parse Week folders (main lessons) ────────────────────
  const weekFiles = files
    .filter(f => f.match(/^Week \d+\//i) && f.endsWith('.html'))
    .sort((a, b) => {
      const na = parseInt(a.match(/Week (\d+)/i)?.[1] || 0)
      const nb = parseInt(b.match(/Week (\d+)/i)?.[1] || 0)
      return na - nb
    })

  for (const wf of weekFiles) {
    const html = await zip.files[wf].async('text')
    const { title, bodyHtml } = extractFromHtml(html)
    const weekNum = parseInt(wf.match(/Week (\d+)/i)?.[1] || 0)
    modules.push({
      folder: 'week',
      title,
      description: `Week ${weekNum} lesson content`,
      content_type: 'text',
      content_body: bodyHtml,
      sort_order: weekNum * 10, // weeks sort first, numbered by week
      week_num: weekNum,
    })
    sortOrder = Math.max(sortOrder, weekNum * 10)
  }

  // ── Parse Assignments (deduplicate by title) ─────────────
  const assignmentFiles = files
    .filter(f => f.startsWith('Assignments/') && f.endsWith('.html'))
    .sort()

  const seenAssignments = new Set()
  let assignIdx = 0
  for (const af of assignmentFiles) {
    const html = await zip.files[af].async('text')
    const { title, bodyHtml, points, weekNum } = extractFromHtml(html)
    if (seenAssignments.has(title)) continue // skip duplicates
    seenAssignments.add(title)
    assignIdx++
    modules.push({
      folder: 'assignment',
      title,
      description: points ? `${points} pts${weekNum ? ` · Week ${weekNum}` : ''}` : '',
      content_type: 'interactive', // assignments are hands-on
      content_body: bodyHtml,
      sort_order: (weekNum ? weekNum * 10 : sortOrder + assignIdx) + 2, // after lesson in same week
      points,
      week_num: weekNum,
    })
  }

  // ── Parse Discussions (deduplicate by title) ─────────────
  const discussionFiles = files
    .filter(f => f.startsWith('Discussions/') && f.endsWith('.html'))
    .sort()

  const seenDiscussions = new Set()
  let discIdx = 0
  for (const df of discussionFiles) {
    const html = await zip.files[df].async('text')
    const { title, bodyHtml, points, weekNum } = extractFromHtml(html)
    if (seenDiscussions.has(title)) continue
    seenDiscussions.add(title)
    discIdx++
    modules.push({
      folder: 'discussion',
      title,
      description: points ? `Discussion · ${points} pts${weekNum ? ` · Week ${weekNum}` : ''}` : 'Discussion',
      content_type: 'interactive',
      content_body: bodyHtml,
      sort_order: (weekNum ? weekNum * 10 : sortOrder + discIdx) + 1,
      points,
      week_num: weekNum,
    })
  }

  // ── Parse Real-World Examples ─────────────────────────────
  const exampleFiles = files
    .filter(f => f.startsWith('Real-World Examples/') && f.endsWith('.html'))
    .sort()

  let exIdx = 0
  for (const ef of exampleFiles) {
    const html = await zip.files[ef].async('text')
    const { title, bodyHtml } = extractFromHtml(html)
    exIdx++
    modules.push({
      folder: 'example',
      title,
      description: 'Real-world case study',
      content_type: 'text',
      content_body: bodyHtml,
      sort_order: 1000 + exIdx, // real-world examples go at end
    })
  }

  // Sort all modules by sort_order
  modules.sort((a, b) => a.sort_order - b.sort_order)
  // Re-index sort_order 0,1,2...
  modules.forEach((m, i) => { m.sort_order = i })

  return {
    title: meta.courseName || 'Imported Course',
    course_number: meta.courseNumber,
    term: meta.term,
    short_desc: `${meta.courseNumber ? meta.courseNumber + ' — ' : ''}${meta.term || ''}`.trim().replace(/^—\s*/, ''),
    description: `${meta.courseName}${meta.courseNumber ? ` (${meta.courseNumber})` : ''}${meta.term ? `, ${meta.term}` : ''}. ${meta.weeks} weeks, ${meta.assignments} assignments.`,
    category: 'Other',
    level: 'intermediate',
    duration_hours: meta.weeks ? parseFloat((meta.weeks * 2.5).toFixed(1)) : null,
    weeks: meta.weeks,
    modules,
    stats: {
      weeks: weekFiles.length,
      assignments: assignmentFiles.length,
      discussions: discussionFiles.length,
      examples: exampleFiles.length,
    }
  }
}

const FOLDER_STYLES = {
  week:       { label: 'Lesson',      cls: 'badge-violet' },
  assignment: { label: 'Assignment',  cls: 'badge-solar' },
  discussion: { label: 'Discussion',  cls: 'bg-green-100 text-green-700 badge' },
  example:    { label: 'Case Study',  cls: 'bg-blue-100 text-blue-700 badge' },
}

export default function ImportClient({ profileId }) {
  const supabase = createClient()
  const fileRef = useRef(null)

  const [stage, setStage]   = useState('upload')
  const [error, setError]   = useState(null)
  const [parsed, setParsed] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  // Allow editing category/level before import
  const [editCategory, setEditCategory] = useState('Other')
  const [editLevel, setEditLevel] = useState('intermediate')

  const CATEGORIES = ['Technology','Business','Design','Science','Mathematics','Health & Medicine','Arts & Humanities','Law','Trades & Vocational','Language','Personal Development','Other']
  const LEVELS = [{ id:'beginner', label:'Beginner' }, { id:'intermediate', label:'Intermediate' }, { id:'advanced', label:'Advanced' }]

  const handleFile = async (file) => {
    if (!file) return
    if (!file.name.endsWith('.zip')) { setError('Please upload a .zip file from CourseForge.'); return }
    setError(null)
    setStage('parsing')
    try {
      const course = await parseZip(file)
      setParsed(course)
      setEditCategory('Other')
      setEditLevel('intermediate')
      setStage('preview')
    } catch (err) {
      setError(err.message)
      setStage('upload')
    }
  }

  const handleDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }

  const handleImport = async () => {
    if (!parsed) return
    setLoading(true)
    try {
      // 1. Create the course
      const { data: course, error: ce } = await supabase.from('courses').insert({
        instructor_id:  profileId,
        title:          parsed.title,
        slug:           slugify(parsed.title),
        description:    parsed.description,
        short_desc:     parsed.short_desc || parsed.title,
        category:       editCategory,
        level:          editLevel,
        duration_hours: parsed.duration_hours,
        tags:           [parsed.course_number, parsed.term].filter(Boolean),
        is_free:        false, published: false, approved: false,
      }).select().single()
      if (ce) throw ce

      // 2. Create one section per week, with concept overview extracted from HTML
      const weekModules  = parsed.modules.filter(m => m.folder === 'week')
      const otherModules = parsed.modules.filter(m => m.folder !== 'week')
      const sectionMap   = {} // weekNum -> section.id

      for (let i = 0; i < weekModules.length; i++) {
        const wm = weekModules[i]
        const weekNum = wm.week_num || (i + 1)
        const overviewMatch = wm.content_body?.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
        const overview = overviewMatch
          ? overviewMatch[1].replace(/<[^>]+>/g,'').trim().slice(0,600) : null

        const { data: section, error: se } = await supabase.from('sections').insert({
          course_id: course.id, title: wm.title,
          overview, sort_order: i,
        }).select().single()
        if (se) throw se
        sectionMap[weekNum] = section.id

        // Week lesson as first module in its section
        await supabase.from('modules').insert({
          course_id: course.id, section_id: section.id,
          title: wm.title, content_type: 'text',
          content_body: wm.content_body, duration_mins: 60, sort_order: 0,
        })
      }

      // 3. Insert assignments/discussions/examples into their week's section
      const sortCounters = {}
      for (const mod of otherModules) {
        const sectionId = (mod.week_num && sectionMap[mod.week_num]) || null
        const key = sectionId || 'ungrouped'
        sortCounters[key] = (sortCounters[key] || 0) + 1

        await supabase.from('modules').insert({
          course_id: course.id, section_id: sectionId,
          title: mod.title, description: mod.description || null,
          content_type: mod.content_type, content_body: mod.content_body || null,
          duration_mins: mod.folder === 'assignment' ? 120 : 30,
          sort_order: sortCounters[key],
        })
      }

      setResult({ courseId: course.id, title: course.title, stats: parsed.stats })
      setStage('done')
      toast.success(`"${course.title}" imported!`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setStage('upload'); setParsed(null); setError(null); setResult(null) }

  return (
    <div className="min-h-screen bg-violet-50 py-10 px-5">
      <div className="max-w-3xl mx-auto">
        <Link href="/instructor" className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-800 font-sans text-sm mb-6 transition-colors">
          ← Back to portal
        </Link>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-violet-900 mb-2">Import from CourseForge</h1>
          <p className="font-sans text-sm text-muted leading-relaxed">
            Upload a .zip export from CourseForge. Weeks, assignments, discussions, and real-world examples are all imported automatically as modules.
          </p>
        </div>

        {/* Upload */}
        {stage === 'upload' && (
          <div>
            <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-violet-300 rounded-2xl p-16 text-center cursor-pointer hover:border-violet-500 hover:bg-white transition-all">
              <FileArchive size={40} className="text-violet-300 mx-auto mb-4" />
              <p className="font-display text-xl font-semibold text-violet-900 mb-2">Drop your CourseForge .zip here</p>
              <p className="font-sans text-sm text-muted mb-5">or click to browse</p>
              <span className="btn-primary mx-auto"><Upload size={14}/> Select .zip file</span>
              <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
            </div>
            {error && (
              <div className="mt-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="font-sans text-sm text-red-700">{error}</p>
              </div>
            )}
            <div className="mt-6 card p-5">
              <p className="font-mono text-xs text-muted uppercase tracking-wider mb-3">What gets imported</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: BookOpen,      label: 'Week lessons',       desc: 'One module per week' },
                  { icon: Star,          label: 'Assignments / Labs',  desc: 'Marked as interactive' },
                  { icon: MessageSquare, label: 'Discussion prompts',  desc: 'Marked as interactive' },
                  { icon: Calendar,      label: 'Real-world examples', desc: 'Marked as reading' },
                ].map(i => (
                  <div key={i.label} className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i.icon size={13} className="text-violet-600" />
                    </div>
                    <div>
                      <p className="font-sans text-xs font-semibold text-violet-900">{i.label}</p>
                      <p className="font-sans text-xs text-muted">{i.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Parsing */}
        {stage === 'parsing' && (
          <div className="card p-16 text-center">
            <Loader size={32} className="text-violet-400 mx-auto mb-4 animate-spin" />
            <p className="font-display text-lg font-semibold text-violet-900 mb-1">Reading course files…</p>
            <p className="font-sans text-sm text-muted">Parsing weeks, assignments, and discussions</p>
          </div>
        )}

        {/* Preview */}
        {stage === 'preview' && parsed && (
          <div className="space-y-5">
            {/* Course header */}
            <div className="card p-7">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <p className="font-mono text-xs text-violet-500 uppercase tracking-wider mb-1">Ready to import</p>
                  <h2 className="font-display text-2xl font-bold text-violet-900">{parsed.title}</h2>
                  {parsed.short_desc && <p className="font-mono text-xs text-violet-500 mt-1">{parsed.short_desc}</p>}
                </div>
                <button onClick={reset} className="text-muted hover:text-violet-700 p-1 transition-colors flex-shrink-0"><X size={17}/></button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                  { label:'Weeks', value: parsed.stats.weeks },
                  { label:'Assignments', value: parsed.stats.assignments },
                  { label:'Discussions', value: parsed.stats.discussions },
                  { label:'Case Studies', value: parsed.stats.examples },
                ].map(s => (
                  <div key={s.label} className="bg-violet-50 rounded-lg p-3 text-center">
                    <p className="font-display text-2xl font-bold text-violet-900">{s.value}</p>
                    <p className="font-mono text-xs text-muted mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Editable fields */}
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

            {/* Module list */}
            <div className="card p-6">
              <h3 className="font-display text-lg font-semibold text-violet-900 mb-4">
                {parsed.modules.length} modules to be created
              </h3>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {parsed.modules.map((m, i) => {
                  const style = FOLDER_STYLES[m.folder] || FOLDER_STYLES.week
                  return (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-border/60 last:border-0">
                      <span className="font-mono text-xs text-muted w-6 flex-shrink-0">{String(i+1).padStart(2,'0')}</span>
                      <p className="font-sans text-sm text-violet-900 flex-1 truncate">{m.title}</p>
                      <span className={clsx('text-xs flex-shrink-0', style.cls)}>{style.label}</span>
                      {m.points && <span className="font-mono text-xs text-muted flex-shrink-0">{m.points}pts</span>}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleImport} disabled={loading} className="btn-primary">
                {loading
                  ? <><Loader size={14} className="animate-spin"/> Importing…</>
                  : <><BookOpen size={14}/> Import {parsed.modules.length} modules</>
                }
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
            <h2 className="font-display text-2xl font-bold text-violet-900 mb-2">Import complete!</h2>
            <p className="font-sans text-sm text-muted mb-2"><strong className="text-violet-900">"{result.title}"</strong> was created as a draft.</p>
            <div className="flex justify-center gap-4 text-sm font-mono text-muted mb-7">
              <span>{result.stats.weeks} weeks</span>
              <span>·</span>
              <span>{result.stats.assignments} assignments</span>
              <span>·</span>
              <span>{result.stats.discussions} discussions</span>
              <span>·</span>
              <span>{result.stats.examples} case studies</span>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href={`/courses/${result.courseId}`} className="btn-outline">Preview course</Link>
              <Link href="/instructor" className="btn-primary">Go to instructor portal <ArrowRight size={14}/></Link>
            </div>
            <button onClick={reset} className="mt-5 font-sans text-xs text-muted hover:text-violet-700 transition-colors block mx-auto">
              Import another course
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
