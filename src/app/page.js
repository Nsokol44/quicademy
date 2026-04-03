import Link from 'next/link'
import { ArrowRight, CheckCircle, Users, Zap, Award, Star, Shield, Clock, ChevronRight, Trophy, BookOpen, Sparkles } from 'lucide-react'
import HeroTypewriter from '@/components/ui/HeroTypewriter'
import LiveDemoChat from '@/components/ui/LiveDemoChat'

export const metadata = {
  title: 'Quicademy — Expert-Led Education',
  description: 'AI-powered education combining expert human instruction with personalized learning. Proven to improve retention by up to 72%.',
}

const STATS = [
  { value: '72%', label: 'Better knowledge retention', icon: Trophy },
  { value: '5×',  label: 'Faster to job-ready skills', icon: Zap },
  { value: '840+', label: 'Certified graduates', icon: Award },
  { value: '48 hr', label: 'Expert feedback turnaround', icon: Clock },
]

const VALUE_PROPS = [
  {
    icon: Sparkles,
    title: 'AI That Knows How You Learn',
    desc: 'Our intake assessment maps your cognitive style — visual, auditory, hands-on, or reading — and the AI builds your personal learning sequence from day one.',
    accent: 'bg-violet-100 text-violet-600',
  },
  {
    icon: Users,
    title: 'Live Expert Rooms',
    desc: 'Join live sessions where a vetted expert instructor, the AI, and your peers are all in the room together. Ask anything. Get real answers, fast.',
    accent: 'bg-solar-100 text-solar-700',
  },
  {
    icon: Shield,
    title: 'Vetted Instructors Only',
    desc: 'Every instructor passes a credential review before they teach. Subject-matter experts, not content farms. Real experience, real accountability.',
    accent: 'bg-violet-100 text-violet-600',
  },
  {
    icon: Award,
    title: 'Earn Stackable Credentials',
    desc: 'Complete modules and earn verifiable badges tied to real competencies that employers and institutions recognize.',
    accent: 'bg-solar-100 text-solar-700',
  },
]

const HOW_IT_WORKS = [
  { num: '01', title: 'Tell us how you learn', desc: 'A short, adaptive intake reveals your cognitive style and experience level in under 3 minutes.' },
  { num: '02', title: 'Follow your custom path', desc: 'The AI sequences video, scenario, text, or hands-on content specifically for how your brain absorbs information.' },
  { num: '03', title: 'Learn with real experts', desc: 'Join live rooms, get AI answers instantly, and receive expert human review for anything complex.' },
  { num: '04', title: 'Earn credentials that matter', desc: 'Graduate with stackable, verifiable credentials employers and licensing bodies recognize.' },
]

