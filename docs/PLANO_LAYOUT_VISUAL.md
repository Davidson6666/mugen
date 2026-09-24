# Plano: reformulação do layout visual

Objetivo: trocar toda a interface (menu, seleção, versus, HUD de luta, pausa,
resultado, configurações) por uma que pareça um jogo de luta de verdade, e não
uma página web genérica. Nesta etapa **não se mexe em personagem nem sprite**.

Cada fase foi escrita para rodar numa conversa nova: tem o que fazer, onde olhar
e como provar que funcionou.

---

## Fase 0 — Descoberta (feita)

### 0.1 Referências reais

36 telas reais foram baixadas e abertas. Estão em `docs/referencias-ui/`, fora
do git.

| Tela | Arquivos-chave | O que tirar de cada uma |
|---|---|---|
| Seleção | `nrt_pos4.jpg` (Naruto Path of Struggle, MUGEN) | Personagem grande dos dois lados sobre mancha de tinta, nome em faixa de pincel preta, borda temática em cima e embaixo, nome do cenário em faixa no rodapé |
| Seleção | `c_sel_sfa3.png` (SF Alpha 3) | Grade em formato de losango, arte do escolhido vazando pela borda, texto gigante rolando no topo, "1P" colado no cursor |
| Seleção | `c_sel_kof2002um.png`, `c_sel_kof98.png` | Fundo dividido azul/vermelho, faixas inclinadas para cada lado |
| Versus | `nrt_pos2.png` | Lutadores sobre mancha de tinta, silhuetas gigantes atrás, "VS" pincelado no centro |
| Luta | `cvs2_battle.jpg` (Capcom vs SNK 2) | Barras amarelas com a ponta interna cortada em diagonal, timer grande numa placa oval no centro, retratos nos cantos externos |
| Luta | `kof2002_x.png` | Retrato grande no canto, contador "3 HIT" grande à esquerda, timer em moldura |
| Luta | `sfa1_gameplay.png`, `sfa3_gameplay.png` | Moldura "TIME", nomes itálicos com contorno, combo que "estoura" |
| Menu | `nsng_1.jpg`, `yt_leENdfsQVPg.jpg` | Arte de personagem ocupando metade da tela, lista de opções com contorno forte, item ativo destacado por faixa |

### 0.2 Convenções que fazem parecer jogo de luta

1. Tudo espelhado: P1 e P2 simétricos a partir do centro, com o timer ou o VS como âncora.
2. Barras de vida nos 12% de cima, cada uma com 36–40% da largura, ponta cortada, moldura escura, amarelo com trilha vermelha do dano recente.
3. O timer é o elemento mais chamativo da tela.
4. Retrato no canto externo, nome logo abaixo da barra.
5. **Personagem grande vende todas as telas de menu.** Aqui não dá: o sprite fica no tamanho nativo (decisão do David). Quem segura a tela são as formas, as cores e a tipografia, como no HUD do CvS2.
6. A grade de seleção tem formato (losango, anel, trapézio), e o cursor é uma etiqueta "1P" vermelha e "2P" azul.
7. Letras pesadas, com contorno grosso e, muitas vezes, gradiente.
8. O fundo sempre tem textura: retícula, tinta, padrão repetido. Nunca um gradiente liso vazio.
9. Algo sempre se mexe: texto rolando, combo estourando, personagem respirando.

### 0.3 O que denuncia "cara de IA" (nenhuma das 36 telas faz isso)

Cantos arredondados, cards com sombra suave, painel centralizado sobre fundo
vazio, fonte de sistema sem serifa, grade com espaçamento todo igual, gradiente
suave de duas cores como fundo, bordas de 1px, tela sem personagem.

A interface atual tem várias dessas marcas: painéis `.bevel` centralizados,
grade 3×2 uniforme, retrato pequeno como única arte, fundo de listras diagonais.

### 0.4 Código atual (onde mexer)

