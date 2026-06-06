import Link from 'next/link'
import { MapPin } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-violet-50 flex items-center justify-center px-5">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-6">
          <MapPin size={28} className="text-violet-400" />
        </div>
        <h1 className="font-display text-4xl font-bold text-violet-900 mb-2">404</h1>
        <p className="font-display text-xl font-semibold text-violet-700 mb-2">Page not found</p>
        <p className="font-sans text-sm text-muted mb-6">
          This page does not exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard" className="btn-primary">Go to dashboard</Link>
          <Link href="/courses" className="btn-ghost">Browse courses</Link>
        </div>
      </div>
    </div>
  )
}
