// Importa o Sukuna do pacote MUGEN "Sukuna Heian" (jonhny6969; creditos em
// CREDITS.md). O pacote fica em assets-src/sukuna-heian/mugen/ (fora do git).
// Para regerar: npm run assets:sukuna
//
// O pacote e fundo: 3731 sprites, 112 animacoes so na faixa comum, e todas as
// animacoes padrao do MUGEN (virar, pulo duplo, apanhar, ser lancado, levantar)
// vem prontas. O mapa de golpes saiu do cmd.cmd -> estado -> "anim = stateno":
//
//   A: 200 -> 210 -> 220 -> 230 -> 240 -> 250 -> 260   (os 7 do MOVESET.txt)
//   B: 300 -> 310 -> 320 -> 330 -> 340
//   C: 400 -> 410 -> 430                                (a corrente da lanca)
//   no ar: 600 (soco), 615 (chute), 3599 (mergulho com a lanca)
//   especiais: 11070, 3000, 2999, 3900, 3800, 11300
//   supers: 3001 (X) e 13000 (Y, o dominio)
//
// Onde o autor desenhou clsn1, a caixa daqui e a dele, quadro a quadro; onde
// nao desenhou (os especiais, que no MUGEN acertam por helpers que este motor
// nao roda), a caixa foi declarada do tamanho do desenho, medida pela caixa
// opaca do sprite.
//
// O ataque de verdade dos especiais mora nos helpers do pacote, que aqui viram
// EFFECTS: o corte branco (3051), a cruz de cortes (7027), o pilar de raio
// (8425), o redemoinho (7092/7280), o portal (6070), o torii do Santuario
// Maligno (3010) e o respingo amaldicoado com a caveira (13003).
//
// O sprite parado tem 83 px: spriteScale 1.3 poe ele na altura do elenco (a
// caixa de dano fica em 95, que e a do Gojo, do Humberto e do Ensina).
// Botoes: soco = a, chute = b, especial = c (a lanca).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importMugenCharacter } from './lib/mugen-import.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = resolve(ROOT, 'assets-src/sukuna-heian/mugen');

const fx = (at, id, pos = [0, 0], extra = {}) => ({ at, effect: { id, pos, ...extra } });
// Janela de acerto declarada: quadros from..until, caixa em px do pacote.
const strike = (from, until, rect, data) => ({ from, until, rect, ...data });

const NORMAL = { specialCancel: true };

// Cortes do dominio: um a cada 10 ticks em cima do oponente, alternando o
// desenho pra nao virar a mesma imagem piscando.
const DOMAIN_CUTS = Array.from({ length: 14 }, (_, index) => fx(60 + index * 10, index % 2 ? 'crossCut' : 'crescent', [
  [-20, 10, -5, 20, 0, -15][index % 6], [-45, -25, -60, -35, -20, -50][index % 6],
], { target: 'opponent' }));

