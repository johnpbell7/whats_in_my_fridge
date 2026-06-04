// Shared Claude logic used by BOTH the local dev server (server/index.js) and
// the Vercel serverless functions (api/*.js). Each handler returns
// { status, body } so the two thin wrappers can just forward it.

import Anthropic from '@anthropic-ai/sdk'
import { guard, accountSummary, authEnabled, recordUsage } from './auth.js'

const VISION_MODEL = process.env.VISION_MODEL || 'claude-sonnet-4-6'
const CHAT_MODEL = process.env.CHAT_MODEL || 'claude-haiku-4-5-20251001'

export const CATEGORIES = ['dairy', 'produce', 'meat', 'bakery', 'leftovers', 'condiments', 'drinks', 'snacks', 'household', 'other']

// Lazy + memoized so the API key is read at call time (after dotenv loads
// locally, or from Vercel's injected env in production).
let _client
function getClient() {
  if (_client !== undefined) return _client
  const key = process.env.ANTHROPIC_API_KEY
  _client = key ? new Anthropic({ apiKey: key }) : null
  return _client
}

const NO_KEY = {
  status: 503,
  body: {
    error: 'no_api_key',
    message:
      'No Anthropic API key set. Add ANTHROPIC_API_KEY (locally in .env, or in your host’s environment variables) and restart.'
  }
}

// Validate a receipt date the model read: must be YYYY-MM-DD, a real date, not
// in the future, and not absurdly old (guards against misreads). Returns the
// string or null.
function validReceiptDate(s) {
  if (!s || typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(s + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return null
  const today = new Date()
  const ninetyAgo = new Date(today.getTime() - 90 * 86400000)
  if (d.getTime() > today.getTime() + 86400000) return null // allow for timezone, but no real future
  if (d.getTime() < ninetyAgo.getTime()) return null
  return s
}

// The tool returns {"items":[...]}, but stay tolerant of shape so we never
// silently drop everything.
function asItemArray(parsed) {
  if (Array.isArray(parsed)) return parsed
  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.items)) return parsed.items
    const firstArray = Object.values(parsed).find(Array.isArray)
    if (firstArray) return firstArray
  }
  return []
}

// Turn an Anthropic SDK error into a clear, specific message. The two common
// real-world causes (no credit, bad key) are otherwise invisible to the user.
function mapClaudeError(err, kind) {
  const status = err?.status
  const detail = err?.error?.error?.message || err?.message || ''
  console.error(`${kind} error [status ${status}]:`, detail)

  if (status === 401) {
    return {
      status: 401,
      body: {
        error: 'bad_key',
        message:
          'Anthropic rejected the API key (invalid or revoked). Put a fresh key in Vercel → Settings → Environment Variables → ANTHROPIC_API_KEY, then redeploy.'
      }
    }
  }
  if (status === 400 && /credit balance|billing|too low/i.test(detail)) {
    return {
      status: 402,
      body: {
        error: 'no_credit',
        message:
          'Your Anthropic account has no credit. Add some at console.anthropic.com → Billing (a few £ lasts a long time), then try again.'
      }
    }
  }
  if (status === 404 && /model/i.test(detail)) {
    return { status: 502, body: { error: 'bad_model', message: `That Claude model isn’t available: ${detail}` } }
  }
  if (status === 429) {
    return { status: 429, body: { error: 'rate_limited', message: 'Too many requests right now — wait a few seconds and try again.' } }
  }
  // Fall back to the real detail so nothing stays hidden.
  const generic = kind === 'vision' ? 'Could not read that photo.' : 'Could not reach Claude.'
  return { status: 502, body: { error: `${kind}_failed`, message: detail ? `${generic} (${detail})` : `${generic} Please try again.` } }
}