- **Todo o CSS** está em `src/App.css` (791 linhas). `src/index.css` só faz o reset.
- **Fontes** vêm por npm, `@fontsource`, importadas em `src/main.jsx:4-6`: Press Start 2P e Silkscreen.
- **Paleta** fica em `src/utils/palette.js`, importada por `main.jsx`, `GameCanvas.jsx` e `Hud.js`. Há dourados fixos no `App.css` (linhas 121, 197, 254, 552 e 685) que furam a paleta.
- **Telas:** `src/components/MainMenu.jsx`, `CharacterSelect.jsx`, `StageSelect.jsx`, `VersusScreen.jsx`, `Battle.jsx` (pausa), `ResultScreen.jsx` e `SettingsScreen.jsx`. As rotas estão em `src/App.jsx:13-21`.
- **Navegação:** `useMenuInput(handlers, enabled)` em `src/utils/useMenuInput.js:36` e `useMenu()` (`go`, `back`, `resetTo`). **Essas APIs ficam como estão**; só a aparência muda.
- **HUD de luta:** `src/systems/Hud.js`, desenhado em Pixi (`Graphics`, `Text`). A API pública `new Hud({ width, names, labels })`, `.view`, `.announce(text, frames)`, `.update(state, delta)` é usada em `GameCanvas.jsx:200-205`.
- **Nenhum teste importa UI.** Os testes cobrem só `src/systems/*`, então o redesenho não quebra teste. A única checagem de UI é o `oxlint`.

### 0.5 APIs permitidas (já usadas no projeto; não inventar outras)

- **Pixi 8:**
  - `new Graphics().rect(x, y, w, h).fill({ color, alpha }).stroke({ color, width })` e `.poly([...])` para ponta cortada (confirmar `poly` na doc do Pixi 8 antes de usar).
  - `new Text({ text, style: { fontFamily, fontSize, fill, stroke: { color, width } } })`, como em `Hud.js:19-31`.
  - `new Sprite(texture)`, `Container`, e `Assets.load(url)` com `texture.source.scaleMode = 'nearest'`, como em `SpriteSheetManager.js`.
- **CSS:** `image-rendering: pixelated`, `clip-path: polygon(...)` para cortes diagonais, `-webkit-text-stroke` / `paint-order` para contorno de texto.
- **Geração de PNG em script Node:** `pngjs`, já dependência, usado em `scripts/import-itachi.mjs`.

### 0.6 Restrições do trabalho acadêmico (PDF da especificação)

- **Exigido e ainda inexistente:**
  - tela de **Ranking** (localStorage) e botão "Ranking" no menu
  - instruções de como jogar
  - pontuação, vidas e tempo visíveis
  - alguma responsividade desktop/mobile
- **"Compatibilidade entre os protótipos de tela com as interfaces desenvolvidas"**, com entrega dos protótipos em **01/10/2026**. O layout desta reformulação precisa virar esses protótipos, ou o contrário.

### 0.7 Lacunas conhecidas

- Nenhuma fonte gratuita tem o itálico pesado cromado dos títulos de SF e KOF. Títulos e nomes grandes precisam ser letreiro gerado como imagem (Fase 2) ou texto CSS com contorno e gradiente sobre fonte pixel.
- Não há arte pintada dos personagens, só sprites de jogo (~110px) e retratos de 50×55, e nada disso será ampliado.
- O elenco vai ficar pequeno (Itachi, Escanor e um dummy). A grade tem que ficar bonita com 3 personagens, usando casas "?" ou bloqueadas como no KOF, em vez de uma grade vazia.

---

## Decisões tomadas

1. **Base visual: Capcom vs SNK 2.** A direção A (screenpack anime MUGEN, com
   pergaminho, tinta e pincel) foi montada e recusada como "meio brega". O David
   prefere os jogos de luta da Capcom.
   - Referências em `docs/referencias-ui/cvs2/`, 30 capturas do Fighters Generation.
   - Principais: `capcomvssnk2-s16.jpg` (HUD), `capcomvssnk2-s4.jpg` (seleção) e `capcomvssnk2-s3.jpg` (K.O.).
