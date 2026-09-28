'use client'
import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'

/**
 * Starts a Stripe Checkout session for a book and redirects the buyer
 * to Stripe's hosted payment page.
 */
export default function BuyButton({ slug, price, className = '' }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const buy = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/press/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Checkout failed. Please try again.')
      }
    } catch {
      setError('Checkout failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={buy} disabled={loading} className={className}>
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
            Starting checkout…
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <ShoppingCart size={14}/>
            Buy now — ${Number(price).toFixed(2)}
          </span>
        )}
      </button>
      {error && (
        <p className="font-sans text-xs text-red-500 mt-2">{error}</p>
      )}
    </>
  )
}
