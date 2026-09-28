import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * POST /api/press/webhook
 * Stripe webhook receiver. Verifies the Stripe signature, then records
 * completed ebook purchases. Configure in the Stripe dashboard:
 *   https://www.quicademy.com/api/press/webhook
 *   events: checkout.session.completed
 */
export async function POST(req) {
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  let event
  try {
    const body = await req.text() // raw body required for signature verification
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('Stripe webhook signature failed:', err.message)
    return NextResponse.json(
      { error: `Webhook signature failed: ${err.message}` },
      { status: 400 }
    )
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    if (session.payment_status === 'paid') {
      try {
        const admin = createAdminClient()
        if (admin) {
          await admin.from('ebook_purchases').upsert(
            {
              book_id: session.metadata?.book_id || null,
              email:
                session.customer_details?.email ||
                session.customer_email ||
                'unknown',
              stripe_session_id: session.id,
              stripe_payment_intent:
                typeof session.payment_intent === 'string'
                  ? session.payment_intent
                  : null,
              amount: session.amount_total ? session.amount_total / 100 : null,
              currency: session.currency || 'usd',
            },
            { onConflict: 'stripe_session_id' }
          )
        } else {
          console.error('ebook_purchases upsert skipped: SUPABASE_SERVICE_ROLE_KEY not set')
        }
      } catch (err) {
        console.error('ebook_purchases upsert failed:', err)
        // Return 500 so Stripe retries the webhook
        return NextResponse.json({ error: 'Purchase recording failed' }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ received: true })
}