const ANIMATIONS = {
  idle: { actions: [0], loop: true },
  walkForward: { actions: [20], loop: true },
  walkBackward: { actions: [21], loop: true },
  jump: { actions: [40, 41] },
  crouch: { actions: [11], loop: true },
  blockStanding: { actions: [130], loop: true },
  blockCrouching: { actions: [131], loop: true },
  hitReaction: { actions: [5000] },
  ko: { actions: [5030, 5050, 5100, 5110] },
  victoryPose: { actions: [180] },
  defeatPose: { actions: [170] },

  // Corrida: o mergulho pra frente (100). Recuo: o pulo pra tras (43), porque
  // a 105 do pacote esta vazia.
  dashForward: {
    actions: [{ id: 100, lengthTicks: 18 }],
    dash: { distance: 185, moveFrom: 0, moveUntil: 12, invulnerableFrom: 2, invulnerableUntil: 8, cancel: true },
  },
  dashBackward: {
    actions: [{ id: 43, lengthTicks: 16 }],
    dash: { distance: 145, moveFrom: 0, moveUntil: 4, invulnerableFrom: 1, invulnerableUntil: 3, cancel: true },
  },
  airDashForward: {
    actions: [{ id: 100, lengthTicks: 12 }],
    dash: { distance: 150, moveFrom: 0, moveUntil: 11, invulnerableFrom: 99, invulnerableUntil: 0 },
  },
  airDashBackward: {
    actions: [{ id: 43, lengthTicks: 10 }],
    dash: { distance: 115, moveFrom: 0, moveUntil: 9, invulnerableFrom: 99, invulnerableUntil: 0 },
  },

  // ---- Corrente do soco: sete golpes, como o MOVESET.txt do pacote ----
  punch: {
    actions: [200],
    ...NORMAL,
    areas: [strike(3, 4, [15, -47, 39, -20], { damage: 3, hitstun: 18, push: 4 })],
    events: [{ at: 6, vx: 4 }],
    cancels: [{ on: 'punch', to: 'punch2', after: 6 }, { on: 'kick', to: 'kick', after: 6 }, { on: 'special', to: 'lance', after: 6 }],
  },
  punch2: {
    actions: [210],
    ...NORMAL,
    areas: [strike(2, 3, [15, -47, 52, -25], { damage: 3, hitstun: 20, push: 4 })],
    events: [{ at: 5, vx: 5 }],
    cancels: [{ on: 'punch', to: 'punch3', after: 6 }, { on: 'special', to: 'lance', after: 6 }],
  },
  // 220: o avanco que corta varias vezes (o autor desenhou clsn1 em cinco
  // quadros seguidos, cada um mais longo que o anterior).
  punch3: {
    actions: [220],
    ...NORMAL,
    noPush: true,
    areas: [
      strike(2, 3, [18, -63, 96, -1], { damage: 2, hitstun: 20, push: 2 }),
      strike(4, 6, [19, -57, 91, 1], { damage: 2, hitstun: 22, push: 3 }),
    ],
    events: [{ at: 3, vx: 8 }, fx(4, 'slashArc', [45, -35], { scale: [0.5, 0.35] })],
    cancels: [{ on: 'punch', to: 'punch4', after: 10 }, { on: 'special', to: 'lance', after: 10 }],
  },
  // 230: ele mergulha e corta embaixo.
  punch4: {
    actions: [230],
    ...NORMAL,
    areas: [strike(6, 7, [3, -57, 46, -13], { damage: 3, hitstun: 22, push: 4 })],
    events: [{ at: 11, vx: 6 }, fx(14, 'dust', [20, 2], { scale: 0.18 }), { at: 4, sound: 's5_5' }],
    cancels: [{ on: 'punch', to: 'punch5', after: 17 }, { on: 'special', to: 'lance', after: 17 }],
  },
  punch5: {
    actions: [240],
    ...NORMAL,
    areas: [strike(2, 4, [1, -58, 35, -6], { damage: 3, hitstun: 22, push: 4 })],
    events: [fx(6, 'redSpark', [20, -35], { scale: 0.5 }), { at: 5, sound: 's10_42' }],
    cancels: [{ on: 'punch', to: 'punch6', after: 6 }, { on: 'special', to: 'lance', after: 6 }],
  },
  // 250: o giro de perna.
  punch6: {
    actions: [250],
    ...NORMAL,
    areas: [strike(2, 4, [10, -50, 53, -8], { damage: 3, hitstun: 24, push: 5 })],
    events: [fx(6, 'slashArc', [25, -30], { scale: [0.35, 0.25] })],
    cancels: [{ on: 'punch', to: 'punch7', after: 8 }],
  },
  // 260: o chute girando que fecha a corrente e lanca.
  punch7: {
    launch: { vx: 4, vy: 6 },
    actions: [260],
    areas: [strike(3, 4, [7, -57, 45, -15], { damage: 4, hitstun: 34, push: 10, heavy: true })],
    events: [{ at: 10, vx: 4 }, fx(12, 'clawSlash', [30, -35], { scale: 0.5 })],
  },

  // ---- Corrente do chute ----
  kick: {
    actions: [300],
    ...NORMAL,
    areas: [strike(2, 3, [8, -69, 45, -9], { damage: 3, hitstun: 20, push: 4 })],
    events: [{ at: 4, vx: 4 }],
    cancels: [{ on: 'kick', to: 'kick2', after: 7 }, { on: 'special', to: 'lance', after: 7 }],
  },
  kick2: {
    actions: [310],
    ...NORMAL,
    areas: [strike(5, 6, [11, -49, 41, -19], { damage: 3, hitstun: 20, push: 4 })],
    events: [{ at: 10, vx: 4 }],
    cancels: [{ on: 'kick', to: 'kick3', after: 13 }, { on: 'special', to: 'lance', after: 13 }],
  },
  // 320: o chute que sobe.
  kick3: {
    actions: [{ id: 320, times: { 2: 12 } }],
    ...NORMAL,
    areas: [strike(2, 2, [21, -49, 54, -9], { damage: 3, hitstun: 24, push: 6 })],
    events: [{ at: 6, vx: 5 }, fx(6, 'slashArc', [30, -30], { scale: [0.4, 0.3] })],
    cancels: [{ on: 'kick', to: 'kick4', after: 10 }],
  },
  // 330: o braco estendido, o mais longo da corrente.
  kick4: {
    actions: [{ id: 330, times: { 2: 8 } }],
    ...NORMAL,
    areas: [strike(1, 2, [0, -72, 77, -9], { damage: 3, hitstun: 26, push: 6 })],
    events: [fx(3, 'crossCut', [55, -35], { scale: 0.3 })],
    cancels: [{ on: 'kick', to: 'kick5', after: 8 }],
  },
  // 340: ele aponta e o corte sai sozinho a frente.
  kick5: {
    launch: { vx: 3, vy: 5 },
    actions: [{ id: 340, times: { 0: 6, 1: 8, 2: 8, 3: 8, 4: 8, 5: 10 } }],
    areas: [strike(2, 4, [40, -80, 130, 2], { damage: 4, hitstun: 32, push: 8, heavy: true })],
    events: [fx(14, 'crescent', [85, -40], { scale: 0.5 }), fx(20, 'crossCut', [95, -35], { scale: 0.4 })],
  },

  // ---- Corrente da lanca (botao especial) ----
  // 400: a estocada. O autor desenhou a caixa indo ate x=113 - e o golpe de
  // maior alcance do personagem.
  lance: {
    actions: [400],
    ...NORMAL,
    areas: [
      strike(3, 3, [17, -42, 113, -24], { damage: 4, hitstun: 24, push: 6 }),
      strike(4, 4, [-70, -57, 88, -2], { damage: 2, hitstun: 20, push: 3 }),
    ],
    events: [fx(15, 'clawSlash', [70, -32], { scale: [0.8, 0.4] })],
    cancels: [{ on: 'special', to: 'lance2', after: 22 }],
  },
  // 410: ele roda a lanca; os quatro quadros tem a mesma caixa.
  lance2: {
    actions: [410],
    ...NORMAL,
    areas: [strike(0, 3, [15, -54, 72, 3], { damage: 2, hitstun: 18, push: 2, every: 4, count: 3 })],
    events: [fx(0, 'slashArc', [45, -30], { scale: [0.6, 0.5] })],
    cancels: [{ on: 'special', to: 'lance3', after: 8 }],
  },
  // 430: o giro largo que fecha, com a caixa de cima e a de baixo do autor.
  lance3: {
    launch: { vx: 5, vy: 7 },
    actions: [430],
    areas: [strike(2, 3, [-63, -93, 55, 6], { damage: 5, hitstun: 36, push: 12, heavy: true })],
    events: [fx(15, 'clawSlash', [0, -50], { scale: 0.9 }), fx(16, 'dust', [-20, 2], { scale: 0.2 }), { at: 0, sound: 's0_38' }],
  },

  // ---- No ar ----
  airLight: {
    actions: [600],
    air: true,
    ...NORMAL,
    areas: [strike(2, 3, [4, -52, 53, -22], { damage: 3, hitstun: 20, push: 4 })],
    events: [{ at: 5, sound: 's5_1' }],
    cancels: [{ on: 'kick', to: 'airMedium', after: 10 }, { on: 'special', to: 'airStrong', after: 10 }],
  },
  airMedium: {
    actions: [615],
    air: true,
    ...NORMAL,
    areas: [strike(3, 4, [4, -71, 38, -11], { damage: 3, hitstun: 22, push: 5 })],
    events: [fx(12, 'slashArc', [20, -40], { scale: [0.35, 0.3] }), { at: 10, sound: 's10_42' }],
  },
  // 3599: ele desce de lanca em riste. No pacote nao tem gravidade (physics
  // = N) e a caixa cobre o corpo todo; aqui vira um mergulho normal.
  airStrong: {
    actions: [{ id: 3599, lengthTicks: 30 }],
    air: true,
    areas: [strike(0, 99, [-20, -95, 25, 10], { damage: 4, hitstun: 30, push: 8, heavy: true })],
    events: [{ at: 0, vx: 6, vy: 5 }, fx(0, 'redSpark', [0, -45], { scale: 0.4 })],
  },

  // ---- Segurando ↓ ----
  // 270: agachado, ele chama os cortes a frente.
  crouchSummon: {
    actions: [{ id: 270, times: { 1: 18, 2: 8 } }],
    cooldown: 60,
    areas: [strike(1, 2, [15, -60, 95, 3], { damage: 4, hitstun: 26, push: 6 })],
    events: [fx(8, 'redSpark', [45, -25], { scale: 0.45 }), fx(10, 'crossCut', [60, -25], { scale: 0.35 })],
  },
  // 21999 -> 22000: ele se firma e explode em cortes ao redor (a caixa do
  // 22000 pega dos dois lados, inclusive atras).
  spearCharge: {
    actions: [{ id: 21999, times: { 1: 10, 2: 6 } }],
    cooldown: 150,
    invulnerable: [14, 26],
    events: [fx(14, 'ringBurst', [0, -35], { scale: 0.5 })],
    next: 'spearBurst',
  },
  spearBurst: {
    launch: { vx: 4, vy: 6 },
    actions: [{ id: 22000, lengthTicks: 26 }],
    noPush: true,
    areas: [strike(0, 99, [-46, -57, 40, 1], { damage: 6, hitstun: 34, push: 10, heavy: true })],
    events: [fx(0, 'ringSlash', [0, -30], { scale: 0.6 }), fx(2, 'groundRings', [0, 0], { scale: 0.5 })],
  },

  // ---- Especiais ----
  // 11070 (↓→P): ele encara, para tudo, e abre o corte. No pacote a caixa
  // pega a tela inteira (-129..135); aqui so o que esta a frente.
  dismantle: {
    launch: { vx: 4, vy: 5 },
    actions: [{ id: 11070, times: { 5: 20, 10: 8 } }],
    cooldown: 180,
    invulnerable: [0, 44],
    areas: [strike(6, 7, [0, -110, 130, 5], { damage: 8, hitstun: 40, push: 14, heavy: true })],
    events: [
      fx(20, 'redSpark', [10, -45], { scale: 0.5 }),
      fx(40, 'crescent', [70, -45], { scale: 0.9 }),
      fx(42, 'crossCut', [80, -40], { scale: 0.6 }),
      fx(44, 'darkStreaks', [60, -40], { scale: 0.7 }),
    ],
  },
  // 3000 (↓←P): a carga longa que termina na explosao amaldicoada.
  cursedBlast: {
    actions: [{ id: 3000, durationScale: 0.4 }],
    cooldown: 300,
    invulnerable: [0, 52],
    areas: [strike(6, 8, [10, -120, 150, 5], { damage: 10, hitstun: 44, push: 16, heavy: true })],
    events: [
      fx(4, 'redSpark', [0, -40]),
      fx(40, 'cursedPlume', [60, -10]),
      fx(52, 'cursedPlume', [110, -10]),
      fx(56, 'burstRing', [100, -45]),
      fx(58, 'fireBall', [105, -50]),
      fx(60, 'rubble', [110, 0]),
    ],
  },
  // 2999 (↓→K): o redemoinho que abre na frente dele.
  vortex: {
    actions: [{ id: 2999, times: { 2: 20, 4: 18 } }],
    cooldown: 200,
    events: [
      fx(10, 'redBolt', [35, -40], { scale: 0.5 }),
      fx(14, 'voidSpiral', [75, -45]),
      fx(20, 'sparkles', [75, -45], { scale: 0.5 }),
    ],
  },
  // 3900 (↓←K): o chao se levanta e o raio desce em cima.
  eruption: {
    actions: [{ id: 3900, times: { 5: 14, 6: 12 } }],
    cooldown: 220,
    events: [
      fx(34, 'ledge', [90, 0], { scale: 0.5 }),
      fx(38, 'boltPillar', [90, -20]),
      fx(40, 'ringFlash', [90, -5], { scale: 0.6 }),
    ],
  },
  // 3800 (↓→S): ele abre o portal amaldicoado em cima do adversario.
  portal: {
    actions: [{ id: 3800, lengthTicks: 50 }],
    cooldown: 260,
    events: [fx(6, 'redSpark', [0, -40]), fx(12, 'cursedPortal', [75, -30])],
  },
  // 11300 (↓←S): o santuario inteiro desce a frente.
  shrineCall: {
    actions: [{ id: 11300, durationScale: 0.45 }],
    cooldown: 280,
    events: [fx(10, 'shrine', [70, 0]), fx(24, 'shrineSmoke', [70, -30], { scale: 0.6 })],
  },

  // ---- Supers ----
  // 3001 (X): ele se firma e o vazio engole a frente.
  voidStorm: {
    actions: [{ id: 3001, times: { 2: 50 } }],
    cooldown: 900,
    invulnerable: [0, 60],
    events: [
      fx(10, 'redSpark', [0, -40], { scale: 0.7 }),
      fx(18, 'voidSpiral', [70, -45], { scale: 1.4 }),
      fx(26, 'clawSlash', [70, -45], { scale: 0.9 }),
      fx(38, 'crossCut', [70, -40], { scale: 0.7 }),
      fx(50, 'crescent', [70, -45], { scale: 1.1 }),
    ],
  },
  // 13000 (Y): Dominio - Santuario Maligno. Prende o oponente e corta ate o
  // fim, como o MUGEN faz com o helper 20010.
  domain: {
    actions: [{ id: 13000, times: { 3: 70 } }],
    cooldown: 1500,
    invulnerable: [0, 165],
    events: [
      { at: 24, standAt: -80, pinOpponent: { dx: 0, lift: 0, ticks: 140 } },
      fx(24, 'cutIn', [0, -60], { target: 'stage' }),
      fx(30, 'shrineField', [-60, 0], { target: 'stage' }),
      ...DOMAIN_CUTS,
      fx(200, 'cursedSkull', [0, -40], { target: 'opponent' }),
    ],
  },
};