const GROCERIES_PROMPT = `You are looking at a photo of someone's fridge, cupboard, groceries, or shopping.
Identify EVERY distinct product visible — be thorough and scan the
whole frame: the front, the back, the shelves, the door, the edges and corners.

Rules:
- List every distinct product you can see. Do NOT stop after the obvious few — work methodically across the whole image and include everything, even small or partly hidden items you can still confidently identify.
- Do not invent items that are fully hidden behind others or sealed inside opaque containers. But DO include items that are only partially visible if you can recognise them.
- Several of the SAME product = one entry with the count as quantity (e.g. three apples -> quantity 3). Different products are always separate entries.
- Include food, drink AND household items. Household covers cleaning products, toiletries and personal care (shampoo, soap, toothpaste, deodorant), and medicine/first-aid. Skip pure decor (flowers, ornaments) and pet food.
- category must be exactly one of: ${CATEGORIES.join(', ')}. Use the most specific fit: fresh herbs, salad, vegetables and fruit -> produce; milk, cheese, yoghurt, eggs, butter, cream -> dairy; meat, poultry and fish -> meat; juice, soft drinks, water, coffee and tea -> drinks; bread and baked goods -> bakery; crisps, chocolate, biscuits, sweets -> snacks; cleaning products, toiletries, personal care and medicine -> household. Only use 'other' when nothing else genuinely fits.
- confidence is your certainty from 0 to 1 that the item is present and correctly named.
- quantity is a number; unit is a short freeform string ("carton", "block", "bunch", "" if not obvious).
- frozen is true ONLY if it is a frozen product that belongs in the freezer (ice cream, frozen vegetables/fruit/fish/meat, oven chips, frozen ready meals, anything whose packaging says "frozen"); otherwise false.

Return ONLY a JSON array, no prose. Include one element per distinct product:
{"name": string, "category": string, "quantity": number, "unit": string, "confidence": number, "frozen": boolean}`

const RECEIPT_PROMPT = `You are reading a shopping receipt. Extract every purchased item — food, drink AND household.

Rules:
- Expand cryptic till abbreviations into normal names when you are confident (e.g. "GBL MLK 2PT" -> "Whole milk"). If unsure, keep it close to the printed text.
- IGNORE non-grocery lines entirely: store name and address, dates, totals, subtotals, VAT/tax, change, card/payment lines, discounts, loyalty/clubcard points, and carrier bags.
- Include household items (cleaning products, toiletries, personal care, medicines) with category 'household'. Skip pet food.
- quantity comes from the line if shown (e.g. "2 @ £1.50" -> quantity 2), otherwise 1.
- category must be exactly one of: ${CATEGORIES.join(', ')}. Use the most specific fit: fresh herbs, salad, vegetables and fruit -> produce; milk, cheese, yoghurt, eggs, butter, cream -> dairy; meat, poultry and fish -> meat; juice, soft drinks, water, coffee and tea -> drinks; bread and baked goods -> bakery; crisps, chocolate, biscuits, sweets -> snacks; cleaning products, toiletries, personal care and medicine -> household. Only use 'other' when nothing else genuinely fits.
- A receipt is printed text, so confidence should usually be high (0.8-1.0) unless the line is genuinely ambiguous.
- frozen is true if the line is clearly a frozen product (e.g. "FROZEN", "FRZ", ice cream, frozen veg/fish/chips); otherwise false.
- Also read the date the receipt was ISSUED (the transaction/purchase date, usually near the top or bottom, NOT any 'best before' dates) and return it as receipt_date in YYYY-MM-DD format. If no transaction date is clearly legible, return an empty string.

Return the items plus receipt_date via the tool.`

export function healthHandler() {
  return {
    status: 200,
    body: {
      ok: true,
      hasKey: Boolean(getClient()),
      authRequired: authEnabled(),
      visionModel: VISION_MODEL,
      chatModel: CHAT_MODEL
    }
  }
}

// GET /api/me — the signed-in user's tier + this month's usage (or
// { authEnabled: false } in open mode).
export function meHandler(token) {
  return accountSummary(token)
}

