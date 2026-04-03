import Link from 'next/link'
import { ArrowRight, BarChart2, Users, Shield, Clock, CheckCircle, Zap, Award } from 'lucide-react'

export const metadata = {
  title: 'Quicademy for Business',
  description: 'Train your team with AI-personalized courses and live expert sessions. Real-time dashboards, compliance tracking, and measurable outcomes.',
}

const FEATURES = [
  { icon: BarChart2, title: 'Team dashboards', desc: 'Real-time visibility into every learner\'s progress, completion rates, and skill milestones across your entire workforce.' },
  { icon: Shield,    title: 'Compliance tracking', desc: 'Monitor required training completion, certification expiry dates, and generate audit-ready reports in one click.' },
  { icon: Users,     title: 'Bulk enrollment', desc: 'Onboard cohorts instantly. Assign learning paths by role, department, or location and set completion deadlines.' },
  { icon: Zap,       title: 'AI-personalized delivery', desc: 'Each employee gets content tailored to how they learn — not a one-size-fits-all video queue.' },
  { icon: Clock,     title: 'Async + live learning', desc: 'Self-paced modules for flexibility, plus scheduled live expert sessions when group instruction is needed.' },
  { icon: Award,     title: 'Verifiable credentials', desc: 'Employees earn stackable credentials tied to real competencies. Exportable to HR systems and LinkedIn.' },
]

const PLANS = [
  {
    name: 'Team',
    price: '$29',
    per: 'per seat / month',
    desc: 'For growing teams up to 50 people',
    features: ['Unlimited course access', 'AI-personalized paths', 'Team dashboard', 'Progress reporting', 'Email support'],
    cta: 'Start free trial',
    highlight: false,
  },
  {
    name: 'Business',
    price: '$22',
    per: 'per seat / month (billed annually)',
    desc: 'For organizations up to 500 people',
    features: ['Everything in Team', 'Live expert sessions', 'Compliance tracking', 'Bulk enrollment', 'Custom learning paths', 'Priority support'],
    cta: 'Contact sales',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    per: 'volume pricing',
    desc: 'For large or complex organizations',
    features: ['Everything in Business', 'SSO / SAML integration', 'Custom content upload', 'Dedicated account manager', 'SLA guarantee', 'White-label option'],
    cta: 'Talk to us',
    highlight: false,
  },
]

export default function ForBusinessPage() {
  return (
    <div className="min-h-screen bg-violet-50">
      {/* Header */}
      <div className="bg-violet-900 text-white py-20 px-5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 48px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 48px)' }} />
        <div className="absolute top-0 right-0 w-96 h-96 opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #f5c842 0%, transparent 70%)', transform: 'translate(30%,-30%)' }} />
        <div className="relative max-w-3xl mx-auto">
          <p className="font-mono text-xs text-violet-400 uppercase tracking-widest mb-4">For Organizations</p>
          <h1 className="font-display text-5xl font-bold mb-5 leading-tight">
            Train smarter.<br />
            <span className="italic" style={{ color: '#f5c842' }}>Measure everything.</span>
          </h1>
          <p className="font-sans text-lg text-violet-200 leading-relaxed mb-8 max-w-xl">
            Quicademy gives your L&amp;D team AI-personalized learning at scale, with the real-time visibility and expert instruction that generic LMS platforms can't match.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/auth/register" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-solar text-violet-900 font-bold font-sans text-sm hover:bg-solar-500 transition-colors shadow-solar">
              Start free trial <ArrowRight size={16} />
            </Link>
            <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg border border-white/25 text-white font-sans text-sm hover:bg-white/10 transition-colors">
              Talk to sales
            </Link>
          </div>
        </div>
      </div>

      {/* Features grid */}
      <section className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl font-bold text-violet-900">Everything your organization needs</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="card p-6">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-4">
                  <f.icon size={18} className="text-violet-600" />
                </div>
                <h3 className="font-display text-lg font-semibold text-violet-900 mb-2">{f.title}</h3>
                <p className="font-sans text-sm text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl font-bold text-violet-900 mb-3">Simple, transparent pricing</h2>
            <p className="font-sans text-sm text-muted">All plans include a 14-day free trial. No credit card required.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map(plan => (
              <div key={plan.name} className={`card p-7 flex flex-col ${plan.highlight ? 'border-violet-600 ring-2 ring-violet-600 ring-offset-2' : ''}`}>
                {plan.highlight && (
                  <div className="badge-solar text-xs mb-4 self-start">Most popular</div>
                )}
                <p className="font-mono text-xs text-violet-500 uppercase tracking-widest mb-2">{plan.name}</p>
                <div className="mb-1">
                  <span className="font-display text-4xl font-bold text-violet-900">{plan.price}</span>
                </div>
                <p className="font-mono text-xs text-muted mb-2">{plan.per}</p>
                <p className="font-sans text-sm text-muted mb-6">{plan.desc}</p>
                <ul className="space-y-2.5 flex-1 mb-7">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle size={14} className="text-violet-500 mt-0.5 flex-shrink-0" />
                      <span className="font-sans text-sm text-violet-800">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/contact"
                  className={`w-full text-center py-3 rounded-lg font-sans font-semibold text-sm transition-colors ${plan.highlight ? 'bg-violet-700 text-white hover:bg-violet-800 shadow-violet' : 'border border-violet-300 text-violet-700 hover:bg-violet-50'}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-solar py-16 px-5 text-center">
        <h2 className="font-display text-3xl font-bold text-violet-900 mb-3">Ready to get started?</h2>
        <p className="font-sans text-violet-800 mb-7 max-w-lg mx-auto">Join organizations using Quicademy to develop their teams faster, with measurably better outcomes.</p>
        <Link href="/contact" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-violet-900 text-white font-bold font-sans text-sm hover:bg-violet-800 transition-colors">
          Schedule a demo <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  )
}
