'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { BookOpen, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
      })
      if (error) throw error
      setSent(true)
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-violet-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-7 h-7 rounded-lg bg-violet-700 flex items-center justify-center">
            <BookOpen size={14} className="text-white" />
          </div>
          <Link href="/" className="font-display font-bold text-violet-900 text-lg">Quicademy</Link>
        </div>
        {sent ? (
          <div className="card p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-solar-50 border border-solar-200 flex items-center justify-center mx-auto mb-4">
              <BookOpen size={22} className="text-solar-600" />
            </div>
            <h1 className="font-display text-2xl font-bold text-violet-900 mb-2">Check your email</h1>
            <p className="font-sans text-sm text-muted mb-5">We sent a password reset link to <strong>{email}</strong>.</p>
            <Link href="/auth/login" className="btn-ghost mx-auto"><ArrowLeft size={14}/> Back to sign in</Link>
          </div>
        ) : (
          <div className="card p-8">
            <h1 className="font-display text-2xl font-bold text-violet-900 mb-2">Reset password</h1>
            <p className="font-sans text-sm text-muted mb-6">Enter your email and we'll send a reset link.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="field-label">Email address</label>
                <input type="email" className="input" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <div className="mt-5 text-center">
              <Link href="/auth/login" className="font-sans text-sm text-violet-600 hover:text-violet-800 flex items-center gap-1 justify-center">
                <ArrowLeft size={13}/> Back to sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
