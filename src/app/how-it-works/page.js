import Link from 'next/link'
import { ArrowRight, Zap, Users, Brain, Award, MessageCircle, BarChart2, Shield } from 'lucide-react'

export const metadata = {
  title: 'How It Works',
  description: 'Learn how Quicademy combines AI personalization with live human expertise to deliver measurably better learning outcomes.',
}

const STEPS = [
  {
    num: '01', icon: Brain,
    title: 'We assess how you learn',
    desc: 'Before you open a single lesson, Quicademy runs a short adaptive intake — not a quiz, but a guided experience that identifies your cognitive style, experience level, and subject focus. This takes under 3 minutes.',
    detail: 'We look for four patterns: visual learners absorb diagrams and demonstrations best; auditory learners prefer lectures and discussion; reading learners thrive with structured text; kinesthetic learners need scenarios and hands-on exercises.',
  },
  {
    num: '02', icon: Zap,
    title: 'AI builds your personal learning path',
    desc: "Our AI doesn't just recommend courses — it assembles the actual content delivery for each module around your profile. The same lesson is served differently depending on how you learn.",
    detail: 'A visual learner gets annotated diagrams and video walkthroughs first. A kinesthetic learner gets a scenario simulation. A reading learner gets the structured text reference. Same knowledge, different delivery — proven to improve retention by up to 72%.',
  },
  {
    num: '03', icon: MessageCircle,
    title: 'Ask anything, get answered instantly',
    desc: 'The AI responds to student questions in real time, 24/7 — no waiting for office hours. It draws on the course context, your learning history, and the current module to give precise, relevant answers.',
    detail: 'The AI is calibrated to be concise but thorough, to use real examples, and to flag when a question warrants human expert input. It never pretends to know what it doesn\'t.',
  },
  {
    num: '04', icon: Users,
    title: 'Live expert sessions deepen understanding',
    desc: 'Every course has scheduled live rooms where the instructor, AI, and students interact simultaneously. The AI handles volume; the instructor provides lived experience, judgment, and nuance.',
    detail: 'Students can also request private 1-on-1 sessions with instructors for personal guidance. These sessions are AI-assisted but instructor-led — the best of both worlds.',
  },
  {
    num: '05', icon: Award,
    title: 'Earn credentials that mean something',
    desc: 'Complete modules and earn stackable, verifiable credentials tied to specific competencies — not just course completion certificates.',
    detail: 'Credentials are linked to your profile and shareable with employers. Organizations using Quicademy for team training can view credential status across their entire workforce.',
  },
]

const FOR_ORGS = [
  { icon: BarChart2, title: 'Real-time dashboards', desc: 'Track every learner\'s progress, completion rates, and skill gaps across your entire team from one view.' },
  { icon: Shield,    title: 'Compliance tracking', desc: 'Know exactly who has completed required training and when certifications need renewal.' },
  { icon: Users,     title: 'Bulk enrollment',     desc: 'Onboard entire cohorts at once, assign learning paths by role, and set completion deadlines.' },
]

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-violet-50">
      {/* Header */}
      <div className="bg-violet-900 text-white py-20 px-5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 48px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 48px)' }} />
        <div className="relative max-w-3xl mx-auto text-center">
          <p className="font-mono text-xs text-violet-400 uppercase tracking-widest mb-4">The Method</p>
          <h1 className="font-display text-5xl font-bold mb-5 leading-tight">How Quicademy works</h1>
          <p className="font-sans text-lg text-violet-200 leading-relaxed">
            Most platforms deliver content. Quicademy delivers understanding — by combining AI speed with human depth at every step.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="max-w-4xl mx-auto px-5 py-20 space-y-16">
        {STEPS.map((step, i) => (
          <div key={step.num} className="grid md:grid-cols-[80px_1fr] gap-8 items-start">
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-violet-700 flex items-center justify-center shadow-violet">
                <step.icon size={22} className="text-white" />
              </div>
              <span className="font-mono text-xs text-muted">{step.num}</span>
              {i < STEPS.length - 1 && <div className="w-px flex-1 bg-border min-h-[40px]" />}
            </div>
            <div className="card p-7">
              <h2 className="font-display text-2xl font-bold text-violet-900 mb-3">{step.title}</h2>
              <p className="font-sans text-base text-violet-800 leading-relaxed mb-4">{step.desc}</p>
              <p className="font-sans text-sm text-muted leading-relaxed border-t border-border pt-4">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* For organizations */}
      <section className="bg-white py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-mono text-xs text-violet-500 uppercase tracking-widest mb-3">For Organizations</p>
            <h2 className="font-display text-3xl font-bold text-violet-900">Everything your L&amp;D team needs</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {FOR_ORGS.map(item => (
              <div key={item.title} className="card p-6">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-4">
                  <item.icon size={18} className="text-violet-600" />
                </div>
                <h3 className="font-display text-lg font-semibold text-violet-900 mb-2">{item.title}</h3>
                <p className="font-sans text-sm text-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-violet-900 py-20 px-5 text-white text-center">
        <h2 className="font-display text-4xl font-bold mb-4">Ready to see the difference?</h2>
        <p className="font-sans text-violet-300 mb-8 max-w-lg mx-auto">Start free — no credit card required. Your personalized learning path is built the moment you complete onboarding.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/auth/register" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-solar text-violet-900 font-bold font-sans text-sm hover:bg-solar-500 transition-colors shadow-solar">
            Get started free <ArrowRight size={16} />
          </Link>
          <Link href="/for-business" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg border border-white/25 text-white font-sans text-sm hover:bg-white/10 transition-colors">
            For organizations
          </Link>
        </div>
      </section>
    </div>
  )
}
