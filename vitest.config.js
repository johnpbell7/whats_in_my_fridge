import { defineConfig } from 'vitest/config'

// Minimal config (kept separate from vite.config.js so the PWA plugin isn't
// loaded for tests). Unit tests cover the pure logic — merge, quota,
// classification, expiry, staples.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js']
  }
})