const EFFECTS = {
  // Os tamanhos (size) foram medidos pela celula gerada: o pacote desenha
  // efeito de tela cheia (o portal tem 402 px de celula, quatro vezes o
  // lutador), entao cada um foi reduzido ate ficar na escala da arena.
  // Faiscas e poeira
  dust: { actions: [7019], harmless: true },
  redSpark: { actions: [9011], size: 0.16, harmless: true },
  sparkles: { actions: [8241], size: 0.25, harmless: true },
  rubble: { actions: [1205], size: 0.2, harmless: true },
  groundRings: { actions: [30203], size: 0.25, harmless: true },
  ringFlash: { actions: [829], size: 0.18, harmless: true },
  shrineSmoke: { actions: [{ id: 7054, lengthTicks: 50 }], size: 0.23, alpha: 0.8, layer: 'back', harmless: true },

  // Cortes
  slashArc: { actions: [332], size: 0.4, harmless: true },
  crescent: {
    actions: [3051],
    size: 0.4,
    area: { rect: [-120, -70, 120, 50], until: 4, damage: 2, hitstun: 26, push: 4 },
  },
  crossCut: {
    actions: [7027],
    size: 0.35,
    area: { rect: [-130, -55, 130, 55], until: 3, damage: 2, hitstun: 26, push: 4 },
  },
  clawSlash: {
    actions: [30029],
    size: 0.7,
    area: { rect: [-60, -40, 60, 40], until: 3, damage: 2, hitstun: 24, push: 4 },
  },
  darkStreaks: { actions: [1345], size: 0.4, harmless: true },
  ringSlash: { actions: [7037], size: 0.16, harmless: true },
  ringBurst: { actions: [9014], size: 0.3, harmless: true },

  // Fogo e energia
  redBolt: { actions: [1013], size: 0.15, harmless: true },
  cursedPlume: {
    actions: [{ id: 7530, lengthTicks: 30 }],
    size: 0.5,
    area: { rect: [-70, -220, 70, 10], until: 6, damage: 2, hitstun: 30, push: 4, every: 6, count: 3 },
  },
  burstRing: { actions: [7229], size: 0.15, harmless: true },
  fireBall: {
    actions: [1506],
    size: 0.28,
    area: { rect: [-90, -90, 90, 60], until: 4, damage: 3, hitstun: 30, push: 8, heavy: true },
  },
  ledge: { actions: [{ id: 99050, lengthTicks: 40 }], size: 0.5, harmless: true },
  boltPillar: {
    actions: [{ id: 8425, lengthTicks: 48 }],
    size: 0.5,
    scale: 0.7,
    area: { rect: [-70, -300, 70, 10], until: 20, damage: 2, hitstun: 28, push: 5, every: 6, count: 5 },
  },

  // Vazio e santuario
  voidSpiral: {
    actions: [{ id: 7092, lengthTicks: 48 }],
    size: 0.5,
    scale: 0.8,
    area: { rect: [-130, -130, 130, 130], until: 40, damage: 1, hitstun: 24, push: 2, every: 5, count: 8 },
  },
  // O portal nasce do chao cortando: e ele que da o dano do golpe, nao o pose.
  cursedPortal: {
    actions: [{ id: 6070, lengthTicks: 54 }],
    size: 0.27,
    layer: 'back',
    area: { rect: [-150, -400, 150, 10], until: 30, damage: 2, hitstun: 28, push: 5, every: 7, count: 4 },
  },
  shrine: {
    actions: [{ id: 8060, lengthTicks: 60 }],
    size: 0.6,
    area: { rect: [-120, -200, 120, 10], until: 40, damage: 2, hitstun: 30, push: 6, every: 8, count: 5 },
  },
  shrineField: { actions: [{ id: 3010, lengthTicks: 150 }], size: 0.7, layer: 'back', alpha: 0.85, harmless: true },
  cutIn: { actions: [{ id: 7096, lengthTicks: 50 }], scale: 0.6, cover: [520, 430], alpha: 0.9, harmless: true },
  cursedSkull: {
    actions: [{ id: 13003, lengthTicks: 40 }],
    size: 0.27,
    scale: 0.5,
    area: { rect: [-200, -200, 200, 60], until: 3, damage: 10, hitstun: 50, push: 16, heavy: true, unblockable: true },
  },
};

