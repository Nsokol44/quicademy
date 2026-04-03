export const metadata = { title: 'Privacy Policy', description: 'How Quicademy collects, uses, and protects your personal data.' }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-violet-50 py-20 px-5">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-4xl font-bold text-violet-900 mb-2">Privacy Policy</h1>
        <p className="font-mono text-xs text-muted mb-10">Last updated: April 2026</p>
        <div className="card p-10 space-y-8 font-sans text-violet-800 leading-relaxed">
          {[
            { title: 'Information we collect', body: 'We collect information you provide directly — such as your name, email address, and learning preferences when you create an account or complete onboarding. We also collect usage data including pages visited, courses accessed, and session activity to improve the platform.' },
            { title: 'How we use your information', body: 'Your information is used to personalise your learning experience, communicate with you about your account, improve our platform, and (with your consent) send you educational content and product updates. We never sell your personal data to third parties.' },
            { title: 'Data sharing', body: 'We share data with service providers who help operate Quicademy (such as our cloud database and email provider), under strict confidentiality agreements. Instructors may see aggregate engagement data for their courses, but never individual student identifiable information without consent.' },
            { title: 'Data retention', body: 'We retain your account data for as long as your account is active. You may request deletion of your account and associated data at any time by contacting hello@quicademy.com.' },
            { title: 'Cookies', body: 'Quicademy uses cookies for authentication and session management. We do not use third-party advertising cookies.' },
            { title: 'Your rights', body: 'You have the right to access, correct, or delete your personal data at any time. Contact hello@quicademy.com for any data requests.' },
            { title: 'Contact', body: 'For privacy-related questions, contact us at privacy@quicademy.com.' },
          ].map(section => (
            <div key={section.title}>
              <h2 className="font-display text-xl font-semibold text-violet-900 mb-2">{section.title}</h2>
              <p className="text-sm leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
