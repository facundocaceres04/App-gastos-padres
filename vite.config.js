import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // La integración de Supabase en Vercel crea SUPABASE_URL / SUPABASE_ANON_KEY (y variantes
  // NEXT_PUBLIC_*). Exponemos solo esas dos al cliente; nunca la service role key.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const url = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '';
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';

  return {
    plugins: [
      react(),
      tailwindcss(),
      // App instalable: manifiesto + service worker que guarda la app (no los datos) para abrir al instante.
      VitePWA({
        registerType: 'prompt', // la versión nueva se aplica cuando el usuario toca "Actualizar"
        injectRegister: false, // se registra desde UpdatePrompt.jsx
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'theme-init.js'],
        manifest: {
          id: '/',
          name: 'Cuentas Claras',
          short_name: 'Cuentas Claras',
          description: 'Gastos compartidos de los chicos entre los dos progenitores, sin discusiones.',
          lang: 'es-AR',
          dir: 'ltr',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          background_color: '#F6F3ED',
          theme_color: '#F6F3ED',
          categories: ['finance', 'lifestyle'],
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          shortcuts: [{ name: 'Agregar gasto', short_name: 'Agregar', url: '/?accion=gasto', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] }],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
          // Supabase (datos, login, comprobantes) nunca se cachea: siempre va a la red.
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'google-fonts-css' },
            },
            {
              urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(url),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(anonKey),
    },
    build: {
      rollupOptions: {
        output: {
          // Librerías aparte: cambian poco, así una actualización de la app baja menos.
          manualChunks(id) {
            if (id.includes('node_modules/@supabase')) return 'supabase';
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
            if (id.includes('node_modules/lucide-react')) return 'icons';
          },
        },
      },
    },
  };
});
