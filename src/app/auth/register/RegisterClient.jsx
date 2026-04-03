'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { BookOpen, User, HardHat, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle, Trophy, Zap, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const ROLES = [
  { id:'student',    label:"I'm here to learn",   sub:'Access AI-personalized courses and live expert sessions', icon: User },
  { id:'instructor', label:"I want to teach",      sub:'Share your expertise and earn as a vetted trade professional', icon: HardHat },
]

const SIDEBAR_POINTS = [
  { icon: Zap,         text: 'AI adapts to your learning style from day one' },
  { icon: Shield,      text: 'Vetted experts you can actually trust' },
  { icon: Trophy,      text: 'Credentials that employers recognize' },
  { icon: CheckCircle, text: '72% better retention on average' },
]

export default function RegisterClient({ defaultRole = 'student' }) {
  const router   = useRouter()
  const supabase = createClient()
  const [role, setRole]     = useState(defaultRole)
  const [step, setStep]     = useState(1)
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState({})
  const [form, setForm]     = useState({
    full_name:'', email:'', password:'',
    bio:'', credentials:'', expertise:'', company_name:'',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.full_name.trim()) e.full_name = 'Required'
    if (!form.email.includes('@')) e.email = 'Valid email required'
    if (form.password.length < 8) e.password = 'Minimum 8 characters'
    if (role === 'instructor' && step === 2) {
      if (!form.bio.trim()) e.bio = 'Required'
      if (!form.credentials.trim()) e.credentials = 'Required'
      if (!form.expertise.trim()) e.expertise = 'Required'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleStep1 = (e) => {
    e.preventDefault()
    if (!validate()) return
    if (role === 'instructor') { setStep(2); return }
    handleSubmit()
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: {
          data: { full_name: form.full_name, role },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error

      if (role === 'instructor' && data.user) {
        await supabase.from('profiles').update({
          bio: form.bio,
          credentials: form.credentials,
          expertise: form.expertise.split(',').map(s => s.trim()).filter(Boolean),
          company_name: form.company_name,
          instructor_status: 'pending',
        }).eq('id', data.user.id)
      }

      toast.success('Account created! Check your email to verify.')
      router.push(role === 'student' ? '/onboarding' : '/instructor/pending')
    } catch (err) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left sidebar ── */}
      <div className="hidden lg:flex lg:w-5/12 bg-violet-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 48px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 48px)' }} />
        <div className="absolute bottom-0 right-0 w-72 h-72 opacity-20 rounded-full"
          style={{ background: 'radial-gradient(circle, #f5c842 0%, transparent 70%)', transform: 'translate(30%,30%)' }} />

        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-solar flex items-center justify-center shadow-solar">
              <BookOpen size={17} className="text-violet-900" />
            </div>
            <span className="font-display font-bold text-xl text-white">Quica<span className="text-solar-400">demy</span></span>
          </Link>
        </div>

        <div className="relative">
          <p className="font-mono text-xs text-violet-400 uppercase tracking-widest mb-4">Why Quicademy?</p>
          <h2 className="font-display text-3xl font-bold text-white leading-tight mb-8">
            The trades deserve world-class education.
          </h2>
          <div className="space-y-4">
            {SIDEBAR_POINTS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-solar/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon size={13} className="text-solar-400" />
                </div>
                <p className="font-sans text-sm text-violet-200 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative font-mono text-xs text-violet-600">© 2026 Quicademy</div>
      </div>

      {/* ── Right form ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-violet-50">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-violet-700 flex items-center justify-center">
              <BookOpen size={15} className="text-white" />
            </div>
            <Link href="/" className="font-display font-bold text-violet-900 text-lg">Quicademy</Link>
          </div>

          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-violet-900 mb-2">
              {step === 1 ? 'Create your account' : 'Your instructor profile'}
            </h1>
            <p className="font-sans text-sm text-muted">
              {step === 1 ? 'Join the Quicademy community — it\'s free to start.' : 'Tell us about yourself so we can review your application.'}
            </p>
          </div>

          {/* Step indicator for instructors */}
          {role === 'instructor' && (
            <div className="flex items-center gap-2 mb-7">
              {[1, 2].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className={clsx(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all',
                    step >= s ? 'bg-violet-700 text-white shadow-violet' : 'bg-white border border-border text-muted'
                  )}>{step > s ? '✓' : s}</div>
                  {s < 2 && <div className={clsx('w-10 h-px transition-all', step > s ? 'bg-violet-600' : 'bg-border')} />}
                </div>
              ))}
              <span className="font-mono text-xs text-muted ml-1">Step {step} of 2</span>
            </div>
          )}

          <div className="card p-7">
            <form onSubmit={step === 1 ? handleStep1 : (e) => { e.preventDefault(); handleSubmit() }} className="space-y-5">

              {step === 1 && (
                <>
                  {/* Role picker */}
                  <div>
                    <label className="field-label">I am joining as</label>
                    <div className="grid grid-cols-2 gap-3">
                      {ROLES.map(r => (
                        <button key={r.id} type="button" onClick={() => setRole(r.id)}
                          className={clsx(
                            'flex flex-col items-start gap-1.5 p-4 rounded-lg border text-left transition-all',
                            role === r.id
                              ? 'border-violet-600 bg-violet-700 shadow-violet'
                              : 'border-border bg-surface hover:border-violet-300'
                          )}>
                          <r.icon size={18} className={role === r.id ? 'text-solar-400' : 'text-violet-400'} />
                          <span className={clsx('font-sans text-sm font-semibold leading-tight', role === r.id ? 'text-white' : 'text-violet-900')}>
                            {r.label}
                          </span>
                          <span className={clsx('font-sans text-xs leading-tight', role === r.id ? 'text-violet-200' : 'text-muted')}>
                            {r.sub}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <FieldInput label="Full name" id="full_name" placeholder="Jane Smith"
                    value={form.full_name} onChange={v => set('full_name', v)} error={errors.full_name} />
                  <FieldInput label="Email address" id="email" type="email" placeholder="jane@company.com"
                    value={form.email} onChange={v => set('email', v)} error={errors.email} />
                  <FieldInput label="Password" id="pw" type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters"
                    value={form.password} onChange={v => set('password', v)} error={errors.password}
                    suffix={
                      <button type="button" onClick={() => setShowPw(!showPw)} className="text-violet-300 hover:text-violet-600">
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    } />
                </>
              )}

              {step === 2 && role === 'instructor' && (
                <>
                  <FieldTextarea label="Professional bio" id="bio" rows={4}
                    placeholder="Describe your trade background, years of experience, and teaching approach..."
                    value={form.bio} onChange={v => set('bio', v)} error={errors.bio} />
                  <FieldInput label="Credentials & certifications" id="creds"
                    placeholder="e.g. Licensed Master Electrician (TN), OSHA 30"
                    value={form.credentials} onChange={v => set('credentials', v)} error={errors.credentials} />
                  <FieldInput label="Areas of expertise" id="exp"
                    placeholder="e.g. Residential wiring, Panel upgrades, NEC code"
                    value={form.expertise} onChange={v => set('expertise', v)} error={errors.expertise}
                    hint="Separate with commas" />
                  <FieldInput label="Company / employer (optional)" id="co"
                    placeholder="Your current employer"
                    value={form.company_name} onChange={v => set('company_name', v)} />
                </>
              )}

              <button type="submit" disabled={loading}
                className="btn-primary w-full py-3.5">
                {loading
                  ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account…</span>
                  : step === 1 && role === 'instructor'
                    ? <span className="flex items-center gap-2">Continue <ArrowRight size={16} /></span>
                    : <span className="flex items-center gap-2">{role === 'instructor' ? 'Submit application' : 'Create my account'} <ArrowRight size={16} /></span>
                }
              </button>

              {step === 2 && (
                <button type="button" onClick={() => setStep(1)} className="btn-ghost w-full">
                  <ArrowLeft size={15} /> Back
                </button>
              )}
            </form>
          </div>

          <div className="mt-6 text-center">
            <span className="font-sans text-sm text-muted">Already have an account? </span>
            <Link href="/auth/login" className="font-sans text-sm font-semibold text-violet-700 hover:text-violet-900">Sign in</Link>
          </div>

          {role === 'instructor' && step === 1 && (
            <div className="mt-5 p-4 bg-solar-50 border border-solar-200 rounded-lg">
              <p className="font-sans text-xs text-solar-800 leading-relaxed">
                <strong>Instructor applications</strong> are reviewed within 2–3 business days. You'll receive an email once approved.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FieldInput({ label, id, type = 'text', placeholder, value, onChange, error, hint, suffix }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="relative">
        <input id={id} type={type} placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          className={clsx('input', suffix && 'pr-10', error && 'input-error')} />
        {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
      {error && <p className="mt-1 text-xs text-red-500 font-mono">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-muted font-mono">{hint}</p>}
    </div>
  )
}

function FieldTextarea({ label, id, rows, placeholder, value, onChange, error }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <textarea id={id} rows={rows} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        className={clsx('input resize-none', error && 'input-error')} />
      {error && <p className="mt-1 text-xs text-red-500 font-mono">{error}</p>}
    </div>
  )
}
