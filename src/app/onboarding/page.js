'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useAuth } from '@/components/auth/AuthProvider'
import { LEARNING_STYLES, EXPERIENCE_LEVELS, CATEGORIES, GOALS } from '@/lib/constants'
import { BookOpen, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const STEPS = [
  { key:'style', label:'Learning Style', question:'How do you absorb information best?', sub:'The AI uses this to decide whether to show you videos, diagrams, text, or hands-on simulations.' },
  { key:'exp',   label:'Experience',     question:'Where are you in your trade journey?', sub:'We\'ll calibrate depth and skip what you already know cold.' },
  { key:'trade', label:'Your Subject',  question:"What's your primary area of study?",  sub:'We\'ll feature courses in your field — you can still browse everything.' },
  { key:'goals', label:'Your Goals',     question:'What are you working toward?',         sub:'Select all that apply. This shapes your dashboard recommendations.' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { user, refreshProfile } = useAuth()
  const supabase = createClient()
  const [step, setStep]     = useState(0)
  const [loading, setLoading] = useState(false)
  const [data, setData]     = useState({ learning_style:'', experience_level:'', industry:'', goals:[], company_name:'' })

  const toggleGoal = (g) => setData(d => ({ ...d, goals: d.goals.includes(g) ? d.goals.filter(x => x!==g) : [...d.goals, g] }))
  const canNext = () => {
    if (step===0) return !!data.learning_style
    if (step===1) return !!data.experience_level
    if (step===2) return !!data.industry
    if (step===3) return data.goals.length > 0
    return true
  }

  const handleFinish = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { error } = await supabase.from('profiles').update({ ...data, onboarded:true }).eq('id', user.id)
      if (error) throw error
      await refreshProfile()
      toast.success('Welcome to Quicademy! 🎉')
      router.push('/dashboard')
    } catch {
      toast.error('Failed to save — please try again')
    } finally {
      setLoading(false)
    }
  }

  const currentStep = STEPS[step]

  return (
    <div className="min-h-screen bg-violet-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-border px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-700 flex items-center justify-center">
            <BookOpen size={15} className="text-white" />
          </div>
          <span className="font-display font-bold text-violet-900">Quicademy</span>
        </div>
        <span className="font-mono text-xs text-muted">Step {step+1} of {STEPS.length}</span>
      </div>

      {/* Progress */}
      <div className="h-1.5 bg-violet-100">
        <div className="h-full bg-violet-600 transition-all duration-500 ease-out rounded-r-full"
          style={{ width: `${((step+1)/STEPS.length)*100}%` }} />
      </div>

      {/* Step tabs */}
      <div className="bg-white border-b border-border px-5 py-3 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max mx-auto justify-center">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={clsx('flex items-center gap-1.5 transition-all', i===step ? 'opacity-100' : i<step ? 'opacity-70' : 'opacity-30')}>
                <div className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all',
                  i < step ? 'bg-solar text-violet-900' : i===step ? 'bg-violet-700 text-white shadow-violet' : 'bg-violet-100 text-muted'
                )}>{i < step ? '✓' : i+1}</div>
                <span className="font-mono text-xs text-violet-700 hidden sm:block">{s.label}</span>
              </div>
              {i < STEPS.length-1 && <div className={clsx('w-6 h-px', i<step ? 'bg-solar-500' : 'bg-border')} />}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <div className="mb-8 au">
            <h1 className="font-display text-3xl font-bold text-violet-900 mb-2">{currentStep.question}</h1>
            <p className="font-sans text-sm text-muted leading-relaxed">{currentStep.sub}</p>
          </div>

          {/* Step 0: Learning style */}
          {step === 0 && (
            <div className="grid grid-cols-2 gap-4 au">
              {LEARNING_STYLES.map(ls => (
                <button key={ls.id} type="button" onClick={() => setData(d => ({...d, learning_style:ls.id}))}
                  className={clsx('flex flex-col gap-2 p-5 rounded-xl border-2 text-left transition-all',
                    data.learning_style===ls.id ? 'border-violet-600 bg-violet-700 shadow-violet' : 'border-border bg-white hover:border-violet-300'
                  )}>
                  <span className="text-2xl">{ls.icon}</span>
                  <span className={clsx('font-display text-lg font-semibold', data.learning_style===ls.id ? 'text-white' : 'text-violet-900')}>{ls.label}</span>
                  <span className={clsx('font-sans text-xs leading-relaxed', data.learning_style===ls.id ? 'text-violet-200' : 'text-muted')}>{ls.desc}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 1: Experience */}
          {step === 1 && (
            <div className="space-y-3 au">
              {EXPERIENCE_LEVELS.map(el => (
                <button key={el.id} type="button" onClick={() => setData(d => ({...d, experience_level:el.id}))}
                  className={clsx('w-full flex items-center gap-5 p-5 rounded-xl border-2 text-left transition-all',
                    data.experience_level===el.id ? 'border-violet-600 bg-violet-700 shadow-violet' : 'border-border bg-white hover:border-violet-300'
                  )}>
                  <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center font-mono text-sm font-bold flex-shrink-0 transition-all',
                    data.experience_level===el.id ? 'bg-solar text-violet-900' : 'bg-violet-100 text-violet-600'
                  )}>{el.tag}</div>
                  <div>
                    <p className={clsx('font-sans font-semibold text-base', data.experience_level===el.id ? 'text-white' : 'text-violet-900')}>{el.label}</p>
                    <p className={clsx('font-sans text-sm mt-0.5', data.experience_level===el.id ? 'text-violet-200' : 'text-muted')}>{el.desc}</p>
                  </div>
                  {data.experience_level===el.id && <CheckCircle size={18} className="text-solar ml-auto flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Trade */}
          {step === 2 && (
            <div className="au">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {CATEGORIES.map(cat => (
                  <button key={cat} type="button" onClick={() => setData(d => ({...d, industry:cat}))}
                    className={clsx('py-3 px-4 rounded-xl border-2 text-sm font-sans font-semibold transition-all text-left',
                      data.industry===cat ? 'border-violet-600 bg-violet-700 text-white shadow-violet' : 'border-border bg-white text-violet-800 hover:border-violet-300'
                    )}>{cat}</button>
                ))}
              </div>
              <div>
                <label className="field-label">Organization / employer <span className="normal-case font-sans text-muted tracking-normal">(optional)</span></label>
                <input type="text" placeholder="School, company, or institution" value={data.company_name}
                  onChange={e => setData(d => ({...d, company_name:e.target.value}))} className="input" />
              </div>
            </div>
          )}

          {/* Step 3: Goals */}
          {step === 3 && (
            <div className="grid grid-cols-2 gap-3 au">
              {GOALS.map(g => (
                <button key={g} type="button" onClick={() => toggleGoal(g)}
                  className={clsx('py-4 px-4 rounded-xl border-2 text-sm font-sans text-left leading-snug transition-all flex items-start gap-2',
                    data.goals.includes(g) ? 'border-violet-600 bg-violet-700 text-white shadow-violet font-semibold' : 'border-border bg-white text-violet-800 hover:border-violet-300'
                  )}>
                  <div className={clsx('w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all',
                    data.goals.includes(g) ? 'border-solar bg-solar' : 'border-border'
                  )}>
                    {data.goals.includes(g) && <CheckCircle size={10} className="text-violet-900" />}
                  </div>
                  {g}
                </button>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-10">
            <button onClick={() => setStep(s => s-1)} disabled={step===0}
              className="btn-ghost disabled:opacity-0 disabled:pointer-events-none">
              <ArrowLeft size={15} /> Back
            </button>
            {step < STEPS.length-1 ? (
              <button onClick={() => setStep(s => s+1)} disabled={!canNext()} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
                Continue <ArrowRight size={15} />
              </button>
            ) : (
              <button onClick={handleFinish} disabled={!canNext() || loading}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-solar text-violet-900 font-sans font-bold text-sm hover:bg-solar-500 transition-colors shadow-solar disabled:opacity-40 disabled:cursor-not-allowed">
                {loading
                  ? <><div className="w-4 h-4 border-2 border-violet-900/30 border-t-violet-900 rounded-full animate-spin" />Saving…</>
                  : <>Go to my dashboard <ArrowRight size={15} /></>
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
