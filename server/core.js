// Shared Claude logic used by BOTH the local dev server (server/index.js) and
// the Vercel serverless functions (api/*.js). Each handler returns
// { status, body } so the two thin wrappers can just forward it.

import Anthropic from '@anthropic-ai/sdk'
import { guard, accountSummary, authEnabled, refundUsage } from './auth.js'

// Input bounds for the AI endpoints (abuse / runaway-cost guards). Downscaled
// photos are far under the image cap; normal questions/inventories are tiny.
const MAX_IMAGE_B64 = 8_000_000 // ~6MB raw
const ALLOWED_MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_QUESTION = 2000
const MAX_INVENTORY = 500

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
  // Don't leak upstream internals to the client — `detail` is already logged above.
  const generic = kind === 'vision' ? 'Could not read that photo.' : 'Could not reach Claude.'
  return { status: 502, body: { error: `${kind}_failed`, message: `${generic} Please try again.` } }
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
- IGNORE non-grocery lines entirely: store name and address, dates, totals, subtotals, VAT/tax, change, card/payment lines, discounts, loyalty/clubcard points, and ANY kind of carrier/shopping bag (e.g. "Carrier Bag", "Bag for Life", "5p Bag", "Reusable Bag", "Single Use Bag"). Never list a bag as an item.
- Include household items (cleaning products, toiletries, personal care, medicines) with category 'household'. Skip pet food.
- quantity comes from the line if shown (e.g. "2 @ £1.50" -> quantity 2), otherwise 1.
- category must be exactly one of: ${CATEGORIES.join(', ')}. Use the most specific fit: fresh herbs, salad, vegetables and fruit -> produce; milk, cheese, yoghurt, eggs, butter, cream -> dairy; meat, poultry and fish -> meat; juice, soft drinks, water, coffee and tea -> drinks; bread and baked goods -> bakery; crisps, chocolate, biscuits, sweets -> snacks; cleaning products, toiletries, personal care and medicine -> household. Only use 'other' when nothing else genuinely fits.
- A receipt is printed text, so confidence should usually be high (0.8-1.0) unless the line is genuinely ambiguous.
- frozen is true if the line is clearly a frozen product (e.g. "FROZEN", "FRZ", ice cream, frozen veg/fish/chips); otherwise false.
- Also read the date the receipt was ISSUED (the transaction/purchase date, usually near the top or bottom, NOT any 'best before' dates) and return it as receipt_date in YYYY-MM-DD format. If no transaction date is clearly legible, return an empty string.

Return the items plus receipt_date via the tool.`

// Carrier/shopping bags and other checkout cruft that the model sometimes lists
// as a product despite the prompt. Kept deliberately narrow so genuine foods
// ("tea bags", "bag salad", "bag of apples") are never dropped.
const CARRIER_BAG_RE =
  /^bags?$|\b(carrier bags?|bags? ?(for|4) ?life|reusable (carrier )?bags?|single[- ]?use bags?|shopping bags?|jute bags?|hessian bags?|woven bags?|long ?life bags?|\d+\s*p\s*(carrier\s*)?bags?|bag charge)\b/i
export function isCarrierBag(name) {
  return CARRIER_BAG_RE.test(String(name || '').trim())
}

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
  // Reject helper refunds the reserved usage slot so a bad/failed request
  // doesn't burn a credit.
  const reject = async (status, error, message) => {
    if (gate.meter) await refundUsage(gate.usageId)
    return { status, body: { error, message } }
  }

  const { imageBase64, mediaType = 'image/jpeg', mode = 'groceries' } = body
  if (typeof imageBase64 !== 'string' || !imageBase64) {
    return reject(400, 'bad_request', 'imageBase64 is required.')
  }
  if (imageBase64.length > MAX_IMAGE_B64) {
    return reject(413, 'image_too_large', 'That image is too large — try a smaller photo.')
  }
  if (!ALLOWED_MEDIA.includes(mediaType)) {
    return reject(400, 'bad_request', 'Unsupported image type.')
  }

  const prompt = mode === 'receipt' ? RECEIPT_PROMPT : GROCERIES_PROMPT
  // Receipts are printed text, which the cheap chat model reads accurately — so
  // route them to Haiku regardless of tier, and reserve the pricier vision model
  // for fridge/grocery photos, where the harder visual recognition earns its
  // cost. Big margin win with no real quality loss. Override with RECEIPT_MODEL.
  const visionModel =
    mode === 'receipt' ? process.env.RECEIPT_MODEL || CHAT_MODEL : gate.visionModel || VISION_MODEL
  try {
    const message = await client.messages.create({
      model: visionModel,
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
      .filter((it) => it.name && !isCarrierBag(it.name))
    // Only trust a date from receipt scans.
    const receiptDate = mode === 'receipt' ? validReceiptDate(toolUse?.input?.receipt_date) : null
    return { status: 200, body: { items, receiptDate } }
  } catch (err) {
    if (gate.meter) await refundUsage(gate.usageId)
    return mapClaudeError(err, 'vision')
  }
}

// Suggest dinners from the inventory. Uses the same cheap chat model and the
// same 'chat' quota bucket as a normal question — one request, no extra
// credits — but returns a structured list (meals + extra things to buy) via a
// tool, so the app can render meal cards with tap-to-add-to-shopping buttons.
export async function mealsHandler(body = {}, token) {
  const client = getClient()
  if (!client) return NO_KEY

  const gate = await guard(token, 'chat')
  if (gate.error) return gate.error
  const reject = async (status, error, message) => {
    if (gate.meter) await refundUsage(gate.usageId)
    return { status, body: { error, message } }
  }

  const { inventory = [], today, request } = body
  if (request && String(request).length > MAX_QUESTION) {
    return reject(400, 'bad_request', 'That request is too long.')
  }
  const inv = Array.isArray(inventory) ? inventory.slice(0, MAX_INVENTORY) : []
  const ask = (typeof request === 'string' && request.trim()) || 'What can I make for dinner from what I have?'

  const instructions = `You suggest meals someone can cook, built around what's in their fridge, freezer and pantry. Default to dinner ideas unless the user asks for something else (e.g. a quick lunch, or a few days of dinners to plan).
