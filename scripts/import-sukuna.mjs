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
//   especiais: 11070 (Dismantle), 3000 (onda gigante), 1000 (vazio + pilar),
//   3900 (erupcao), 3800 (portal), 11300 (Fuga, a flecha de fogo)
//   ↓ + botao: 270 (rajada de cortes), 21999 -> 22000 (voadora), 2998 (pilar)
//   1200 (corte instantaneo), 1300 (arremesso da lanca)
//   supers: 3001 (X) e 13000 (Y, o dominio)
//
// O pose do Sukuna e so a casca: o ataque de cada especial mora em Explod e
// Helper encadeados do .cns (que este motor nao roda), e os de longo alcance
// - a onda 1505, a flecha 11303, os cortes 390, a lanca 1350 - viram EFFECTS
// que andam (velocityX) e acertam. Os desenhos a escolher tem pegadinha: o
// 3051 e um anel escuro quase invisivel (o corte branco e o 1505), o 7064 e a
// fogueira e o 7051 o rastro de chama no chao, e o 1550 e uma coluna
// retangular que o MUGEN deixa sair da tela (aqui ela afunila e dissolve).
//
// Onde o autor desenhou clsn1, a caixa daqui e a dele, quadro a quadro; onde
// nao desenhou (os especiais), a caixa foi declarada do tamanho do desenho,
// medida pela caixa opaca do sprite.
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
// Efeito que se repete: o "repeat" e campo do evento, nao do efeito - varios
// golpes do pacote soltam o mesmo Explod a cada N ticks ate um certo tempo.
const fxLoop = (at, id, pos, every, until, extra = {}) => ({ at, repeat: { every, until }, effect: { id, pos, ...extra } });
// Janela de acerto declarada: quadros from..until, caixa em px do pacote.
const strike = (from, until, rect, data) => ({ from, until, rect, ...data });

const NORMAL = { specialCancel: true };

// Sorteio deterministico (o mesmo a cada importacao): o dominio espalha riscos,
// pedras e cortes por posicoes e angulos "aleatorios", mas a folha gerada nao
// pode mudar de uma importacao para outra.
function seeded(seed) {
  let state = seed >>> 0;
  return (low = 0, high = 1) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return low + (state / 4294967296) * (high - low);
  };
}

// Todos os cortes do video sao a mesma coisa: uma lamina preta fina e comprida
// (blade, desenhada por codigo em mugen-import), girada de um jeito a cada
// golpe pelo "angle" do pedido. cutS/M/L/XL so enfeitam; terminados em "h"
// tambem acertam o que estiver no meio deles.
const DOMAIN_ANGLES = [-52, 18, -12, 44, -28, 8, 62, -40, 24, -6, 36, -60, 14, -22];
const DOMAIN_SIZES = ['cutMh', 'cutLh', 'cutMh', 'cutXLh', 'cutMh', 'cutLh', 'cutMh', 'cutLh', 'cutMh', 'cutXLh', 'cutMh', 'cutLh', 'cutMh', 'cutLh'];
// Os que acertam: um a cada 14 ticks em cima do oponente.
const DOMAIN_CUTS = Array.from({ length: 14 }, (_, index) => fx(64 + index * 14, DOMAIN_SIZES[index], [0, -45], { target: 'opponent', angle: DOMAIN_ANGLES[index], spread: [55, 28] }));

// O resto do dominio e ambiente, tirado do estado 20011 do pacote, que roda em
// laco: riscos brancos finos (a anim 829 esticada, tres por tick) em qualquer
// angulo, pedacos de rocha subindo (7096, vel 2,-5), a fileira de pedras no
// chao (7048) e laminas pretas por toda a tela.
const rnd = seeded(7);
const DOMAIN_HAIRLINES = Array.from({ length: 80 }, (_, index) => fx(36 + index * 3, 'hairline', [rnd(-440, 440), rnd(-190, -10)], {
  target: 'stage', angle: rnd(-80, 80), scale: [rnd(3.5, 6), rnd(0.35, 0.8)],
}));
const DOMAIN_ROCKS = Array.from({ length: 56 }, (_, index) => fx(48 + index * 5, 'rockChunk', [rnd(-470, 470), 0], {
  target: 'stage', velocitySpread: [3, 2], scale: rnd(0.8, 1.5),
}));
const DOMAIN_PILES = Array.from({ length: 15 }, (_, index) => fx(46 + index * 3, 'rockPile', [-490 + index * 70 + rnd(-16, 16), 4], {
  target: 'stage', scale: rnd(0.75, 1.2),
}));
const DOMAIN_BLACKS = Array.from({ length: 22 }, (_, index) => fx(70 + index * 11, ['cutL', 'cutXL', 'cutM'][index % 3], [rnd(-340, 340), rnd(-170, -20)], {
  target: 'stage', angle: rnd(-72, 72),
}));

