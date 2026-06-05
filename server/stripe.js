// Stripe subscription checkout (Plus, £3.99/month). Lives entirely server-side
// — the secret key never reaches the browser. Flow:
//   1. /api/checkout      → create a Checkout Session, return its URL
//   2. user pays on Stripe's hosted page
//   3. /api/checkout-confirm → verify the session is paid, flip tier to 'plus'
//   4. /api/billing-portal → Stripe-hosted page to manage / cancel
// Everything degrades gracefully (clear 503) until STRIPE_* env vars are set,
// so the app keeps working before payments are configured.

import Stripe from 'stripe'
import { authenticate, admin } from './auth.js'

const SECRET = process.env.STRIPE_SECRET_KEY
const PRICE_ID = process.env.STRIPE_PRICE_ID
const APP_URL = process.env.APP_URL || 'https://whats-in-my-fridge-lyart.vercel.app'

let _stripe
function getStripe() {
  if (_stripe !== undefined) return _stripe
  _stripe = SECRET ? new Stripe(SECRET) : null
  return _stripe
}

export function stripeEnabled() {
  return Boolean(SECRET && PRICE_ID)
}

const NOT_CONFIGURED = {
  status: 503,
  body: { error: 'not_configured', message: 'Card payments are not set up yet.' }
}

async function profileOf(userId) {
  const { data } = await admin()
    .from('profiles')
    .select('stripe_customer_id, stripe_subscription_id')
    .eq('id', userId)
    .single()
  return data || {}
}

async function getOrCreateCustomer(stripe, user) {
  const profile = await profileOf(user.id)
  if (profile.stripe_customer_id) return profile.stripe_customer_id
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { user_id: user.id }
  })
  await admin().from('profiles').update({ stripe_customer_id: customer.id }).eq('id', user.id)
  return customer.id
}

// POST /api/checkout — start a subscription checkout for the signed-in user.
export async function checkoutHandler(token) {
  const stripe = getStripe()
  if (!stripe || !stripeEnabled()) return NOT_CONFIGURED
  const auth = await authenticate(token)
  if (auth.error) return auth.error
  try {
    const customer = await getOrCreateCustomer(stripe, auth.user)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      client_reference_id: auth.user.id,
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${APP_URL}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/?checkout=cancel`,
      subscription_data: { metadata: { user_id: auth.user.id } }
    })
    return { status: 200, body: { url: session.url } }
  } catch (err) {
    console.error('stripe checkout failed:', err?.message || err)
    return { status: 502, body: { error: 'checkout_failed', message: 'Could not start checkout. Please try again.' } }
  }
}

// POST /api/checkout-confirm { session_id } — after the redirect back, verify
// the session belongs to this user and is paid, then grant Plus.
export async function confirmCheckoutHandler(body = {}, token) {
  const stripe = getStripe()
  if (!stripe || !stripeEnabled()) return NOT_CONFIGURED
  const auth = await authenticate(token)
  if (auth.error) return auth.error
  const sessionId = body.session_id
  if (!sessionId || typeof sessionId !== 'string') {
    return { status: 400, body: { error: 'bad_request', message: 'session_id is required.' } }
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.client_reference_id !== auth.user.id) {
      return { status: 403, body: { error: 'forbidden', message: 'That checkout is not yours.' } }
    }
    const paid = session.payment_status === 'paid' || session.status === 'complete'
    if (!paid) {
      return { status: 402, body: { error: 'not_paid', message: 'Payment not completed.' } }
    }
    await admin()
      .from('profiles')
      .update({ tier: 'plus', stripe_customer_id: session.customer, stripe_subscription_id: session.subscription })
      .eq('id', auth.user.id)
    return { status: 200, body: { ok: true, tier: 'plus' } }
  } catch (err) {
    console.error('stripe confirm failed:', err?.message || err)
    return { status: 502, body: { error: 'confirm_failed', message: 'Could not confirm your subscription.' } }
  }
}

// POST /api/billing-portal — Stripe-hosted page to manage or cancel.
export async function billingPortalHandler(token) {
  const stripe = getStripe()
  if (!stripe || !stripeEnabled()) return NOT_CONFIGURED
  const auth = await authenticate(token)
  if (auth.error) return auth.error
  try {
    const profile = await profileOf(auth.user.id)
    if (!profile.stripe_customer_id) {
      return { status: 400, body: { error: 'no_customer', message: 'No subscription to manage yet.' } }
    }
    const portal = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${APP_URL}/`
    })
    return { status: 200, body: { url: portal.url } }
  } catch (err) {
    console.error('stripe portal failed:', err?.message || err)
    return { status: 502, body: { error: 'portal_failed', message: 'Could not open billing settings.' } }
  }
}
