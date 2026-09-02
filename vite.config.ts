import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  return {
    base: '/AB-YAPI/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo.svg'],
        manifest: {
          id: '/AB-YAPI/',
          name: 'AB Yapı İnşaat & Mimari Hesaplayıcı',
          short_name: 'AB Yapı',
          description: 'AB Yapı kentsel dönüşüm, inşaat maliyeti, 3D bina modeli ve 2D mimari kat planı uygulaması',
          theme_color: '#4f46e5',
          background_color: '#09090b',
          display: 'standalone',
          orientation: 'any',
          start_url: '/AB-YAPI/',
          scope: '/AB-YAPI/',
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
  };
});
