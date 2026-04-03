'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { BookOpen, Eye, EyeOff, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [email, setEmail]   = useState('')
  const [pw, setPw]         = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw })
      if (error) throw error
      const { data: profile } = await supabase.from('profiles').select('role,onboarded').eq('id', data.user.id).single()
      toast.success('Welcome back!')
      if (profile?.role === 'instructor') router.push('/instructor')
      else if (!profile?.onboarded) router.push('/onboarding')
      else router.push('/dashboard')
    } catch (err) {
      toast.error(err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-violet-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5 justify-center mb-6">
            <div className="w-10 h-10 rounded-xl bg-violet-700 flex items-center justify-center shadow-violet">
              <BookOpen size={18} className="text-white" />
            </div>
          </Link>
          <h1 className="font-display text-3xl font-bold text-violet-900 mb-2">Welcome back</h1>
          <p className="font-sans text-sm text-muted">Sign in to continue your learning journey.</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="field-label">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com" className="input" required />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="field-label mb-0">Password</label>
                <Link href="/auth/forgot-password" className="font-mono text-xs text-violet-500 hover:text-violet-700 transition-colors">Forgot?</Link>
              </div>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)}
                  placeholder="Your password" className="input pr-10" required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-300 hover:text-violet-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3.5 text-sm">
              {loading
                ? <span className="flex items-center gap-2 justify-center"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</span>
                : <span className="flex items-center gap-2 justify-center">Sign in <ArrowRight size={16} /></span>
              }
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <span className="font-sans text-sm text-muted">New to Quicademy? </span>
            <Link href="/auth/register" className="font-sans text-sm font-semibold text-violet-700 hover:text-violet-900 transition-colors">
              Create a free account
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
