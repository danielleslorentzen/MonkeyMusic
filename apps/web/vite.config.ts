import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Served from a subpath on GitHub Pages project sites
// (danielleslorentzen.github.io/MonkeyMusic/); the Pages workflow sets
// BASE_PATH=/MonkeyMusic/. Dev, local builds, and the Capacitor mobile
// shell all want root-relative assets, so BASE_PATH is unset there.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Lyd',
        short_name: 'Lyd',
        description: 'Your playful music companion — hears chords, hums melodies, keeps time. Fully offline.',
        theme_color: '#1a1423',
        background_color: '#1a1423',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything must be precached: full offline cold-start is a tenet.
        globPatterns: ['**/*.{js,css,html,svg,wasm,woff2}'],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
  },
  build: {
    target: 'es2022',
  },
});
