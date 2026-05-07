'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { BookOpen, Clock, Users, ArrowRight, Zap, Trophy, Play, ChevronRight, Lock, MessageCircle, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const LEVEL_MAP = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }
const STYLE_MAP = { visual: 'Visual', auditory: 'Auditory', reading: 'Reading', kinesthetic: 'Hands-on' }

export default function DashboardClient({ profile, enrollments, suggestedCourses, groupRooms, privateRooms, instructors }) {
  const name = profile?.full_name?.split(' ')[0] || 'there'
  const completedCount  = enrollments.filter(e => e.progress === 100).length
  const inProgressCount = enrollments.filter(e => e.progress > 0 && e.progress < 100).length

  return (
    <div className="min-h-screen bg-violet-50">
      <div className="max-w-7xl mx-auto px-5 py-10 space-y-10">

        {/* ── Welcome banner ── */}
        <div className="relative bg-violet-800 rounded-2xl p-8 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 40px)' }} />
          <div className="absolute top-0 right-0 w-64 h-64 opacity-20 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, #f5c842 0%, transparent 70%)', transform: 'translate(30%,-30%)' }} />
          <div className="relative flex items-start justify-between gap-6">
            <div>
              <p className="font-mono text-xs text-violet-400 uppercase tracking-widest mb-2">Welcome back</p>
              <h1 className="font-display text-3xl font-bold text-white mb-3">
                Good to see you, <span style={{ color: '#f5c842' }}>{name}.</span>
              </h1>
              <p className="font-sans text-sm text-violet-300 max-w-md leading-relaxed">
                You're a <strong className="text-white">{LEVEL_MAP[profile?.experience_level] || 'learner'}</strong> studying{' '}
                <strong className="text-white">{profile?.industry || 'your subject'}</strong>.
                Content is matched to your <strong className="text-white">{STYLE_MAP[profile?.learning_style] || 'preferred'}</strong> learning style.
              </p>
              <Link href="/courses"
                className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-lg bg-solar text-violet-900 font-bold font-sans text-sm hover:bg-solar-500 transition-colors shadow-solar">
                Browse courses <ArrowRight size={14} />
              </Link>
            </div>
            <div className="hidden md:flex flex-col items-end gap-2 text-right flex-shrink-0">
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-3">
                <Trophy size={16} className="text-solar-400" />
                <span className="font-mono text-sm text-white font-bold">{completedCount}</span>
                <span className="font-sans text-xs text-violet-300">completed</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-3">
                <BookOpen size={16} className="text-violet-300" />
                <span className="font-mono text-sm text-white font-bold">{inProgressCount}</span>
                <span className="font-sans text-xs text-violet-300">in progress</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Live group rooms ── */}
        {groupRooms.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-violet-600" />
                <h2 className="font-display text-xl font-semibold text-violet-900">Live Group Sessions</h2>
              </div>
              <span className="badge-solar flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {groupRooms.length} live now
              </span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {groupRooms.map(room => (
                <Link key={room.id} href={`/live-room/${room.id}`}
                  className="card p-5 hover:shadow-card-lg hover:-translate-y-0.5 transition-all flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-sans font-semibold text-sm text-violet-900 truncate">{room.title}</p>
                    <p className="font-mono text-xs text-muted mt-0.5">{room.courses?.title}</p>
                    <p className="font-mono text-xs text-violet-400 mt-0.5">
                      by {room.instructor?.full_name || 'Instructor'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-violet-700 text-white px-3 py-1.5 rounded-lg flex-shrink-0 text-xs font-semibold font-sans">
                    <Play size={11} className="fill-white" /> Join
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Private 1-on-1 sessions ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Lock size={17} className="text-violet-600" />
              <h2 className="font-display text-xl font-semibold text-violet-900">My Private Sessions</h2>
            </div>
          </div>

          {privateRooms.length > 0 ? (
            <div className="space-y-3 mb-4">
              {privateRooms.map(room => (
                <PrivateRoomRow key={room.id} room={room} />
              ))}
            </div>
          ) : (
            <div className="card p-6 mb-4 flex items-center gap-4 border-dashed border-violet-200">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                <MessageCircle size={18} className="text-violet-400" />
              </div>
              <div className="flex-1">
                <p className="font-sans text-sm font-medium text-violet-900">No private sessions yet</p>
                <p className="font-sans text-xs text-muted mt-0.5">Request a 1-on-1 session with your course instructor below.</p>
              </div>
            </div>
          )}

          {/* Request new private session */}
          {instructors.length > 0 && (
            <RequestPrivateSession profile={profile} instructors={instructors} />
          )}
        </div>

        {/* ── Enrolled courses ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-violet-900">
              {enrollments.length > 0 ? 'Your Courses' : 'Start Your First Course'}
            </h2>
            <Link href="/courses" className="font-sans text-sm text-violet-600 hover:text-violet-800 flex items-center gap-1">
              Browse all <ChevronRight size={14} />
            </Link>
          </div>
          {enrollments.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {enrollments.map(({ courses: c, progress }) => (
                <CourseCard key={c.id} course={c} progress={progress} enrolled={true} />
              ))}
            </div>
          ) : (
            <div className="card p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-4">
                <BookOpen size={24} className="text-violet-500" />
              </div>
              <h3 className="font-display text-lg font-semibold text-violet-900 mb-2">No courses yet</h3>
              <p className="font-sans text-sm text-muted mb-5">Browse our trade courses and enroll in something that matches your goals.</p>
              <Link href="/courses" className="btn-primary mx-auto">Browse courses <ArrowRight size={14} /></Link>
            </div>
          )}
        </div>

        {/* ── Suggested ── */}
        {suggestedCourses.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-solar-600" />
              <h2 className="font-display text-xl font-semibold text-violet-900">Recommended for You</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {suggestedCourses.map(c => <CourseCard key={c.id} course={c} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Private room row ── */
function PrivateRoomRow({ room }) {
  const isActive  = room.status === 'active'
  const isPending = room.status === 'pending'

  return (
    <div className={clsx('card p-5 flex items-center gap-4', isPending && 'opacity-70')}>
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
        isActive ? 'bg-violet-700' : 'bg-violet-100'
      )}>
        {isActive
          ? <Lock size={16} className="text-white" />
          : <Clock size={16} className="text-violet-400" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-sans font-semibold text-sm text-violet-900 truncate">{room.title}</p>
          <span className={clsx('badge text-xs', isActive ? 'badge-violet' : 'bg-solar-100 text-solar-700')}>
            {isPending ? 'Pending' : 'Active'}
          </span>
        </div>
        <p className="font-mono text-xs text-muted mt-0.5">
          with {room.instructor?.full_name || 'Instructor'}
          {room.courses && ` · ${room.courses.title}`}
        </p>
      </div>
      {isActive && (
        <Link href={`/live-room/${room.id}`}
          className="btn-primary btn-sm flex-shrink-0">
          Enter <ArrowRight size={13} />
        </Link>
      )}
      {isPending && (
        <span className="font-mono text-xs text-muted flex-shrink-0">Awaiting instructor</span>
      )}
    </div>
  )
}

/* ── Request private session form ── */
function RequestPrivateSession({ profile, instructors }) {
  const supabase = createClient()
  const [open, setOpen]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [topic, setTopic]       = useState('')
  const [instructorId, setInst] = useState(instructors[0]?.id || '')

  const handleRequest = async (e) => {
    e.preventDefault()
    if (!topic.trim()) return toast.error('Please describe what you need help with')
    setLoading(true)
    try {
      const { error } = await supabase.from('live_rooms').insert({
        title:         `1-on-1: ${topic.trim()}`,
        instructor_id: instructorId,
        student_id:    profile.id,
        room_type:     'private',
        status:        'pending',
        is_active:     false,
      })
      if (error) throw error
      toast.success('Session requested! Your instructor will be notified.')
      setOpen(false)
      setTopic('')
      window.location.reload()
    } catch (err) {
      toast.error(err.message || 'Failed to send request')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm font-sans font-medium text-violet-600 hover:text-violet-800 transition-colors">
        <Plus size={16} /> Request a private 1-on-1 session
      </button>
    )
  }

  return (
    <div className="card p-6 border-violet-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-violet-900">Request Private Session</h3>
        <button onClick={() => setOpen(false)} className="text-muted hover:text-violet-700 transition-colors">
          <X size={18} />
        </button>
      </div>
      <form onSubmit={handleRequest} className="space-y-4">
        {instructors.length > 1 && (
          <div>
            <label className="field-label">Instructor</label>
            <select className="input" value={instructorId} onChange={e => setInst(e.target.value)}>
              {instructors.map(i => (
                <option key={i.id} value={i.id}>{i.full_name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="field-label">What do you need help with?</label>
          <textarea className="input resize-none" rows={3}
            placeholder="e.g. I'm struggling with three-phase wiring calculations and need a walkthrough…"
            value={topic} onChange={e => setTopic(e.target.value)} required />
          <p className="font-mono text-xs text-muted mt-1">This becomes the session title and gives your instructor context before you meet.</p>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading
              ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Requesting…</span>
              : <><MessageCircle size={14} /> Send request</>
            }
          </button>
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
        </div>
      </form>
    </div>
  )
}

/* ── Course card ── */
function CourseCard({ course: c, progress, enrolled }) {
  const href = enrolled ? `/learn/${c.id}` : `/courses/${c.id}`
  return (
    <Link href={href} className="card hover:shadow-card-lg hover:-translate-y-0.5 transition-all flex flex-col">
      <div className="h-36 bg-gradient-to-br from-violet-700 to-violet-900 rounded-t-lg flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 1px,transparent 12px)' }} />
        <span className="font-display text-4xl font-bold text-white/20 select-none uppercase tracking-tight">
          {c.category?.[0] || '?'}
        </span>
        <div className="absolute top-3 left-3">
          <span className={c.is_free ? 'badge-solar' : 'badge-violet'}>{c.is_free ? 'Free' : c.level}</span>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <p className="font-mono text-xs text-violet-400 mb-1">{c.category}</p>
        <h3 className="font-display text-base font-semibold text-violet-900 mb-2 leading-snug">{c.title}</h3>
        {c.short_desc && <p className="font-sans text-xs text-muted leading-relaxed flex-1">{c.short_desc}</p>}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
          <Clock size={12} className="text-muted" />
          <span className="font-mono text-xs text-muted">{c.duration_hours}h</span>
          {typeof progress === 'number' && (
            <div className="ml-auto flex items-center gap-2 flex-1">
              <div className="flex-1 h-1.5 bg-violet-100 rounded-full overflow-hidden">
                <div className="h-full bg-violet-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="font-mono text-xs text-violet-600">{progress}%</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
