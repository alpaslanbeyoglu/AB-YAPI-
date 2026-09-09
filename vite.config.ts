import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['apple-touch-icon.png', 'logo.svg'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) =>
                request.destination === 'script' ||
                request.destination === 'style' ||
                url.pathname.endsWith('.js') ||
                url.pathname.endsWith('.css') ||
                url.pathname.includes('/assets/'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'app-assets',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 30 * 24 * 60 * 60,
                },
              },
            },
            {
              urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts',
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        manifest: {
          id: '/',
          name: 'AB Yapı İnşaat & Mimari Hesaplayıcı',
          short_name: 'AB Yapı',
          description: 'AB Yapı kentsel dönüşüm, inşaat maliyeti, 3D bina modeli ve 2D mimari kat planı uygulaması',
          theme_color: '#4f46e5',
          background_color: '#09090b',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: ['es2020', 'safari14'],
      outDir: 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 4000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three')) {
              return 'three-vendor';
            }
            if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
              return 'firebase-vendor';
            }
            if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) {
              return 'pdf-vendor';
            }
            if (id.includes('node_modules/d3')) {
              return 'd3-vendor';
            }
            if (
              id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/motion') ||
              id.includes('node_modules/lucide-react')
            ) {
              return 'react-vendor';
            }
          },
        },
      },
    },
  };
});
