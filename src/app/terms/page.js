export const metadata = { title: 'Terms of Service', description: 'Terms and conditions for using Quicademy.' }

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-violet-50 py-20 px-5">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-4xl font-bold text-violet-900 mb-2">Terms of Service</h1>
        <p className="font-mono text-xs text-muted mb-10">Last updated: April 2026</p>
        <div className="card p-10 space-y-8 font-sans text-violet-800">
          {[
            { title: 'Acceptance of terms', body: 'By creating an account or using Quicademy, you agree to these Terms of Service. If you do not agree, please do not use the platform.' },
            { title: 'Account responsibilities', body: 'You are responsible for maintaining the security of your account credentials. You must not share your account or use the platform for any unlawful purpose.' },
            { title: 'Content and intellectual property', body: 'Course content on Quicademy is owned by the respective instructors or Quicademy. You may not reproduce, distribute, or resell any content without explicit written permission.' },
            { title: 'Instructor conduct', body: 'Instructors agree to provide accurate credentials and honest representations of their expertise. Misrepresentation may result in immediate account termination.' },
            { title: 'Payments and refunds', body: 'Paid courses are subject to a 30-day money-back guarantee. Refund requests must be submitted within 30 days of purchase.' },
            { title: 'Limitation of liability', body: 'Quicademy provides educational content for informational purposes. We are not liable for decisions made based on information learned through the platform.' },
            { title: 'Changes to terms', body: 'We may update these terms periodically. Continued use of the platform after changes constitutes acceptance.' },
            { title: 'Contact', body: 'For legal inquiries, contact legal@quicademy.com.' },
          ].map(s => (
            <div key={s.title}>
              <h2 className="font-display text-xl font-semibold text-violet-900 mb-2">{s.title}</h2>
              <p className="text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
