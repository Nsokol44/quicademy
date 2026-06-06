'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import {
  BookOpen, Send, Upload, Check, X, ArrowLeft, User,
  Mail, FileText, Users, Star, HelpCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const CATEGORIES = [
  'GIS & Geospatial', 'Data Science', 'Python', 'Remote Sensing',
  'Cartography', 'Urban Planning', 'Environmental Science',
  'Statistics', 'Machine Learning', 'Other'
]

const STEPS = ['Your Info', 'About the Book', 'Final Details']

export default function SubmitClient() {
  const supabase = createClient()
  const fileRef  = useRef(null)

  const [step,      setStep]      = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState({
    author_name:        '',
    author_email:       '',
    author_credentials: '',
    author_bio:         '',
    title:              '',
    subtitle:           '',
    description:        '',
    target_audience:    '',
    category:           '',
    why_quicademy:      '',
    sample_url:         '',
    sample_name:        '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File must be under 20MB')
      return
    }
    setUploading(true)
    try {
      const path = `submissions/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error } = await supabase.storage.from('press-assets').upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('press-assets').getPublicUrl(path)
      set('sample_url', publicUrl)
      set('sample_name', file.name)
      toast.success('Sample chapter uploaded!')
    } catch (err) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const validateStep = () => {
    if (step === 0) {
      if (!form.author_name.trim()) { toast.error('Name is required'); return false }
      if (!form.author_email.trim() || !form.author_email.includes('@')) { toast.error('Valid email is required'); return false }
    }
    if (step === 1) {
      if (!form.title.trim()) { toast.error('Book title is required'); return false }
      if (!form.description.trim() || form.description.length < 100) { toast.error('Please write at least 100 characters describing your book'); return false }
    }
    return true
  }

  const nextStep = () => { if (validateStep()) setStep(s => s + 1) }
  const prevStep = () => setStep(s => s - 1)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateStep()) return
    setSaving(true)
    try {
      const { error } = await supabase.from('book_submissions').insert({
        author_name:        form.author_name.trim(),
        author_email:       form.author_email.trim().toLowerCase(),
        author_credentials: form.author_credentials.trim() || null,
        author_bio:         form.author_bio.trim() || null,
        title:              form.title.trim(),
        subtitle:           form.subtitle.trim() || null,
        description:        form.description.trim(),
        target_audience:    form.target_audience.trim() || null,
        category:           form.category || null,
        why_quicademy:      form.why_quicademy.trim() || null,
        sample_url:         form.sample_url || null,
        sample_name:        form.sample_name || null,
        status:             'pending',
      })
      if (error) throw error

      // Notify admin via API
      await fetch('/api/notify-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:        'book_submission',
          authorName:  form.author_name,
          authorEmail: form.author_email,
          bookTitle:   form.title,
        }),
      }).catch(() => {}) // fire and forget

      setSubmitted(true)
    } catch (err) {
      toast.error(err.message || 'Submission failed — please try again')
    } finally {
      setSaving(false)
    }
  }

  // ── Success state ──────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-violet-50 flex items-center justify-center px-5 py-20">
        <div className="max-w-lg w-full text-center">
          <div className="w-20 h-20 rounded-3xl bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-6">
            <Check size={36} className="text-green-500" />
          </div>
          <h1 className="font-display text-3xl font-bold text-violet-900 mb-3">
            Submission received!
          </h1>
          <p className="font-sans text-muted leading-relaxed mb-2">
            Thank you, <strong className="text-violet-900">{form.author_name}</strong>. We've received your submission for <strong className="text-violet-900">"{form.title}"</strong>.
          </p>
          <p className="font-sans text-sm text-muted leading-relaxed mb-8">
            Our editorial team will review your submission and respond to <strong>{form.author_email}</strong> within 2–3 weeks. We read every submission carefully.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/press" className="btn-primary">Browse our books</Link>
            <Link href="/" className="btn-ghost">Go home</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-violet-50">
      {/* Hero */}
      <div className="bg-violet-900 text-white px-5 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-5">
            <BookOpen size={13} className="text-solar-400"/>
            <span className="font-mono text-xs text-solar-300 tracking-wider uppercase">Quicademy Press</span>
          </div>
          <h1 className="font-display text-4xl font-bold mb-4">Submit Your Book</h1>
          <p className="font-sans text-violet-200 leading-relaxed max-w-lg mx-auto">
            We publish practical, expert-authored books in GIS, data science, geospatial technology,
            and applied sciences. Every submission is read by our editorial team.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-12">
        {/* What we look for */}
        <div className="card p-6 mb-8">
          <h2 className="font-display text-lg font-bold text-violet-900 mb-4">What we look for</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { icon: Star,        text: 'Practical expertise — real-world knowledge, not just theory' },
              { icon: Users,       text: 'Clear audience — who specifically benefits from this book' },
              { icon: FileText,    text: 'Original content — not a rehash of existing textbooks' },
              { icon: BookOpen,    text: 'Alignment with our mission — GIS, data, applied tech' },
            ].map(item => (
              <div key={item.text} className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <item.icon size={13} className="text-violet-600"/>
                </div>
                <p className="font-sans text-sm text-violet-800 leading-snug">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm font-bold flex-shrink-0 transition-all',
                i < step  ? 'bg-green-500 text-white' :
                i === step ? 'bg-violet-700 text-white shadow-violet' :
                             'bg-violet-100 text-violet-400'
              )}>
                {i < step ? <Check size={14}/> : i + 1}
              </div>
              <span className={clsx('font-sans text-xs hidden sm:block',
                i === step ? 'text-violet-900 font-semibold' : 'text-muted'
              )}>{label}</span>
              {i < STEPS.length - 1 && (
                <div className={clsx('flex-1 h-0.5 rounded-full transition-all',
                  i < step ? 'bg-green-400' : 'bg-violet-200'
                )}/>
              )}
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="card p-8">
          <h2 className="font-display text-xl font-bold text-violet-900 mb-6">
            {STEPS[step]}
          </h2>

          <form onSubmit={step === 2 ? handleSubmit : e => { e.preventDefault(); nextStep() }}
            className="space-y-5">

            {/* ── Step 0: Author info ── */}
            {step === 0 && (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">Full name *</label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
                      <input className="input pl-9" placeholder="Dr. Jane Smith"
                        value={form.author_name} onChange={e => set('author_name', e.target.value)} required/>
                    </div>
                  </div>
                  <div>
                    <label className="field-label">Email address *</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
                      <input type="email" className="input pl-9" placeholder="you@university.edu"
                        value={form.author_email} onChange={e => set('author_email', e.target.value)} required/>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="field-label">Credentials & qualifications</label>
                  <input className="input" placeholder="e.g. PhD in Geography, 10 years industry experience, author of…"
                    value={form.author_credentials} onChange={e => set('author_credentials', e.target.value)}/>
                  <p className="font-mono text-xs text-muted mt-1">What makes you the right person to write this book?</p>
                </div>
                <div>
                  <label className="field-label">Short bio</label>
                  <textarea className="input resize-none" rows={3}
                    placeholder="A brief professional biography that will appear on the book page if published…"
                    value={form.author_bio} onChange={e => set('author_bio', e.target.value)}/>
                </div>
              </>
            )}

            {/* ── Step 1: Book info ── */}
            {step === 1 && (
              <>
                <div>
                  <label className="field-label">Book title *</label>
                  <input className="input" placeholder="e.g. Mapping the Chaos: Mastering GIS with Python"
                    value={form.title} onChange={e => set('title', e.target.value)} required/>
                </div>
                <div>
                  <label className="field-label">Subtitle</label>
                  <input className="input" placeholder="Optional"
                    value={form.subtitle} onChange={e => set('subtitle', e.target.value)}/>
                </div>
                <div>
                  <label className="field-label">Category</label>
                  <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                    <option value="">— Select a category —</option>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">
                    What is this book about? *
                    <span className="font-mono text-xs text-muted ml-2 font-normal">min. 100 characters</span>
                  </label>
                  <textarea className="input resize-none" rows={5}
                    placeholder="Describe your book in detail. What topics does it cover? What will readers learn? What's the structure? What makes it different from existing books on this topic?"
                    value={form.description} onChange={e => set('description', e.target.value)} required/>
                  <p className={clsx('font-mono text-xs mt-1',
                    form.description.length < 100 ? 'text-muted' : 'text-green-600'
                  )}>{form.description.length} / 100 minimum</p>
                </div>
                <div>
                  <label className="field-label">Who is the target audience?</label>
                  <input className="input" placeholder="e.g. Geography students, GIS professionals, data scientists new to spatial analysis"
                    value={form.target_audience} onChange={e => set('target_audience', e.target.value)}/>
                </div>
              </>
            )}

            {/* ── Step 2: Final details ── */}
            {step === 2 && (
              <>
                <div>
                  <label className="field-label">Why Quicademy Press?</label>
                  <textarea className="input resize-none" rows={4}
                    placeholder="Why is Quicademy Press the right home for this book? How does it align with our mission of expert-led, practical education?"
                    value={form.why_quicademy} onChange={e => set('why_quicademy', e.target.value)}/>
                </div>

                <div>
                  <label className="field-label">Sample chapter (PDF, max 20MB)</label>
                  <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleUpload}/>

                  {form.sample_url ? (
                    <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Check size={18} className="text-green-600"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-sans text-sm font-semibold text-green-800">Sample uploaded</p>
                        <p className="font-mono text-xs text-green-600 truncate">{form.sample_name}</p>
                      </div>
                      <button type="button" onClick={() => { set('sample_url', ''); set('sample_name', '') }}
                        className="text-green-400 hover:text-red-500 transition-colors">
                        <X size={16}/>
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="w-full flex items-center gap-3 p-5 border-2 border-dashed border-violet-200 rounded-xl hover:border-violet-400 hover:bg-violet-50/50 transition-all text-left">
                      {uploading ? (
                        <>
                          <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                            <div className="w-5 h-5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin"/>
                          </div>
                          <div>
                            <p className="font-sans text-sm font-semibold text-violet-900">Uploading…</p>
                            <p className="font-mono text-xs text-muted">Please wait</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                            <Upload size={18} className="text-violet-500"/>
                          </div>
                          <div>
                            <p className="font-sans text-sm font-semibold text-violet-900">Upload a sample chapter</p>
                            <p className="font-mono text-xs text-muted">PDF only · max 20MB · optional but strongly recommended</p>
                          </div>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Summary */}
                <div className="bg-violet-50 rounded-xl p-5 border border-violet-200 space-y-2">
                  <p className="font-mono text-xs text-muted uppercase tracking-wider mb-3">Submission summary</p>
                  {[
                    ['Author',   form.author_name],
                    ['Email',    form.author_email],
                    ['Book',     form.title + (form.subtitle ? ` — ${form.subtitle}` : '')],
                    ['Category', form.category || 'Not specified'],
                    ['Sample',   form.sample_name || 'Not provided'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-start gap-3">
                      <span className="font-mono text-xs text-muted w-20 flex-shrink-0">{label}</span>
                      <span className="font-sans text-sm text-violet-900 truncate">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-2 p-3 bg-violet-50 rounded-lg border border-violet-200">
                  <HelpCircle size={14} className="text-violet-400 flex-shrink-0 mt-0.5"/>
                  <p className="font-sans text-xs text-muted leading-relaxed">
                    By submitting, you confirm this is your original work. We will respond to your email within 2–3 weeks.
                    Submission does not guarantee publication.
                  </p>
                </div>
              </>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              {step > 0 ? (
                <button type="button" onClick={prevStep} className="btn-ghost">
                  <ArrowLeft size={14}/> Back
                </button>
              ) : (
                <Link href="/press" className="btn-ghost">
                  <ArrowLeft size={14}/> Back to Press
                </Link>
              )}

              {step < 2 ? (
                <button type="submit" className="btn-primary">
                  Continue →
                </button>
              ) : (
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Submitting…</>
                    : <><Send size={14}/> Submit for review</>
                  }
                </button>
              )}
            </div>
          </form>
        </div>

        {/* FAQ */}
        <div className="mt-8 space-y-4">
          <h3 className="font-display text-lg font-bold text-violet-900">Common questions</h3>
          {[
            ['Do I need to be a Quicademy instructor to submit?', 'No. Anyone with genuine expertise and a compelling manuscript is welcome to submit.'],
            ['How long does the review process take?', 'We aim to respond within 2–3 weeks. If your submission is under serious consideration, we may reach out sooner with questions.'],
            ['What happens after approval?', 'We will contact you by email to discuss the publishing agreement, timeline, cover design, and pricing.'],
            ['Can I submit a book that is already published elsewhere?', 'We only publish original manuscripts or significantly revised editions with new rights. Previously published books require discussion.'],
          ].map(([q, a]) => (
            <div key={q} className="card p-5">
              <p className="font-sans font-semibold text-sm text-violet-900 mb-1">{q}</p>
              <p className="font-sans text-sm text-muted leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
