import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Expense Tracker',
        short_name: 'Expenses',
        description: 'Personal expense tracker',
        theme_color: '#9333ea',
        background_color: '#030712',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'minimal-ui'],
        shortcuts: [
          {
            name: 'Widgets',
            short_name: 'Widgets',
            description: 'Quick glance at your finances',
            url: '/widgets',
            icons: [{ src: '/favicon.svg', sizes: 'any' }],
          },
          {
            name: 'New Transaction',
            short_name: 'Add',
            description: 'Add a new transaction',
            url: '/transactions/new',
            icons: [{ src: '/favicon.svg', sizes: 'any' }],
          },
        ],
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
          { src: '/favicon.svg', sizes: '48x48 72x72 96x96 128x128 192x192 256x256 384x384 512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
        screenshots: [
          {
            src: '/favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            form_factor: 'narrow',
            label: 'Expense Tracker Widget View',
          },
        ],
      },
      workbox: {
        navigateFallback: '/',
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
})
