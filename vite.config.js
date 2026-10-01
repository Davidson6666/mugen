import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt': a versao nova fica esperando em vez de entrar sozinha, e
      // quem decide a hora e o jogador pelo aviso na tela (UpdateBanner.jsx).
      // Entrar sozinha no meio de uma partida seria pior.
      registerType: 'prompt',
      // O registro do service worker acontece no UpdateBanner, pra ele saber
      // quando tem versao nova esperando; sem isto, o plugin injetaria um
      // segundo registro por fora.
      injectRegister: null,
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
            // NetworkFirst, e nao CacheFirst: com CacheFirst o app servia pra
            // sempre o personagem que ja estava gravado e nem perguntava ao
            // servidor. Um personagem atualizado so aparecia com Ctrl+Shift+R
            // e voltava ao antigo assim que o app era reaberto - foi o que
            // aconteceu com o Humberto, e aconteceria com qualquer mudanca em
            // personagem ou cenario.
            //
            // Perguntar primeiro e barato: o servidor responde "nao mudou"
            // (304) quando o arquivo e o mesmo, sem reenviar os megabytes. Sem
            // internet, cai no cache e o jogo continua jogavel.
            handler: 'NetworkFirst',
            options: {
              cacheName: 'mugen-game-assets',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