Rules:
- Suggest 3-4 appetising meals. Build each around items that are ACTUALLY in their inventory — never invent inventory items.
- Prefer meals that use items expiring soon, so nothing goes to waste.
- Be a little adventurous and inspiring: for each meal suggest a handful (2-4) of extra ingredients worth buying that would genuinely elevate the dish — a fresh herb, a sauce, a cheese, something that lifts it — not just bare essentials. Assume basics (salt, pepper, oil, common dried herbs/spices) are already on hand.
- If the user gives a follow-up or preference (e.g. a cuisine, "vegetarian", "quick", "something with chicken", "more adventurous"), tailor the whole set of suggestions to it while still using their inventory.
- Keep each method to one practical sentence — real weeknight cooking, easy to follow.`

  try {
    const message = await client.messages.create({
      model: CHAT_MODEL,
      max_tokens: 1000,
      system: [
        { type: 'text', text: instructions, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: `Today's date: ${today || 'unknown'}\nCurrent inventory (JSON):\n${JSON.stringify(inv)}` }
      ],
      tools: [
        {
          name: 'suggest_meals',
          description: 'Return a short list of dinners the user can make from their inventory.',
          input_schema: {
            type: 'object',
            properties: {
              meals: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Short, appetising meal name' },
                    description: { type: 'string', description: 'One practical sentence on how to make it' },
                    uses: { type: 'array', items: { type: 'string' }, description: 'Inventory items this meal uses' },
                    buy: { type: 'array', items: { type: 'string' }, description: 'Up to 5 extra ingredients worth buying to make it better' }
                  },
                  required: ['name', 'description', 'uses', 'buy']
                }
              }
            },
            required: ['meals']
          }
        }
      ],
      tool_choice: { type: 'tool', name: 'suggest_meals' },
      messages: [{ role: 'user', content: ask }]
    })
    const toolUse = message.content.find((b) => b.type === 'tool_use')
    const raw = Array.isArray(toolUse?.input?.meals) ? toolUse.input.meals : []
    const meals = raw
      .map((m) => ({
        name: String(m.name || '').trim(),
        description: String(m.description || '').trim(),
        uses: Array.isArray(m.uses) ? m.uses.map((s) => String(s).trim()).filter(Boolean) : [],
        buy: Array.isArray(m.buy) ? m.buy.map((s) => String(s).trim()).filter(Boolean).slice(0, 5) : []
      }))
      .filter((m) => m.name)
    return { status: 200, body: { meals } }
  } catch (err) {
    if (gate.meter) await refundUsage(gate.usageId)
    return mapClaudeError(err, 'chat')
  }
}

