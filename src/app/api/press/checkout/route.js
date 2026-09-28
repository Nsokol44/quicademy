import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/**
 * POST /api/press/checkout
 * Body: { slug }
 * Creates a Stripe Checkout session for a published, priced book
 * and returns the hosted checkout URL.
 */
export async function POST(req) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Payments are not configured yet. Please check back soon.' },
        { status: 503 }
      )
    }

    const { slug } = await req.json()
    if (!slug) {
      return NextResponse.json({ error: 'Missing book.' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: book } = await supabase
      .from('books')
      .select('id, slug, title, subtitle, price, cover_url, is_free')
      .eq('slug', slug)
      .eq('published', true)
      .single()

    if (!book || !book.price || book.is_free) {
      return NextResponse.json(
        { error: 'This book is not available for purchase.' },
        { status: 404 }
      )
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const origin =
      req.headers.get('origin') ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://www.quicademy.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(Number(book.price) * 100),
            product_data: {
              name: `Quicademy Press — ${book.title}`,
              description: (book.subtitle || 'eBook edition').slice(0, 400),
              images: book.cover_url ? [book.cover_url] : undefined,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { book_id: book.id, slug: book.slug },
      success_url: `${origin}/press/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/press/${book.slug}`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Press checkout error:', err)
    return NextResponse.json(
      { error: 'Could not start checkout. Please try again.' },
      { status: 500 }
    )
  }
}
