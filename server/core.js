// Shared Claude logic used by BOTH the local dev server (server/index.js) and
// the Vercel serverless functions (api/*.js). Each handler returns
// { status, body } so the two thin wrappers can just forward it.

import Anthropic from '@anthropic-ai/sdk'

const VISION_MODEL = process.env.VISION_MODEL || 'claude-sonnet-4-6'
const CHAT_MODEL = process.env.CHAT_MODEL || 'claude-haiku-4-5-20251001'

export const CATEGORIES = ['dairy', 'produce', 'meat', 'leftovers', 'condiments', 'drinks', 'other']

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

// Pull the first JSON array/object out of a model response, tolerating stray
// prose or ```json fences.
function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.search(/[[{]/)
  if (start === -1) throw new Error('No JSON found in model response')
  const open = candidate[start]
  const close = open === '[' ? ']' : '}'
  let depth = 0
  for (let i = start; i < candidate.length; i++) {
    if (candidate[i] === open) depth++
    else if (candidate[i] === close) {
      depth--
      if (depth === 0) return JSON.parse(candidate.slice(start, i + 1))
    }
  }
  throw new Error('Unbalanced JSON in model response')
}

const GROCERIES_PROMPT = `You are looking at a photo taken inside or of someone's fridge/groceries.
List every distinct food or drink item you can clearly identify.

Rules:
- Only include things you can actually see. Do not guess at what might be hidden behind other items or inside opaque containers.
- Merge obvious duplicates into one entry with a quantity (e.g. three apples -> quantity 3).
- category must be exactly one of: ${CATEGORIES.join(', ')}.
- confidence is your certainty from 0 to 1 that the item is present and correctly named.
- quantity is a number; unit is a short freeform string ("carton", "block", "bunch", "" if not obvious).

Return ONLY a JSON array, no prose. Each element:
{"name": string, "category": string, "quantity": number, "unit": string, "confidence": number}`

const RECEIPT_PROMPT = `You are reading a shopping receipt. Extract every FOOD or DRINK item that was purchased.

Rules:
- Expand cryptic till abbreviations into normal names when you are confident (e.g. "GBL MLK 2PT" -> "Whole milk"). If unsure, keep it close to the printed text.
- IGNORE non-grocery lines entirely: store name and address, dates, totals, subtotals, VAT/tax, change, card/payment lines, discounts, loyalty/clubcard points, and carrier bags.
- Skip clearly non-food household items (cleaning products, toiletries) unless they are food or drink.
- quantity comes from the line if shown (e.g. "2 @ £1.50" -> quantity 2), otherwise 1.
- category must be exactly one of: ${CATEGORIES.join(', ')}.
- A receipt is printed text, so confidence should usually be high (0.8-1.0) unless the line is genuinely ambiguous.

Return ONLY a JSON array, no prose. Each element:
{"name": string, "category": string, "quantity": number, "unit": string, "confidence": number}`

export function healthHandler() {
  return {
    status: 200,
    body: { ok: true, hasKey: Boolean(getClient()), visionModel: VISION_MODEL, chatModel: CHAT_MODEL }
  }
}

export async function visionHandler(body = {}) {
  const client = getClient()
  if (!client) return NO_KEY

  const { imageBase64, mediaType = 'image/jpeg', mode = 'groceries' } = body
  if (!imageBase64) {
    return { status: 400, body: { error: 'bad_request', message: 'imageBase64 is required.' } }
  }

  const prompt = mode === 'receipt' ? RECEIPT_PROMPT : GROCERIES_PROMPT
  try {
    const message = await client.messages.create({
      model: VISION_MODEL,
      max_tokens: 1500,
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
    const text = message.content.find((b) => b.type === 'text')?.text || ''
    const parsed = extractJson(text)
    const items = (Array.isArray(parsed) ? parsed : [])
      .map((it) => ({
        name: String(it.name || '').trim(),
        category: CATEGORIES.includes(it.category) ? it.category : 'other',
        quantity: Number.isFinite(it.quantity) ? it.quantity : 1,
        unit: String(it.unit || '').trim(),
        confidence: typeof it.confidence === 'number' ? Math.max(0, Math.min(1, it.confidence)) : 0.5
      }))
      .filter((it) => it.name)
    return { status: 200, body: { items } }
  } catch (err) {
    console.error('vision error:', err?.message || err)
    const hint =
      mode === 'receipt'
        ? 'Could not read that receipt. Try a flatter, well-lit shot with the whole list in frame.'
        : 'Could not read that photo. Try a clearer, well-lit shot.'
    return { status: 502, body: { error: 'vision_failed', message: hint } }
  }
}

export async function chatHandler(body = {}) {
  const client = getClient()
  if (!client) return NO_KEY

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
    return { status: 200, body: { answer } }
  } catch (err) {
    console.error('chat error:', err?.message || err)
    return { status: 502, body: { error: 'chat_failed', message: 'Could not reach Claude. Please try again.' } }
  }
}