const TESTIMONIALS = [
  {
    text: 'I went from zero knowledge to passing my certification exam on the first try. The live rooms are unlike anything I\'ve seen in online education.',
    name: 'Marcus T.',
    role: 'Software Engineer',
    company: 'Nashville, TN',
    stars: 5,
  },
  {
    text: 'We onboarded 14 new hires using Quicademy. Completion rates up 60% vs our old LMS, and the employer dashboard saves us hours every month.',
    name: 'Diane R.',
    role: 'HR Director',
    company: 'Apex Services Group',
    stars: 5,
  },
  {
    text: 'Finally a platform that understood I learn by doing, not reading slides. The scenario simulations are exactly how I needed to absorb this material.',
    name: 'Carlos M.',
    role: 'Nursing Student',
    company: 'University of Tennessee',
    stars: 5,
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ── HERO ──────────────────────────────────── */}
      <section className="relative bg-violet-900 text-white overflow-hidden">
        {/* Grid texture */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 48px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 48px)' }} />
        {/* Glow blobs */}
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #f5c842 0%, transparent 70%)' }} />
        <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #9d7dd4 0%, transparent 70%)' }} />

        <div className="relative max-w-7xl mx-auto px-5 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="max-w-3xl">
            <HeroTypewriter />

            <p className="au-2 font-sans text-lg text-violet-200 leading-relaxed max-w-xl mb-10">
              Most platforms give you AI <em>or</em> a human expert. Quicademy gives you both — simultaneously. Vetted instructors and AI work together in every session, so you get machine speed and human depth in one place.
            </p>

            <div className="au-3 flex flex-wrap items-center gap-4">
              <Link href="/auth/register"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-solar text-violet-900 font-sans font-bold text-sm hover:bg-solar-500 transition-colors shadow-solar">
                Start learning free <ArrowRight size={16} />
              </Link>
              <Link href="/for-business"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg border border-white/25 text-white font-sans font-medium text-sm hover:bg-white/10 transition-colors">
                Enroll your team <ChevronRight size={15} />
              </Link>
            </div>

            <div className="au-4 flex flex-wrap items-center gap-6 mt-10 pt-10 border-t border-white/10">
              {['No credit card required', 'Vetted expert instructors', 'Every subject, every level'].map(t => (
                <div key={t} className="flex items-center gap-2">
                  <CheckCircle size={13} className="text-solar-400" />
                  <span className="font-sans text-xs text-violet-300">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="bg-solar">
        <div className="max-w-7xl mx-auto px-5 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map(({ value, label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-violet-900/15 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-violet-900" />
                </div>
                <div>
                  <div className="font-display text-3xl font-bold text-violet-900">{value}</div>
                  <div className="font-sans text-xs text-violet-800 leading-tight mt-0.5">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VALUE PROPS ── */}
      <section className="py-24 bg-violet-50">
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="eyebrow justify-center mb-4">
              <span className="w-8 h-px bg-violet-400" />Why Quicademy<span className="w-8 h-px bg-violet-400" />
            </div>
            <h2 className="font-display text-4xl font-bold text-violet-900 leading-tight mb-4">
              Built for <em className="text-solar-600 not-italic">everyone who learns</em>
            </h2>
            <p className="font-sans text-base text-muted leading-relaxed">
              Generic LMS platforms weren't designed for real learning outcomes. Quicademy was built from the ground up for people who need to apply knowledge immediately — not just pass a test.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {VALUE_PROPS.map((vp, i) => (
              <div key={vp.title} className={`card p-8 ${i === 0 ? 'md:row-span-1' : ''}`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${vp.accent}`}>
                  <vp.icon size={20} />
                </div>
                <h3 className="font-display text-xl font-semibold text-violet-900 mb-3">{vp.title}</h3>
                <p className="font-sans text-sm text-muted leading-relaxed">{vp.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="eyebrow justify-center mb-4">
              <span className="w-8 h-px bg-violet-400" />The Method<span className="w-8 h-px bg-violet-400" />
            </div>
            <h2 className="font-display text-4xl font-bold text-violet-900 leading-tight">
              Your journey, step by step
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map((s, i) => (
              <div key={s.num} className="relative">
                {i < 3 && (
                  <div className="hidden md:block absolute top-6 left-1/2 w-full h-px border-t-2 border-dashed border-violet-200 z-0" />
                )}
                <div className="relative text-center">
                  <div className="w-12 h-12 rounded-full bg-violet-700 text-white font-mono font-bold text-sm flex items-center justify-center mx-auto mb-5 shadow-violet relative z-10">
                    {s.num}
                  </div>
                  <h3 className="font-display text-lg font-semibold text-violet-900 mb-2">{s.title}</h3>
                  <p className="font-sans text-sm text-muted leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE DEMO ── */}
      <section className="py-24 bg-violet-50">
        <div className="max-w-7xl mx-auto px-5">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: copy */}
            <div>
              <div className="eyebrow mb-4">
                <span className="w-8 h-px bg-violet-400" />See It In Action
              </div>
              <h2 className="font-display text-4xl font-bold text-violet-900 leading-tight mb-5">
                AI answers instantly.<br />
                <span className="text-solar-600">Experts add what AI can't.</span>
              </h2>
              <p className="font-sans text-base text-muted leading-relaxed mb-6">
                When a student asks a question, the AI responds in seconds with accurate, structured information. Then the instructor steps in — adding real-world context, lived experience, and the nuance that only a human expert can provide.
              </p>
              <div className="space-y-3">
                {[
                  { icon: Zap,    label: 'AI responds in under 2 seconds, 24/7' },
                  { icon: Users,  label: 'Instructor adds job-site context and experience' },
                  { icon: Shield, label: 'Both work together — not instead of each other' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <Icon size={15} className="text-violet-600" />
                    </div>
                    <span className="font-sans text-sm text-violet-800">{label}</span>
                  </div>
                ))}
              </div>
              <Link href="/auth/register" className="btn-primary mt-8 inline-flex">
                Try it yourself <ArrowRight size={15} />
              </Link>
            </div>
            {/* Right: demo chat */}
            <div className="rounded-2xl shadow-card-lg overflow-hidden border border-border">
              <LiveDemoChat />
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 bg-violet-50">
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center max-w-xl mx-auto mb-16">
            <div className="eyebrow justify-center mb-4">
              <span className="w-8 h-px bg-violet-400" />Real Results<span className="w-8 h-px bg-violet-400" />
            </div>
            <h2 className="font-display text-4xl font-bold text-violet-900">From people like you</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="card p-6 hover:shadow-card-lg transition-shadow">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(t.stars)].map((_, i) => (
                    <Star key={i} size={14} className="text-solar-500 fill-solar-500" />
                  ))}
                </div>
                <blockquote className="font-sans text-sm text-violet-900 leading-relaxed mb-6 italic">
                  "{t.text}"
                </blockquote>
                <div className="border-t border-border pt-4">
                  <p className="font-sans font-semibold text-sm text-violet-900">{t.name}</p>
                  <p className="font-mono text-xs text-violet-500 mt-0.5">{t.role}</p>
                  <p className="font-mono text-xs text-violet-300 mt-0.5">{t.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRIDE CTA ── */}
      <section className="py-24 bg-violet-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 48px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 48px)' }} />
        <div className="absolute top-0 right-0 w-96 h-96 opacity-20 rounded-full"
          style={{ background: 'radial-gradient(circle, #f5c842 0%, transparent 70%)', transform: 'translate(30%,-30%)' }} />
        <div className="relative max-w-4xl mx-auto px-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-solar flex items-center justify-center mx-auto mb-8 shadow-solar">
            <Trophy size={28} className="text-violet-900" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Your team deserves{' '}
            <span className="italic" style={{ color: '#f5c842' }}>world-class</span>{' '}
            education.
          </h2>
          <p className="font-sans text-base text-violet-300 max-w-xl mx-auto mb-10 leading-relaxed">
            Quicademy's employer dashboard gives you real-time visibility into your team's progress, completion rates, and skill development — without the overhead of in-person sessions.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/auth/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-solar text-violet-900 font-bold font-sans text-sm hover:bg-solar-500 transition-colors shadow-solar">
              Create your free account <ArrowRight size={16} />
            </Link>
            <Link href="/auth/register?role=instructor"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-lg border border-white/25 text-white font-sans font-medium text-sm hover:bg-white/10 transition-colors">
              Teach on Quicademy
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-violet-950 text-violet-400 py-14">
        <div className="max-w-7xl mx-auto px-5">
          <div className="flex flex-col md:flex-row justify-between gap-10 mb-12">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-violet-700 flex items-center justify-center">
                  <BookOpen size={13} className="text-white" />
                </div>
                <span className="font-display font-bold text-white text-lg">Quica<span className="text-solar-400">demy</span></span>
              </div>
              <p className="font-sans text-xs leading-relaxed">Expert-led education powered by AI personalization and human expertise.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-xs font-sans">
              {[
                { title: 'Platform', links: [['Courses','/courses'],['How It Works','/how-it-works'],['For Business','/for-business']] },
                { title: 'Account',  links: [['Sign up','/auth/register'],['Sign in','/auth/login'],['Become an Instructor','/auth/register?role=instructor']] },
                { title: 'Company',  links: [['About','/about'],['Blog','/blog'],['Contact','/contact']] },
                { title: 'Legal',    links: [['Privacy','/privacy'],['Terms','/terms']] },
              ].map(col => (
                <div key={col.title}>
                  <p className="font-mono font-medium text-violet-500 uppercase tracking-wider mb-3 text-xs">{col.title}</p>
                  <div className="space-y-2">
                    {col.links.map(([label, href]) => (
                      <div key={label}><Link href={href} className="hover:text-white transition-colors">{label}</Link></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-violet-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-3">
            <p className="font-mono text-xs">© 2026 Quicademy. All rights reserved.</p>
            <p className="font-mono text-xs">Built for people who never stop learning.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
