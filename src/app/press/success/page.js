import Stripe from 'stripe'
import Link from 'next/link'
import { CheckCircle2, Download, ArrowLeft, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const metadata = {
  title: 'Order complete — Quicademy Press',
  description: 'Your ebook purchase is complete. Download your book here.',
}

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 // 24 hours

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-violet-50 py-16 px-5">
      <div className="max-w-xl mx-auto">
        <div className="card p-10 text-center">{children}</div>
        <div className="text-center mt-6">
          <Link href="/press" className="btn-ghost text-sm inline-flex items-center gap-2">
            <ArrowLeft size={13}/> Back to Quicademy Press
          </Link>
        </div>
      </div>
    </div>
  )
}

export default async function PressSuccessPage({ searchParams }) {
  const sessionId = searchParams?.session_id

  if (!sessionId || !process.env.STRIPE_SECRET_KEY) {
    return (
      <Shell>
        <AlertTriangle size={36} className="text-amber-500 mx-auto mb-4"/>
        <h1 className="font-display text-2xl font-bold text-violet-900 mb-2">Order not found</h1>
        <p className="font-sans text-sm text-muted">
          We couldn't find that order. If you just completed a purchase, give it a moment and check your email for a receipt.
        </p>
      </Shell>
    )
  }

  // Verify the session with Stripe — never trust the URL alone
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  let session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId)
  } catch {
    session = null
  }

  if (!session || session.payment_status !== 'paid') {
    return (
      <Shell>
        <AlertTriangle size={36} className="text-amber-500 mx-auto mb-4"/>
        <h1 className="font-display text-2xl font-bold text-violet-900 mb-2">Payment not confirmed</h1>
        <p className="font-sans text-sm text-muted">
          This order doesn't show as paid yet. If you completed checkout, your receipt is on its way — contact us if the download doesn't arrive.
        </p>
      </Shell>
    )
  }

  const bookId = session.metadata?.book_id
  const supabase = createClient()
  const { data: book } = bookId
    ? await supabase.from('books').select('id, title, subtitle, cover_url, ebook_path').eq('id', bookId).single()
    : { data: null }

  // Generate a time-limited signed download URL for the private ebook bucket
  let downloadUrl = null
  if (book?.ebook_path) {
    const admin = createAdminClient()
    if (admin) {
      const { data, error } = await admin.storage
        .from('press-ebooks')
        .createSignedUrl(book.ebook_path, SIGNED_URL_TTL_SECONDS)
      if (!error) downloadUrl = data.signedUrl
    }
  }

  return (
    <Shell>
      <CheckCircle2 size={44} className="text-green-500 mx-auto mb-4"/>
      <h1 className="font-display text-3xl font-bold text-violet-900 mb-2">Thank you!</h1>
      <p className="font-sans text-sm text-muted mb-8">
        Your purchase is complete. A receipt was sent to{' '}
        <span className="font-semibold text-violet-800">
          {session.customer_details?.email || 'your email'}
        </span>.
      </p>

      {book && (
        <div className="flex items-center gap-4 bg-violet-50 rounded-xl p-4 mb-8 text-left">
          {book.cover_url && (
            <img src={book.cover_url} alt={book.title} className="w-14 h-20 object-cover rounded shadow"/>
          )}
          <div className="min-w-0">
            <p className="font-display font-bold text-violet-900 leading-tight">{book.title}</p>
            {book.subtitle && <p className="font-sans text-xs text-muted italic mt-1 truncate">{book.subtitle}</p>}
            <p className="font-mono text-xs text-green-600 mt-1">eBook edition</p>
          </div>
        </div>
      )}

      {downloadUrl ? (
        <>
          <a href={downloadUrl} download
            className="btn-solar inline-flex items-center gap-2 text-base px-8 py-3.5">
            <Download size={16}/> Download your ebook
          </a>
          <p className="font-mono text-xs text-muted mt-4">
            This link expires in 24 hours. Your purchase is saved — contact us anytime for a fresh link.
          </p>
        </>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="font-sans text-sm text-amber-800">
            Your ebook file is being prepared. We'll email your download link shortly — thank you for your patience.
          </p>
        </div>
      )}
    </Shell>
  )
}
