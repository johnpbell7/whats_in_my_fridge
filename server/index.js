// Local development server. In production these same handlers run as Vercel
// serverless functions (see api/*.js) — this Express wrapper just exists so
// `npm run dev` works without the Vercel CLI.
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { healthHandler, visionHandler, chatHandler } from './core.js'

const PORT = process.env.API_PORT || 8787

const app = express()
app.use(cors())
app.use(express.json({ limit: '12mb' })) // base64 photos can be a couple of MB

const send = (res, { status, body }) => res.status(status).json(body)

app.get('/api/health', (_req, res) => send(res, healthHandler()))
app.post('/api/vision', async (req, res) => send(res, await visionHandler(req.body)))
app.post('/api/chat', async (req, res) => send(res, await chatHandler(req.body)))

app.listen(PORT, () => {
  console.log(`Fridge API listening on http://localhost:${PORT}`)
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('  No ANTHROPIC_API_KEY set — chat and photo recognition will return a setup message until you add one.')
  }
})
