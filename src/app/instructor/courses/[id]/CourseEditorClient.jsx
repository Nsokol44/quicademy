'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { CATEGORIES } from '@/lib/constants'
import {
  ArrowLeft, Plus, GripVertical, ChevronDown, ChevronUp,
  Video, FileText, HelpCircle, Zap, Globe, Trash2, Edit3,
  Save, Eye, EyeOff, Upload, X, Check, BookOpen, AlertCircle,
  Link as LinkIcon, File
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const CONTENT_TYPES = [
  { id: 'text',        label: 'Lesson / Reading',    icon: FileText,   desc: 'Written content, notes, or markdown' },
  { id: 'video',       label: 'Video',               icon: Video,      desc: 'Video URL (YouTube, Vimeo, Loom, etc.)' },
  { id: 'interactive', label: 'Assignment / Lab',    icon: Zap,        desc: 'Hands-on task or exercise' },
  { id: 'quiz',        label: 'Quiz',                icon: HelpCircle, desc: 'Knowledge check questions' },
  { id: 'scenario',    label: 'Case Study',          icon: Globe,      desc: 'Real-world scenario or example' },
]

const TYPE_COLORS = {
  text:        'bg-violet-100 text-violet-600',
  video:       'bg-blue-100 text-blue-600',
  interactive: 'bg-solar-100 text-solar-700',
  quiz:        'bg-green-100 text-green-700',
  scenario:    'bg-pink-100 text-pink-700',
}

const TYPE_ICONS = {
  text: FileText, video: Video, interactive: Zap, quiz: HelpCircle, scenario: Globe
}

export default function CourseEditorClient({ course: initialCourse, initialModules }) {
  const supabase = createClient()
  const [course, setCourse]       = useState(initialCourse)
  const [modules, setModules]     = useState(initialModules)
  const [editingCourse, setEditingCourse] = useState(false)
  const [addingModule, setAddingModule]   = useState(false)
  const [expandedId, setExpandedId]       = useState(null)
  const [savingCourse, setSavingCourse]   = useState(false)
  const [courseForm, setCourseForm]       = useState({
    title:          course.title || '',
    short_desc:     course.short_desc || '',
    description:    course.description || '',
    category:       course.category || CATEGORIES[0],
    level:          course.level || 'beginner',
    duration_hours: course.duration_hours || '',
    is_free:        course.is_free ?? true,
    price:          course.price || '0',
  })

  // Save course metadata
  const saveCourse = async () => {
    setSavingCourse(true)
    try {
      const { data, error } = await supabase.from('courses').update({
        ...courseForm,
        duration_hours: parseFloat(courseForm.duration_hours) || null,
        price: parseFloat(courseForm.price) || 0,
      }).eq('id', course.id).select().single()
      if (error) throw error
      setCourse(data)
      setEditingCourse(false)
      toast.success('Course details saved!')
    } catch (err) { toast.error(err.message) }
    finally { setSavingCourse(false) }
  }

  // Toggle publish
  const togglePublish = async () => {
    const newVal = !course.published
    const { data, error } = await supabase.from('courses').update({ published: newVal }).eq('id', course.id).select().single()
    if (error) return toast.error(error.message)
    setCourse(data)
    toast.success(newVal ? 'Course submitted for review' : 'Course unpublished')
  }

  // Add new module
  const handleAddModule = async (mod) => {
    const sort_order = modules.length
    const { data, error } = await supabase.from('modules').insert({
      course_id:    course.id,
      title:        mod.title,
      description:  mod.description || null,
      content_type: mod.content_type,
      content_body: mod.content_body || null,
      content_url:  mod.content_url  || null,
      duration_mins:parseInt(mod.duration_mins) || null,
      sort_order,
    }).select().single()
    if (error) return toast.error(error.message)
    setModules(m => [...m, data])
    setAddingModule(false)
    setExpandedId(data.id)
    toast.success('Module added!')
  }

  // Update module
  const handleUpdateModule = async (id, updates) => {
    const { data, error } = await supabase.from('modules').update(updates).eq('id', id).select().single()
    if (error) return toast.error(error.message)
    setModules(m => m.map(x => x.id === id ? data : x))
    toast.success('Module saved!')
  }

  // Delete module
  const handleDeleteModule = async (id, title) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    const { error } = await supabase.from('modules').delete().eq('id', id)
    if (error) return toast.error(error.message)
    setModules(m => m.filter(x => x.id !== id))
    if (expandedId === id) setExpandedId(null)
    toast.success('Module deleted')
  }

  // Move module up/down
  const moveModule = async (index, direction) => {
    const newMods = [...modules]
    const swapIdx = index + direction
    if (swapIdx < 0 || swapIdx >= newMods.length) return
    ;[newMods[index], newMods[swapIdx]] = [newMods[swapIdx], newMods[index]]
    newMods.forEach((m, i) => { m.sort_order = i })
    setModules(newMods)
    // Persist new order
    await Promise.all(newMods.map((m, i) =>
      supabase.from('modules').update({ sort_order: i }).eq('id', m.id)
    ))
  }

  const totalDuration = modules.reduce((sum, m) => sum + (m.duration_mins || 0), 0)

  return (
    <div className="min-h-screen bg-violet-50">
      {/* Top bar */}
      <div className="sticky top-16 z-40 bg-white border-b border-border px-5 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/instructor" className="p-1.5 rounded hover:bg-violet-100 text-violet-600 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <p className="font-sans font-semibold text-sm text-violet-900 truncate max-w-xs">{course.title}</p>
            <p className="font-mono text-xs text-muted">{modules.length} modules · {totalDuration > 0 ? `${Math.round(totalDuration/60*10)/10}h total` : 'no duration set'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/courses/${course.id}`} target="_blank"
            className="btn-ghost btn-sm text-xs gap-1.5">
            <Eye size={13} /> Preview
          </Link>
          <button onClick={togglePublish}
            className={clsx('btn-sm text-xs gap-1.5 inline-flex items-center',
              course.published ? 'btn-ghost text-orange-500' : 'btn-primary'
            )}>
            {course.published ? <><EyeOff size={13}/> Unpublish</> : <><Globe size={13}/> Submit for review</>}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-10 space-y-8">

        {/* ── Course details card ── */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-violet-50">
            <h2 className="font-display text-lg font-bold text-violet-900">Course Details</h2>
            <div className="flex items-center gap-2">
              <span className={clsx('badge text-xs',
                course.approved && course.published ? 'badge-green' :
                course.published ? 'badge-solar' : 'badge-violet'
              )}>
                {course.approved && course.published ? 'Live' : course.published ? 'Under Review' : 'Draft'}
              </span>
              <button onClick={() => setEditingCourse(!editingCourse)} className="btn-ghost btn-sm">
                {editingCourse ? <><X size={13}/> Cancel</> : <><Edit3 size={13}/> Edit</>}
              </button>
            </div>
          </div>

          {editingCourse ? (
            <div className="p-6 space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="field-label">Course title *</label>
                  <input className="input" value={courseForm.title}
                    onChange={e => setCourseForm(f => ({...f, title: e.target.value}))} />
                </div>
                <div>
                  <label className="field-label">Category</label>
                  <select className="input" value={courseForm.category}
                    onChange={e => setCourseForm(f => ({...f, category: e.target.value}))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Level</label>
                  <select className="input" value={courseForm.level}
                    onChange={e => setCourseForm(f => ({...f, level: e.target.value}))}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="field-label">Short description (shown on course card)</label>
                  <input className="input" placeholder="One line summary"
                    value={courseForm.short_desc}
                    onChange={e => setCourseForm(f => ({...f, short_desc: e.target.value}))} />
                </div>
                <div className="md:col-span-2">
                  <label className="field-label">Full description</label>
                  <textarea className="input resize-none" rows={4}
                    placeholder="What students will learn, prerequisites, outcomes…"
                    value={courseForm.description}
                    onChange={e => setCourseForm(f => ({...f, description: e.target.value}))} />
                </div>
                <div>
                  <label className="field-label">Duration (hours)</label>
                  <input type="number" step="0.5" min="0" className="input" placeholder="e.g. 8"
                    value={courseForm.duration_hours}
                    onChange={e => setCourseForm(f => ({...f, duration_hours: e.target.value}))} />
                </div>
                <div>
                  <label className="field-label">Pricing</label>
                  <div className="flex items-center gap-3 h-[46px]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={courseForm.is_free}
                        onChange={e => setCourseForm(f => ({...f, is_free: e.target.checked}))}
                        className="rounded accent-violet-600" />
                      <span className="font-sans text-sm text-violet-800">Free</span>
                    </label>
                    {!courseForm.is_free && (
                      <input type="number" step="0.01" min="0" className="input flex-1" placeholder="Price (USD)"
                        value={courseForm.price}
                        onChange={e => setCourseForm(f => ({...f, price: e.target.value}))} />
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2 border-t border-border">
                <button onClick={saveCourse} disabled={savingCourse} className="btn-primary">
                  {savingCourse
                    ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Saving…</>
                    : <><Save size={13}/> Save changes</>
                  }
                </button>
                <button onClick={() => setEditingCourse(false)} className="btn-ghost">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="p-6 grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-3">
                <div>
                  <p className="field-label mb-1">Description</p>
                  <p className="font-sans text-sm text-violet-800 leading-relaxed">
                    {course.description || course.short_desc || <span className="text-muted italic">No description yet</span>}
                  </p>
                </div>
              </div>
              <div className="space-y-2.5">
                {[
                  { label:'Category', value: course.category },
                  { label:'Level',    value: { beginner:'Beginner', intermediate:'Intermediate', advanced:'Advanced' }[course.level] },
                  { label:'Duration', value: course.duration_hours ? `${course.duration_hours}h` : '—' },
                  { label:'Price',    value: course.is_free ? 'Free' : `$${course.price}` },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted w-20">{r.label}</span>
                    <span className="font-sans text-sm text-violet-900">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Curriculum ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-violet-900">Curriculum</h2>
              <p className="font-sans text-sm text-muted mt-0.5">
                {modules.length} module{modules.length !== 1 ? 's' : ''}
                {totalDuration > 0 && ` · ${Math.round(totalDuration/60*10)/10}h`}
              </p>
            </div>
            <button onClick={() => setAddingModule(true)} className="btn-primary btn-sm">
              <Plus size={14}/> Add module
            </button>
          </div>

          {/* Add module form */}
          {addingModule && (
            <AddModuleForm
              onSave={handleAddModule}
              onCancel={() => setAddingModule(false)}
              profileId={course.instructor_id}
            />
          )}

          {/* Module list */}
          {modules.length === 0 && !addingModule ? (
            <div className="card p-14 text-center border-dashed border-2 border-violet-200">
              <BookOpen size={28} className="text-violet-300 mx-auto mb-3" />
              <p className="font-display text-lg font-semibold text-violet-900 mb-1">No modules yet</p>
              <p className="font-sans text-sm text-muted mb-5 max-w-xs mx-auto">
                Add your first module — a lesson, video, assignment, or quiz.
              </p>
              <button onClick={() => setAddingModule(true)} className="btn-primary mx-auto">
                <Plus size={14}/> Add first module
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {modules.map((mod, index) => (
                <ModuleRow
                  key={mod.id}
                  mod={mod}
                  index={index}
                  total={modules.length}
                  expanded={expandedId === mod.id}
                  onToggle={() => setExpandedId(expandedId === mod.id ? null : mod.id)}
                  onUpdate={(updates) => handleUpdateModule(mod.id, updates)}
                  onDelete={() => handleDeleteModule(mod.id, mod.title)}
                  onMove={(dir) => moveModule(index, dir)}
                  profileId={course.instructor_id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Publish notice */}
        {!course.published && modules.length > 0 && (
          <div className="card p-5 border-violet-200 bg-violet-50 flex items-start gap-3">
            <AlertCircle size={16} className="text-violet-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-sans font-semibold text-sm text-violet-900">Ready to publish?</p>
              <p className="font-sans text-xs text-muted mt-0.5">Submit your course for review. Once approved it will be visible to students.</p>
            </div>
            <button onClick={togglePublish} className="btn-primary btn-sm flex-shrink-0">
              <Globe size={13}/> Submit for review
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Add Module Form ── */
function AddModuleForm({ onSave, onCancel, profileId }) {
  const [form, setForm] = useState({
    title:        '',
    description:  '',
    content_type: 'text',
    content_body: '',
    content_url:  '',
    duration_mins:'',
  })
  const set = (k, v) => setForm(f => ({...f, [k]: v}))
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Title is required')
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="card p-6 mb-3 border-violet-300">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-lg font-bold text-violet-900">New Module</h3>
        <button onClick={onCancel} className="text-muted hover:text-violet-700 transition-colors"><X size={17}/></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type selector */}
        <div>
          <label className="field-label">Content type</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {CONTENT_TYPES.map(ct => (
              <button key={ct.id} type="button" onClick={() => set('content_type', ct.id)}
                className={clsx(
                  'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-center transition-all',
                  form.content_type === ct.id
                    ? 'border-violet-600 bg-violet-700'
                    : 'border-border bg-white hover:border-violet-300'
                )}>
                <ct.icon size={16} className={form.content_type === ct.id ? 'text-solar-400' : 'text-violet-400'} />
                <span className={clsx('font-sans text-xs font-medium leading-tight', form.content_type === ct.id ? 'text-white' : 'text-violet-800')}>
                  {ct.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="field-label">Module title *</label>
            <input className="input" placeholder="e.g. Week 1: Introduction to GIS"
              value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>
          <div className="md:col-span-2">
            <label className="field-label">Description (optional)</label>
            <input className="input" placeholder="Brief overview of what this module covers"
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div>
            <label className="field-label">Duration (minutes)</label>
            <input type="number" min="0" className="input" placeholder="e.g. 45"
              value={form.duration_mins} onChange={e => set('duration_mins', e.target.value)} />
          </div>
        </div>

        {/* Content fields based on type */}
        <ContentFields form={form} set={set} profileId={profileId} />

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Adding…</> : <><Plus size={13}/>Add module</>}
          </button>
          <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        </div>
      </form>
    </div>
  )
}

/* ── Content-type-specific fields ── */
function ContentFields({ form, set, profileId }) {
  const supabase = createClient()
  const fileRef  = useRef(null)
  const [uploading, setUploading] = useState(false)

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `${profileId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error } = await supabase.storage.from('course-materials').upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('course-materials').getPublicUrl(path)
      set('content_url', publicUrl)
      toast.success(`"${file.name}" uploaded!`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  if (form.content_type === 'video') {
    return (
      <div className="space-y-3">
        <div>
          <label className="field-label">Video URL</label>
          <div className="flex items-center gap-2">
            <LinkIcon size={14} className="text-muted flex-shrink-0" />
            <input className="input" placeholder="YouTube, Vimeo, Loom, or any video link"
              value={form.content_url} onChange={e => set('content_url', e.target.value)} />
          </div>
          <p className="font-mono text-xs text-muted mt-1">Paste any video URL — YouTube, Vimeo, Loom, Google Drive, etc.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="font-mono text-xs text-muted">or upload a file</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div>
          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="btn-ghost w-full border border-dashed border-violet-300 text-violet-600 hover:border-violet-500">
            {uploading
              ? <><div className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin"/> Uploading…</>
              : <><Upload size={14}/> Upload video file (mp4, webm, mov)</>
            }
          </button>
          {form.content_url?.startsWith('http') && (
            <div className="mt-2 flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-lg">
              <Check size={12} className="text-green-600 flex-shrink-0"/>
              <span className="font-mono text-xs text-green-700 truncate">{form.content_url}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (form.content_type === 'text' || form.content_type === 'scenario') {
    return (
      <div className="space-y-3">
        <div>
          <label className="field-label">Content</label>
          <textarea className="input resize-none font-sans text-sm leading-relaxed" rows={10}
            placeholder="Write your lesson content here. Supports Markdown:&#10;&#10;# Heading&#10;**Bold** and *italic*&#10;- Bullet points&#10;&#10;Paste directly from Word, Google Docs, or CourseForge."
            value={form.content_body} onChange={e => set('content_body', e.target.value)} />
          <p className="font-mono text-xs text-muted mt-1">Supports Markdown. Paste from any source.</p>
        </div>
        <div>
          <label className="field-label">Attach a file (optional)</label>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,image/*" className="hidden" onChange={handleFileUpload} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="btn-ghost w-full border border-dashed border-violet-200 text-violet-500 hover:border-violet-400 text-xs">
            {uploading
              ? <><div className="w-3.5 h-3.5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin"/> Uploading…</>
              : <><File size={13}/> Attach PDF, Word, PowerPoint, image, or zip</>
            }
          </button>
          {form.content_url && (
            <div className="mt-2 flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-lg">
              <Check size={12} className="text-green-600 flex-shrink-0"/>
              <a href={form.content_url} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-green-700 truncate hover:underline">
                {form.content_url.split('/').pop()}
              </a>
              <button type="button" onClick={() => set('content_url', '')} className="ml-auto text-muted hover:text-red-500 flex-shrink-0">
                <X size={11}/>
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (form.content_type === 'interactive' || form.content_type === 'quiz') {
    return (
      <div className="space-y-3">
        <div>
          <label className="field-label">
            {form.content_type === 'quiz' ? 'Quiz questions' : 'Assignment instructions'}
          </label>
          <textarea className="input resize-none font-sans text-sm leading-relaxed" rows={10}
            placeholder={form.content_type === 'quiz'
              ? "Write your quiz questions:\n\n1. What is a GIS?\na) Geographic Information System\nb) General Information Software\nc) Geospatial Index System\n\nAnswer: a\n\n2. Next question..."
              : "Describe the assignment in detail:\n\n## Objectives\n- Objective 1\n- Objective 2\n\n## Instructions\nStep 1...\n\n## Submission\nSubmit via..."
            }
            value={form.content_body} onChange={e => set('content_body', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Attach supporting file (optional)</label>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,image/*" className="hidden" onChange={handleFileUpload} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="btn-ghost w-full border border-dashed border-violet-200 text-violet-500 hover:border-violet-400 text-xs">
            {uploading
              ? <><div className="w-3.5 h-3.5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin"/> Uploading…</>
              : <><File size={13}/> Attach dataset, rubric, or reference file</>
            }
          </button>
          {form.content_url && (
            <div className="mt-2 flex items-center gap-2 p-2.5 bg-violet-50 border border-violet-200 rounded-lg">
              <LinkIcon size={11} className="text-violet-400 flex-shrink-0"/>
              <a href={form.content_url} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-violet-600 truncate hover:underline">
                {form.content_url}
              </a>
              <button type="button" onClick={() => set('content_url', '')} className="ml-auto text-muted hover:text-red-500">
                <X size={11}/>
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}

/* ── Module Row ── */
function ModuleRow({ mod, index, total, expanded, onToggle, onUpdate, onDelete, onMove, profileId }) {
  const [editing, setEditing]   = useState(false)
  const [saving,  setSaving]    = useState(false)
  const [form, setForm]         = useState({
    title:        mod.title,
    description:  mod.description || '',
    content_type: mod.content_type || 'text',
    content_body: mod.content_body || '',
    content_url:  mod.content_url  || '',
    duration_mins:mod.duration_mins || '',
  })
  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error('Title is required')
    setSaving(true)
    await onUpdate({
      title:        form.title,
      description:  form.description || null,
      content_type: form.content_type,
      content_body: form.content_body || null,
      content_url:  form.content_url  || null,
      duration_mins:parseInt(form.duration_mins) || null,
    })
    setSaving(false)
    setEditing(false)
  }

  const Icon = TYPE_ICONS[mod.content_type] || FileText
  const colorCls = TYPE_COLORS[mod.content_type] || TYPE_COLORS.text

  return (
    <div className={clsx('card overflow-hidden transition-all', expanded && 'ring-2 ring-violet-300')}>
      {/* Row header */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Drag handle / order */}
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          <button onClick={() => onMove(-1)} disabled={index === 0}
            className="p-0.5 rounded text-violet-200 hover:text-violet-600 disabled:opacity-20 transition-colors">
            <ChevronUp size={13}/>
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1}
            className="p-0.5 rounded text-violet-200 hover:text-violet-600 disabled:opacity-20 transition-colors">
            <ChevronDown size={13}/>
          </button>
        </div>

        <span className="font-mono text-xs text-muted w-6 flex-shrink-0 text-center">
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Type badge */}
        <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', colorCls)}>
          <Icon size={13} />
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0" onClick={onToggle} style={{cursor:'pointer'}}>
          <p className="font-sans text-sm font-semibold text-violet-900 truncate">{mod.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-xs text-muted">
              {CONTENT_TYPES.find(t => t.id === mod.content_type)?.label || mod.content_type}
            </span>
            {mod.duration_mins && (
              <span className="font-mono text-xs text-muted">· {mod.duration_mins}m</span>
            )}
            {mod.content_url && (
              <span className="font-mono text-xs text-violet-400 flex items-center gap-0.5">
                <LinkIcon size={9}/> URL
              </span>
            )}
            {mod.content_body && (
              <span className="font-mono text-xs text-violet-400 flex items-center gap-0.5">
                <FileText size={9}/> Content
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => { setEditing(!editing); if (!expanded) onToggle() }}
            className="p-1.5 rounded hover:bg-violet-100 text-violet-400 hover:text-violet-700 transition-colors">
            <Edit3 size={14}/>
          </button>
          <button onClick={onDelete}
            className="p-1.5 rounded hover:bg-red-50 text-violet-200 hover:text-red-500 transition-colors">
            <Trash2 size={14}/>
          </button>
          <button onClick={onToggle}
            className="p-1.5 rounded hover:bg-violet-100 text-violet-400 transition-colors">
            {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border bg-violet-50/50 p-5">
          {editing ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="field-label">Title</label>
                  <input className="input" value={form.title} onChange={e => set('title', e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Type</label>
                  <select className="input" value={form.content_type} onChange={e => set('content_type', e.target.value)}>
                    {CONTENT_TYPES.map(ct => <option key={ct.id} value={ct.id}>{ct.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Duration (minutes)</label>
                  <input type="number" min="0" className="input" placeholder="e.g. 45"
                    value={form.duration_mins} onChange={e => set('duration_mins', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="field-label">Description</label>
                  <input className="input" value={form.description} onChange={e => set('description', e.target.value)} />
                </div>
              </div>
              <ContentFields form={form} set={set} profileId={profileId} />
              <div className="flex gap-3">
                <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm">
                  {saving ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Saving…</> : <><Check size={13}/>Save</>}
                </button>
                <button onClick={() => setEditing(false)} className="btn-ghost btn-sm">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {mod.description && (
                <p className="font-sans text-sm text-muted leading-relaxed">{mod.description}</p>
              )}
              {mod.content_url && (
                <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-border">
                  <LinkIcon size={13} className="text-violet-400 flex-shrink-0"/>
                  <a href={mod.content_url} target="_blank" rel="noopener noreferrer"
                    className="font-mono text-xs text-violet-600 hover:text-violet-800 underline truncate">
                    {mod.content_url}
                  </a>
                </div>
              )}
              {mod.content_body && (
                <div className="p-4 bg-white rounded-lg border border-border max-h-48 overflow-y-auto">
                  <pre className="font-sans text-xs text-violet-800 leading-relaxed whitespace-pre-wrap">
                    {mod.content_body.replace(/<[^>]+>/g, '').slice(0, 800)}
                    {mod.content_body.length > 800 && '…'}
                  </pre>
                </div>
              )}
              {!mod.content_url && !mod.content_body && (
                <div className="flex items-center gap-2 text-muted">
                  <AlertCircle size={13}/>
                  <span className="font-sans text-xs">No content added yet. Click Edit to add content.</span>
                </div>
              )}
              <button onClick={() => setEditing(true)} className="btn-ghost btn-sm text-xs">
                <Edit3 size={12}/> Edit content
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
