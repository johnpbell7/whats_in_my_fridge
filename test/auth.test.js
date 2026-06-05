import { describe, it, expect } from 'vitest'
import { quotaDecision, effectivePlan, periodStart, dayStart, TRIAL_DAYS } from '../server/auth.js'

describe('quotaDecision', () => {
  it('allows under the monthly limit and blocks at/over it', () => {
    expect(quotaDecision('free', 'vision', 9)).toMatchObject({ allowed: true, limit: 10 })
    expect(quotaDecision('free', 'vision', 10).allowed).toBe(false)
    expect(quotaDecision('plus', 'chat', 199)).toMatchObject({ allowed: true, limit: 200 })
    expect(quotaDecision('plus', 'chat', 200).allowed).toBe(false)
  })
  it('falls back to the free tier for an unknown tier', () => {
    expect(quotaDecision('mystery', 'vision', 0).limit).toBe(10)
  })
})

describe('effectivePlan', () => {
  it('treats a brand-new account as a Plus trial', () => {
    const p = effectivePlan({ tier: 'free', created_at: new Date().toISOString() })
    expect(p).toMatchObject({ tier: 'plus', paid: false, trial: true })
    expect(p.trialDaysLeft).toBeGreaterThan(0)
    expect(p.trialDaysLeft).toBeLessThanOrEqual(TRIAL_DAYS)
  })
  it('drops to free after the trial window', () => {
    const old = new Date(Date.now() - (TRIAL_DAYS + 1) * 86400000).toISOString()
    expect(effectivePlan({ tier: 'free', created_at: old })).toMatchObject({ tier: 'free', trial: false })
  })
  it('is paid Plus regardless of dates when tier is plus', () => {
    expect(effectivePlan({ tier: 'plus', created_at: '2000-01-01' })).toMatchObject({ tier: 'plus', paid: true })
  })
})

describe('period helpers', () => {
  it('periodStart is the 1st of the month at UTC midnight', () => {
    expect(periodStart(new Date('2026-06-17T12:34:00Z'))).toBe('2026-06-01T00:00:00.000Z')
  })
  it('dayStart is today at UTC midnight', () => {
    expect(dayStart(new Date('2026-06-17T12:34:00Z'))).toBe('2026-06-17T00:00:00.000Z')
  })
})
