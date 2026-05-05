'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useAuth } from '@/components/auth/AuthProvider'
import { useRouter } from 'next/navigation'
import { User, Lock, Bell, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const supabase = createClient()
  const { user, profile, refreshProfile } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    company_name: profile?.company_name || '',
  })
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })

  const saveProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: form.full_name,
        company_name: form.company_name,
      }).eq('id', user.id)
      if (error) throw error
      await refreshProfile()
      toast.success('Profile updated!')
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    if (pwForm.newPw !== pwForm.confirm) return toast.error('Passwords do not match')
    if (pwForm.newPw.length < 8) return toast.error('Password must be at least 8 characters')
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.newPw })
      if (error) throw error
      toast.success('Password updated!')
      setPwForm({ current: '', newPw: '', confirm: '' })
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  const TABS = [
    { id:'profile', label:'Profile', icon: User },
    { id:'password', label:'Password', icon: Lock },
  ]

  return (
    <div className="min-h-screen bg-violet-50 py-12 px-5">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-3xl font-bold text-violet-900 mb-8">Settings</h1>
        <div className="flex gap-1 mb-6 border-b border-border">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-sans font-medium transition-colors border-b-2 -mb-px ${tab === t.id ? 'border-violet-600 text-violet-700' : 'border-transparent text-muted hover:text-violet-700'}`}>
              <t.icon size={14}/>{t.label}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <div className="card p-7">
            <h2 className="font-display text-lg font-bold text-violet-900 mb-5">Personal information</h2>
            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <label className="field-label">Full name</label>
                <input className="input" value={form.full_name} onChange={e => setForm(f=>({...f,full_name:e.target.value}))} />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input className="input bg-violet-50" value={user?.email || ''} disabled />
                <p className="font-mono text-xs text-muted mt-1">Email cannot be changed here.</p>
              </div>
              <div>
                <label className="field-label">Organization / employer</label>
                <input className="input" placeholder="Optional" value={form.company_name} onChange={e => setForm(f=>({...f,company_name:e.target.value}))} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </div>
        )}

        {tab === 'password' && (
          <div className="card p-7">
            <h2 className="font-display text-lg font-bold text-violet-900 mb-5">Change password</h2>
            <form onSubmit={changePassword} className="space-y-4">
              <div>
                <label className="field-label">New password</label>
                <input type="password" className="input" placeholder="Min. 8 characters" value={pwForm.newPw} onChange={e => setPwForm(f=>({...f,newPw:e.target.value}))} />
              </div>
              <div>
                <label className="field-label">Confirm new password</label>
                <input type="password" className="input" placeholder="Repeat new password" value={pwForm.confirm} onChange={e => setPwForm(f=>({...f,confirm:e.target.value}))} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
