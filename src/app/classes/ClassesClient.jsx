'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useAuth } from '@/components/auth/AuthProvider'
import { CATEGORIES } from '@/lib/constants'
import { Plus, Users, Copy, Radio, ArrowRight, X, Check, GraduationCap, Hash } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function ClassesClient({ profile, memberships, ownedClasses: initialOwned, isInstructor }) {
  const supabase = createClient()
  const [ownedClasses, setOwned]   = useState(initialOwned)
  const [myClasses, setMyClasses]  = useState(memberships)
  const [joinCode, setJoinCode]    = useState('')
  const [joining, setJoining]      = useState(false)
  const [showCreate, setShowCreate]= useState(false)

  // Join a class by code
  const handleJoin = async (e) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    setJoining(true)
    try {
      const code = joinCode.trim().toUpperCase()
      const { data: cls, error: findErr } = await supabase
        .from('classes')
        .select('*, instructor:instructor_id(full_name), courses(title)')
        .eq('join_code', code)
        .eq('is_active', true)
        .single()

      if (findErr || !cls) {
        toast.error('Class not found. Check the code and try again.')
        return
      }

      // Check not already a member
      const { data: existing } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', cls.id)
        .eq('user_id', profile.id)
        .single()

      if (existing) {
        toast.error('You\'re already in this class.')
        return
      }

      const { error: joinErr } = await supabase.from('class_members').insert({
        class_id: cls.id,
        user_id: profile.id,
        role: 'student',
      })
      if (joinErr) throw joinErr

      toast.success(`Joined "${cls.name}"!`)
      setJoinCode('')
      window.location.reload()
    } catch (err) {
      toast.error(err.message || 'Failed to join class')
    } finally {
      setJoining(false)
    }
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    toast.success('Join code copied!')
  }

  const startSession = async (cls) => {
    try {
      const { data, error } = await supabase.from('live_rooms').insert({
        title:         `${cls.name} — Live Session`,
        class_id:      cls.id,
        course_id:     cls.course_id || null,
        instructor_id: profile.id,
        room_type:     'class',
        status:        'active',
        is_active:     true,
      }).select().single()
      if (error) throw error

      // Notify all students
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'room_started',
          roomId: data.id,
          classId: cls.id,
          senderName: profile.full_name,
        }),
      })

      toast.success('Session started!')
      window.location.href = `/classroom/${data.id}`
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-violet-50">
      <div className="max-w-5xl mx-auto px-5 py-12 space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-violet-900">My Classes</h1>
            <p className="font-sans text-sm text-muted mt-1">
              {isInstructor ? 'Manage your classes or join one as a student.' : 'Join a class with a code from your instructor.'}
            </p>
          </div>
          {isInstructor && (
            <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
              <Plus size={15}/> Create class
            </button>
          )}
        </div>

        {/* Create class form */}
        {showCreate && isInstructor && (
          <CreateClassForm
            profile={profile}
            onClose={() => setShowCreate(false)}
            onCreated={(cls) => { setOwned(p => [cls, ...p]); setShowCreate(false) }}
          />
        )}

        {/* Join by code */}
        {!isInstructor && (
          <div className="card p-6">
            <h2 className="font-display text-lg font-semibold text-violet-900 mb-4 flex items-center gap-2">
              <Hash size={18} className="text-violet-500"/> Join a class
            </h2>
            <form onSubmit={handleJoin} className="flex gap-3">
              <input
                className="input flex-1 font-mono uppercase tracking-widest"
                placeholder="Enter 6-character code"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0,6))}
                maxLength={6}
              />
              <button type="submit" disabled={joining || joinCode.length < 6} className="btn-primary flex-shrink-0">
                {joining ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : 'Join'}
              </button>
            </form>
          </div>
        )}

        {/* My enrolled classes */}
        {myClasses.filter(m => m.role !== 'instructor').length > 0 && (
          <div>
            <h2 className="font-display text-xl font-semibold text-violet-900 mb-4">Enrolled classes</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {myClasses.filter(m => m.role !== 'instructor').map(m => (
                <ClassCard key={m.id} cls={m.classes} role={m.role} anonName={m.anon_name} isStudent />
              ))}
            </div>
          </div>
        )}

        {/* Owned classes (instructors) */}
        {isInstructor && ownedClasses.length > 0 && (
          <div>
            <h2 className="font-display text-xl font-semibold text-violet-900 mb-4">Your classes</h2>
            <div className="space-y-4">
              {ownedClasses.map(cls => (
                <div key={cls.id} className="card p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-display text-lg font-semibold text-violet-900">{cls.name}</h3>
                        <span className={clsx('badge text-xs', cls.is_active ? 'badge-green' : 'badge-violet')}>
                          {cls.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {cls.courses && <p className="font-mono text-xs text-muted">{cls.courses.title}</p>}
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-violet-700 tracking-widest bg-violet-100 px-3 py-1 rounded-lg">
                            {cls.join_code}
                          </span>
                          <button onClick={() => copyCode(cls.join_code)}
                            className="p-1.5 rounded hover:bg-violet-100 text-violet-400 hover:text-violet-700 transition-colors">
                            <Copy size={13}/>
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted">
                          <Users size={13}/>
                          <span className="font-mono text-xs">{cls.class_members?.[0]?.count || 0} students</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button onClick={() => startSession(cls)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-700 text-white text-xs font-semibold font-sans hover:bg-violet-800 transition-colors shadow-violet">
                        <Radio size={13}/> Start session
                      </button>
                      <Link href={`/classes/${cls.id}/members`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-xs font-semibold text-violet-700 hover:bg-violet-50 transition-colors">
                        <Users size={13}/> Manage members
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {myClasses.length === 0 && ownedClasses.length === 0 && !showCreate && (
          <div className="card p-16 text-center">
            <GraduationCap size={32} className="text-violet-300 mx-auto mb-4"/>
            <h3 className="font-display text-lg font-semibold text-violet-900 mb-2">No classes yet</h3>
            <p className="font-sans text-sm text-muted max-w-xs mx-auto">
              {isInstructor
                ? 'Create your first class to get a join code and start inviting students.'
                : 'Enter a class code from your instructor to get started.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function ClassCard({ cls, role, anonName, isStudent }) {
  if (!cls) return null
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base font-semibold text-violet-900 truncate">{cls.name}</h3>
          <p className="font-mono text-xs text-muted mt-0.5">
            {cls.instructor?.full_name && `with ${cls.instructor.full_name}`}
            {cls.courses && ` · ${cls.courses.title}`}
          </p>
          {isStudent && anonName && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="font-mono text-xs text-violet-500">You appear as:</span>
              <span className="badge-violet text-xs font-mono">{anonName}</span>
            </div>
          )}
        </div>
        <span className={clsx('badge text-xs flex-shrink-0', role === 'ta' ? 'badge-solar' : 'badge-violet')}>
          {role === 'ta' ? 'TA' : 'Student'}
        </span>
      </div>
    </div>
  )
}

function CreateClassForm({ profile, onClose, onCreated }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', category: CATEGORIES[0] })
  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Class name is required')
    setLoading(true)
    try {
      const { data, error } = await supabase.from('classes').insert({
        name: form.name.trim(),
        description: form.description.trim() || null,
        instructor_id: profile.id,
      }).select('*, courses(title), class_members(count)').single()
      if (error) throw error

      // Auto-add instructor as member
      await supabase.from('class_members').insert({
        class_id: data.id,
        user_id: profile.id,
        role: 'instructor',
      })

      toast.success(`Class "${data.name}" created! Code: ${data.join_code}`)
      onCreated(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-7 border-violet-300">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-xl font-bold text-violet-900">Create new class</h3>
        <button onClick={onClose} className="btn-ghost btn-sm"><X size={15}/></button>
      </div>
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="field-label">Class name *</label>
          <input className="input" placeholder="e.g. Electrical Engineering 101 — Fall 2026"
            value={form.name} onChange={e => set('name', e.target.value)} required />
        </div>
        <div>
          <label className="field-label">Description (optional)</label>
          <textarea className="input resize-none" rows={2} placeholder="Brief description of the class"
            value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div className="bg-violet-50 rounded-lg p-4 border border-violet-200">
          <p className="font-sans text-xs text-muted leading-relaxed">
            A unique 6-character join code will be automatically generated. Share it with your students to let them enroll. Students will be assigned anonymous display names for the class chat.
          </p>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Creating…</span> : 'Create class'}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        </div>
      </form>
    </div>
  )
}
