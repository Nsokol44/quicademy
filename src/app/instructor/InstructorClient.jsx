'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useAuth } from '@/components/auth/AuthProvider'
import { CATEGORIES } from '@/lib/constants'
import {
  BookOpen, Plus, Video, Users, BarChart2, Edit3, Trash2,
  Radio, X, ArrowRight, Lock, MessageCircle, Check, Clock, Upload,
  File, CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const TABS = ['Overview', 'My Courses', 'Submissions', 'Group Rooms', 'Private Sessions', 'Profile']

export default function InstructorClient({ profile, courses, groupRooms, privateRooms }) {
  const [tab, setTab]           = useState('Overview')
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [showRoomForm, setShowRoomForm]     = useState(false)
  const name = profile?.full_name?.split(' ')[0] || 'Instructor'

  const pendingCount = privateRooms.filter(r => r.status === 'pending').length

  // Called from Overview quick actions
  const openCreateCourse = () => { setShowCourseForm(true); setTab('My Courses') }
  const openCreateRoom   = () => { setShowRoomForm(true);   setTab('Group Rooms') }

  return (
    <div className="min-h-screen bg-violet-50">
      <div className="bg-violet-900 text-white px-5 pt-10 pb-0 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 48px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 48px)' }} />
        <div className="absolute top-0 right-0 w-96 h-96 opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #f5c842 0%, transparent 65%)', transform: 'translate(40%,-40%)' }} />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-start gap-5 mb-8">
            <div className="w-14 h-14 rounded-xl bg-solar flex items-center justify-center shadow-solar flex-shrink-0">
              <span className="font-display font-bold text-2xl text-violet-900">
                {(profile?.full_name || 'I')[0].toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-display text-2xl font-bold text-white">Welcome, {name}</h1>
                <span className="badge bg-solar/20 text-solar-200 border border-solar/30 text-xs">Instructor</span>
              </div>
              <p className="font-sans text-sm text-violet-300">
                {profile?.credentials || 'Trade Professional'} · {profile?.expertise?.slice(0, 2).join(', ')}
              </p>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={clsx(
                  'px-5 py-3 font-sans text-sm font-medium transition-all relative whitespace-nowrap flex items-center gap-2',
                  tab === t
                    ? 'text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-solar'
                    : 'text-violet-400 hover:text-violet-200'
                )}>
                {t}
                {t === 'Private Sessions' && pendingCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-solar text-violet-900 text-xs font-bold font-mono flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 py-10">
        {tab === 'Overview'         && <OverviewTab profile={profile} courses={courses} groupRooms={groupRooms} privateRooms={privateRooms} setTab={setTab} onCreateCourse={openCreateCourse} onCreateRoom={openCreateRoom} />}
        {tab === 'My Courses'       && <CoursesTab courses={courses} profile={profile} showForm={showCourseForm} setShowForm={setShowCourseForm} />}
        {tab === 'Group Rooms'      && <GroupRoomsTab rooms={groupRooms} courses={courses} profile={profile} showCreate={showRoomForm} setShowCreate={setShowRoomForm} />}
        {tab === 'Private Sessions' && <PrivateSessionsTab rooms={privateRooms} profile={profile} />}
        {tab === 'Submissions'      && <SubmissionsTab profile={profile} />}
        {tab === 'Profile'          && <ProfileTab profile={profile} />}
      </div>
    </div>
  )
}

/* ─── OVERVIEW ─── */
function OverviewTab({ profile, courses, groupRooms, privateRooms, setTab, onCreateCourse, onCreateRoom }) {
  const published   = courses.filter(c => c.published).length
  const activeGroup = groupRooms.filter(r => r.is_active).length
  const pending1on1 = privateRooms.filter(r => r.status === 'pending').length

  const stats = [
    { label: 'Total Courses',      value: courses.length, icon: BookOpen,      color: 'bg-violet-100 text-violet-600' },
    { label: 'Published',          value: published,      icon: Video,         color: 'bg-green-100 text-green-600' },
    { label: 'Active Group Rooms', value: activeGroup,    icon: Users,         color: 'bg-solar-100 text-solar-700' },
    { label: 'Pending 1-on-1s',    value: pending1on1,    icon: MessageCircle, color: pending1on1 > 0 ? 'bg-red-100 text-red-500' : 'bg-violet-100 text-violet-400' },
  ]

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {stats.map(s => (
          <div key={s.label} className="card p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon size={18} />
            </div>
            <p className="font-display text-3xl font-bold text-violet-900">{s.value}</p>
            <p className="font-sans text-xs text-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pending private sessions alert */}
      {pending1on1 > 0 && (
        <div className="card p-5 border-solar-200 bg-solar-50 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-solar flex items-center justify-center flex-shrink-0">
            <MessageCircle size={18} className="text-violet-900" />
          </div>
          <div className="flex-1">
            <p className="font-sans font-semibold text-sm text-violet-900">
              {pending1on1} student{pending1on1 > 1 ? 's have' : ' has'} requested a private session
            </p>
            <p className="font-sans text-xs text-muted mt-0.5">Review and accept requests to open a 1-on-1 room.</p>
          </div>
          <button onClick={() => setTab('Private Sessions')} className="btn-primary btn-sm flex-shrink-0">
            Review <ArrowRight size={13} />
          </button>
        </div>
      )}

      <div>
        <h2 className="font-display text-xl font-semibold text-violet-900 mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <QuickAction icon={Plus}      title="Create New Course"       desc="Build a new course for your students"         onClick={onCreateCourse} solar />
          <QuickAction icon={Upload}    title="Import from CourseForge" desc="Upload a .zip export to create a course"       href="/instructor/import" />
          <QuickAction icon={BarChart2} title="View Analytics"          desc="Engagement and completion data"                href="/instructor/analytics" />
        </div>
      </div>

      {courses.length > 0 && (
        <div>
          <h2 className="font-display text-xl font-semibold text-violet-900 mb-4">Recent Courses</h2>
          <div className="space-y-3">
            {courses.slice(0, 3).map(c => (
              <a key={c.id} href={`/instructor/courses/${c.id}`} className="card p-5 flex items-center gap-4 hover:shadow-card-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-700 to-violet-900 flex items-center justify-center flex-shrink-0">
                  <span className="font-display font-bold text-white/40">{c.category?.[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sans font-semibold text-sm text-violet-900 truncate">{c.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs text-muted">{c.category}</span>
                    <span className={clsx('badge text-xs', c.published && c.approved ? 'badge-green' : c.published ? 'badge-solar' : 'badge-violet')}>
                      {c.approved && c.published ? 'Live' : c.published ? 'Under Review' : 'Draft'}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-xs text-violet-400 flex-shrink-0 flex items-center gap-1">
                  <Edit3 size={11}/> Edit
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function QuickAction({ icon: Icon, title, desc, href, onClick, solar }) {
  const cls = clsx(
    'card p-6 flex flex-col gap-3 hover:shadow-card-lg hover:-translate-y-0.5 transition-all cursor-pointer text-left',
    solar && 'border-solar-200 bg-solar-50 hover:bg-solar-100'
  )
  const inner = (
    <>
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', solar ? 'bg-solar text-violet-900' : 'bg-violet-100 text-violet-600')}>
        <Icon size={18} />
      </div>
      <div>
        <p className="font-sans font-semibold text-sm text-violet-900">{title}</p>
        <p className="font-sans text-xs text-muted mt-0.5 leading-relaxed">{desc}</p>
      </div>
      <div className={clsx('flex items-center gap-1 text-xs font-mono font-medium mt-auto', solar ? 'text-solar-700' : 'text-violet-600')}>
        Get started <ArrowRight size={12} />
      </div>
    </>
  )
  if (href) return <a href={href} className={cls}>{inner}</a>
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>
}

/* ─── COURSES TAB ─── */
function CoursesTab({ courses, profile, showForm, setShowForm }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-violet-900">My Courses</h2>
          <p className="font-sans text-sm text-muted mt-1">{courses.length} course{courses.length !== 1 ? 's' : ''} created</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-solar"><Plus size={16} /> New Course</button>
      </div>
      {showForm && <CreateCourseForm profileId={profile.id} onClose={() => setShowForm(false)} />}
      {courses.length > 0
        ? <div className="space-y-4">{courses.map(c => <CourseRow key={c.id} course={c} />)}</div>
        : (
          <div className="card p-16 text-center">
            <BookOpen size={32} className="text-violet-300 mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold text-violet-900 mb-2">No courses yet</h3>
            <p className="font-sans text-sm text-muted mb-5">Create your first course to start teaching.</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mx-auto"><Plus size={15} /> Create course</button>
          </div>
        )
      }
    </div>
  )
}

function CourseRow({ course: c, compact }) {
  const supabase = createClient()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Delete "${c.title}"? This will also delete all its modules and cannot be undone.`)) return
    setDeleting(true)
    const { error } = await supabase.from('courses').delete().eq('id', c.id)
    if (error) { toast.error(error.message); setDeleting(false); return }
    toast.success('Course deleted')
    window.location.reload()
  }

  return (
    <div className="card p-5 flex items-center gap-5">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-700 to-violet-900 flex items-center justify-center flex-shrink-0">
        <span className="font-display text-lg font-bold text-white/40">{c.category?.[0]}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-sans font-semibold text-sm text-violet-900 truncate">{c.title}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="font-mono text-xs text-muted">{c.category}</span>
          <span className={clsx('badge text-xs', c.published && c.approved ? 'badge-green' : c.published ? 'badge-solar' : 'badge-violet')}>
            {c.approved && c.published ? 'Live' : c.published ? 'Under Review' : 'Draft'}
          </span>
          {c.duration_hours && (
            <span className="font-mono text-xs text-muted">{c.duration_hours}h</span>
          )}
        </div>
      </div>
      {!compact && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <a href={`/instructor/courses/${c.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-100 text-violet-700 text-xs font-semibold font-sans hover:bg-violet-200 transition-colors">
            <Edit3 size={12}/> Edit & Add Content
          </a>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded hover:bg-red-50 text-violet-200 hover:text-red-500 transition-colors disabled:opacity-40">
            <Trash2 size={14}/>
          </button>
        </div>
      )}
    </div>
  )
}

function CreateCourseForm({ profileId, onClose }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ title:'', short_desc:'', description:'', category: CATEGORIES[0], level:'beginner', duration_hours:'', price:'0', is_free:true })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Title is required')
    setLoading(true)
    try {
      const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now()
      const { error } = await supabase.from('courses').insert({ ...form, slug, instructor_id: profileId, duration_hours: parseFloat(form.duration_hours)||0, price: parseFloat(form.price)||0, published:false, approved:false })
      if (error) throw error
      toast.success('Course created as draft!')
      onClose(); window.location.reload()
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="card p-7 border-violet-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-xl font-bold text-violet-900">Create New Course</h3>
        <button onClick={onClose} className="btn-ghost btn-sm"><X size={16} /></button>
      </div>
      <form onSubmit={handleCreate} className="space-y-5">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="field-label">Course title *</label>
            <input className="input" placeholder="e.g. HVAC Load Calculations" value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>
          <div>
            <label className="field-label">Category</label>
            <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Level</label>
            <select className="input" value={form.level} onChange={e => set('level', e.target.value)}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="field-label">Short description</label>
            <input className="input" placeholder="One-line summary for course cards" value={form.short_desc} onChange={e => set('short_desc', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="field-label">Full description</label>
            <textarea className="input resize-none" rows={4} placeholder="What students will learn, prerequisites, real-world applications…" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div>
            <label className="field-label">Duration (hours)</label>
            <input type="number" step="0.5" min="0.5" className="input" placeholder="e.g. 8.5" value={form.duration_hours} onChange={e => set('duration_hours', e.target.value)} />
          </div>
          <div>
            <label className="field-label">Pricing</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_free} onChange={e => set('is_free', e.target.checked)} className="rounded accent-violet-600" />
                <span className="font-sans text-sm text-violet-800">Free course</span>
              </label>
              {!form.is_free && <input type="number" step="0.01" min="0" className="input flex-1" placeholder="Price (USD)" value={form.price} onChange={e => set('price', e.target.value)} />}
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating…</span> : 'Create Draft'}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        </div>
      </form>
    </div>
  )
}

/* ─── GROUP ROOMS TAB ─── */
function GroupRoomsTab({ rooms, courses, profile, showCreate, setShowCreate }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-violet-900">Group Live Rooms</h2>
          <p className="font-sans text-sm text-muted mt-1">Open classroom sessions — all enrolled students can join</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-solar"><Radio size={16} /> Go Live</button>
      </div>
      {showCreate && <CreateRoomForm courses={courses} profileId={profile.id} onClose={() => setShowCreate(false)} />}
      {rooms.length > 0 ? (
        <div className="space-y-3">
          {rooms.map(room => (
            <div key={room.id} className="card p-5 flex items-center gap-5">
              <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', room.is_active ? 'bg-red-50 border border-red-100' : 'bg-violet-100')}>
                {room.is_active ? <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" /> : <Video size={18} className="text-violet-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-sans font-semibold text-sm text-violet-900 truncate">{room.title}</p>
                  {room.is_active && <span className="badge bg-red-100 text-red-600 text-xs">Live</span>}
                </div>
                <p className="font-mono text-xs text-muted">{room.courses?.title}</p>
              </div>
              {room.is_active && (
                <a href={`/live-room/${room.id}`} className="btn-primary btn-sm flex-shrink-0">Enter Room</a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-16 text-center">
          <Users size={32} className="text-violet-300 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-violet-900 mb-2">No group sessions yet</h3>
          <p className="font-sans text-sm text-muted mb-5">Start a live session to teach students in a group setting.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto"><Radio size={14} /> Start a session</button>
        </div>
      )}
    </div>
  )
}

function CreateRoomForm({ courses, profileId, onClose }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ title:'', course_id: courses[0]?.id || '' })

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Title required')
    setLoading(true)
    try {
      const { data, error } = await supabase.from('live_rooms').insert({
        title: form.title, course_id: form.course_id || null,
        instructor_id: profileId, room_type: 'group',
        status: 'active', is_active: true,
      }).select().single()
      if (error) throw error
      toast.success('Group room started!')
      window.location.href = `/live-room/${data.id}`
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="card p-7 border-solar-200 bg-solar-50">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-lg font-bold text-violet-900">Start Group Session</h3>
        <button onClick={onClose} className="btn-ghost btn-sm"><X size={16} /></button>
      </div>
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="field-label">Session title</label>
          <input className="input" placeholder="e.g. Q&A: NEC Code Updates 2025" value={form.title} onChange={e => setForm(f => ({ ...f, title:e.target.value }))} required />
        </div>
        {courses.length > 0 && (
          <div>
            <label className="field-label">Associated course (optional)</label>
            <select className="input" value={form.course_id} onChange={e => setForm(f => ({ ...f, course_id:e.target.value }))}>
              <option value="">No course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
        )}
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-solar">
            {loading ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-violet-900/30 border-t-violet-900 rounded-full animate-spin" />Starting…</span> : <><Radio size={14} /> Go Live</>}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        </div>
      </form>
    </div>
  )
}

/* ─── PRIVATE SESSIONS TAB ─── */
function PrivateSessionsTab({ rooms, profile }) {
  const supabase = createClient()
  const pending = rooms.filter(r => r.status === 'pending')
  const active  = rooms.filter(r => r.status === 'active')

  const acceptSession = async (room) => {
    try {
      const { error } = await supabase.from('live_rooms')
        .update({ status: 'active', is_active: true })
        .eq('id', room.id)
      if (error) throw error

      // Notify student via in-app + email
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', room.student?.id || room.student_id)
        .single()

      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'private_accepted',
          roomId: room.id,
          studentEmail: studentProfile?.email,
        }),
      })

      toast.success(`Session with ${room.student?.full_name} is now open!`)
      window.location.href = `/live-room/${room.id}`
    } catch (err) {
      toast.error(err.message)
    }
  }

  const declineSession = async (roomId) => {
    try {
      await supabase.from('live_rooms').update({ status: 'ended' }).eq('id', roomId)
      toast.success('Request declined')
      window.location.reload()
    } catch (err) { toast.error(err.message) }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-violet-900">Private 1-on-1 Sessions</h2>
        <p className="font-sans text-sm text-muted mt-1">Individual sessions between you and a single student — private and AI-assisted</p>
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-solar-600" />
            <h3 className="font-display text-lg font-semibold text-violet-900">Pending Requests</h3>
            <span className="badge-solar">{pending.length} new</span>
          </div>
          <div className="space-y-3">
            {pending.map(room => (
              <div key={room.id} className="card p-5 border-solar-200 bg-solar-50 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-violet-700 flex items-center justify-center text-white font-display font-bold flex-shrink-0">
                  {(room.student?.full_name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sans font-semibold text-sm text-violet-900">{room.student?.full_name || 'Student'}</p>
                  <p className="font-sans text-sm text-violet-800 mt-1 italic">"{room.title.replace('1-on-1: ', '')}"</p>
                  {room.courses && <p className="font-mono text-xs text-muted mt-1">Course: {room.courses.title}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => acceptSession(room)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-700 text-white text-xs font-semibold font-sans hover:bg-violet-800 transition-colors shadow-violet">
                    <Check size={13} /> Accept
                  </button>
                  <button onClick={() => declineSession(room.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-border text-xs font-semibold font-sans text-red-500 hover:bg-red-50 transition-colors">
                    <X size={13} /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active sessions */}
      {active.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Lock size={16} className="text-violet-600" />
            <h3 className="font-display text-lg font-semibold text-violet-900">Active Sessions</h3>
          </div>
          <div className="space-y-3">
            {active.map(room => (
              <div key={room.id} className="card p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-violet-700 flex items-center justify-center text-white font-display font-bold flex-shrink-0">
                  {(room.student?.full_name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sans font-semibold text-sm text-violet-900">{room.student?.full_name}</p>
                  <p className="font-sans text-xs text-muted mt-0.5 truncate">{room.title.replace('1-on-1: ', '')}</p>
                </div>
                <a href={`/live-room/${room.id}`} className="btn-primary btn-sm flex-shrink-0">
                  Enter <ArrowRight size={13} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && active.length === 0 && (
        <div className="card p-16 text-center">
          <MessageCircle size={32} className="text-violet-300 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-violet-900 mb-2">No private sessions</h3>
          <p className="font-sans text-sm text-muted max-w-sm mx-auto leading-relaxed">
            When students request a 1-on-1 session with you, they'll appear here for you to accept.
          </p>
        </div>
      )}
    </div>
  )
}

/* ─── PROFILE TAB ─── */
function ProfileTab({ profile }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    full_name: profile.full_name || '', bio: profile.bio || '',
    credentials: profile.credentials || '', expertise: profile.expertise?.join(', ') || '',
    company_name: profile.company_name || '',
  })

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: form.full_name, bio: form.bio, credentials: form.credentials,
        expertise: form.expertise.split(',').map(s => s.trim()).filter(Boolean),
        company_name: form.company_name,
      }).eq('id', profile.id)
      if (error) throw error
      toast.success('Profile updated!')
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h2 className="font-display text-2xl font-bold text-violet-900">Instructor Profile</h2>
        <p className="font-sans text-sm text-muted mt-1">Visible on your courses and to students in sessions.</p>
      </div>
      <div className="card p-8">
        <div className="flex items-center gap-5 mb-8 pb-8 border-b border-border">
          <div className="w-16 h-16 rounded-2xl bg-violet-700 flex items-center justify-center shadow-violet">
            <span className="font-display font-bold text-3xl text-white">{(profile.full_name||'I')[0].toUpperCase()}</span>
          </div>
          <div>
            <p className="font-display text-lg font-bold text-violet-900">{profile.full_name}</p>
            <p className="font-mono text-xs text-violet-500 mt-0.5">{profile.email}</p>
            <span className={clsx('badge mt-2', profile.instructor_status === 'approved' ? 'badge-green' : 'badge-solar')}>
              {profile.instructor_status === 'approved' ? '✓ Approved Instructor' : 'Pending Review'}
            </span>
          </div>
        </div>
        <form onSubmit={handleSave} className="space-y-5">
          {[
            { label:'Full name', key:'full_name', placeholder:'Your full name' },
            { label:'Credentials & certifications', key:'credentials', placeholder:'e.g. Licensed Master Electrician, OSHA 30' },
            { label:'Expertise areas (comma-separated)', key:'expertise', placeholder:'Residential wiring, Panel upgrades, NEC code' },
            { label:'Company / employer', key:'company_name', placeholder:'Your current employer' },
          ].map(f => (
            <div key={f.key}>
              <label className="field-label">{f.label}</label>
              <input className="input" placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(p => ({...p, [f.key]:e.target.value}))} />
            </div>
          ))}
          <div>
            <label className="field-label">Bio</label>
            <textarea className="input resize-none" rows={4} placeholder="Your professional background and teaching philosophy…"
              value={form.bio} onChange={e => setForm(p => ({...p, bio:e.target.value}))} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</span> : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ─── SUBMISSIONS TAB ─── */
function SubmissionsTab({ profile }) {
  const supabase = createClient()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading]         = useState(true)
  const [activeId, setActiveId]       = useState(null)
  const [feedbackForm, setFeedback]   = useState({ text: '', grade: '' })
  const [saving, setSaving]           = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('*, modules(title, content_type), courses(title), profiles:student_id(full_name, email)')
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })
      setSubmissions(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const giveFeedback = async (subId) => {
    if (!feedbackForm.text.trim()) return toast.error('Please write feedback before submitting')
    setSaving(true)
    try {
      const { data, error } = await supabase.from('submissions').update({
        feedback_text:  feedbackForm.text,
        feedback_grade: feedbackForm.grade || null,
        feedback_by:    profile.id,
        feedback_at:    new Date().toISOString(),
        status:         'returned',
      }).eq('id', subId).select().single()
      if (error) throw error
      setSubmissions(s => s.filter(x => x.id !== subId))
      setActiveId(null)
      toast.success('Feedback submitted!')
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin"/></div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-violet-900">Student Submissions</h2>
        <p className="font-sans text-sm text-muted mt-1">{submissions.length} awaiting feedback</p>
      </div>

      {submissions.length === 0 ? (
        <div className="card p-16 text-center">
          <CheckCircle size={28} className="text-green-400 mx-auto mb-3"/>
          <p className="font-display text-lg font-semibold text-violet-900">All caught up!</p>
          <p className="font-sans text-sm text-muted mt-1">No pending submissions to review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map(sub => (
            <div key={sub.id} className="card overflow-hidden">
              <div className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-violet-200 flex items-center justify-center font-display font-bold text-violet-700 flex-shrink-0">
                  {(sub.profiles?.full_name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sans font-semibold text-sm text-violet-900">{sub.profiles?.full_name}</p>
                  <p className="font-mono text-xs text-muted">{sub.modules?.title} · {sub.courses?.title}</p>
                  <p className="font-mono text-xs text-violet-400 mt-0.5">
                    {new Date(sub.submitted_at).toLocaleDateString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                  </p>
                </div>
                <button onClick={() => setActiveId(activeId === sub.id ? null : sub.id)}
                  className="btn-primary btn-sm flex-shrink-0">
                  {activeId === sub.id ? 'Close' : 'Review'}
                </button>
              </div>

              {activeId === sub.id && (
                <div className="border-t border-border p-5 space-y-4 bg-violet-50/30">
                  {/* Student's submission */}
                  <div>
                    <p className="field-label mb-2">Student's response</p>
                    {sub.text_response && (
                      <div className="bg-white rounded-lg border border-border p-4 max-h-48 overflow-y-auto">
                        <pre className="font-sans text-sm text-violet-800 whitespace-pre-wrap leading-relaxed">{sub.text_response}</pre>
                      </div>
                    )}
                    {sub.file_url && (
                      <a href={sub.file_url} target="_blank" rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-2 p-3 bg-white rounded-lg border border-border text-violet-600 hover:text-violet-800 text-xs font-mono">
                        <File size={13}/>{sub.file_name || 'Attached file'}
                      </a>
                    )}
                  </div>
                  {/* Feedback form */}
                  <div className="space-y-3">
                    <div>
                      <label className="field-label">Your feedback *</label>
                      <textarea className="input resize-none" rows={4}
                        placeholder="Provide detailed feedback on the student's submission…"
                        value={feedbackForm.text}
                        onChange={e => setFeedback(f => ({...f, text: e.target.value}))}/>
                    </div>
                    <div>
                      <label className="field-label">Grade / score (optional)</label>
                      <input className="input" placeholder="e.g. A, 85/100, Pass, 9/10"
                        value={feedbackForm.grade}
                        onChange={e => setFeedback(f => ({...f, grade: e.target.value}))}/>
                    </div>
                    <button onClick={() => giveFeedback(sub.id)} disabled={saving} className="btn-primary">
                      {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Submitting…</> : <>Submit feedback</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
