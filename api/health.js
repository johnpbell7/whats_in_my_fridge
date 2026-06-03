import { healthHandler } from '../server/core.js'

export default function handler(_req, res) {
  const { status, body } = healthHandler()
  res.status(status).json(body)
}
