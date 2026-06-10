import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// The API (Anthropic key holder) runs on 8787 in dev; the browser only ever
// talks to /api, never to Anthropic directly. See server/index.js.
const API_PORT = process.env.API_PORT || 8787

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // We register the SW ourselves (main.jsx) so we can poll for updates and
      // refresh on refocus, not only at page load.
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icon.svg', 'icon-maskable.svg', 'apple-touch-icon.png'],
      manifest: {
        name: "What's in my Fridge.",
        short_name: 'Fridge',
        description: "Tracks what's in your fridge — with photo recognition and chat.",
        theme_color: '#2f7d5a',
        // Match the steel doors so Android's launch screen flows straight into
        // the intro instead of flashing the icon on a different background.
        background_color: '#d3d7da',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        // PNG icons (with a full-bleed maskable) so Android/Chrome treats the
        // app as installable and the home-screen icon renders crisply; the SVGs
        // stay as scalable fallbacks.
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
        ]
      },
      workbox: {
        // Don't try to cache the API — those calls must always hit the network.
        navigateFallbackDenylist: [/^\/api/],
        // Take over and drop stale caches as soon as a new version deploys, so
        // an old cached shell can never strand the app on a blank screen.
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      }
    })
  ],
  build: {
    // Split big, rarely-changing dependencies out of the main app chunk so the
    // first paint isn't held behind one 585 KB file and they cache separately
    // across deploys.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          motion: ['framer-motion'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true
      }
    }
  }
})
