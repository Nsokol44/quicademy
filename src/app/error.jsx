'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Log to console in dev; in production wire to Sentry/LogRocket/etc.
    console.error('[Quicademy Error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-violet-50 flex items-center justify-center px-5">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <h1 className="font-display text-2xl font-bold text-violet-900 mb-2">
          Something went wrong
        </h1>
        <p className="font-sans text-sm text-muted mb-6 leading-relaxed">
          An unexpected error occurred. This has been logged and our team will look into it.
          {process.env.NODE_ENV === 'development' && (
            <span className="block mt-2 font-mono text-xs text-red-500 bg-red-50 p-2 rounded text-left">
              {error?.message}
            </span>
          )}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset}
            className="btn-primary">
            <RefreshCw size={14}/> Try again
          </button>
          <Link href="/" className="btn-ghost">Go home</Link>
        </div>
      </div>
    </div>
  )
}