export async function visionHandler(body = {}, token) {
  const client = getClient()
  if (!client) return NO_KEY

  // Require a signed-in user (when accounts are on) and enforce their quota.
  const gate = await guard(token, 'vision')
  if (gate.error) return gate.error

  const { imageBase64, mediaType = 'image/jpeg', mode = 'groceries' } = body
  if (!imageBase64) {
    return { status: 400, body: { error: 'bad_request', message: 'imageBase64 is required.' } }
  }

  const prompt = mode === 'receipt' ? RECEIPT_PROMPT : GROCERIES_PROMPT
  try {
    const message = await client.messages.create({
      model: gate.visionModel || VISION_MODEL,
      max_tokens: 4096, // room for a long list of items without truncating
      // Force the model to return the list through this tool, so we read a
      // validated object instead of parsing free text (which proved fragile).
      tools: [
        {
          name: 'record_items',
          description: 'Record every distinct food or drink item identified in the image.',
          input_schema: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'The product name' },
                    category: { type: 'string', enum: CATEGORIES },
                    quantity: { type: 'number', description: 'How many of this product, default 1' },
                    unit: { type: 'string', description: 'Short freeform unit, or empty string' },
                    confidence: { type: 'number', description: '0 to 1 certainty' },
                    frozen: { type: 'boolean', description: 'true if this is a frozen product (belongs in the freezer)' }
                  },
                  required: ['name', 'category', 'quantity', 'unit', 'confidence', 'frozen']
                }
              },
              receipt_date: {
                type: 'string',
                description:
                  "For a shopping receipt: the transaction/purchase date printed on it, in YYYY-MM-DD. Empty string if not a receipt or no date is legible."
              }
            },
            required: ['items']
          }
        }
      ],
      tool_choice: { type: 'tool', name: 'record_items' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: prompt }
          ]
        }
      ]
    })
    const toolUse = message.content.find((b) => b.type === 'tool_use')
    const items = asItemArray(toolUse?.input)
      .map((it) => ({
        name: String(it.name || '').trim(),
        category: CATEGORIES.includes(it.category) ? it.category : 'other',
        quantity: Number.isFinite(it.quantity) ? it.quantity : 1,
        unit: String(it.unit || '').trim(),
        confidence: typeof it.confidence === 'number' ? Math.max(0, Math.min(1, it.confidence)) : 0.5,
        frozen: Boolean(it.frozen)
      }))
      .filter((it) => it.name)
    // Only trust a date from receipt scans.
    const receiptDate = mode === 'receipt' ? validReceiptDate(toolUse?.input?.receipt_date) : null
    if (gate.meter) await recordUsage(gate.user.id, 'vision')
    return { status: 200, body: { items, receiptDate } }
  } catch (err) {
    return mapClaudeError(err, 'vision')
  }
}

export async function chatHandler(body = {}, token) {
  const client = getClient()
  if (!client) return NO_KEY

  const gate = await guard(token, 'chat')
  if (gate.error) return gate.error

  const { question, inventory = [], today } = body
  if (!question || !String(question).trim()) {
    return { status: 400, body: { error: 'bad_request', message: 'A question is required.' } }
  }

  const instructions = `You answer questions about what is in the user's fridge, freezer and pantry.
Be concise and practical — they are often checking on their phone while out shopping.
You can answer "do I have X?", "what's expiring soon?", and suggest meals from what's available.
If something is expiring within 2 days, flag it. Never invent items that aren't in the inventory.
Quantities and units are freeform. If the inventory is empty, say so plainly.`

  try {
    const message = await client.messages.create({
      model: CHAT_MODEL,
      max_tokens: 700,
      system: [
        { type: 'text', text: instructions, cache_control: { type: 'ephemeral' } },
        {
          type: 'text',
          text: `Today's date: ${today || 'unknown'}\nCurrent inventory (JSON):\n${JSON.stringify(inventory)}`
        }
      ],
      messages: [{ role: 'user', content: String(question) }]
    })
    const answer = message.content.find((b) => b.type === 'text')?.text || ''
    if (gate.meter) await recordUsage(gate.user.id, 'chat')
    return { status: 200, body: { answer } }
  } catch (err) {
    return mapClaudeError(err, 'chat')
  }
}