const COMBOS = [
  { id: 'domain', input: '↓→↓→P', animation: 'domain' },
  { id: 'void-storm', input: '↓→↓→K', animation: 'voidStorm' },
  { id: 'dismantle', input: '↓→P', animation: 'dismantle' },
  { id: 'cursed-blast', input: '↓←P', animation: 'cursedBlast' },
  { id: 'vortex', input: '↓→K', animation: 'vortex' },
  { id: 'eruption', input: '↓←K', animation: 'eruption' },
  { id: 'portal', input: '↓→S', animation: 'portal' },
  { id: 'shrine-call', input: '↓←S', animation: 'shrineCall' },
  { id: 'crouch-summon', input: 'P', hold: '↓', animation: 'crouchSummon' },
  { id: 'low-dive', input: 'K', hold: '↓', animation: 'punch4' },
  { id: 'spear-burst', input: 'S', hold: '↓', animation: 'spearCharge' },
];

const BUTTONS = {
  ground: { punch: 'punch', kick: 'kick', special: 'lance' },
  air: { punch: 'airLight', kick: 'airMedium', special: 'airStrong' },
};

const MOVE_LIST = [
  { section: 'Movimento', name: 'Corrida', input: '→→', note: 'Mergulha para frente; emenda num golpe' },
  { section: 'Movimento', name: 'Recuo', input: '←←' },
  { section: 'Movimento', name: 'Dash aéreo', input: '→→', note: 'No ar' },
  { section: 'Movimento', name: 'Pulo duplo', input: '↑↑', note: 'No ar, aperte para cima de novo' },
  { section: 'Golpes', name: 'Sequência do soco', input: 'PPPPPPP', note: 'Sete golpes; o último lança' },
  { section: 'Golpes', name: 'Sequência do chute', input: 'KKKKK', note: 'Fecha chamando o corte à distância' },
  { section: 'Golpes', name: 'Sequência da lança', input: 'SSS', note: 'A estocada é o golpe de maior alcance dele' },
  { section: 'Golpes', name: 'No ar', input: 'PKS', note: 'O especial mergulha de lança em riste' },
  { section: 'Golpes', name: 'Cortes rasteiros', input: 'P', hold: '↓' },
  { section: 'Golpes', name: 'Mergulho baixo', input: 'K', hold: '↓' },
  { section: 'Golpes', name: 'Explosão de cortes', input: 'S', hold: '↓', note: 'Pega dos dois lados, inclusive atrás' },
  { section: 'Especiais', name: 'Dismantle', input: '↓→P', note: 'Para tudo e abre o corte à frente' },
  { section: 'Especiais', name: 'Explosão amaldiçoada', input: '↓←P', note: 'Carrega demorado e dá o maior dano dele' },
  { section: 'Especiais', name: 'Redemoinho', input: '↓→K', note: 'Vários acertos à frente' },
  { section: 'Especiais', name: 'Erupção', input: '↓←K', note: 'O chão sobe e o raio desce em cima' },
  { section: 'Especiais', name: 'Portal amaldiçoado', input: '↓→S', note: 'Abre em cima do adversário e corta' },
  { section: 'Especiais', name: 'Santuário', input: '↓←S', note: 'O santuário desce à frente, cortando' },
  { section: 'Super', name: 'Tempestade do vazio', input: '↓→↓→K', note: 'O vazio engole a frente' },
  { section: 'Super', name: 'Domain Expansion: Santuário Maligno', input: '↓→↓→P', note: 'Prende o oponente sob uma chuva de cortes' },
];