// A familia de cortes: os quatro tamanhos, com e sem dano.
const CUT_STEPS = [[0.3, 1], [1, 3], [1, 3], [0.6, 2], [0.2, 2]];
const CUT_SIZES = { S: [240, 7], M: [520, 12], L: [760, 15], XL: [1000, 20] };
const CUT_HIT = { rect: [-70, -65, 70, 65], until: 3, damage: 2, hitstun: 24, push: 3 };
const CUT_FAMILY = Object.fromEntries(Object.entries(CUT_SIZES).flatMap(([name, [length, thickness]]) => {
  const blade = { length, thickness, hair: 1.1, steps: CUT_STEPS };
  return [[`cut${name}`, { blade, harmless: true }], [`cut${name}h`, { blade, area: CUT_HIT }]];
}));

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
    events: [{ at: 3, vx: 8 }, fx(2, 'ghost', [0, 0], { follow: 'owner', lifetime: 16 }), fx(4, 'cutS', [45, -38], { angle: 25 })],
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
    events: [fx(6, 'cutS', [28, -32], { angle: -30 })],
    cancels: [{ on: 'punch', to: 'punch7', after: 8 }],
  },
  // 260: o chute girando que fecha a corrente e lanca.
  punch7: {
    launch: { vx: 4, vy: 6 },
    actions: [260],
    areas: [strike(3, 4, [7, -57, 45, -15], { damage: 4, hitstun: 34, push: 10, heavy: true })],
    events: [{ at: 10, vx: 4 }, fx(12, 'cutM', [34, -38], { angle: 35 })],
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
    events: [{ at: 6, vx: 5 }, fx(6, 'cutS', [32, -32], { angle: 40 })],
    cancels: [{ on: 'kick', to: 'kick4', after: 10 }],
  },
  // 330: o braco estendido, o mais longo da corrente.
  kick4: {
    actions: [{ id: 330, times: { 2: 8 } }],
    ...NORMAL,
    areas: [strike(1, 2, [0, -72, 77, -9], { damage: 3, hitstun: 26, push: 6 })],
    events: [fx(3, 'cutS', [55, -38], { angle: -14 })],
    cancels: [{ on: 'kick', to: 'kick5', after: 8 }],
  },
  // 340: ele aponta e o corte sai sozinho a frente.
  kick5: {
    launch: { vx: 3, vy: 5 },
    actions: [{ id: 340, times: { 0: 6, 1: 8, 2: 8, 3: 8, 4: 8, 5: 10 } }],
    areas: [strike(2, 4, [40, -80, 130, 2], { damage: 4, hitstun: 32, push: 8, heavy: true })],
    events: [fx(14, 'cutM', [85, -42], { angle: 12 }), fx(20, 'cutM', [95, -36], { angle: -18 })],
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
    events: [fx(15, 'cutM', [75, -33], { angle: 8 })],
    cancels: [{ on: 'special', to: 'lance2', after: 22 }],
  },
  // 410: ele roda a lanca; os quatro quadros tem a mesma caixa.
  lance2: {
    actions: [410],
    ...NORMAL,
    areas: [strike(0, 3, [15, -54, 72, 3], { damage: 2, hitstun: 18, push: 2, every: 4, count: 3 })],
    events: [fx(0, 'cutM', [45, -32], { angle: -25 })],
    cancels: [{ on: 'special', to: 'lance3', after: 8 }],
  },
  // 430: o giro largo que fecha, com a caixa de cima e a de baixo do autor.
  lance3: {
    launch: { vx: 5, vy: 7 },
    actions: [430],
    areas: [strike(2, 3, [-63, -93, 55, 6], { damage: 5, hitstun: 36, push: 12, heavy: true })],
    events: [fx(15, 'cutL', [10, -50], { angle: 30 }), fx(16, 'dust', [-20, 2], { scale: 0.2 }), { at: 0, sound: 's0_38' }],
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
    events: [fx(12, 'cutS', [22, -42], { angle: -35 }), { at: 10, sound: 's10_42' }],
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
  // Os tres do pacote sao golpes de alcance: o 270 (↓A) e ele apontando e
  // soltando cortes verticais que cruzam a tela (helper 390, velocidade 20); o
  // 21999 -> 22000 (↓B) e a voadora que atravessa a arena; o 2998 (↓C) cai um
  // pilar em cima do adversario onde ele estiver (helper 445). Eu tinha feito
  // os tres como golpes curtos de perto.
  cutBarrage: {
    actions: [{ id: 270, times: { 0: 8, 1: 38, 2: 8, 3: 6 } }],
    cooldown: 100,
    events: [
      fx(6, 'redSpark', [36, -52], { scale: 0.4 }),
      fx(10, 'cutWave', [34, -52]),
      fx(18, 'cutWave', [34, -44]),
      fx(26, 'cutWave', [34, -58]),
      fx(34, 'cutWave', [34, -50]),
    ],
  },
  flyKick: {
    actions: [{ id: 21999, times: { 0: 6, 1: 12, 2: 6 } }],
    cooldown: 140,
    events: [fx(8, 'ringBurst', [0, -35], { scale: 0.5 })],
    next: 'flyKickDash',
  },
  flyKickDash: {
    launch: { vx: 5, vy: 6 },
    actions: [{ id: 22000, lengthTicks: 24 }],
    onHit: { to: 'rush' },
    noPush: true,
    areas: [strike(0, 99, [-10, -57, 64, 1], { damage: 6, hitstun: 36, push: 10, heavy: true })],
    events: [
      { at: 0, vx: 13 }, { at: 6, vx: 13 }, { at: 12, vx: 11 }, { at: 18, vx: 7 },
      fx(0, 'ghost', [0, 0], { follow: 'owner' }),
      fx(0, 'ghost2', [0, 0], { follow: 'owner' }),
      fxLoop(0, 'darkStreaks', [-30, 0], 3, 22),
      fx(2, 'cutM', [60, -30], { angle: 6 }),
      fx(0, 'groundRings', [0, 0], { scale: 0.5 }),
    ],
  },
  pillar: {
    actions: [{ id: 2998, times: { 0: 8, 1: 5, 2: 8, 3: 4, 4: 26 } }],
    cooldown: 150,
    events: [
      fx(8, 'redSpark', [34, -52], { scale: 0.4 }),
      fx(8, 'pillarMark', [0, 0], { target: 'opponent', follow: 'target' }),
      fx(21, 'blackPillar', [0, 0], { target: 'opponent' }),
      fx(21, 'emberSplash', [0, 0], { target: 'opponent' }),
      fx(23, 'smokeBurst', [0, 0], { target: 'opponent' }),
    ],
  },
  // 1200: o corte instantaneo. No pacote ele some e reaparece colado no
  // adversario (PosAdd de ate 300 px) e corta; so a caixa do quadro 5 acerta.
  cleave: {
    launch: { vx: 5, vy: 6 },
    actions: [{ id: 1200, times: { 0: 3, 1: 3, 2: 6, 3: 4, 4: 2, 5: 5, 6: 12, 7: 4, 8: 8 } }],
    cooldown: 220,
    invulnerable: [6, 22],
    areas: [strike(4, 6, [0, -75, 95, -8], { damage: 8, hitstun: 40, push: 12, heavy: true })],
    events: [
      fx(10, 'ringBurst', [0, -40], { scale: 0.5 }),
      fx(10, 'darkStreaks', [0, 0], { scale: 0.8 }),
      { at: 12, teleport: 48 },
      fx(14, 'ringBurst', [30, -40], { scale: 0.5 }),
      fx(18, 'cutL', [0, -48], { target: 'opponent', angle: 14 }),
      fx(19, 'cutM', [0, -40], { target: 'opponent', angle: -20 }),
      fx(19, 'cutHair', [0, -45], { target: 'opponent', angle: -7 }),
      fx(20, 'bloodSplat', [40, -42]),
    ],
  },
  // 1300 (Y): o arremesso da lanca. O pacote solta o helper 1350 no quadro 6:
  // a haste fina de ponta dourada que voa a velocidade 20 com o rastro de laminas
  // brancas (1362). Acertando ou nao, ela cai e FICA FINCADA no chao (o helper
  // 1415) ate ser chamada de volta.
  hiten: {
    actions: [{ id: 1300, times: { 0: 5, 1: 5, 2: 5, 3: 10, 4: 3, 5: 12 } }],
    cooldown: 200,
    events: [
      fx(8, 'redSpark', [30, -60]),
      fx(28, 'hitenSpear', [44, -60]),
      fx(28, 'ringBurst', [46, -60], { scale: 0.6 }),
    ],
  },
  // 1303 (Y de novo, com a lanca no chao): ele aponta o braco (a pose 1301) e a
  // lanca volta girando como um disco de vento (1351) - acertando quem estiver
  // no caminho - ate a mao dele (1302). So sai com a lanca fincada em campo.
  recall: {
    actions: [{ id: 1301 }, { id: 1302, times: { 0: 12, 1: 14, 2: 12 } }],
    requires: 'plantedSpear',
    cooldown: 60,
    events: [
      { at: 10, consume: 'plantedSpear' },
      fx(10, 'redSpark', [30, -56], { scale: 0.5 }),
    ],
  },

  // ---- Barragem de socos ----
  // O print do video mostra o Sukuna martelando socos tao rapido que o braco
  // aparece em varias posicoes ao mesmo tempo (o AfterImage do pacote). Aqui:
  // oito socos a dois ticks por quadro, as imagens residuais atras dele
  // (mirrorOwner, o mesmo recurso do clone do Dante) e o chute 260 que fecha e
  // lanca. Quem pega o primeiro soco leva a serie inteira.
  rush: {
    launch: { vx: 5, vy: 7 },
    actions: [
      { id: 210, pick: [1, 2, 3], times: { 0: 2, 1: 2, 2: 2 } },
      { id: 200, pick: [2, 3, 4], times: { 0: 2, 1: 2, 2: 2 } },
      { id: 210, pick: [1, 2, 3], times: { 0: 2, 1: 2, 2: 2 } },
      { id: 200, pick: [2, 3, 4], times: { 0: 2, 1: 2, 2: 2 } },
      { id: 210, pick: [1, 2, 3], times: { 0: 2, 1: 2, 2: 2 } },
      { id: 200, pick: [2, 3, 4], times: { 0: 2, 1: 2, 2: 2 } },
      { id: 210, pick: [1, 2, 3], times: { 0: 2, 1: 2, 2: 2 } },
      { id: 200, pick: [2, 3, 4], times: { 0: 2, 1: 2, 2: 2 } },
      { id: 260 },
    ],
    cooldown: 300,
    areas: [
      strike(0, 23, [8, -58, 62, -20], { damage: 1, hitstun: 12, push: 1, every: 4, count: 8 }),
      strike(27, 28, [7, -57, 52, -15], { damage: 5, hitstun: 36, push: 10, heavy: true }),
    ],
    events: [
      fx(0, 'ghost', [0, 0], { follow: 'owner' }),
      fx(0, 'ghost2', [0, 0], { follow: 'owner' }),
      fx(0, 'ghost3', [0, 0], { follow: 'owner' }),
      fxLoop(2, 'cutHit', [48, -44], 4, 46, { spread: [16, 18], scale: 0.45 }),
      fx(58, 'bloodSplat', [0, -42], { target: 'opponent' }),
      fx(58, 'cutM', [45, -40], { angle: 15 }),
    ],
  },

  // ---- Golpes que a primeira versao deixou de fora ----
  // 700: a cotovelada curta, caixa baixa (o autor desenhou so [10,-26,30,0]).
  elbow: {
    actions: [{ id: 700, times: { 1: 14 } }],
    ...NORMAL,
    areas: [strike(1, 1, [10, -26, 30, 0], { damage: 3, hitstun: 22, push: 5 })],
    events: [fx(10, 'ringBurst', [20, -15], { scale: 0.5 })],
    cancels: [{ on: 'special', to: 'lance', after: 12 }],
  },
  // ---- Especiais ----
  // A estrutura de cada um saiu do proprio .cns: quais Explod/Helper o estado
  // solta, em que quadro e em que posicao. A primeira versao deste import
  // trazia dois ou tres efeitos por golpe, e o pacote solta de seis a vinte e
  // cinco - era por isso que os especiais pareciam vazios perto do original.
  //
  // 11070 (↓→P): a carga enche a tela de cortes e colunas em volta dele, o
  // selo acende, e no quadro 7 sai o corte grande. No pacote a caixa pega a
  // tela inteira (-129..135); aqui so o que esta a frente.
  dismantle: {
    launch: { vx: 4, vy: 5 },
    actions: [{ id: 11070, times: { 5: 20, 10: 8 } }],
    cooldown: 180,
    invulnerable: [0, 44],
    areas: [strike(6, 7, [0, -110, 130, 5], { damage: 8, hitstun: 40, push: 14, heavy: true })],
    events: [
      fxLoop(0, 'debrisRing', [0, 0], 14, 38),
      fxLoop(10, 'plume', [-50, -25], 6, 38),
      fxLoop(13, 'plume', [45, -20], 6, 38),
      fxLoop(12, 'cutM', [0, -75], 4, 38, { angle: 3, spread: [110, 40] }),
      fxLoop(14, 'cutM', [0, -35], 4, 38, { angle: -4, spread: [110, 30] }),
      fxLoop(16, 'cutS', [0, -60], 4, 38, { angle: 9, spread: [120, 45] }),
      fx(20, 'cursedSigil', [0, -49]),
      fx(40, 'cutLh', [0, -45], { target: 'opponent', angle: 7 }),
      fx(40, 'groundLine', [0, 5]),
      fx(41, 'cutHair', [0, -45], { target: 'opponent', angle: -7 }),
      fx(42, 'cutHairWhite', [0, -45], { target: 'opponent', angle: 57 }),
      fx(44, 'darkStreaks', [60, -40], { scale: 0.7 }),
    ],
  },
  // 11050 (↓→P no ar): a mesma abertura, de cima.
  airDismantle: {
    launch: { vx: 4, vy: 4 },
    actions: [{ id: 11050, times: { 5: 18, 10: 6 } }],
    air: true,
    cooldown: 200,
    areas: [strike(6, 7, [-20, -90, 120, 60], { damage: 8, hitstun: 38, push: 12, heavy: true })],
    events: [
      fxLoop(10, 'plume', [-40, -20], 6, 34),
      fxLoop(12, 'cutM', [0, -60], 5, 34, { angle: 6, spread: [100, 40] }),
      fx(18, 'cursedSigil', [0, -49]),
      fx(36, 'cutLh', [60, -30], { angle: 10 }),
      fx(38, 'darkStreaks', [50, -25], { scale: 0.7 }),
    ],
  },
  // 3000 (↓←P): a carga longa. No quadro 8 o pacote solta o helper 1505, que
  // cruza a tela e tira um terco da vida. Aqui vira o corte preto do video,
  // grande o bastante para atravessar a arena inteira de uma vez.
  cursedBlast: {
    actions: [{ id: 3000, durationScale: 0.4 }],
    cooldown: 300,
    invulnerable: [0, 52],
    events: [
      fx(4, 'redSpark', [0, -40]),
      fx(26, 'whiteCross', [-1, -46]),
      fx(28, 'redRing', [-1, -46]),
      fx(28, 'coreBurst', [-1, -46]),
      fx(30, 'darkOrb', [-1, -46]),
      fx(58, 'starBurst', [40, -52]),
      fx(66, 'bigCut', [0, -45], { target: 'stage', angle: 7 }),
      fx(67, 'cutHair', [0, -45], { target: 'stage', angle: -7 }),
      fx(68, 'cutHairWhite', [0, -45], { target: 'stage', angle: 57 }),
      fx(66, 'flashRing', [40, -50]),
      fx(68, 'coreBurst', [40, -50]),
      fx(72, 'groundScar', [0, 0], { target: 'stage' }),
    ],
  },
  // 1000 (↓→K): os relampagos vermelhos saem da mao e o helper 1040 abre um
  // vazio no ceu EM CIMA do adversario (PosAdd ate o oponente, PosSet y = -270);
  // meio segundo depois o golpe cai nele (helper 20001, o dano grande do
  // pacote). Alcance total: nao importa onde ele esteja quando comeca.
  vortex: {
    actions: [{ id: 2999, times: { 2: 20, 4: 46 } }],
    cooldown: 220,
    events: [
      fx(8, 'redSpark', [38, -52]),
      fx(18, 'redBolt', [38, -41]),
      fx(22, 'redBolt', [46, -41]),
      fx(26, 'redBolt', [30, -41]),
      fx(20, 'darkOrbs', [25, -60]),
      fx(26, 'streak', [18, -52]),
      fx(24, 'voidEye', [0, -150], { target: 'opponent', follow: 'target' }),
      fx(30, 'pillarMark', [0, 0], { target: 'opponent', follow: 'target' }),
      fx(46, 'pillarMark', [0, 0], { target: 'opponent', follow: 'target' }),
      fx(60, 'voidPillar', [0, 0], { target: 'opponent' }),
      fx(60, 'emberSplash', [0, 0], { target: 'opponent' }),
      fx(62, 'smokeBurst', [0, 0], { target: 'opponent' }),
      fx(64, 'sidePillar', [-95, 0], { target: 'opponent' }),
      fx(66, 'sidePillar', [95, 0], { target: 'opponent' }),
      fx(66, 'sparkles', [0, -60], { target: 'opponent' }),
    ],
  },
  // 3900 (↓←K): o estouro no quadro 7 e, logo atras, a coluna de fogo em cima
  // do adversario. A coluna do pacote (1550) e um retangulo que sai pela parte
  // de cima da tela; aqui ela afunila e dissolve, e a base vira fogueira e
  // brasa (7064, 7063), que sao as chamas de verdade do pacote.
  eruption: {
    actions: [{ id: 3900, times: { 5: 26, 6: 34 } }],
    cooldown: 260,
    events: [
      fx(34, 'burstBig', [37, -57], { scale: 0.6 }),
      fx(34, 'burstSmall', [37, -57]),
      fx(36, 'emberBed', [0, 0], { target: 'opponent', follow: 'target' }),
      fx(38, 'fireColumn', [0, 0], { target: 'opponent', follow: 'target', scale: [0.8, 1.5] }),
      fx(38, 'emberSplash', [0, 0], { target: 'opponent' }),
      fx(38, 'bonfireShort', [-42, 0], { target: 'opponent', follow: 'target' }),
      fx(41, 'bonfireShort', [0, 0], { target: 'opponent', follow: 'target', scale: 1.3 }),
      fx(44, 'bonfireShort', [42, 0], { target: 'opponent', follow: 'target' }),
      fxLoop(40, 'rubble', [70, 0], 12, 86, { scale: 0.6 }),
    ],
  },
  // 3800 (↓→S): o baque no chao, o anel do portal, e o portal abrindo.
  portal: {
    actions: [{ id: 3800 }, { id: 3801 }],
    cooldown: 260,
    events: [
      fx(7, 'shockRing', [0, 3]),
      { action: 3801, at: 0, effect: { id: 'portalRing', pos: [0, 0] } },
      { action: 3801, at: 2, effect: { id: 'plume', pos: [-20, 23] } },
      { action: 3801, at: 27, effect: { id: 'cursedPortal', pos: [75, -30] } },
    ],
  },
  // 11300 (↓←S): no pacote e a flecha de fogo (helper "arrow", Fuga). Ele
  // arma, ela sai a velocidade 16 e, onde bate, vira uma explosao que fica
  // queimando o chao. Antes eu tinha feito uma coluna de fogo parada na altura
  // da mao, que e o que parecia estranho.
  shrineCall: {
    actions: [{ id: 11300, times: { 0: 8, 1: 12, 2: 26, 3: 8, 4: 8, 5: 26 } }],
    cooldown: 280,
    events: [
      fx(10, 'arrowGlow', [36, -46], { lifetime: 56 }),
      fxLoop(14, 'emberPuff', [26, -40], 6, 60, { follow: 'owner' }),
      fx(62, 'fugaArrow', [40, -46]),
      fx(62, 'flashRing', [42, -46]),
      fx(64, 'redSpark', [40, -46]),
    ],
  },

  // ---- Supers ----
  // 3001 (↓→↓→K): no pacote o estado espera 200 ticks antes de entregar - a
  // primeira versao daqui cortava em 85 e o golpe acabava antes do pagamento.
  // Agora a carga enche a tela de energia amaldicoada e o vazio fecha no fim.
  voidStorm: {
    actions: [{ id: 3001, times: { 2: 110 } }],
    cooldown: 900,
    invulnerable: [0, 130],
    areas: [strike(2, 2, [0, -130, 190, 10], { damage: 4, hitstun: 30, push: 6, every: 14, count: 5 })],
    events: [
      fx(8, 'redSpark', [0, -40]),
      fx(14, 'redHaze', [0, -40], { target: 'stage' }),
      fx(20, 'cursedCloud', [70, -45]),
      fx(26, 'voidSpiral', [75, -45], { scale: 1.4 }),
      fx(40, 'cursedCloud', [110, -60]),
      fx(60, 'cursedCloud', [50, -30]),
      fx(70, 'cutLh', [0, -45], { target: 'opponent', angle: -14 }),
      fx(90, 'cutXLh', [0, -42], { target: 'opponent', angle: 9 }),
      fx(104, 'voidBlast', [80, -45]),
      fx(112, 'cutLh', [0, -45], { target: 'opponent', angle: -30 }),
      fx(118, 'splash', [80, -20]),
    ],
  },
  // 13000 (↓→↓→P): Dominio - Santuario Maligno. O pacote tinge a tela de
  // vermelho e abre o portal; aqui ele prende o adversario e corta ate o fim.
  domain: {
    // 13000 (↓→↓→P): Dominio - Santuario Maligno. No pacote e o laco do estado
    // 20011 por 700 ticks; aqui sao ~350, e antes eram so 165, o que cortava
    // os ultimos oito eventos (inclusive a caveira, que nunca disparava).
    actions: [{ id: 13000, times: { 0: 20, 1: 14, 2: 36, 3: 240, 4: 10, 5: 10, 6: 10, 7: 10 } }],
    cooldown: 1500,
    invulnerable: [0, 340],
    events: [
      { at: 24, standAt: -80, pinOpponent: { dx: 0, lift: 0, ticks: 300 } },
      fx(14, 'domainDark', [0, -200], { target: 'stage' }),
      fx(20, 'redTint', [0, 0], { target: 'stage' }),
      fx(28, 'cursedSigil', [0, -60]),
      fx(30, 'shrineField', [-60, 0], { target: 'stage' }),
      fx(34, 'redBands', [0, 0], { target: 'stage' }),
      fx(40, 'voidBlast', [0, -40], { target: 'opponent' }),
      ...DOMAIN_PILES,
      ...DOMAIN_HAIRLINES,
      ...DOMAIN_ROCKS,
      ...DOMAIN_CUTS,
      ...DOMAIN_BLACKS,
      fx(280, 'splash', [0, -20], { target: 'opponent' }),
      fx(284, 'groundRocks', [0, 0], { target: 'opponent' }),
      fx(288, 'cursedSkull', [0, -40], { target: 'opponent' }),
    ],
  },
};

