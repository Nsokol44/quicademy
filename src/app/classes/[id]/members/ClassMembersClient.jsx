'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { ArrowLeft, Users, Shield, Trash2, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function ClassMembersClient({ cls, members: initial }) {
  const supabase = createClient()
  const [members, setMembers] = useState(initial)

  const promoteToTA = async (memberId, name) => {
    const { error } = await supabase.from('class_members').update({ role: 'ta' }).eq('id', memberId)
    if (error) return toast.error(error.message)
    setMembers(m => m.map(x => x.id === memberId ? { ...x, role: 'ta' } : x))
    toast.success(`${name} promoted to TA`)
  }

  const demoteFromTA = async (memberId, name) => {
    const { error } = await supabase.from('class_members').update({ role: 'student' }).eq('id', memberId)
    if (error) return toast.error(error.message)
    setMembers(m => m.map(x => x.id === memberId ? { ...x, role: 'student' } : x))
    toast.success(`${name} demoted to student`)
  }

  const removeMember = async (memberId, name) => {
    if (!confirm(`Remove ${name} from this class?`)) return
    const { error } = await supabase.from('class_members').delete().eq('id', memberId)
    if (error) return toast.error(error.message)
    setMembers(m => m.filter(x => x.id !== memberId))
    toast.success(`${name} removed`)
  }

  const students = members.filter(m => m.role === 'student')
  const tas      = members.filter(m => m.role === 'ta')

  return (
    <div className="min-h-screen bg-violet-50 py-10 px-5">
      <div className="max-w-4xl mx-auto">
        <Link href="/classes" className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-800 font-sans text-sm mb-6 transition-colors">
          <ArrowLeft size={14}/> Back to classes
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-violet-900">{cls.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="font-mono text-sm font-bold text-violet-700 tracking-widest bg-violet-100 px-3 py-1 rounded-lg">{cls.join_code}</span>
              <span className="font-mono text-xs text-muted">{members.length} members</span>
            </div>
          </div>
        </div>

        {/* TAs */}
        {tas.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-solar-600"/>
              <h2 className="font-display text-xl font-semibold text-violet-900">Teaching Assistants ({tas.length})</h2>
            </div>
            <div className="space-y-2">
              {tas.map(m => (
                <MemberRow key={m.id} member={m}
                  onDemote={() => demoteFromTA(m.id, m.profiles?.full_name || 'Member')}
                  onRemove={() => removeMember(m.id, m.profiles?.full_name || 'Member')}
                  isTA />
              ))}
            </div>
          </div>
        )}

        {/* Students */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-violet-600"/>
            <h2 className="font-display text-xl font-semibold text-violet-900">Students ({students.length})</h2>
          </div>
          {students.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="font-sans text-sm text-muted">No students enrolled yet. Share the join code: <strong className="font-mono">{cls.join_code}</strong></p>
            </div>
          ) : (
            <div className="space-y-2">
              {students.map(m => (
                <MemberRow key={m.id} member={m}
                  onPromote={() => promoteToTA(m.id, m.profiles?.full_name || 'Member')}
                  onRemove={() => removeMember(m.id, m.profiles?.full_name || 'Member')}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MemberRow({ member: m, onPromote, onDemote, onRemove, isTA }) {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={clsx('w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-sm flex-shrink-0',
        isTA ? 'bg-solar text-violet-900' : 'bg-violet-200 text-violet-700'
      )}>
        {(m.profiles?.full_name || '?')[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-sans font-semibold text-sm text-violet-900">{m.profiles?.full_name || 'Unknown'}</p>
        <p className="font-mono text-xs text-muted truncate">{m.profiles?.email}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="text-right mr-2">
          <p className="font-mono text-xs text-violet-500">Appears as</p>
          <p className="font-mono text-xs font-semibold text-violet-700">{m.anon_name}</p>
        </div>
        {isTA ? (
          <button onClick={onDemote} className="btn-ghost btn-sm text-xs">Demote</button>
        ) : (
          <button onClick={onPromote} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-solar-50 border border-solar-200 text-solar-700 text-xs font-semibold font-sans hover:bg-solar-100 transition-colors">
            <GraduationCap size={11}/> Make TA
          </button>
        )}
        <button onClick={onRemove} className="btn-ghost btn-sm text-red-400 hover:bg-red-50">
          <Trash2 size={13}/>
        </button>
      </div>
    </div>
  )
}