importMugenCharacter({
  root: ROOT,
  sffPath: resolve(PACK, 'sff.sff'),
  airPath: resolve(PACK, 'air.air'),
  outDir: 'public/assets/characters/sukuna',
  id: 'sukuna',
  // Sons dos golpes: lidos do .cns do pacote (scripts/lib/cns-sounds.mjs).
  sndPath: resolve(PACK, 'snd.snd'),
  soundsFromDef: resolve(PACK, 'Sukuna Heian.def'),
  // Clipes citados na mao acima: o .cns do pacote toca dois ao mesmo tempo em
  // cinco golpes basicos (dois sons do mesmo lutador juntos nao e mixagem, e
  // barulho). Fica o mais curto, que e o criterio ja usado no resto do elenco.
  sounds: { s5_5: [5, 5], s10_42: [10, 42], s0_38: [0, 38], s5_1: [5, 1] },
  name: 'Sukuna',
  description: 'O rei das maldições',
  template: 'public/assets/characters/dummy/dummy_config.json',
  animations: ANIMATIONS,
  effects: EFFECTS,
  combos: COMBOS,
  buttons: BUTTONS,
  moveList: MOVE_LIST,
  spriteScale: 1.3,
  // Varias poses do pacote vem dentro de sprites gigantes quase vazios (a
  // estocada da lanca e um 349x372 com o desenho em 98x71): sem cortar, a
  // celula do atlas vai a 394x408 e as paginas passam de 6 MB.
  trimFrames: true,
  hurtboxFrom: 'idle',
  portrait: { sprite: [9000, 1], crop: [0, 0, 120, 140], width: 50, height: 58, background: '#2a1418' },
});