const EFFECTS = {
  // Os tamanhos (size) foram medidos pela celula gerada: o pacote desenha
  // efeito de tela cheia (a nuvem amaldicoada e um 1024x1024), entao cada um
  // foi reduzido ate ficar na escala da arena.
  // Faiscas e poeira
  dust: { actions: [7019], harmless: true },
  redSpark: { actions: [9011], size: 0.16, harmless: true },
  sparkles: { actions: [8241], size: 0.25, harmless: true },
  rubble: { actions: [1205], size: 0.2, harmless: true },
  groundRings: { actions: [30203], size: 0.25, harmless: true },
  ringFlash: { actions: [829], size: 0.18, harmless: true },
  shrineSmoke: { actions: [{ id: 7054, lengthTicks: 50 }], size: 0.23, alpha: 0.8, layer: 'back', harmless: true },
  debrisRing: { actions: [30216], size: 0.4, harmless: true },
  groundLine: { actions: [{ id: 7017, lengthTicks: 24 }], size: 0.35, harmless: true },
  shockRing: { actions: [30201], size: 0.6, harmless: true },
  lowSmoke: { actions: [7003], size: 0.5, layer: 'back', harmless: true },
  groundRocks: { actions: [3021], size: 0.35, harmless: true },
  splash: { actions: [{ id: 7046, lengthTicks: 40 }], size: 0.2, harmless: true },

  darkStreaks: { actions: [1345], size: 0.4, harmless: true },
  ringBurst: { actions: [9014], size: 0.3, harmless: true },
  streak: { actions: [30024], size: 0.3, harmless: true },
  cursedSigil: { actions: [524], size: 0.35, harmless: true },

  // Fogo e energia
  redBolt: { actions: [1013], size: 0.15, harmless: true },
  plume: { actions: [7000], size: 0.3, harmless: true },
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
  // A coluna de fogo do pacote tem 88 quadros; aqui vai cortada pela metade.
  fireColumn: {
    actions: [{ id: 1550, lengthTicks: 46 }],
    size: 0.3,
    shape: { taper: 0.4, from: 0.25, fadeTop: 0.32, ragged: 0.22, soften: 0.22, grain: 2 },
    palfx: { mul: [256, 185, 110] },
    area: { rect: [-90, -340, 90, 10], until: 40, damage: 2, hitstun: 30, push: 5, every: 7, count: 6 },
  },
  burstBig: { actions: [1141], size: 0.25, harmless: true },
  burstSmall: { actions: [1142], size: 0.35, harmless: true },
  starBurst: { actions: [1320], size: 0.25, harmless: true },
  redRing: { actions: [{ id: 830, lengthTicks: 26 }], size: 0.18, harmless: true },
  whiteCross: { actions: [9080], size: 0.3, harmless: true },
  coreBurst: { actions: [{ id: 9081, lengthTicks: 30 }], size: 0.25, harmless: true },
  darkOrb: { actions: [{ id: 8007, lengthTicks: 26 }], size: 0.35, harmless: true },
  darkOrbs: { actions: [{ id: 1938, lengthTicks: 24 }], size: 0.35, harmless: true },
  smokePillar: { actions: [8062], size: 0.25, layer: 'back', harmless: true },
  flashRing: { actions: [30315], size: 0.3, harmless: true },
  bigImpact: { actions: [30214], size: 0.22, harmless: true },
  purpleBolt: { actions: [1420], size: 0.3, harmless: true },
  haloRing: { actions: [4101], size: 0.4, harmless: true },
  coneRing: { actions: [4102], size: 0.4, harmless: true },
  wideBlast: { actions: [{ id: 7038, lengthTicks: 34 }], size: 0.25, harmless: true },

  // Cortes: a lamina preta do video (ver CUT_FAMILY) e seus fios.
  ...CUT_FAMILY,
  cutHair: {
    blade: { length: 700, thickness: 3.5, hair: 1.2, steps: [[1, 5, 1], [1, 5, 0.8], [1, 4, 0.5]] },
    harmless: true,
  },
  cutHairWhite: {
    blade: { length: 520, thickness: 2.6, hair: 1.1, color: [235, 245, 255], steps: [[1, 4, 1], [1, 4, 0.8], [1, 4, 0.5]] },
    harmless: true,
  },
  // O corte da onda gigante (↓←P): atravessa a arena inteira, a 7 graus.
  bigCut: {
    blade: { length: 1000, thickness: 22, hair: 1.2, steps: [[0.2, 1], [1, 2], [1, 8], [0.85, 4], [0.5, 3], [0.2, 2]] },
    launch: { vx: 5, vy: 7 },
    area: { rect: [-500, -100, 500, 100], until: 6, damage: 10, hitstun: 46, push: 14, heavy: true },
  },
  // Corte vertical que cruza a tela (o helper 390 do pacote: caixa de 9x95).
  cutWave: {
    blade: { length: 150, thickness: 6, angle: 90, hair: 1.1, steps: [[1, 3], [0.8, 3]] },
    loop: true,
    velocityX: 15,
    lifetime: 46,
    destroyOnHit: true,
    endAtWall: true,
    area: { rect: [-10, -80, 10, 80], until: 99, damage: 3, hitstun: 22, push: 5 },
    onHitSpawn: { id: 'cutHit', pos: [0, 0] },
  },
  cutHit: { actions: [7027], size: 0.4, harmless: true },
  // Pilar que cai em cima do adversario (2998 -> helper 445, anim 8062).
  pillarMark: { actions: [{ id: 30203, lengthTicks: 14 }], size: 0.35, harmless: true },
  blackPillar: {
    actions: [8062],
    size: 0.5,
    blend: 'normal',
    shape: { taper: 0.12, from: 0.2, fadeTop: 0.28, ragged: 0.4, soften: 0.16, grain: 4 },
    launch: { vx: 3, vy: 8 },
    area: { fromFrame: 3, widthRatio: 0.5, heightRatio: 0.92, until: 6, damage: 7, hitstun: 42, push: 8, heavy: true },
  },
  // O vazio que se abre em cima do alvo: so visual (o dano e do pilar).
  voidEye: {
    actions: [{ id: 7092, lengthTicks: 44 }],
    size: 0.5,
    scale: 1.2,
    harmless: true,
  },
  // O pilar do redemoinho: o mesmo desenho do pilar rapido, maior e mais forte.
  voidPillar: {
    actions: [8062],
    size: 0.62,
    blend: 'normal',
    shape: { taper: 0.12, from: 0.2, fadeTop: 0.28, ragged: 0.4, soften: 0.16, grain: 4 },
    launch: { vx: 3, vy: 9 },
    area: { fromFrame: 3, widthRatio: 0.5, heightRatio: 0.92, until: 6, damage: 11, hitstun: 54, push: 10, heavy: true },
  },
  sidePillar: {
    actions: [8062],
    size: 0.4,
    blend: 'normal',
    shape: { taper: 0.12, from: 0.2, fadeTop: 0.28, ragged: 0.4, soften: 0.16, grain: 4 },
    launch: { vx: 3, vy: 6 },
    area: { fromFrame: 3, widthRatio: 0.5, heightRatio: 0.92, until: 6, damage: 2, hitstun: 30, push: 4 },
  },
  emberSplash: { actions: [331], size: 0.3, harmless: true },
  smokeBurst: { actions: [1014], size: 0.28, blend: 'normal', harmless: true },
  // Arremesso da lanca (Hiten, helper 1350): a haste (99x19) com o rastro de
  // laminas; onde ela acaba, fica fincada.
  hitenSpear: {
    actions: [1350],
    loop: true,
    size: 1.1,
    velocityX: 17,
    lifetime: 46,
    destroyOnHit: true,
    endAtWall: true,
    area: { rect: [-70, -26, 70, 26], damage: 8, hitstun: 40, push: 5, heavy: true },
    onHitSpawn: { id: 'spearImpact', pos: [0, 0] },
    onDeathSpawn: { id: 'plantedSpear', pos: [100, 8] },
    spawns: [{ at: 0, repeat: { every: 4, until: 44 }, effect: { id: 'slashFan', pos: [-60, 0] } }],
  },
  slashFan: { actions: [1362], size: 0.35, harmless: true },
  spearImpact: { actions: [1360], size: 0.55, harmless: true },
  // A lanca fincada no chao (helper 1415): fica ate ser chamada de volta ou o
  // round acabar. Ao sumir, ela mesma solta o disco de volta no lugar em que
  // estava - so que quem a faz sumir e o golpe "recall", nao o tempo.
  plantedSpear: {
    actions: [1415],
    loop: true,
    size: 1.15,
    tag: 'plantedSpear',
    blend: 'normal',
    harmless: true,
    onDeathSpawn: { id: 'spearReturn', pos: [0, 0] },
  },
  // A lanca voltando: o disco de vento 1351 vai ate quem a chamou.
  spearReturn: {
    actions: [1351],
    loop: true,
    size: 1.0,
    velocityX: -10,
    lifetime: 56,
    launch: { vx: 4, vy: 6 },
    area: { rect: [-62, -40, 62, 40], until: 99, damage: 4, hitstun: 26, push: 4, every: 7, count: 2 },
    spawns: [{ at: 0, repeat: { every: 5, until: 54 }, effect: { id: 'slashFan', pos: [40, 0] } }],
  },
  // Imagem residual: o proprio Sukuna repetido atras (o AfterImage do pacote).
  ghost: { actions: [0], loop: true, lifetime: 60, harmless: true, layer: 'back', alpha: 0.5, tint: 0xffd0d0, mirrorOwner: { delay: 3, offset: 16 } },
  ghost2: { actions: [0], loop: true, lifetime: 60, harmless: true, layer: 'back', alpha: 0.32, tint: 0xffb0b0, mirrorOwner: { delay: 6, offset: 32 } },
  ghost3: { actions: [0], loop: true, lifetime: 60, harmless: true, layer: 'back', alpha: 0.2, tint: 0xff9090, mirrorOwner: { delay: 9, offset: 48 } },
  groundScar: { actions: [8647], size: 0.5, center: true, blend: 'normal', lifetime: 150, layer: 'back', harmless: true },
  // Sangue dos acertos (as faiscas vermelhas do pacote: 7613 e 70031).
  bloodFlash: { actions: [7613], size: 0.3, harmless: true },
  bloodSplat: { actions: [70031], size: 0.45, blend: 'normal', harmless: true },

  // Fuga: a flecha, o rastro, a explosao e as chamas que ficam no chao.
  arrowGlow: { actions: [8060], size: 0.6, loop: true, harmless: true },
  emberPuff: { actions: [7054], size: 0.1, harmless: true },
  fugaArrow: {
    actions: [8060],
    size: 0.85,
    loop: true,
    velocityX: 15,
    lifetime: 70,
    endAtWall: true,
    destroyOnHit: true,
    area: { widthRatio: 0.9, heightRatio: 1, damage: 4, hitstun: 30, push: 6 },
    onDeathSpawn: { id: 'fugaBlast', pos: [0, 0] },
    spawns: [{ at: 0, repeat: { every: 4, until: 68 }, effect: { id: 'emberPuff', pos: [-50, 0] } }],
  },
  fugaBlast: {
    actions: [7054],
    size: 0.3,
    launch: { vx: 4, vy: 6 },
    area: { widthRatio: 0.7, heightRatio: 0.8, until: 5, damage: 5, hitstun: 40, push: 12, heavy: true },
    spawns: [
      { at: 0, effect: { id: 'fireBed', pos: [0, 46] } },
      { at: 0, effect: { id: 'emberBed', pos: [0, 46] } },
      { at: 3, effect: { id: 'bonfire', pos: [-48, 46] } },
      { at: 6, effect: { id: 'bonfire', pos: [0, 46], scale: 1.25 } },
      { at: 9, effect: { id: 'bonfire', pos: [48, 46] } },
    ],
  },
  fireBed: {
    actions: [{ id: 7051, lengthTicks: 110 }],
    size: 0.8,
    area: { rect: [-130, -110, 130, 0], until: 99, damage: 2, hitstun: 22, push: 2, every: 10, count: 9 },
  },
  emberBed: { actions: [{ id: 7063, lengthTicks: 110 }], size: 0.4, layer: 'back', harmless: true },
  bonfire: { actions: [{ id: 7064, lengthTicks: 100 }], size: 0.55, harmless: true },
  bonfireShort: { actions: [{ id: 7064, lengthTicks: 56 }], size: 0.55, harmless: true },

  // Vazio e santuario
  voidSpiral: {
    actions: [{ id: 7092, lengthTicks: 48 }],
    size: 0.5,
    scale: 0.8,
    area: { rect: [-130, -130, 130, 130], until: 40, damage: 1, hitstun: 24, push: 2, every: 5, count: 8 },
  },
  // Nuvem de energia amaldicoada: 1024x1024 no pacote, cortada em tamanho e
  // em numero de quadros para nao estourar o atlas.
  cursedCloud: {
    actions: [{ id: 3651, lengthTicks: 34 }],
    size: 0.14,
    area: { rect: [-320, -320, 320, 200], until: 30, damage: 1, hitstun: 22, push: 2, every: 6, count: 5 },
  },
  voidBlast: {
    actions: [{ id: 7506, lengthTicks: 28 }],
    size: 0.2,
    area: { rect: [-200, -120, 200, 60], until: 4, damage: 4, hitstun: 34, push: 10, heavy: true },
  },
  cursedPortal: {
    actions: [{ id: 6070, lengthTicks: 54 }],
    size: 0.27,
    layer: 'back',
    area: { rect: [-150, -400, 150, 10], until: 30, damage: 2, hitstun: 28, push: 5, every: 7, count: 4 },
  },
  portalRing: { actions: [6110], size: 0.5, harmless: true },
  shrine: {
    actions: [{ id: 8060, lengthTicks: 60 }],
    size: 0.6,
    area: { rect: [-120, -200, 120, 10], until: 40, damage: 2, hitstun: 30, push: 6, every: 8, count: 5 },
  },
  shrineField: { actions: [{ id: 3010, lengthTicks: 330 }], size: 0.7, layer: 'back', alpha: 0.9, harmless: true },
  // O campo escuro do dominio: o estagio quase some e fica um vermelho fechado.
  domainDark: {
    solid: { color: [26, 0, 6], steps: [[0.2, 6], [0.4, 6], [0.58, 8], [0.66, 300], [0.4, 8], [0.15, 8]] },
    cover: [1700, 1700],
    layer: 'back',
    harmless: true,
  },
  // Riscos finos do estado 20011: a anim 829 esticada (aqui guardada pequena e
  // esticada no pedido).
  hairline: { actions: [829], size: 0.2, harmless: true },
  // Pedaco de rocha que sobe e cai (anim 7096, velocidade 2,-5 no pacote).
  rockChunk: { actions: [7096], size: 0.38, velocityX: 1.5, velocityY: -6, gravity: 0.34, lifetime: 60, harmless: true },
  // Fileira de pedras no chao (anim 7048).
  rockPile: { actions: [7048], size: 0.45, loop: true, lifetime: 310, harmless: true },
  // Tintas de tela cheia do pacote: entram como cobertura, nao como sprite.
  redTint: { actions: [{ id: 4010, lengthTicks: 150 }], scale: 0.2, cover: [1500, 1500], alpha: 0.35, layer: 'back', harmless: true },
  redBands: { actions: [{ id: 4011, lengthTicks: 140 }], scale: 0.2, cover: [1280, 300], alpha: 0.45, layer: 'back', harmless: true },
  redHaze: { actions: [{ id: 4075, lengthTicks: 120 }], scale: 0.2, cover: [1500, 1500], alpha: 0.3, layer: 'back', harmless: true },
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
  { id: 'rush', input: '↓↓P', animation: 'rush', airAnimation: 'airDismantle' },
  { id: 'elbow', input: '→P', animation: 'elbow' },
  { id: 'cursed-blast', input: '↓←P', animation: 'cursedBlast' },
  { id: 'vortex', input: '↓→K', animation: 'vortex' },
  { id: 'eruption', input: '↓←K', animation: 'eruption' },
  { id: 'portal', input: '↓→S', animation: 'portal' },
  { id: 'shrine-call', input: '↓←S', animation: 'shrineCall' },
  { id: 'cut-barrage', input: 'P', hold: '↓', animation: 'cutBarrage' },
  { id: 'fly-kick', input: 'K', hold: '↓', animation: 'flyKick' },
  { id: 'pillar', input: 'S', hold: '↓', animation: 'pillar' },
  { id: 'cleave', input: '↓↓K', animation: 'cleave' },
  { id: 'hiten', input: '→↓↘S', animation: 'hiten' },
  { id: 'recall', input: '↓↓S', animation: 'recall' },
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
  { section: 'Golpes', name: 'Cotovelada', input: '→P', note: 'Curta e baixa; emenda na lança' },
  { section: 'Golpes', name: 'Rajada de cortes', input: 'P', hold: '↓', note: 'Quatro cortes verticais que cruzam a tela' },
  { section: 'Golpes', name: 'Voadora', input: 'K', hold: '↓', note: 'Atravessa a arena de ponta a ponta' },
  { section: 'Golpes', name: 'Pilar', input: 'S', hold: '↓', note: 'Cai em cima do adversário onde ele estiver' },
  { section: 'Especiais', name: 'Dismantle', input: '↓→P', note: 'Para tudo e abre o corte à frente' },
  { section: 'Especiais', name: 'Barragem de socos', input: '↓↓P', note: 'Oito socos em dois ticks cada e o chute que lança; no ar vira o Dismantle' },
  { section: 'Especiais', name: 'Corte instantâneo', input: '↓↓K', note: 'Some e reaparece colado no adversário' },
  { section: 'Especiais', name: 'Arremesso da lança', input: '→↓↘S', note: 'A lança cruza a tela e fica fincada no chão' },
  { section: 'Especiais', name: 'Chamar a lança', input: '↓↓S', note: 'Com a lança no chão: ela volta girando até a mão dele' },
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
