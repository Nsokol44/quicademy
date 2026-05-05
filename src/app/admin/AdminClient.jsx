'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { CheckCircle, XCircle, Users, GraduationCap, Clock, Shield, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const TABS = ['Pending Approval', 'Approved Instructors', 'Recent Users']

export default function AdminClient({ pendingInstructors: initial, approvedInstructors: initialApproved, recentUsers }) {
  const supabase = createClient()
  const [tab, setTab] = useState('Pending Approval')
  const [pending,  setPending]  = useState(initial)
  const [approved, setApproved] = useState(initialApproved)
  const [expanded, setExpanded] = useState(null)

  const approveInstructor = async (id, name) => {
    const { error } = await supabase.from('profiles')
      .update({ instructor_status: 'approved' })
      .eq('id', id)
    if (error) return toast.error(error.message)
    const person = pending.find(p => p.id === id)
    setPending(p => p.filter(x => x.id !== id))
    setApproved(p => [{ ...person, instructor_status: 'approved' }, ...p])
    toast.success(`${name} approved as instructor!`)
  }

  const rejectInstructor = async (id, name) => {
    if (!confirm(`Reject ${name}'s instructor application? This will set their role back to student.`)) return
    const { error } = await supabase.from('profiles')
      .update({ instructor_status: 'rejected', role: 'student' })
      .eq('id', id)
    if (error) return toast.error(error.message)
    setPending(p => p.filter(x => x.id !== id))
    toast.success(`${name}'s application rejected.`)
  }

  const revokeInstructor = async (id, name) => {
    if (!confirm(`Revoke ${name}'s instructor status?`)) return
    const { error } = await supabase.from('profiles')
      .update({ instructor_status: 'pending', role: 'student' })
      .eq('id', id)
    if (error) return toast.error(error.message)
    setApproved(p => p.filter(x => x.id !== id))
    toast.success(`${name}'s instructor status revoked.`)
  }

  return (
    <div className="min-h-screen bg-violet-50">
      {/* Header */}
      <div className="bg-violet-900 text-white px-5 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Shield size={20} className="text-solar-400" />
            <h1 className="font-display text-2xl font-bold">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Clock size={14} className="text-red-400" />
              </div>
              <div>
                <p className="font-display text-xl font-bold text-white">{pending.length}</p>
                <p className="font-mono text-xs text-violet-400">Pending approval</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <GraduationCap size={14} className="text-green-400" />
              </div>
              <div>
                <p className="font-display text-xl font-bold text-white">{approved.length}</p>
                <p className="font-mono text-xs text-violet-400">Active instructors</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Users size={14} className="text-violet-300" />
              </div>
              <div>
                <p className="font-display text-xl font-bold text-white">{recentUsers.length}</p>
                <p className="font-mono text-xs text-violet-400">Recent signups</p>
              </div>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 mt-6">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={clsx('px-4 py-2 font-sans text-sm font-medium rounded-t-lg transition-all relative',
                  tab === t ? 'text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-solar' : 'text-violet-400 hover:text-violet-200'
                )}>
                {t}
                {t === 'Pending Approval' && pending.length > 0 && (
                  <span className="ml-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold inline-flex items-center justify-center">{pending.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-8">

        {/* Pending */}
        {tab === 'Pending Approval' && (
          <div className="space-y-4">
            {pending.length === 0 ? (
              <div className="card p-16 text-center">
                <CheckCircle size={32} className="text-green-400 mx-auto mb-3" />
                <p className="font-display text-lg font-semibold text-violet-900">All caught up!</p>
                <p className="font-sans text-sm text-muted mt-1">No pending instructor applications.</p>
              </div>
            ) : pending.map(p => (
              <InstructorCard key={p.id} person={p}
                expanded={expanded === p.id}
                onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
                onApprove={() => approveInstructor(p.id, p.full_name)}
                onReject={() => rejectInstructor(p.id, p.full_name)}
              />
            ))}
          </div>
        )}

        {/* Approved */}
        {tab === 'Approved Instructors' && (
          <div className="space-y-3">
            {approved.length === 0 ? (
              <div className="card p-12 text-center">
                <p className="font-sans text-sm text-muted">No approved instructors yet.</p>
              </div>
            ) : approved.map(p => (
              <div key={p.id} className="card p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-violet-700 flex items-center justify-center text-white font-display font-bold flex-shrink-0">
                  {(p.full_name||'?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sans font-semibold text-sm text-violet-900">{p.full_name}</p>
                  <p className="font-mono text-xs text-muted truncate">{p.email}</p>
                  {p.credentials && <p className="font-sans text-xs text-violet-600 mt-0.5">{p.credentials}</p>}
                </div>
                <span className="badge-green text-xs flex-shrink-0">Approved</span>
                <button onClick={() => revokeInstructor(p.id, p.full_name)}
                  className="btn-ghost btn-sm text-red-400 hover:bg-red-50 flex-shrink-0">
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Recent Users */}
        {tab === 'Recent Users' && (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-violet-50 border-b border-border">
                <tr>
                  {['Name','Email','Role','Joined'].map(h => (
                    <th key={h} className="px-5 py-3 text-left font-mono text-xs text-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentUsers.map(u => (
                  <tr key={u.id} className="hover:bg-violet-50/50 transition-colors">
                    <td className="px-5 py-3 font-sans text-sm text-violet-900">{u.full_name || '—'}</td>
                    <td className="px-5 py-3 font-mono text-xs text-muted">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={clsx('badge text-xs', u.role === 'instructor' ? 'badge-solar' : u.role === 'admin' ? 'bg-red-100 text-red-700' : 'badge-violet')}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function InstructorCard({ person: p, expanded, onToggle, onApprove, onReject }) {
  return (
    <div className="card overflow-hidden">
      <div className="p-5 flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700 font-display font-bold text-lg flex-shrink-0">
          {(p.full_name||'?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg font-semibold text-violet-900">{p.full_name}</p>
              <p className="font-mono text-xs text-muted">{p.email}</p>
              <p className="font-mono text-xs text-violet-400 mt-0.5">
                Applied {new Date(p.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={onApprove}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold font-sans hover:bg-green-700 transition-colors">
                <CheckCircle size={13}/> Approve
              </button>
              <button onClick={onReject}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 text-red-500 text-xs font-semibold font-sans hover:bg-red-50 transition-colors">
                <XCircle size={13}/> Reject
              </button>
            </div>
          </div>
          {p.credentials && (
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="badge-solar text-xs">{p.credentials}</span>
            </div>
          )}
        </div>
        <button onClick={onToggle} className="text-muted hover:text-violet-700 transition-colors p-1 flex-shrink-0">
          {expanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border bg-violet-50 px-5 py-4 space-y-3">
          {p.bio && (
            <div>
              <p className="font-mono text-xs text-muted uppercase tracking-wider mb-1">Bio</p>
              <p className="font-sans text-sm text-violet-800 leading-relaxed">{p.bio}</p>
            </div>
          )}
          {p.expertise?.length > 0 && (
            <div>
              <p className="font-mono text-xs text-muted uppercase tracking-wider mb-1">Expertise</p>
              <div className="flex flex-wrap gap-2">
                {p.expertise.map(e => <span key={e} className="badge-violet text-xs">{e}</span>)}
              </div>
            </div>
          )}
          {p.company_name && (
            <div>
              <p className="font-mono text-xs text-muted uppercase tracking-wider mb-1">Company</p>
              <p className="font-sans text-sm text-violet-800">{p.company_name}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