// "I want to make X" — work out which of the dish's ingredients the user already
// has and which they still need to buy. Same cheap model + 'chat' quota bucket as
// a normal question; returns a structured result the app renders as a card with
// the missing items tappable straight onto the shopping list.
export async function dishHandler(body = {}, token) {
  const client = getClient()
  if (!client) return NO_KEY

  const gate = await guard(token, 'chat')
  if (gate.error) return gate.error
  const reject = async (status, error, message) => {
    if (gate.meter) await refundUsage(gate.usageId)
    return { status, body: { error, message } }
  }

  const { dish, inventory = [], today } = body
  if (!dish || !String(dish).trim()) {
    return reject(400, 'bad_request', 'Tell me which dish you want to make.')
  }
  if (String(dish).length > MAX_QUESTION) {
    return reject(400, 'bad_request', 'That dish name is too long.')
  }
  const inv = Array.isArray(inventory) ? inventory.slice(0, MAX_INVENTORY) : []

  const instructions = `The user names a dish they'd like to cook. Work out the ingredients a typical home version needs, then split them into two lists by checking their inventory:
- "have": ingredients the dish needs that ARE in their inventory. Use the inventory's own item names.
- "need": ingredients the dish needs that are NOT in their inventory — the things to buy.
Rules:
- Assume kitchen basics are already on hand (salt, pepper, cooking oil, water, common dried herbs/spices) — never put these in "need".
- Match generously: if the inventory has "cheddar" and the dish needs "cheese", count it as had. Treat sensible substitutes as had only when genuinely interchangeable.
- Quantities help: for each "have" item set "have" to how much they've got (from the inventory quantity) and "needs" to how much the recipe wants (e.g. have:"2", needs:"4"). For each "need" item set "qty" to a sensible shopping amount (e.g. "200g", "1 tin", "2"). Leave a quantity as "" when it isn't meaningful.
- Keep ingredient names short and shopping-friendly.
- "note": one short, friendly line on how close they are (e.g. "You're nearly there — just a couple of bits to grab").`

  try {
    const message = await client.messages.create({
      model: CHAT_MODEL,
      max_tokens: 700,
      system: [
        { type: 'text', text: instructions, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: `Today's date: ${today || 'unknown'}\nCurrent inventory (JSON):\n${JSON.stringify(inv)}` }
      ],
      tools: [
        {
          name: 'dish_check',
          description: "Return which of the dish's ingredients the user has and which they still need.",
          input_schema: {
            type: 'object',
            properties: {
              dish: { type: 'string', description: 'The dish name, tidied up' },
              have: {
                type: 'array',
                description: 'Ingredients the dish needs that are in their inventory, with quantities where sensible',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    have: { type: 'string', description: 'How much they have (from inventory), or "" ' },
                    needs: { type: 'string', description: 'How much the recipe needs, or "" ' }
                  },
                  required: ['name']
                }
              },
              need: {
                type: 'array',
                description: 'Ingredients to buy (not in their inventory), with a shopping amount where sensible',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    qty: { type: 'string', description: 'Amount to buy, e.g. "200g", "1 tin", or "" ' }
                  },
                  required: ['name']
                }
              },
              note: { type: 'string', description: 'One short, friendly line on how close they are' }
            },
            required: ['dish', 'have', 'need']
          }
        }
      ],
      tool_choice: { type: 'tool', name: 'dish_check' },
      messages: [{ role: 'user', content: `I want to make: ${String(dish).trim()}` }]
    })
    const toolUse = message.content.find((b) => b.type === 'tool_use')
    const input = toolUse?.input || {}
    const str = (v) => String(v ?? '').trim()
    const have = Array.isArray(input.have)
      ? input.have.map((h) => ({ name: str(h?.name), have: str(h?.have), needs: str(h?.needs) })).filter((h) => h.name)
      : []
    const need = Array.isArray(input.need)
      ? input.need.map((n) => ({ name: str(n?.name), qty: str(n?.qty) })).filter((n) => n.name).slice(0, 20)
      : []
    const result = { dish: str(input.dish) || str(dish), have, need, note: str(input.note) }
    return { status: 200, body: { result } }
  } catch (err) {
    if (gate.meter) await refundUsage(gate.usageId)
    return mapClaudeError(err, 'chat')
  }
}

export async function chatHandler(body = {}, token) {
  const client = getClient()
  if (!client) return NO_KEY

  const gate = await guard(token, 'chat')
  if (gate.error) return gate.error
  const reject = async (status, error, message) => {
    if (gate.meter) await refundUsage(gate.usageId)
    return { status, body: { error, message } }
  }

  const { question, inventory = [], today } = body
  if (!question || !String(question).trim()) {
    return reject(400, 'bad_request', 'A question is required.')
  }
  if (String(question).length > MAX_QUESTION) {
    return reject(400, 'bad_request', 'That question is too long.')
  }
  const inv = Array.isArray(inventory) ? inventory.slice(0, MAX_INVENTORY) : []

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
          text: `Today's date: ${today || 'unknown'}\nCurrent inventory (JSON):\n${JSON.stringify(inv)}`
        }
      ],
      messages: [{ role: 'user', content: String(question) }]
    })
    const answer = message.content.find((b) => b.type === 'text')?.text || ''
    return { status: 200, body: { answer } }
  } catch (err) {
    if (gate.meter) await refundUsage(gate.usageId)
    return mapClaudeError(err, 'chat')
  }
}
