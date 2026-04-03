import Link from 'next/link'
import { ArrowRight, BookOpen, Zap, Users, Heart } from 'lucide-react'

export const metadata = {
  title: 'About Quicademy',
  description: 'Learn about Quicademy\'s mission to combine human expertise with AI-personalized learning to improve education outcomes for everyone.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-violet-50">
      <div className="bg-violet-900 text-white py-20 px-5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 48px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 48px)' }} />
        <div className="relative max-w-3xl mx-auto">
          <p className="font-mono text-xs text-violet-400 uppercase tracking-widest mb-4">Our Story</p>
          <h1 className="font-display text-5xl font-bold leading-tight mb-5">
            We believe education should work as hard as you do.
          </h1>
          <p className="font-sans text-lg text-violet-200 leading-relaxed">
            Quicademy was founded on a single observation: AI can answer questions faster than any human, but it can't replace the judgment, experience, and mentorship that real experts provide. We built the platform that combines both.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-20 space-y-16">
        <section className="card p-10">
          <h2 className="font-display text-3xl font-bold text-violet-900 mb-5">The problem we're solving</h2>
          <div className="space-y-4 font-sans text-base text-violet-800 leading-relaxed">
            <p>Online learning has been broken for a long time. Most platforms are just video libraries — passive, one-size-fits-all, and designed more for completion metrics than actual understanding.</p>
            <p>Meanwhile, AI tutoring tools are fast and scalable, but lack the lived experience that makes knowledge stick. Telling someone <em>what</em> is true is different from helping them understand <em>why it matters</em> and <em>how to apply it</em> in the real world.</p>
            <p>Quicademy bridges that gap. Our platform puts a vetted human expert and an AI assistant in the same room as the learner — simultaneously — so every question gets both the precise answer and the real-world context.</p>
          </div>
        </section>

        <section>
          <h2 className="font-display text-3xl font-bold text-violet-900 mb-8">What we stand for</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { icon: BookOpen, title: 'Learning that sticks', desc: 'We design around retention, not just completion. Every module is built to change how someone thinks, not just what they know.' },
              { icon: Zap,      title: 'Speed without sacrifice', desc: 'AI makes learning faster. Human expertise makes it deeper. We refuse to choose between the two.' },
              { icon: Users,    title: 'Community over content', desc: 'The best learning happens in relationship. Live rooms, peer interaction, and instructor mentorship are core — not optional add-ons.' },
              { icon: Heart,    title: 'Access for everyone', desc: 'Great education shouldn\'t require a prestigious institution or an expensive tutor. Quicademy brings both together, affordably.' },
            ].map(item => (
              <div key={item.title} className="card p-6">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-4">
                  <item.icon size={18} className="text-violet-600" />
                </div>
                <h3 className="font-display text-lg font-semibold text-violet-900 mb-2">{item.title}</h3>
                <p className="font-sans text-sm text-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-violet-900 rounded-2xl p-10 text-white text-center">
          <h2 className="font-display text-3xl font-bold mb-4">Join us</h2>
          <p className="font-sans text-violet-300 max-w-md mx-auto mb-7 leading-relaxed">
            Whether you're a learner, an expert with knowledge to share, or an organization looking to develop your team — there's a place for you at Quicademy.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/auth/register" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-solar text-violet-900 font-bold font-sans text-sm hover:bg-solar-500 transition-colors shadow-solar">
              Start learning <ArrowRight size={16} />
            </Link>
            <Link href="/auth/register?role=instructor" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg border border-white/25 text-white font-sans text-sm hover:bg-white/10 transition-colors">
              Become an instructor
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
