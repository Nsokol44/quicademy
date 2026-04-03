import Link from 'next/link'
import { BookOpen, Clock, CheckCircle, Mail } from 'lucide-react'

export const metadata = { title: 'Application Under Review' }

export default function InstructorPendingPage() {
  return (
    <div className="min-h-screen bg-violet-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        <div className="card p-10">
          <div className="w-16 h-16 rounded-2xl bg-solar flex items-center justify-center mx-auto mb-6 shadow-solar">
            <Clock size={28} className="text-violet-900" />
          </div>

          <h1 className="font-display text-3xl font-bold text-violet-900 mb-3">
            Application Received
          </h1>
          <p className="font-sans text-sm text-muted leading-relaxed mb-8">
            Your instructor application is under review by the Quicademy team. We vet all instructors personally to ensure the highest quality for our students.
          </p>

          <div className="space-y-3 text-left mb-8">
            {[
              { icon: CheckCircle, label: 'Application submitted', done: true },
              { icon: Clock,       label: 'Team review (1–3 business days)', done: false },
              { icon: Mail,        label: 'Approval email sent to you', done: false },
              { icon: BookOpen,    label: 'Build your first course', done: false },
            ].map(({ icon: Icon, label, done }) => (
              <div key={label} className={`flex items-center gap-3 p-3 rounded-lg ${done ? 'bg-green-50' : 'bg-violet-50'}`}>
                <Icon size={16} className={done ? 'text-green-600' : 'text-violet-300'} />
                <span className={`font-sans text-sm ${done ? 'text-green-800 font-medium' : 'text-muted'}`}>{label}</span>
              </div>
            ))}
          </div>

          <div className="bg-solar-50 border border-solar-200 rounded-xl p-4 mb-6">
            <p className="font-sans text-sm text-solar-800 leading-relaxed">
              <strong>Questions?</strong> Email us at{' '}
              <a href="mailto:instructors@quicademy.com" className="text-violet-700 font-semibold hover:underline">
                instructors@quicademy.com
              </a>
            </p>
          </div>

          <Link href="/courses" className="btn-ghost text-sm mx-auto">
            Browse courses while you wait
          </Link>
        </div>
      </div>
    </div>
  )
}
