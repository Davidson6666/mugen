# Trilha sonora

MP3s completos fornecidos pelo usuário, copiados sem cortes, recompressão ou alteração de velocidade.

- `tekken3-opening.mp3`: Opening — Tekken 3, nos menus.
- `devils-never-cry.mp3`: Devils Never Cry — Devil May Cry 3, nas lutas. A reprodução começa em 1:15, pulando a introdução; o arquivo original permanece completo.
- `bayonetta-fly-me-to-the-moon.mp3`: Fly Me To The Moon (Climax) — Bayonetta, nas lutas. Fonte: a segunda cópia enviada, com sufixo `- Someone`; a primeira estava vazia.

As duas músicas de luta alternam ao terminar e entre partidas. Uma única faixa toca por vez, com redução suave antes da troca. Não reinicia entre rounds. Pausa do jogo, aba oculta e volume zero suspendem a reprodução sem perder a posição.

O volume `MUSICA` é independente e começa em 20%, multiplicado pelo volume geral. Com volume geral padrão de 80%, a música toca a 16% de amplitude nos menus e 12,8% nas lutas; durante falas e especiais longos, cai para aproximadamente 4,5%. Esses valores são ganhos de reprodução, não medições de loudness. A entrada e recuperação de volume são suaves. Ajustável em Configurações.

Reprodução por streaming de HTMLAudioElement, sem decodificar músicas completas na memória dos efeitos. O navegador exige um primeiro clique/tecla para liberar o som; ações de menu pelo controle também tentam liberá-lo. Sem permissão do navegador, aguarda um gesto aceito.

Código: `src/systems/Soundtrack.js`. Prévia: `/docs/soundtrack-preview.html` com Vite.
