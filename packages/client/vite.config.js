import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  plugins: [
    // Disable PWA in development — service worker caching breaks HMR
    mode !== 'development' && VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-webfonts', expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 } }
          }
        ]
      },
      manifest: false,
      includeAssets: ['favicon.svg']
    })
  ].filter(Boolean),
  server: {
    port: 3000,
    open: true,
    headers: {
      'Cache-Control': 'no-store'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
}));