2. **Personagem no tamanho exato do sprite, sem zoom.** O David viu a
   comparação (1×, 2× suavizado, 2× em blocos, 3×) e escolheu 1×. Na arena de
   1280×720 o Itachi fica com uns 110px de altura. Vale para menus e para a luta.
3. **Consequência para a luta:** `RENDER_SCALE = 3` em `src/systems/Fighter.js`
   vira 1. Velocidades, pulo, hitboxes e o chão dos mapas foram calibrados para
   3×, então a troca precisa de fase própria, com os testes de combate como rede
   de segurança.
4. **O importador borra o sprite.** `scripts/import-itachi.mjs` reescala as
   fileiras com filtro bilinear (`ROW_SCALE`), o que amolece o pixel. Na fase
   dos personagens, cortar sem reescalar, ou reescalar só em "nearest".

### Vocabulário do CvS2 (visto nas capturas)

- **Losango em tudo:**
  - células da seleção giradas 45°, numa faixa diagonal
  - retratos do HUD em losango
  - marcadores de round
- **Contorno em camadas:** preto, fio branco, preto.
- **Cores:** amarelo-limão `#FDFF17` na vida, emblema laranja `#F0C928`; campos chapados cortados na diagonal (laranja, vermelho, azul) com letreiro gigante apagado ("MILLENNIUM 2001").
- **Tipografia:** itálico condensado pesado, branco com contorno preto. A versão livre usada aqui é a **Barlow Condensed** itálica 600/800/900.
- **Timer:** num triângulo invertido com faixa de título ("MARK OF THE MILLENNIUM").
- **Anúncios:**
  - K.O. gigante sobre faixa amarela
  - combos em cápsulas amarelas ("2 HIT COMBO", "SUPER COMBO FINISH")

---

## Andamento

- **Feito:**
  - fundação de estilo
  - HUD de luta (Fase 2): `src/systems/Hud.js`, com a mesma geometria de `src/utils/hudGeometry.js`
  - telas de seleção, cenário, versus, menu, pausa, resultado e configurações (Fases 4 a 6, exceto o Ranking)
- **Peças compartilhadas:** `src/components/cvs2.jsx`, `src/utils/cvs2Layout.js` e `src/styles/cvs2.css`.
- **Prancha de estilo:** removida depois da aprovação.
- **Escala 1 na luta:** feita.
  - `RENDER_SCALE = 1`.
  - Andar 1,5 px/quadro, pulo 7 com gravidade 0,35 (sobe ~70px, fica 40 quadros no ar).
  - Projéteis com mais ou menos metade da velocidade.
  - Round começa com os lutadores a 220px.
  - Testes reescalados.
- **Itachi do pacote MUGEN:** feito.
  - Importador de .sff/.air em `scripts/lib/`.
  - Motor com duração por quadro, janela de acerto e linha do chão.
  - Gojo removido.
- **Arena:** 700px entre pilares, cenários redesenhados na escala do boneco.
- **Peso da luta:** pausa de impacto, faísca, tremor, empurrão e sombra.
- **Falta:**
  - elenco final (Escanor e dummy)
  - tela de Ranking com a regra de pontuação
  - "Como jogar"
  - verificação final (Fase 7)

## Fase 1 — Fundação de estilo

> **Status: feita, aguardando aprovação do David.**
>
> - **Prancha:** `src/components/StyleBoard.jsx` (`?screen=styleboard`, só em desenvolvimento), com três painéis: seleção, luta com HUD e K.O./kit.
> - **Geometria do HUD:** `src/utils/hudGeometry.js`, a mesma para o SVG da prancha e para o Pixi.
> - **Sprite nos menus:** `src/components/FighterSprite.jsx`, em escala 1.
> - **Paleta:** tokens do CvS2 em `src/utils/palette.js`; os antigos continuam até cada tela ser refeita.
> - **Fontes e CRT:** Barlow Condensed em `main.jsx`; as linhas de CRT (scanlines) foram removidas.

