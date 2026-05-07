'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { CATEGORIES } from '@/lib/constants'
import {
  ArrowLeft, Plus, ChevronDown, ChevronUp,
  Video, FileText, HelpCircle, Zap, Globe, Trash2, Edit3,
  Save, Eye, EyeOff, X, Check, BookOpen, AlertCircle,
  Link as LinkIcon, File, Layers, Upload, Users
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const CONTENT_TYPES = [
  { id: 'text',        label: 'Lesson',     icon: FileText,   color: 'bg-violet-100 text-violet-600' },
  { id: 'video',       label: 'Video',      icon: Video,      color: 'bg-blue-100 text-blue-600' },
  { id: 'interactive', label: 'Assignment', icon: Zap,        color: 'bg-solar-100 text-solar-700' },
  { id: 'quiz',        label: 'Quiz',       icon: HelpCircle, color: 'bg-green-100 text-green-700' },
  { id: 'scenario',    label: 'Case Study', icon: Globe,      color: 'bg-pink-100 text-pink-700' },
]
const TYPE_MAP = Object.fromEntries(CONTENT_TYPES.map(t => [t.id, t]))

export default function CourseEditorClient({ course: initialCourse, initialSections, initialModules, initialEnrollments }) {
  const supabase = createClient()
  const [course,   setCourse]   = useState(initialCourse)
  const [sections, setSections] = useState(initialSections)
  const [modules,  setModules]  = useState(initialModules)
  const [tab, setTab] = useState('curriculum') // 'curriculum' | 'students'
  const [editingCourse, setEditingCourse] = useState(false)
  const [savingCourse,  setSavingCourse]  = useState(false)
  const [addingSection, setAddingSection] = useState(false)
  const [expandedSections, setExpandedSections] = useState(
    Object.fromEntries(initialSections.map(s => [s.id, true]))
  )
  const [courseForm, setCF] = useState({
    title: course.title || '', short_desc: course.short_desc || '',
    description: course.description || '', category: course.category || CATEGORIES[0],
    level: course.level || 'beginner', duration_hours: course.duration_hours || '',
    is_free: course.is_free ?? true, price: course.price || '0',
  })

  const ungrouped = modules.filter(m => !m.section_id)
  const modsFor   = (sid) => modules.filter(m => m.section_id === sid).sort((a,b) => a.sort_order - b.sort_order)

  const saveCourse = async () => {
    setSavingCourse(true)
    try {
      const { data, error } = await supabase.from('courses').update({
        ...courseForm,
        duration_hours: parseFloat(courseForm.duration_hours) || null,
        price: parseFloat(courseForm.price) || 0,
      }).eq('id', course.id).select().single()
      if (error) throw error
      setCourse(data); setEditingCourse(false); toast.success('Course saved!')
    } catch (err) { toast.error(err.message) }
    finally { setSavingCourse(false) }
  }

  const togglePublish = async () => {
    const val = !course.published
    const { data, error } = await supabase.from('courses')
      .update({ published: val, approved: val })
      .eq('id', course.id).select().single()
    if (error) return toast.error(error.message)
    setCourse(data)
    toast.success(val ? 'Course is now live!' : 'Course unpublished')
  }

  const addSection = async (title, overview) => {
    const { data, error } = await supabase.from('sections').insert({
      course_id: course.id, title, overview: overview || null, sort_order: sections.length,
    }).select().single()
    if (error) return toast.error(error.message)
    setSections(s => [...s, data])
    setExpandedSections(p => ({...p, [data.id]: true}))
    setAddingSection(false)
    toast.success('Section added!')
  }

  const updateSection = async (id, updates) => {
    const { data, error } = await supabase.from('sections').update(updates).eq('id', id).select().single()
    if (error) return toast.error(error.message)
    setSections(s => s.map(x => x.id === id ? data : x))
    toast.success('Section saved!')
  }

  const deleteSection = async (id, title) => {
    if (!confirm(`Delete "${title}"? Modules inside will become ungrouped.`)) return
    const { error } = await supabase.from('sections').delete().eq('id', id)
    if (error) return toast.error(error.message)
    setSections(s => s.filter(x => x.id !== id))
    setModules(m => m.map(x => x.section_id === id ? {...x, section_id: null} : x))
    toast.success('Section deleted')
  }

  const moveSection = async (idx, dir) => {
    const arr = [...sections]; const swap = idx + dir
    if (swap < 0 || swap >= arr.length) return
    ;[arr[idx], arr[swap]] = [arr[swap], arr[idx]]
    arr.forEach((s, i) => { s.sort_order = i })
    setSections(arr)
    await Promise.all(arr.map((s, i) => supabase.from('sections').update({ sort_order: i }).eq('id', s.id)))
  }

  const addModule = async (sectionId, mod) => {
    const group = sectionId ? modsFor(sectionId) : ungrouped
    const { data, error } = await supabase.from('modules').insert({
      course_id: course.id, section_id: sectionId || null,
      title: mod.title, description: mod.description || null,
      content_type: mod.content_type, content_body: mod.content_body || null,
      content_url: mod.content_url || null,
      duration_mins: parseInt(mod.duration_mins) || null,
      sort_order: group.length,
    }).select().single()
    if (error) { toast.error(error.message); return }
    setModules(m => [...m, data])
    toast.success('Module added!')
  }

  const updateModule = async (id, updates) => {
    const { data, error } = await supabase.from('modules').update(updates).eq('id', id).select().single()
    if (error) { toast.error(error.message); return }
    setModules(m => m.map(x => x.id === id ? data : x))
    toast.success('Saved!')
  }

  const deleteModule = async (id, title) => {
    if (!confirm(`Delete "${title}"?`)) return
    const { error } = await supabase.from('modules').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    setModules(m => m.filter(x => x.id !== id))
    toast.success('Module deleted')
  }

  const moveModule = async (modId, sectionId, dir) => {
    const group = [...(sectionId ? modsFor(sectionId) : ungrouped)]
    const idx = group.findIndex(m => m.id === modId); const swap = idx + dir
    if (swap < 0 || swap >= group.length) return
    ;[group[idx], group[swap]] = [group[swap], group[idx]]
    group.forEach((m, i) => { m.sort_order = i })
    setModules(prev => {
      const updated = [...prev]
      group.forEach(g => { const i = updated.findIndex(u => u.id === g.id); if (i >= 0) updated[i] = {...updated[i], sort_order: g.sort_order} })
      return updated
    })
    await Promise.all(group.map((m, i) => supabase.from('modules').update({ sort_order: i }).eq('id', m.id)))
  }

  const totalMins = modules.reduce((s, m) => s + (m.duration_mins || 0), 0)

  return (
    <div className="min-h-screen bg-violet-50">
      {/* Top bar */}
      <div className="sticky top-16 z-40 bg-white border-b border-border shadow-sm px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/instructor" className="p-1.5 rounded hover:bg-violet-100 text-violet-600 transition-colors">
            <ArrowLeft size={18}/>
          </Link>
          <div>
            <p className="font-sans font-semibold text-sm text-violet-900 truncate max-w-sm">{course.title}</p>
            <p className="font-mono text-xs text-muted">
              {sections.length} section{sections.length !== 1 ? 's' : ''} · {modules.length} module{modules.length !== 1 ? 's' : ''}
              {totalMins > 0 && ` · ${(totalMins/60).toFixed(1)}h`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={clsx('badge text-xs', course.published ? 'badge-green' : 'badge-violet')}>
            {course.published ? 'Live' : 'Draft'}
          </span>
          <Link href={`/courses/${course.id}`} target="_blank" className="btn-ghost btn-sm text-xs">
            <Eye size={12}/> Preview
          </Link>
          <button onClick={togglePublish} className={clsx('btn-sm text-xs inline-flex items-center gap-1.5',
            course.published ? 'btn-ghost text-orange-500' : 'btn-primary'
          )}>
            {course.published ? <><EyeOff size={12}/>Unpublish</> : <><Globe size={12}/>Publish</>}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-10 space-y-6">
        {/* Course details */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-violet-50/80">
            <h2 className="font-display text-lg font-bold text-violet-900">Course Details</h2>
            <button onClick={() => setEditingCourse(!editingCourse)} className="btn-ghost btn-sm">
              {editingCourse ? <><X size={13}/>Cancel</> : <><Edit3 size={13}/>Edit</>}
            </button>
          </div>
          {editingCourse ? (
            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><label className="field-label">Course title</label>
                  <input className="input" value={courseForm.title} onChange={e => setCF(f=>({...f,title:e.target.value}))}/>
                </div>
                <div><label className="field-label">Category</label>
                  <select className="input" value={courseForm.category} onChange={e => setCF(f=>({...f,category:e.target.value}))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="field-label">Level</label>
                  <select className="input" value={courseForm.level} onChange={e => setCF(f=>({...f,level:e.target.value}))}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div className="md:col-span-2"><label className="field-label">Short description</label>
                  <input className="input" value={courseForm.short_desc} onChange={e => setCF(f=>({...f,short_desc:e.target.value}))}/>
                </div>
                <div className="md:col-span-2"><label className="field-label">Full description</label>
                  <textarea className="input resize-none" rows={3} value={courseForm.description} onChange={e => setCF(f=>({...f,description:e.target.value}))}/>
                </div>
                <div><label className="field-label">Duration (hours)</label>
                  <input type="number" step="0.5" className="input" value={courseForm.duration_hours} onChange={e => setCF(f=>({...f,duration_hours:e.target.value}))}/>
                </div>
                <div><label className="field-label">Pricing</label>
                  <div className="flex items-center gap-3 h-[46px]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={courseForm.is_free} onChange={e => setCF(f=>({...f,is_free:e.target.checked}))} className="rounded accent-violet-600"/>
                      <span className="font-sans text-sm">Free</span>
                    </label>
                    {!courseForm.is_free && <input type="number" className="input flex-1" value={courseForm.price} onChange={e => setCF(f=>({...f,price:e.target.value}))}/>}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2 border-t border-border">
                <button onClick={saveCourse} disabled={savingCourse} className="btn-primary">
                  {savingCourse ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Saving…</> : <><Save size={13}/>Save</>}
                </button>
                <button onClick={() => setEditingCourse(false)} className="btn-ghost">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="p-6 grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <p className="font-sans text-sm text-violet-800 leading-relaxed">
                  {course.description || course.short_desc || <span className="text-muted italic">No description yet</span>}
                </p>
              </div>
              <div className="space-y-2">
                {[['Category',course.category],['Level',{beginner:'Beginner',intermediate:'Intermediate',advanced:'Advanced'}[course.level]],['Duration',course.duration_hours?`${course.duration_hours}h`:'—'],['Price',course.is_free?'Free':`$${course.price}`]].map(([l,v])=>(
                  <div key={l} className="flex gap-3">
                    <span className="font-mono text-xs text-muted w-20">{l}</span>
                    <span className="font-sans text-sm text-violet-900">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 border-b border-border">
          {[['curriculum','Curriculum'],['students',`Students (${initialEnrollments.length})`]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-5 py-2.5 font-sans text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === id ? 'border-violet-600 text-violet-700' : 'border-transparent text-muted hover:text-violet-700'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Students tab ── */}
        {tab === 'students' && (
          <StudentsPanel enrollments={initialEnrollments} course={course} />
        )}

        {/* ── Curriculum tab ── */}
        {tab === 'curriculum' && (<>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-2xl font-bold text-violet-900">Curriculum</h2>
              <p className="font-sans text-sm text-muted mt-0.5">
                Organize content by week, unit, or topic. Each section has a concept overview followed by lessons, videos, assignments, and quizzes.
              </p>
            </div>
            <button onClick={() => setAddingSection(true)} className="btn-primary">
              <Plus size={14}/> Add section
            </button>
          </div>

          {addingSection && (
            <AddSectionForm
              onSave={addSection}
              onCancel={() => setAddingSection(false)}
              index={sections.length}
            />
          )}

          {sections.length === 0 && !addingSection ? (
            <div className="card p-14 text-center border-2 border-dashed border-violet-200">
              <Layers size={28} className="text-violet-300 mx-auto mb-3"/>
              <p className="font-display text-lg font-semibold text-violet-900 mb-1">No sections yet</p>
              <p className="font-sans text-sm text-muted mb-5 max-w-sm mx-auto">
                Start by adding a section — Week 1, Unit 1, or any topic group. Then add lessons, videos, and assignments inside it.
              </p>
              <button onClick={() => setAddingSection(true)} className="btn-primary mx-auto">
                <Plus size={14}/> Add first section
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sections.map((section, idx) => (
                <SectionBlock
                  key={section.id}
                  section={section}
                  index={idx}
                  total={sections.length}
                  modules={modsFor(section.id)}
                  expanded={!!expandedSections[section.id]}
                  onToggle={() => setExpandedSections(p => ({...p, [section.id]: !p[section.id]}))}
                  onUpdate={(u) => updateSection(section.id, u)}
                  onDelete={() => deleteSection(section.id, section.title)}
                  onMove={(d) => moveSection(idx, d)}
                  onAddModule={(mod) => addModule(section.id, mod)}
                  onUpdateModule={updateModule}
                  onDeleteModule={deleteModule}
                  onMoveModule={(mid, d) => moveModule(mid, section.id, d)}
                  profileId={course.instructor_id}
                />
              ))}

              {ungrouped.length > 0 && (
                <div className="card overflow-hidden border-2 border-dashed border-violet-200">
                  <div className="bg-violet-50 px-5 py-3 flex items-center justify-between border-b border-violet-200">
                    <p className="font-mono text-xs text-muted uppercase tracking-wider">Ungrouped modules</p>
                    <p className="font-sans text-xs text-muted">{ungrouped.length} item{ungrouped.length !== 1 ? 's' : ''} — assign to a section using the edit button on each module</p>
                  </div>
                  <div className="divide-y divide-border/60">
                    {ungrouped.map((mod, i) => (
                      <ModuleRow key={mod.id} mod={mod} index={i} total={ungrouped.length}
                        onUpdate={(u) => updateModule(mod.id, u)}
                        onDelete={() => deleteModule(mod.id, mod.title)}
                        onMove={(d) => moveModule(mod.id, null, d)}
                        onAssignSection={async (sectionId) => {
                          await updateModule(mod.id, { section_id: sectionId })
                        }}
                        sections={sections}
                        profileId={course.instructor_id}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </> )}
      </div>
    </div>
  )
}

function StudentsPanel({ enrollments, course }) {
  const [search, setSearch] = useState('')
  const filtered = enrollments.filter(e => {
    const q = search.toLowerCase()
    return !q
      || e.profiles?.full_name?.toLowerCase().includes(q)
      || e.profiles?.email?.toLowerCase().includes(q)
  })

  const avg = enrollments.length > 0
    ? Math.round(enrollments.reduce((s, e) => s + (e.progress || 0), 0) / enrollments.length)
    : 0

  const completed = enrollments.filter(e => e.progress === 100).length

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Enrolled', value: enrollments.length },
          { label: 'Avg. progress', value: `${avg}%` },
          { label: 'Completed', value: completed },
        ].map(s => (
          <div key={s.label} className="card p-5 text-center">
            <p className="font-display text-3xl font-bold text-violet-900">{s.value}</p>
            <p className="font-mono text-xs text-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      {enrollments.length > 5 && (
        <input className="input" placeholder="Search by name or email…"
          value={search} onChange={e => setSearch(e.target.value)} />
      )}

      {/* Table */}
      {enrollments.length === 0 ? (
        <div className="card p-14 text-center border-2 border-dashed border-violet-200">
          <Users size={28} className="text-violet-300 mx-auto mb-3"/>
          <p className="font-display text-lg font-semibold text-violet-900 mb-1">No students yet</p>
          <p className="font-sans text-sm text-muted">
            {course.published ? 'Share the course link to get your first enrollments.' : 'Publish this course so students can enroll.'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-violet-50 border-b border-border">
              <tr>
                {['Student', 'Email', 'Progress', 'Enrolled'].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-mono text-xs text-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(e => (
                <tr key={e.id} className="hover:bg-violet-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-200 flex items-center justify-center font-display font-bold text-violet-700 text-sm flex-shrink-0">
                        {(e.profiles?.full_name || '?')[0].toUpperCase()}
                      </div>
                      <span className="font-sans text-sm text-violet-900">{e.profiles?.full_name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-muted">{e.profiles?.email || '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-violet-100 rounded-full overflow-hidden flex-shrink-0">
                        <div className="h-full bg-violet-600 rounded-full transition-all"
                          style={{ width: `${e.progress || 0}%` }}/>
                      </div>
                      <span className={clsx('font-mono text-xs font-semibold',
                        e.progress === 100 ? 'text-green-600' : 'text-violet-600'
                      )}>
                        {e.progress || 0}%
                      </span>
                      {e.progress === 100 && (
                        <span className="badge-green text-xs flex-shrink-0">Done</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-muted">
                    {e.enrolled_at
                      ? new Date(e.enrolled_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && search && (
            <p className="font-sans text-sm text-muted text-center py-8">No students match "{search}"</p>
          )}
        </div>
      )}
    </div>
  )
}

function AddSectionForm({ onSave, onCancel, index }) {
  const [title, setTitle]       = useState(`Week ${index + 1}: `)
  const [overview, setOverview] = useState('')
  const [saving, setSaving]     = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return toast.error('Title required')
    setSaving(true); await onSave(title.trim(), overview.trim()); setSaving(false)
  }

  return (
    <div className="card p-6 mb-4 border-violet-300 bg-violet-50/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-base font-bold text-violet-900">New Section</h3>
        <button onClick={onCancel}><X size={16} className="text-muted hover:text-violet-700"/></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="field-label">Section title</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} required autoFocus
            placeholder="e.g. Week 1: Foundations of GIS"/>
          <p className="font-mono text-xs text-muted mt-1">Use "Week N:", "Unit N:", or any topic name</p>
        </div>
        <div>
          <label className="field-label">Concept overview / learning objectives (optional)</label>
          <textarea className="input resize-none" rows={3} value={overview} onChange={e => setOverview(e.target.value)}
            placeholder="What will students understand by the end of this section? What foundational concepts does this establish?"/>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Adding…</> : <><Plus size={13}/>Add section</>}
          </button>
          <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        </div>
      </form>
    </div>
  )
}

function SectionBlock({ section, index, total, modules, expanded, onToggle, onUpdate, onDelete, onMove, onAddModule, onUpdateModule, onDeleteModule, onMoveModule, profileId }) {
  const [editing,      setEditing]      = useState(false)
  const [addingModule, setAddingModule] = useState(false)
  const [form, setForm] = useState({ title: section.title, overview: section.overview || '' })

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error('Title required')
    await onUpdate({ title: form.title.trim(), overview: form.overview.trim() || null })
    setEditing(false)
  }

  return (
    <div className="card overflow-hidden shadow-card">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-violet-900 text-white">
        <div className="flex flex-col gap-0 flex-shrink-0">
          <button onClick={() => onMove(-1)} disabled={index===0} className="p-0.5 text-violet-400 hover:text-white disabled:opacity-20"><ChevronUp size={13}/></button>
          <button onClick={() => onMove(1)} disabled={index===total-1} className="p-0.5 text-violet-400 hover:text-white disabled:opacity-20"><ChevronDown size={13}/></button>
        </div>

        {editing ? (
          <div className="flex-1 flex items-center gap-2">
            <input className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-1.5 text-white text-sm font-sans focus:outline-none focus:border-solar-400"
              value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} autoFocus/>
            <button onClick={handleSave} className="p-1.5 rounded bg-solar text-violet-900 hover:bg-solar-500"><Check size={14}/></button>
            <button onClick={() => setEditing(false)} className="p-1.5 rounded hover:bg-white/10 text-white/70"><X size={14}/></button>
          </div>
        ) : (
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
            <div className="flex items-center gap-3">
              <p className="font-display font-bold text-white text-base truncate">{section.title}</p>
              <span className="font-mono text-xs text-violet-400 flex-shrink-0">{modules.length} item{modules.length!==1?'s':''}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          {!editing && <button onClick={() => setEditing(true)} className="p-1.5 rounded text-violet-300 hover:text-white hover:bg-white/10"><Edit3 size={13}/></button>}
          <button onClick={onDelete} className="p-1.5 rounded text-violet-400 hover:text-red-400 hover:bg-red-400/10"><Trash2 size={13}/></button>
          <button onClick={onToggle} className="p-1.5 rounded text-violet-300 hover:text-white hover:bg-white/10">
            {expanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="divide-y divide-border">
          {/* Concept overview */}
          {(section.overview || editing) && (
            <div className="px-5 py-4 bg-amber-50/80 border-b border-amber-100">
              {editing ? (
                <div>
                  <label className="field-label text-amber-700">Concept overview</label>
                  <textarea className="input resize-none text-sm" rows={3} value={form.overview}
                    onChange={e => setForm(f=>({...f,overview:e.target.value}))}
                    placeholder="Learning objectives or conceptual overview…"/>
                </div>
              ) : (
                <>
                  <p className="font-mono text-xs text-amber-600 uppercase tracking-wider mb-2">Concept Overview</p>
                  <p className="font-sans text-sm text-amber-900 leading-relaxed">{section.overview}</p>
                </>
              )}
            </div>
          )}

          {/* Modules */}
          {modules.length > 0 && (
            <div className="divide-y divide-border/60">
              {modules.map((mod, i) => (
                <ModuleRow key={mod.id} mod={mod} index={i} total={modules.length}
                  onUpdate={(u) => onUpdateModule(mod.id, u)}
                  onDelete={() => onDeleteModule(mod.id, mod.title)}
                  onMove={(d) => onMoveModule(mod.id, d)}
                  profileId={profileId}
                />
              ))}
            </div>
          )}

          {/* Add module inline form */}
          {addingModule && (
            <div className="px-5 py-5 bg-violet-50/50">
              <AddModuleForm
                onSave={async (mod) => { await onAddModule(mod); setAddingModule(false) }}
                onCancel={() => setAddingModule(false)}
                profileId={profileId}
              />
            </div>
          )}

          {/* Add button */}
          {!addingModule && (
            <div className="px-5 py-3 bg-violet-50/30 flex items-center gap-4">
              <button onClick={() => setAddingModule(true)}
                className="flex items-center gap-1.5 text-xs font-mono text-violet-500 hover:text-violet-700 transition-colors">
                <Plus size={12}/> Add content to this section
              </button>
              {!section.overview && !editing && (
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-xs font-mono text-amber-500 hover:text-amber-700 transition-colors">
                  <Edit3 size={12}/> Add concept overview
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ModuleRow({ mod, index, total, onUpdate, onDelete, onMove, onAssignSection, sections, profileId }) {
  const [expanded, setExpanded] = useState(false)
  const [editing,  setEditing]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [form, setForm] = useState({
    title: mod.title, description: mod.description||'',
    content_type: mod.content_type||'text',
    content_body: mod.content_body||'', content_url: mod.content_url||'',
    duration_mins: mod.duration_mins||'',
  })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error('Title required')
    setSaving(true)
    await onUpdate({ title:form.title, description:form.description||null,
      content_type:form.content_type, content_body:form.content_body||null,
      content_url:form.content_url||null, duration_mins:parseInt(form.duration_mins)||null })
    setSaving(false); setEditing(false)
  }

  const type = TYPE_MAP[mod.content_type] || TYPE_MAP.text

  return (
    <div className="bg-white">
      <div className="flex items-center gap-3 px-5 py-3 hover:bg-violet-50/40 transition-colors">
        <div className="flex flex-col flex-shrink-0">
          <button onClick={() => onMove(-1)} disabled={index===0} className="p-0.5 text-violet-200 hover:text-violet-500 disabled:opacity-20"><ChevronUp size={12}/></button>
          <button onClick={() => onMove(1)} disabled={index===total-1} className="p-0.5 text-violet-200 hover:text-violet-500 disabled:opacity-20"><ChevronDown size={12}/></button>
        </div>
        <div className={clsx('w-6 h-6 rounded flex items-center justify-center flex-shrink-0', type.color)}>
          <type.icon size={11}/>
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <p className="font-sans text-sm text-violet-900 truncate">{mod.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-xs text-muted">{type.label}</span>
            {mod.duration_mins && <span className="font-mono text-xs text-muted">· {mod.duration_mins}m</span>}
            {mod.content_url   && <span className="font-mono text-xs text-violet-400">· URL</span>}
            {mod.content_body  && <span className="font-mono text-xs text-violet-400">· Content</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => { setEditing(!editing); setExpanded(true) }} className="p-1.5 rounded text-violet-300 hover:text-violet-600 hover:bg-violet-100"><Edit3 size={13}/></button>
          <button onClick={onDelete} className="p-1.5 rounded text-violet-200 hover:text-red-500 hover:bg-red-50"><Trash2 size={13}/></button>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded text-violet-300 hover:text-violet-600">
            {expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/60 bg-violet-50/30 px-5 py-4">
          {editing ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><label className="field-label">Title</label><input className="input" value={form.title} onChange={e => set('title',e.target.value)}/></div>
                <div><label className="field-label">Type</label>
                  <select className="input" value={form.content_type} onChange={e => set('content_type',e.target.value)}>
                    {CONTENT_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div><label className="field-label">Duration (mins)</label><input type="number" className="input" value={form.duration_mins} onChange={e => set('duration_mins',e.target.value)}/></div>
                <div className="md:col-span-2"><label className="field-label">Description</label><input className="input" value={form.description} onChange={e => set('description',e.target.value)}/></div>
                {onAssignSection && sections?.length > 0 && (
                  <div className="md:col-span-2">
                    <label className="field-label">Move to section</label>
                    <select className="input" defaultValue=""
                      onChange={e => { if (e.target.value) onAssignSection(e.target.value) }}>
                      <option value="">— keep ungrouped —</option>
                      {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <ContentFields form={form} set={set} profileId={profileId}/>
              <div className="flex gap-3">
                <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm">
                  {saving?<><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Saving…</>:<><Check size={12}/>Save</>}
                </button>
                <button onClick={()=>setEditing(false)} className="btn-ghost btn-sm">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {mod.description && <p className="font-sans text-sm text-muted">{mod.description}</p>}

              {/* Video embed */}
              {mod.content_url && mod.content_type === 'video' && (
                <VideoEmbed url={mod.content_url} />
              )}

              {/* Non-video file/URL */}
              {mod.content_url && mod.content_type !== 'video' && (
                <a href={mod.content_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-border text-violet-600 hover:text-violet-800 text-xs font-mono">
                  <LinkIcon size={11}/><span className="truncate">{mod.content_url.split('/').pop()?.split('?')[0] || mod.content_url}</span>
                </a>
              )}

              {/* Image detection */}
              {mod.content_url && /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(mod.content_url) && (
                <img src={mod.content_url} alt={mod.title} className="rounded-lg max-h-64 object-contain border border-border" />
              )}

              {/* Content body — HTML or plain text */}
              {mod.content_body && (
                <div className="p-4 bg-white rounded-lg border border-border max-h-64 overflow-y-auto">
                  {mod.content_body.trim().startsWith('<') ? (
                    <div className="font-sans text-xs text-violet-800 leading-relaxed [&_h1]:font-bold [&_h2]:font-bold [&_h2]:mt-3 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_li]:mb-1"
                      dangerouslySetInnerHTML={{ __html: mod.content_body }} />
                  ) : (
                    <pre className="font-sans text-xs text-violet-800 leading-relaxed whitespace-pre-wrap">
                      {mod.content_body.slice(0, 800)}{mod.content_body.length > 800 && '…'}
                    </pre>
                  )}
                </div>
              )}

              {!mod.content_url && !mod.content_body && (
                <p className="font-sans text-xs text-muted flex items-center gap-1.5"><AlertCircle size={11}/> No content yet — click Edit to add</p>
              )}
              <button onClick={()=>setEditing(true)} className="btn-ghost btn-sm text-xs"><Edit3 size={11}/> Edit content</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Smart video embed — handles YouTube, Vimeo, Loom, and direct video files
function VideoEmbed({ url }) {
  const getEmbedUrl = (url) => {
    // YouTube
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`
    // Vimeo
    const vi = url.match(/vimeo\.com\/(\d+)/)
    if (vi) return `https://player.vimeo.com/video/${vi[1]}`
    // Loom
    const lo = url.match(/loom\.com\/share\/([\w-]+)/)
    if (lo) return `https://www.loom.com/embed/${lo[1]}`
    return null
  }
  const embedUrl = getEmbedUrl(url)
  const isDirectVideo = /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url)

  if (embedUrl) return (
    <div className="relative rounded-lg overflow-hidden bg-black" style={{ paddingTop: '56.25%' }}>
      <iframe src={embedUrl} className="absolute inset-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
    </div>
  )
  if (isDirectVideo) return (
    <video controls className="w-full rounded-lg border border-border">
      <source src={url} />Your browser does not support video.
    </video>
  )
  // Fallback link
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-xs font-mono hover:text-blue-900">
      <Video size={12}/> <span className="truncate">{url}</span>
    </a>
  )
}

function AddModuleForm({ onSave, onCancel, profileId }) {
  const [form, setForm] = useState({ title:'', description:'', content_type:'text', content_body:'', content_url:'', duration_mins:'' })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Title required')
    setSaving(true); await onSave(form); setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="field-label">Content type</label>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map(ct=>(
            <button key={ct.id} type="button" onClick={()=>set('content_type',ct.id)}
              className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all',
                form.content_type===ct.id?'border-violet-600 bg-violet-700 text-white':'border-border bg-white text-violet-700 hover:border-violet-300'
              )}>
              <ct.icon size={12}/>{ct.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="field-label">Title *</label>
          <input className="input" placeholder="e.g. Lecture Notes — Coordinate Systems" value={form.title} onChange={e=>set('title',e.target.value)} required/>
        </div>
        <div><label className="field-label">Duration (mins)</label><input type="number" className="input" placeholder="45" value={form.duration_mins} onChange={e=>set('duration_mins',e.target.value)}/></div>
        <div><label className="field-label">Description</label><input className="input" placeholder="Brief summary" value={form.description} onChange={e=>set('description',e.target.value)}/></div>
      </div>
      <ContentFields form={form} set={set} profileId={profileId}/>
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-primary btn-sm">
          {saving?<><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Adding…</>:<><Plus size={12}/>Add</>}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost btn-sm">Cancel</button>
      </div>
    </form>
  )
}

function ContentFields({ form, set, profileId }) {
  const supabase = createClient()
  const fileRef  = useRef(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const path = `${profileId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const { error } = await supabase.storage.from('course-materials').upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('course-materials').getPublicUrl(path)
      set('content_url', publicUrl); toast.success(`${file.name} uploaded!`)
    } catch (err) { toast.error(err.message) }
    finally { setUploading(false) }
  }

  const UploadBtn = ({ accept, label }) => (
    <>
      <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={handleUpload}/>
      <button type="button" onClick={()=>fileRef.current?.click()} disabled={uploading}
        className="btn-ghost w-full border border-dashed border-violet-200 text-xs">
        {uploading?<><div className="w-3.5 h-3.5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin"/>Uploading…</>:<><Upload size={13}/>{label}</>}
      </button>
      {form.content_url && (
        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
          <Check size={11} className="text-green-600 flex-shrink-0"/>
          <a href={form.content_url} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-green-700 truncate hover:underline flex-1">
            {form.content_url.split('/').pop()?.split('?')[0]||'Uploaded file'}
          </a>
          <button type="button" onClick={()=>set('content_url','')} className="text-muted hover:text-red-500"><X size={11}/></button>
        </div>
      )}
    </>
  )

  if (form.content_type==='video') return (
    <div className="space-y-3">
      <div><label className="field-label">Video URL</label>
        <input className="input" placeholder="YouTube, Vimeo, Loom, Google Drive…" value={form.content_url} onChange={e=>set('content_url',e.target.value)}/>
        <p className="font-mono text-xs text-muted mt-1">Paste any video link</p>
      </div>
      <div className="flex items-center gap-3"><div className="flex-1 h-px bg-border"/><span className="font-mono text-xs text-muted">or upload</span><div className="flex-1 h-px bg-border"/></div>
      <UploadBtn accept="video/*" label="Upload video file (mp4, webm, mov)"/>
    </div>
  )

  if (form.content_type==='text'||form.content_type==='scenario') return (
    <div className="space-y-3">
      <div><label className="field-label">Content (Markdown supported)</label>
        <textarea className="input resize-none font-sans text-sm leading-relaxed" rows={8}
          placeholder="Write lesson content, paste from Word/Google Docs/CourseForge…"
          value={form.content_body} onChange={e=>set('content_body',e.target.value)}/>
      </div>
      <div><label className="field-label">Attach file (optional)</label>
        <UploadBtn accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,image/*" label="Attach PDF, Word, PowerPoint, image"/>
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      <div><label className="field-label">{form.content_type==='quiz'?'Quiz questions':'Assignment instructions'}</label>
        <textarea className="input resize-none font-sans text-sm leading-relaxed" rows={8}
          placeholder={form.content_type==='quiz'?"1. Question?\na) Option A\nb) Option B\n\nAnswer: a":"## Objectives\n\n## Instructions\n\n## Submission requirements\n\n## Grading rubric"}
          value={form.content_body} onChange={e=>set('content_body',e.target.value)}/>
      </div>
      <div><label className="field-label">Supporting file (optional)</label>
        <UploadBtn accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,image/*" label="Attach dataset, rubric, or reference file"/>
      </div>
    </div>
  )
}
