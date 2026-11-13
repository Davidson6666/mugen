# Humberto — remasterização pelas fotografias (v8)

192 poses de pixel art detalhado para combinar com os outros professores:
96 normais e 96 lendárias, em oito folhas de 24 poses. O rosto de meia-idade,
o cabelo penteado de lado, a barba discreta, a camiseta preta, a calça oliva
e os tênis de solado claro seguem as fotografias originais enviadas pelo usuário.
As poses de vitória valorizam a expressão simpática do professor.

As folhas de movimento, combate, reações e especiais incluem defesa, dano,
queda, recuperação, frascos, Six Seven, katana, Katon e petrificação. As quatro
folhas lendárias mantêm a identidade e acrescentam o cabelo verde inspirado no Broly.
Arte criada com ImageGen; efeitos separados do corpo e fundo transparente.

## Reconstrução atual

`npm run assets:humberto`

Fontes: `assets-src/humberto/remaster/*-source.png`.
Saídas: `humberto_movement.png`, `humberto_combat.png`,
`humberto_reactions.png`, `humberto_specials.png`, suas quatro versões
`humberto_legendary_*.png` e o retrato atualizado.

O empacotador preserva cabelos, mãos, solas e espadas por componentes conexos,
normaliza a escala pelo rosto e pelos pés, mantém o apoio em y=330 e usa nearest.
A grade lógica de 320×350 e a escala física anterior continuam no config.
Dano, alcance, eventos, comandos, duração dos ataques, transformação e sons
permanecem. Postura, caminhada e recuperação usam quatro poses dentro da mesma duração.

O `frameMap` visual lendário mantém Katon e Judgement Cut End com cabelo verde
sem duplicar os golpes, as recargas ou os limites por round. Os sprites antigos
permanecem como histórico e não são carregados pelo config ativo.

Prévias: `/docs/humberto-remaster-preview.html` mostra as duas formas e as 192
poses; `/docs/humberto-combat-preview.html` executa golpes e efeitos na simulação real.

## Histórico v6 (substituído pela versão acima)

64 poses integradas: 32 normais e as mesmas 32 na transformação. Rosto, camiseta preta e calça oliva preservam a identidade do professor. Cabelo verde em mechas largas, coroa radial e franja inspirado na referência do Broly enviada pelo usuário.

Arte criada com a ferramenta integrada ImageGen, seguindo o estudo v6 aprovado. Prompt: folha transparente de 8 colunas e 4 linhas com idle, caminhada, agachamento, defesa, socos, chutes, salto, queda, dano, KO, vitória, uppercut, carga, lançamento de frasco, palmas, transformação, dash, rasteira e gestos Six Seven. Repetir exatamente as poses na versão transformada, alterando o cabelo. Pixel art grosseiro, paleta limitada, sem efeitos embutidos no corpo.

Corpos reduzidos para aproximadamente 60 pixels de altura; cabelo acrescenta 16 pixels. Atlas utiliza ampliação nearest de 4x para preservar as coordenadas de colisão do jogo. Efeitos de ki de 28×24 pixels e impacto de 40×40, em cinco cores. Auras e efeitos têm transparência e filtro nearest. Efeitos químicos continuam em sua resolução pequena original.

## Comandos (relativos ao adversário)

- Frente + P: ki verde (mais forte transformado).
- Trás + K: esfera de petrificação; paralisa por 1,5 segundo se acertar, bloqueável.
- Baixo, baixo + S: transformação lendária; dura 12 segundos, uma por round.
- Baixo, frente + S: canhão lendário enquanto transformado.
- Demais comandos de química e Six Seven permanecem na lista de golpes do jogo.

P/K/S correspondem por padrão a J/K/L. Sons novos sintetizados para ki, transformação e petrificação.

Arquivos ativos: humberto_body.png, humberto_legendary.png, chemistry_fx.png, legendary_fx.png e humberto_portrait.png. Configuração versionada como humberto-legendary-v6 para atualizar o carregamento das texturas.
