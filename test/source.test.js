import { describe, it, expect } from 'vitest'
import { readQr, cleanCode } from '../src/lib/source.js'

const BASE = 'https://app.whatsinmyfridge.co.uk'

describe('QR codes', () => {
  it('reads the code from the forwarded address and tidies it', () => {
    expect(readQr(`${BASE}/?utm_source=qr&utm_medium=qr&utm_campaign=flyer`)).toEqual({ code: 'flyer', url: '/' })
  })

  it('reads the short address when the installed app serves it', () => {
    expect(readQr(`${BASE}/qr/home`)).toEqual({ code: 'home', url: '/' })
    expect(readQr(`${BASE}/qr/Poster-2/`)).toEqual({ code: 'poster-2', url: '/' })
  })

  it('keeps other parts of the address', () => {
    expect(readQr(`${BASE}/?utm_source=qr&utm_campaign=home&upgrade=1#x`)).toEqual({ code: 'home', url: '/?upgrade=1#x' })
  })

  it('ignores normal visits', () => {
    expect(readQr(`${BASE}/`)).toBeNull()
    expect(readQr(`${BASE}/?checkout=success`)).toBeNull()
    expect(readQr(`${BASE}/?utm_source=instagram&utm_campaign=x`)).toBeNull()
  })

  it('refuses odd codes but still tidies the address', () => {
    expect(readQr(`${BASE}/qr/%3Cscript%3E`)).toEqual({ code: null, url: '/' })
    expect(cleanCode('a'.repeat(61))).toBeNull()
    expect(cleanCode(' Van ')).toBe('van')
  })
})
