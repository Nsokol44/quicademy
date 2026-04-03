'use client'
import { useState } from 'react'
import { Mail, MessageCircle, Building } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ContactPage() {
  const [form, setForm] = useState({ name:'', email:'', type:'general', message:'' })
  const [sent, setSent] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    // In production, wire this to your email provider (Resend, SendGrid, etc.)
    setSent(true)
    toast.success('Message sent! We\'ll get back to you within 1 business day.')
  }

  return (
    <div className="min-h-screen bg-violet-50 py-20 px-5">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="font-mono text-xs text-violet-500 uppercase tracking-widest mb-3">Get in touch</p>
          <h1 className="font-display text-4xl font-bold text-violet-900 mb-3">Contact us</h1>
          <p className="font-sans text-base text-muted max-w-md mx-auto">We respond to all enquiries within one business day.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: MessageCircle, title: 'General enquiries', email: 'hello@quicademy.com' },
            { icon: Building,      title: 'Business & partnerships', email: 'business@quicademy.com' },
            { icon: Mail,          title: 'Instructor applications', email: 'instructors@quicademy.com' },
          ].map(c => (
            <div key={c.title} className="card p-6 text-center">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mx-auto mb-3">
                <c.icon size={18} className="text-violet-600" />
              </div>
              <p className="font-display text-base font-semibold text-violet-900 mb-1">{c.title}</p>
              <a href={`mailto:${c.email}`} className="font-mono text-xs text-violet-500 hover:text-violet-700">{c.email}</a>
            </div>
          ))}
        </div>

        <div className="card p-8 max-w-2xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-violet-900 mb-6">Send a message</h2>
          {sent ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-solar-50 border border-solar-200 flex items-center justify-center mx-auto mb-4">
                <Mail size={24} className="text-solar-600" />
              </div>
              <p className="font-display text-xl font-bold text-violet-900 mb-2">Message received</p>
              <p className="font-sans text-sm text-muted">We'll get back to you within 1 business day.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="field-label">Your name</label>
                  <input className="input" placeholder="Jane Smith" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required />
                </div>
                <div>
                  <label className="field-label">Email</label>
                  <input type="email" className="input" placeholder="jane@company.com" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} required />
                </div>
              </div>
              <div>
                <label className="field-label">Type of enquiry</label>
                <select className="input" value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))}>
                  <option value="general">General question</option>
                  <option value="business">Business / enterprise</option>
                  <option value="instructor">Instructor application</option>
                  <option value="support">Technical support</option>
                  <option value="press">Press enquiry</option>
                </select>
              </div>
              <div>
                <label className="field-label">Message</label>
                <textarea className="input resize-none" rows={5} placeholder="How can we help?" value={form.message} onChange={e => setForm(f=>({...f,message:e.target.value}))} required />
              </div>
              <button type="submit" className="btn-primary w-full">Send message</button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