**Não fazer:**
- sombra com desfoque
- gradiente liso de fundo
- fonte de sistema
- ampliar sprite ou retrato

---

## Fase 2 — HUD de luta (`src/systems/Hud.js`)

**Fazer:** portar o painel 2 da prancha para o Pixi, usando os pontos de
`hudGeometry.js` com `Graphics.poly`. Conferir a assinatura na documentação do
Pixi 8 antes de usar. O HUD precisa de:

- barras amarelas com a **trilha vermelha** descendo atrasada depois do golpe
- retrato em losango
- nome em itálico sob a barra
- emblema com o timer
- losangos de vitória de round
- cápsula "N HIT COMBO" do lado de quem ataca
- K.O. gigante sobre faixa amarela

A API pública (construtor, `announce`, `update`) fica igual, com um campo
opcional `portraits` no construtor.

**Checar:**
- capturas em jogo aos 90s, depois de um golpe e no K.O., lado a lado com `capcomvssnk2-s16.jpg`
- `npm test` e `npm run lint` verdes

**Não fazer:** barra de super, de guarda ou de groove. O jogo não tem esses
sistemas, e barra decorativa sem função é detalhe falso.

---

## Fase 3 — Personagens na escala 1

**Fazer:**
- trocar `RENDER_SCALE` para 1
- recalibrar `walkSpeed`, `jumpForce`, `jumpGravity`, o alcance da IA e a posição de partida
- corrigir o importador para não borrar o sprite (item 4 das decisões)
- remover os personagens placeholder e deixar Itachi, Escanor (folha nova) e um dummy

**Checar:**
- testes de combate verdes
- captura da luta com os dois personagens
- o David jogar

---

## Fase 4 — Seleção de personagem e de cenário

**Fazer** (base: painel 1 da prancha e `capcomvssnk2-s4.jpg`):
- campo laranja do P1 e azul do P2, cortados pela faixa diagonal preta com a grade de losangos
- retrato nativo dentro do losango e cursor 1P/2P com etiqueta ao lado
- sprite nativo sobre o pedestal amarelo e nome em cápsula amarela
- "PLAYER SELECT" com timer

`StageSelect` segue a mesma linguagem. `useMenuInput` e a lógica de escolha
ficam como estão.

**Checar:**
- capturas com 1 e com 2 jogadores
- navegação por teclado e gamepad

---

## Fase 5 — Versus

**Fazer:** campos laranja e azul em diagonal, os dois lutadores em tamanho
nativo sobre pedestais, "VS" gigante em itálico com contorno no centro, nomes
em cápsulas e cenário embaixo. Antes de desenhar, capturar uma tela de versus
real da Capcom: o CvS2 do Fighters Generation não tinha nenhuma, só a arte
`capcomvssnk2-s7.jpg`. O pré-carregamento e o tempo mínimo de 1800 ms ficam
como estão.

---

## Fase 6 — Menu principal, pausa, resultado, configurações e Ranking

**Fazer:**
- **Menu:** campos diagonais, logo em itálico pesado, opções em cápsulas, item ativo em amarelo.
- **Opções exigidas pelo PDF:**
  - "Iniciar jogo"
  - **"Ranking"**, tela nova com pontuação em `localStorage`
  - "Como jogar"
- **Pausa e resultado:** na mesma linguagem.

**Decisão pendente com o David:** a regra de pontuação do Ranking.

---

## Fase 7 — Verificação final

1. Capturar todas as telas com o script de captura via DevTools (usado na fase dos efeitos do Itachi) e montar uma folha "antes × depois × referência".
2. Grep dos anti-padrões em `src/`: `box-shadow: .*px .*px [1-9]` (sombra com desfoque), `linear-gradient` em fundo de tela, `sans-serif`, `system-ui` e escala de sprite diferente de 1. Qualquer ocorrência precisa de justificativa.
3. Rodar `npm run lint`, `npm test` e `npm run build`.
4. Testar em 1280×720, 1920×1080 e numa janela estreita, pelo requisito de responsividade.
5. O David joga e aprova.
