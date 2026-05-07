'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import {
  CheckCircle, Circle, ChevronDown, ChevronUp, ArrowLeft,
  Video, FileText, Zap, HelpCircle, Globe, Upload, Send,
  MessageCircle, Lock, BookOpen, Award, X, File, Check, Users
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const TYPE_ICON  = { text: FileText, video: Video, interactive: Zap, quiz: HelpCircle, scenario: Globe }
const TYPE_LABEL = { text:'Lesson', video:'Video', interactive:'Assignment', quiz:'Quiz', scenario:'Case Study' }
const TYPE_COLOR = { text:'bg-violet-100 text-violet-600', video:'bg-blue-100 text-blue-600', interactive:'bg-solar-100 text-solar-700', quiz:'bg-green-100 text-green-700', scenario:'bg-pink-100 text-pink-700' }

export default function LearnClient({ course, enrollment, sections, modules, initialProgress, initialSubmissions, profile, activeRoom }) {
  const supabase = createClient()
  const [progress,    setProgress]    = useState(Object.fromEntries(initialProgress.map(p => [p.module_id, p])))
  const [submissions, setSubmissions] = useState(Object.fromEntries(initialSubmissions.map(s => [s.module_id, s])))
  const [activeModId, setActiveModId] = useState(null)
  const [expandedSections, setExpandedSections] = useState(Object.fromEntries(sections.map(s => [s.id, true])))

  const ungrouped  = modules.filter(m => !m.section_id)
  const modsFor    = (sid) => modules.filter(m => m.section_id === sid)
  const completed  = modules.filter(m => progress[m.id]?.completed).length
  const pct        = modules.length > 0 ? Math.round((completed / modules.length) * 100) : 0
  const activeMod  = modules.find(m => m.id === activeModId)

  const markComplete = async (modId) => {
    if (progress[modId]?.completed) return
    const { data, error } = await supabase.from('module_progress')
      .upsert({ student_id: profile.id, module_id: modId, completed: true, completed_at: new Date().toISOString() }, { onConflict: 'student_id,module_id' })
      .select().single()
    if (error) return toast.error(error.message)
    setProgress(p => ({ ...p, [modId]: data }))

    // Update enrollment progress
    const newPct = Math.round(((completed + 1) / modules.length) * 100)
    await supabase.from('enrollments').update({ progress: newPct }).eq('student_id', profile.id).eq('course_id', course.id)
    toast.success('Module marked complete!')
  }

  const markIncomplete = async (modId) => {
    await supabase.from('module_progress').update({ completed: false, completed_at: null }).eq('student_id', profile.id).eq('module_id', modId)
    setProgress(p => ({ ...p, [modId]: { ...p[modId], completed: false } }))
  }

  return (
    <div className="min-h-screen bg-violet-50 flex flex-col">
      {/* Top bar */}
      <div className="sticky top-16 z-40 bg-white border-b border-border shadow-sm px-5 py-3 flex items-center gap-4">
        <Link href="/dashboard" className="p-1.5 rounded hover:bg-violet-100 text-violet-600 transition-colors flex-shrink-0">
          <ArrowLeft size={17}/>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-sans font-semibold text-sm text-violet-900 truncate">{course.title}</p>
          <p className="font-mono text-xs text-muted">{course.instructor?.full_name}</p>
        </div>
        {/* Progress bar */}
        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
          <div className="w-32 h-2 bg-violet-100 rounded-full overflow-hidden">
            <div className="h-full bg-violet-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}/>
          </div>
          <span className="font-mono text-xs text-violet-600 font-semibold">{pct}%</span>
          <span className="font-mono text-xs text-muted">{completed}/{modules.length}</span>
        </div>
        {pct === 100 && (
          <div className="flex items-center gap-1.5 badge-solar flex-shrink-0">
            <Award size={12}/> Complete!
          </div>
        )}
      </div>

      <div className="flex-1 grid md:grid-cols-[320px_1fr] max-w-7xl mx-auto w-full px-5 py-6 gap-6">

        {/* ── Left sidebar: curriculum ── */}
        <div className="space-y-3 md:sticky md:top-32 md:self-start md:max-h-[calc(100vh-10rem)] md:overflow-y-auto">
          {/* Mobile progress */}
          <div className="md:hidden card p-4 flex items-center gap-3">
            <div className="flex-1 h-2 bg-violet-100 rounded-full overflow-hidden">
              <div className="h-full bg-violet-600 rounded-full transition-all" style={{ width: `${pct}%` }}/>
            </div>
            <span className="font-mono text-xs text-violet-600 font-semibold flex-shrink-0">{pct}% complete</span>
          </div>

          {/* Live group chat button — shown when instructor has opened a session */}
          {activeRoom ? (
            <Link href={`/classroom/${activeRoom.id}`}
              className="flex items-center gap-3 px-4 py-3.5 bg-red-600 hover:bg-red-700 rounded-xl text-white transition-colors shadow-md">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse flex-shrink-0"/>
              <div className="flex-1 min-w-0">
                <p className="font-sans text-sm font-bold">Live class is open</p>
                <p className="font-mono text-xs text-red-200 mt-0.5">Join the group chat now</p>
              </div>
              <Users size={16} className="text-red-200 flex-shrink-0"/>
            </Link>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 bg-violet-100 rounded-xl text-violet-500">
              <MessageCircle size={14} className="flex-shrink-0"/>
              <p className="font-sans text-xs text-violet-500">Group chat opens when your instructor starts a live session</p>
            </div>
          )}

          {sections.map(section => (
            <div key={section.id} className="card overflow-hidden">
              <button
                onClick={() => setExpandedSections(p => ({...p, [section.id]: !p[section.id]}))}
                className="w-full flex items-center gap-3 px-4 py-3 bg-violet-900 text-white hover:bg-violet-800 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm truncate">{section.title}</p>
                  <p className="font-mono text-xs text-violet-400 mt-0.5">
                    {modsFor(section.id).filter(m => progress[m.id]?.completed).length}/{modsFor(section.id).length} done
                  </p>
                </div>
                {expandedSections[section.id] ? <ChevronUp size={14} className="text-violet-400 flex-shrink-0"/> : <ChevronDown size={14} className="text-violet-400 flex-shrink-0"/>}
              </button>
              {expandedSections[section.id] && (
                <div className="divide-y divide-border/60">
                  {modsFor(section.id).map(mod => (
                    <SidebarModuleRow key={mod.id} mod={mod} isActive={activeModId === mod.id}
                      isComplete={!!progress[mod.id]?.completed}
                      hasSubmission={!!submissions[mod.id]}
                      onClick={() => setActiveModId(mod.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {ungrouped.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-2.5 bg-violet-100 border-b border-violet-200">
                <p className="font-mono text-xs text-muted uppercase tracking-wider">Additional Content</p>
              </div>
              <div className="divide-y divide-border/60">
                {ungrouped.map(mod => (
                  <SidebarModuleRow key={mod.id} mod={mod} isActive={activeModId === mod.id}
                    isComplete={!!progress[mod.id]?.completed}
                    hasSubmission={!!submissions[mod.id]}
                    onClick={() => setActiveModId(mod.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 1-on-1 chat button */}
          <RequestSessionButton
            courseId={course.id}
            instructorId={course.instructor?.id}
            instructorName={course.instructor?.full_name}
            studentId={profile.id}
            studentEmail={profile.email}
          />
        </div>

        {/* ── Right panel: module content ── */}
        <div>
          {!activeMod ? (
            <WelcomePanel course={course} completed={completed} total={modules.length} pct={pct} />
          ) : (
            <ModuleViewer
              mod={activeMod}
              isComplete={!!progress[activeMod.id]?.completed}
              submission={submissions[activeMod.id]}
              profileId={profile.id}
              courseId={course.id}
              onComplete={() => markComplete(activeMod.id)}
              onUncomplete={() => markIncomplete(activeMod.id)}
              onSubmissionSaved={(sub) => setSubmissions(s => ({...s, [activeMod.id]: sub}))}
              onNext={() => {
                const idx = modules.findIndex(m => m.id === activeMod.id)
                if (idx < modules.length - 1) setActiveModId(modules[idx + 1].id)
              }}
              hasNext={modules.findIndex(m => m.id === activeMod.id) < modules.length - 1}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Sidebar module row ── */
function SidebarModuleRow({ mod, isActive, isComplete, hasSubmission, onClick }) {
  const Icon  = TYPE_ICON[mod.content_type]  || FileText
  const color = TYPE_COLOR[mod.content_type] || TYPE_COLOR.text

  return (
    <button onClick={onClick}
      className={clsx('w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
        isActive ? 'bg-violet-100' : 'hover:bg-violet-50/60'
      )}>
      <div className="flex-shrink-0">
        {isComplete
          ? <CheckCircle size={16} className="text-green-500"/>
          : <Circle size={16} className="text-violet-200"/>
        }
      </div>
      <div className={clsx('w-5 h-5 rounded flex items-center justify-center flex-shrink-0', color)}>
        <Icon size={10}/>
      </div>
      <p className={clsx('font-sans text-xs flex-1 truncate leading-snug',
        isActive ? 'text-violet-900 font-semibold' : 'text-violet-800'
      )}>{mod.title}</p>
      {hasSubmission && <div className="w-1.5 h-1.5 rounded-full bg-solar-500 flex-shrink-0" title="Submitted"/>}
    </button>
  )
}

/* ── Welcome panel ── */
function WelcomePanel({ course, completed, total, pct }) {
  return (
    <div className="card p-10 text-center">
      <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-5">
        <BookOpen size={28} className="text-violet-500"/>
      </div>
      <h2 className="font-display text-2xl font-bold text-violet-900 mb-2">
        {pct === 0 ? 'Ready to start?' : pct === 100 ? 'Course complete! 🎉' : 'Keep going!'}
      </h2>
      <p className="font-sans text-sm text-muted mb-6">
        {pct === 0
          ? 'Select any module from the sidebar to begin learning.'
          : pct === 100
          ? `You've completed all ${total} modules in this course.`
          : `You've completed ${completed} of ${total} modules. Select the next one to continue.`
        }
      </p>
      <div className="w-full max-w-xs mx-auto">
        <div className="h-3 bg-violet-100 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-violet-600 rounded-full transition-all" style={{ width: `${pct}%` }}/>
        </div>
        <p className="font-mono text-xs text-muted text-center">{pct}% complete</p>
      </div>
    </div>
  )
}

/* ── Module viewer ── */
function ModuleViewer({ mod, isComplete, submission, profileId, courseId, onComplete, onUncomplete, onSubmissionSaved, onNext, hasNext }) {
  const Icon  = TYPE_ICON[mod.content_type]  || FileText
  const color = TYPE_COLOR[mod.content_type] || TYPE_COLOR.text

  return (
    <div className="space-y-5">
      {/* Module header */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', color)}>
              <Icon size={15}/>
            </div>
            <div>
              <p className="font-mono text-xs text-muted mb-1">{TYPE_LABEL[mod.content_type]}</p>
              <h2 className="font-display text-xl font-bold text-violet-900">{mod.title}</h2>
              {mod.description && <p className="font-sans text-sm text-muted mt-1">{mod.description}</p>}
            </div>
          </div>
          <button
            onClick={isComplete ? onUncomplete : onComplete}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-semibold transition-all flex-shrink-0',
              isComplete
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
            )}>
            {isComplete ? <><CheckCircle size={12}/>Completed</> : <><Circle size={12}/>Mark complete</>}
          </button>
        </div>
      </div>

      {/* Video embed */}
      {mod.content_url && mod.content_type === 'video' && (
        <div className="card overflow-hidden">
          <VideoEmbed url={mod.content_url}/>
        </div>
      )}

      {/* Content body */}
      {mod.content_body && (
        <div className="card p-6">
          {mod.content_body.trim().startsWith('<') ? (
            <div className="font-sans text-sm text-violet-800 leading-relaxed [&_h1]:font-display [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-violet-900 [&_h1]:mb-3 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-violet-900 [&_h2]:mb-2 [&_h2]:mt-4 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1 [&_strong]:font-semibold [&_strong]:text-violet-900 [&_blockquote]:border-l-4 [&_blockquote]:border-violet-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted"
              dangerouslySetInnerHTML={{ __html: mod.content_body }}/>
          ) : (
            <pre className="font-sans text-sm text-violet-800 leading-relaxed whitespace-pre-wrap">{mod.content_body}</pre>
          )}
        </div>
      )}

      {/* Non-video file attachment */}
      {mod.content_url && mod.content_type !== 'video' && (
        <div className="card p-4">
          <a href={mod.content_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 text-violet-600 hover:text-violet-800 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
              <File size={18} className="text-violet-500"/>
            </div>
            <div>
              <p className="font-sans text-sm font-semibold">{mod.content_url.split('/').pop()?.split('?')[0] || 'Download file'}</p>
              <p className="font-mono text-xs text-muted">Click to open</p>
            </div>
          </a>
        </div>
      )}

      {/* Assignment submission */}
      {(mod.content_type === 'interactive' || mod.content_type === 'quiz') && (
        <SubmissionPanel
          mod={mod}
          submission={submission}
          profileId={profileId}
          courseId={courseId}
          onSaved={onSubmissionSaved}
          onComplete={onComplete}
          isComplete={isComplete}
        />
      )}

      {/* Next module button */}
      <div className="flex items-center justify-between">
        {!isComplete && (
          <button onClick={onComplete} className="btn-primary">
            <Check size={14}/> Mark complete
          </button>
        )}
        {hasNext && (
          <button onClick={onNext} className={clsx('btn-outline', !isComplete && 'ml-auto')}>
            Next module →
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Assignment submission panel ── */
function SubmissionPanel({ mod, submission, profileId, courseId, onSaved, onComplete, isComplete }) {
  const supabase = createClient()
  const fileRef  = useRef(null)
  const [text,      setText]      = useState(submission?.text_response || '')
  const [fileUrl,   setFileUrl]   = useState(submission?.file_url || '')
  const [fileName,  setFileName]  = useState(submission?.file_name || '')
  const [uploading, setUploading] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const submitted = submission?.status === 'submitted' || submission?.status === 'reviewed' || submission?.status === 'returned'

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const path = `${profileId}/submissions/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const { error } = await supabase.storage.from('course-materials').upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('course-materials').getPublicUrl(path)
      setFileUrl(publicUrl); setFileName(file.name)
      toast.success(`${file.name} ready to submit`)
    } catch (err) { toast.error(err.message) }
    finally { setUploading(false) }
  }

  const handleSubmit = async () => {
    if (!text.trim() && !fileUrl) return toast.error('Please write a response or attach a file before submitting')
    setSaving(true)
    try {
      const payload = {
        module_id: mod.id, course_id: courseId, student_id: profileId,
        text_response: text || null, file_url: fileUrl || null,
        file_name: fileName || null, status: 'submitted',
        submitted_at: new Date().toISOString(),
      }
      const { data, error } = await supabase.from('submissions')
        .upsert(payload, { onConflict: 'module_id,student_id' })
        .select().single()
      if (error) throw error
      onSaved(data)
      if (!isComplete) onComplete()
      toast.success('Submitted! Your instructor will review and provide feedback.')
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="card overflow-hidden">
      <div className="bg-solar-50 border-b border-solar-200 px-5 py-3.5 flex items-center justify-between">
        <p className="font-display font-semibold text-sm text-violet-900">
          {mod.content_type === 'quiz' ? 'Quiz Submission' : 'Assignment Submission'}
        </p>
        {submission?.status && (
          <span className={clsx('badge text-xs', {
            submitted: 'badge-violet',
            reviewed: 'badge-solar',
            returned: 'badge-green',
          }[submission.status] || 'badge-violet')}>
            {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Instructor feedback (if returned) */}
        {submission?.feedback_text && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
            <p className="font-mono text-xs text-green-600 uppercase tracking-wider">Instructor Feedback</p>
            {submission.feedback_grade && (
              <p className="font-display text-lg font-bold text-green-800">Grade: {submission.feedback_grade}</p>
            )}
            <p className="font-sans text-sm text-green-800 leading-relaxed">{submission.feedback_text}</p>
          </div>
        )}

        {submitted ? (
          <div className="space-y-3">
            <div className="bg-violet-50 rounded-lg p-4 border border-violet-200">
              <p className="font-mono text-xs text-violet-500 uppercase tracking-wider mb-2">Your submission</p>
              {submission.text_response && <p className="font-sans text-sm text-violet-800 leading-relaxed whitespace-pre-wrap">{submission.text_response}</p>}
              {submission.file_url && (
                <a href={submission.file_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 mt-2 text-violet-600 hover:text-violet-800 text-xs font-mono">
                  <File size={11}/>{submission.file_name || 'Attached file'}
                </a>
              )}
            </div>
            {!submission?.feedback_text && (
              <p className="font-sans text-xs text-muted text-center">Awaiting instructor feedback</p>
            )}
            {/* Allow resubmission */}
            <button onClick={() => onSaved(null)} className="btn-ghost btn-sm text-xs w-full">
              Resubmit / Edit response
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="field-label">Your response</label>
              <textarea className="input resize-none font-sans text-sm leading-relaxed" rows={6}
                placeholder="Type your answer, analysis, or response here…"
                value={text} onChange={e => setText(e.target.value)}/>
            </div>
            <div>
              <label className="field-label">Attach file (optional)</label>
              <input ref={fileRef} type="file" className="hidden" onChange={handleUpload}/>
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="btn-ghost w-full border border-dashed border-violet-200 text-xs">
                {uploading
                  ? <><div className="w-3.5 h-3.5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin"/>Uploading…</>
                  : <><Upload size={13}/>Upload file (PDF, Word, image, etc.)</>
                }
              </button>
              {fileUrl && (
                <div className="mt-2 flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                  <Check size={11} className="text-green-600 flex-shrink-0"/>
                  <span className="font-mono text-xs text-green-700 truncate flex-1">{fileName}</span>
                  <button onClick={() => { setFileUrl(''); setFileName('') }} className="text-muted hover:text-red-500"><X size={11}/></button>
                </div>
              )}
            </div>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary w-full justify-center">
              {saving
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Submitting…</>
                : <><Send size={14}/>Submit {mod.content_type === 'quiz' ? 'quiz' : 'assignment'}</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Request 1-on-1 session per course ── */
function RequestSessionButton({ courseId, instructorId, instructorName, studentId, studentEmail }) {
  const supabase  = createClient()
  const [open,    setOpen]    = useState(false)
  const [topic,   setTopic]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleRequest = async (e) => {
    e.preventDefault()
    if (!topic.trim()) return toast.error('Please describe what you need help with')
    setLoading(true)
    try {
      const { data, error } = await supabase.from('live_rooms').insert({
        title:         `1-on-1: ${topic.trim()}`,
        instructor_id: instructorId,
        student_id:    studentId,
        course_id:     courseId,
        room_type:     'private',
        status:        'pending',
        is_active:     false,
      }).select().single()
      if (error) throw error

      // Notify instructor
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'private_request', roomId: data.id,
          senderName: 'A student', studentEmail,
        }),
      })

      toast.success('Session requested! Your instructor will be notified.')
      setOpen(false); setTopic('')
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  if (!instructorId) return null

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-violet-50 transition-colors text-left">
        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
          <MessageCircle size={15} className="text-violet-600"/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-sans text-sm font-semibold text-violet-900">Request 1-on-1 session</p>
          <p className="font-mono text-xs text-muted">Private chat with {instructorName}</p>
        </div>
        {open ? <ChevronUp size={14} className="text-muted flex-shrink-0"/> : <ChevronDown size={14} className="text-muted flex-shrink-0"/>}
      </button>
      {open && (
        <div className="border-t border-border p-4">
          <form onSubmit={handleRequest} className="space-y-3">
            <textarea className="input resize-none text-sm" rows={3}
              placeholder="What do you need help with? e.g. I'm struggling with the coordinate projection concepts in Week 2…"
              value={topic} onChange={e => setTopic(e.target.value)} required/>
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="btn-primary btn-sm flex-1 justify-center">
                {loading ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Sending…</> : <><Send size={12}/>Send request</>}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost btn-sm"><X size={14}/></button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

/* ── Video embed ── */
function VideoEmbed({ url }) {
  const getEmbed = (url) => {
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`
    const vi = url.match(/vimeo\.com\/(\d+)/)
    if (vi) return `https://player.vimeo.com/video/${vi[1]}`
    const lo = url.match(/loom\.com\/share\/([\w-]+)/)
    if (lo) return `https://www.loom.com/embed/${lo[1]}`
    return null
  }
  const embedUrl = getEmbed(url)
  if (embedUrl) return (
    <div className="relative" style={{ paddingTop: '56.25%' }}>
      <iframe src={embedUrl} className="absolute inset-0 w-full h-full" allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"/>
    </div>
  )
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return (
    <video controls className="w-full"><source src={url}/>Your browser does not support video.</video>
  )
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 text-violet-600 hover:text-violet-800 text-sm font-mono">
      <Video size={14}/> {url}
    </a>
  )
}
