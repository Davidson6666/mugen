import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // So o app em si (JS/CSS/HTML) entra no precache - os assets de
      // personagens e cenarios (public/assets, ~90MB) sao cacheados sob
      // demanda pelo runtimeCaching abaixo, conforme o jogador de fato usa
      // cada personagem/cenario, em vez de baixar tudo de uma vez na
      // instalacao.
      manifest: {
        name: 'Ruptura Arena',
        short_name: 'Ruptura Arena',
        description: 'Jogo de luta com personagens de anime e ranking online.',
        start_url: '/',
        // 'fullscreen' faz o app instalado abrir ja em tela cheia de
        // verdade (sem precisar clicar no botao); display_override e a
        // lista de fallback pra quando o navegador nao suportar isso.
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        background_color: '#0A0A0C',
        theme_color: '#F53C17',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\/assets\/(characters|maps|sfx)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mugen-game-assets',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
