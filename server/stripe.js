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
import { sendEmail, newSubscriberEmail, OWNER_EMAIL } from './email.js'

const SECRET = process.env.STRIPE_SECRET_KEY
const PRICE_ID = process.env.STRIPE_PRICE_ID
const APP_URL = process.env.APP_URL || 'https://app.whatsinmyfridge.co.uk'

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

// Confirm a checkout session was actually for our Plus price, so a session for
// some other (cheaper) price can't be used to unlock Plus. Fails OPEN only when
// we genuinely can't read the line items (transient) — never on a real mismatch.
async function checkoutPriceOk(stripe, sessionId) {
  if (!PRICE_ID) return true
  try {
    const items = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 10 })
    const prices = (items.data || []).map((li) => li.price?.id).filter(Boolean)
    if (!prices.length) return true // couldn't read items — don't block a paid session
    return prices.includes(PRICE_ID)
  } catch (err) {
    console.error('could not verify checkout price (allowing):', err?.message || err)
    return true
  }
}

async function getOrCreateCustomer(stripe, user) {
  const profile = await profileOf(user.id)
  if (profile.stripe_customer_id) {
    // Make sure the stored customer still exists under the current keys. A
    // customer created in test mode won't exist once we're live, so retrieving
    // it throws — in that case fall through and create a fresh live customer
    // instead of reusing a dead ID (which would break checkout entirely).
    try {
      const existing = await stripe.customers.retrieve(profile.stripe_customer_id)
      if (existing && !existing.deleted) return profile.stripe_customer_id
    } catch (err) {
      console.error('stale stripe customer, creating a new one:', err?.message || err)
    }
  }
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
    if (!(await checkoutPriceOk(stripe, session.id))) {
      return { status: 400, body: { error: 'wrong_price', message: 'That checkout was not for the Plus plan.' } }
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

// POST /api/stripe-webhook — Stripe calls this on subscription lifecycle
// events so the user's tier reflects reality (e.g. auto-downgrade on cancel or
// failed payment). Requires the raw request body for signature verification.
async function handleEvent(stripe, event) {
  const obj = event.data.object
  if (event.type === 'checkout.session.completed') {
    // Only grant Plus (and notify) when the session is genuinely for our Plus
    // price — a checkout for any other price must never unlock Plus.
    const priceOk = obj.client_reference_id ? await checkoutPriceOk(stripe, obj.id) : false
    if (!priceOk) return
    await admin()
      .from('profiles')
      .update({ tier: 'plus', stripe_customer_id: obj.customer, stripe_subscription_id: obj.subscription })
      .eq('id', obj.client_reference_id)
    // Tell the owner there's a new subscriber (best-effort — never block the webhook).
    try {
      const email = obj.customer_details?.email || null
      const amount = obj.amount_total ? `£${(obj.amount_total / 100).toFixed(2)}` : ''
      const { subject, html } = newSubscriberEmail({ email, amount })
      await sendEmail({ to: OWNER_EMAIL, subject, html })
    } catch (err) {
      console.error('new-subscriber notify failed:', err?.message || err)
    }
  } else if (event.type === 'customer.subscription.updated') {
    // Keep Plus while the subscription is live OR mid-dunning. `past_due` means
    // a payment failed but Stripe is still retrying the card — downgrading here
    // would strip Plus from a paying customer who usually recovers on retry.
    // Only genuinely terminal states (canceled / unpaid / incomplete_expired,
    // and `paused`) fall through to free; the final cancel also arrives as
    // `customer.subscription.deleted` below.
    const stillPlus = ['active', 'trialing', 'past_due'].includes(obj.status)
    await admin()
      .from('profiles')
      .update({ tier: stillPlus ? 'plus' : 'free', stripe_subscription_id: obj.id })
      .eq('stripe_customer_id', obj.customer)
  } else if (event.type === 'customer.subscription.deleted') {
    await admin()
      .from('profiles')
      .update({ tier: 'free', stripe_subscription_id: null })
      .eq('stripe_customer_id', obj.customer)
  }
}

export async function webhookHandler(rawBody, signature) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !secret) return { status: 503, body: { error: 'not_configured', message: 'Webhook not set up.' } }
  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch (err) {
    console.error('stripe webhook signature failed:', err?.message || err)
    return { status: 400, body: { error: 'bad_signature' } }
  }
  // Idempotency: Stripe re-delivers on retry and can deliver out of order, so
  // skip any event we've already fully processed. (If the stripe_events table
  // doesn't exist yet, this select errors and `seen` stays null — we then
  // process normally, so the guard degrades gracefully before the migration.)
  try {
    const { data: seen } = await admin().from('stripe_events').select('id').eq('id', event.id).maybeSingle()
    if (seen) return { status: 200, body: { received: true, duplicate: true } }
  } catch (err) {
    console.error('stripe event dedupe check failed (processing anyway):', err?.message || err)
  }

  try {
    await handleEvent(stripe, event)
  } catch (err) {
    // The signature was valid but we failed to apply the change (e.g. the DB
    // was briefly unavailable). Return 500 so Stripe retries with backoff —
    // otherwise a paying customer could be left without Plus and never recover.
    // Stripe gives up after ~3 days, so this can't retry-storm forever.
    console.error('stripe webhook handling failed:', err?.message || err)
    return { status: 500, body: { error: 'handler_failed' } }
  }

  // Record as processed only AFTER success, so a failed (500) event can be
  // retried by Stripe rather than being permanently skipped. Best-effort.
  try {
    await admin().from('stripe_events').insert({ id: event.id, type: event.type })
  } catch (err) {
    console.error('stripe event record failed (non-fatal):', err?.message || err)
  }
  return { status: 200, body: { received: true } }
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
    const detail = err?.message || String(err)
    console.error('stripe portal failed:', detail)
    // Surface the two common live-mode causes so the on-screen error is useful.
    let message = 'Could not open billing settings.'
    if (/configuration/i.test(detail)) {
      message = 'Billing portal isn’t set up in Stripe yet. Save the customer portal settings in live mode and try again.'
    } else if (/No such customer|test mode/i.test(detail)) {
      message = 'Your subscription was created in Stripe test mode, but the app is now live. Re-subscribe to manage it.'
    }
    return { status: 502, body: { error: 'portal_failed', message } }
  }
}
