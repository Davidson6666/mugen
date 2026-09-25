// Importa o Sukuna do pacote MUGEN "Unfair Sukuna" (Joey Joestar e varios
// editores, ultima edicao de Kuro; creditos em CREDITS.md).
//
// O pacote fica em assets-src/sukuna/mugen/ (fora do git). SFF v1 sem .act
// (as cores ja vem no arquivo). Para regerar: npm run assets:sukuna
//
// O pacote e o Yuji com o Sukuna dentro: os golpes do Sukuna sao a serie
// 10000/11000 (var(11) = 10000). E "unfair" de proposito: todo golpe acerta
// por um projetil invisivel do tamanho da tela (anim 94919, caixa +-9999),
// tudo tem contra-ataque automatico, varios golpes matam na hora. Aqui os
// golpes acertam por caixas declaradas (areas), do tamanho do corte que o
// desenho mostra, e o dano e normal.
//
// Golpes: as sequencias do soco, do chute e do especial, os aereos, a pisada
// (↓), a rasteira que nao da para defender, o Dismantle, o Cleave, o arranque
// do coracao, o Fuga (flecha de fogo), os cometas, as bolas de fogo e o
// dominio Malevolent Shrine. ↓↓K troca para a forma Yuji (no pacote, o botao
// y transforma o Yuji no Sukuna), com os golpes dele (serie 200-1400) e o
// Black Flash. O sprite e pequeno (57 px): spriteScale 1.7.
// Botoes: soco = a, chute = b, especial = c.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importMugenCharacter } from './lib/mugen-import.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = resolve(ROOT, 'assets-src/sukuna/mugen');

const fx = (at, id, pos = [0, 0], extra = {}) => ({ at, effect: { id, pos, ...extra } });
// Janela de acerto declarada: quadros from..until, caixa em px do pacote.
const strike = (from, until, rect, data) => ({ from, until, rect, ...data });

const NORMAL = { specialCancel: true };
const TO_STRONG = { on: 'special', to: 'strong', after: 5 };

// Cortes do Malevolent Shrine: um a cada 8 ticks em cima do oponente.
const SHRINE_CUTS = Array.from({ length: 18 }, (_, index) => fx(40 + index * 8, index % 2 ? 'cutA' : 'cutB', [
  [-15, -30, 10, -45, 5, -20][index % 6], [-40, -25, -55, -35, -20, -50][index % 6],
], { target: 'opponent' }));

const ANIMATIONS = {
  idle: { actions: [10000], loop: true },
  walkForward: { actions: [10020], loop: true },
  walkBackward: { actions: [10021], loop: true },
  jump: { actions: [10040, 10041] },
  crouch: { actions: [10011], loop: true },
  blockStanding: { actions: [10130], loop: true },
  blockCrouching: { actions: [10131], loop: true },
  hitReaction: { actions: [15000] },
  ko: { actions: [15030, 15050, 15100, 15110] },
  victoryPose: { actions: [10180] },
  defeatPose: { actions: [170] },

  // Corrida (10060, anim 10100) e pulo para tras (70, anim 105).
  dashForward: {
    actions: [{ id: 10100, lengthTicks: 16 }],
    dash: { distance: 190, moveFrom: 0, moveUntil: 11, invulnerableFrom: 1, invulnerableUntil: 6, cancel: true },
  },
  dashBackward: {
    actions: [{ id: 105, lengthTicks: 16 }],
    dash: { distance: 150, moveFrom: 0, moveUntil: 3, invulnerableFrom: 1, invulnerableUntil: 3, cancel: true },
  },
  airDashForward: {
    actions: [{ id: 10100, lengthTicks: 12 }],
    dash: { distance: 150, moveFrom: 0, moveUntil: 11, invulnerableFrom: 99, invulnerableUntil: 0 },
  },
  airDashBackward: {
    actions: [{ id: 10100, lengthTicks: 10 }],
    dash: { distance: 110, moveFrom: 0, moveUntil: 9, invulnerableFrom: 99, invulnerableUntil: 0 },
  },

  // ---- Soco: 10200 (soco com arranque) -> 10210 -> 10220 (atravessa) ----
  punch: {
    actions: [{ id: 10200, lengthTicks: 20 }],
    ...NORMAL,
    areas: [strike(1, 2, [5, -55, 38, -15], { damage: 3, hitstun: 18, push: 4 })],
    events: [{ at: 0, vx: 6 }],
    cancels: [{ on: 'punch', to: 'punch2', after: 6 }, { on: 'kick', to: 'kick', after: 6 }, TO_STRONG],
  },
  punch2: {
    actions: [{ id: 10210, lengthTicks: 20 }],
    ...NORMAL,
    areas: [strike(1, 2, [5, -55, 38, -15], { damage: 3, hitstun: 20, push: 4 })],
    events: [{ at: 0, vx: 6 }],
    cancels: [{ on: 'punch', to: 'punch3', after: 6 }, TO_STRONG],
  },
  punch3: {
    actions: [{ id: 10220, lengthTicks: 40 }],
    ...NORMAL,
    noPush: true,
    areas: [
      strike(6, 6, [0, -55, 40, -5], { damage: 2, hitstun: 24, push: 2 }),
      strike(8, 8, [0, -55, 40, -5], { damage: 2, hitstun: 24, push: 2 }),
      strike(10, 12, [0, -55, 40, -5], { damage: 3, hitstun: 32, push: 14, heavy: true }),
    ],
    events: [{ at: 5, vx: -8 }, { at: 8, teleport: 20 }, { at: 9, vx: 4 }],
  },

  // ---- Chute: 10400 -> 10410 (rasteira que nao da para defender) -> 10420 ----
  kick: {
    actions: [{ id: 10400, lengthTicks: 25 }],
    ...NORMAL,
    areas: [strike(3, 5, [5, -45, 42, 0], { damage: 3, hitstun: 20, push: 4 })],
    events: [{ at: 5, vx: 5 }, fx(0, 'dust', [-10, 3], { scale: [0.1, 0.05] })],
    cancels: [{ on: 'kick', to: 'kick2', after: 8 }, TO_STRONG],
  },
  kick2: {
    actions: [{ id: 10410, lengthTicks: 30 }],
    ...NORMAL,
    areas: [strike(0, 2, [10, -20, 70, 5], { damage: 3, hitstun: 26, push: 4, unblockable: true })],
    events: [fx(0, 'debris', [70, 3], { scale: 0.12 })],
    cancels: [{ on: 'kick', to: 'kick3', after: 8 }, TO_STRONG],
  },
  kick3: {
    actions: [{ id: 10420, lengthTicks: 30 }],
    ...NORMAL,
    areas: [strike(0, 99, [0, -65, 35, 0], { damage: 4, hitstun: 32, push: 8, heavy: true })],
    events: [{ at: 0, vx: 3, vy: -9 }],
  },

  // ---- Especial: 10500 (corte com arranque) -> 10510 (tres cortes) -> rajada ----
  strong: {
    actions: [{ id: 10500, lengthTicks: 20 }],
    ...NORMAL,
    areas: [strike(1, 5, [5, -55, 42, 0], { damage: 4, hitstun: 22, push: 5 })],
    events: [{ at: 3, vx: 8 }, fx(0, 'redSlash', [10, -50], { scale: [0.65, 0.45] })],
    cancels: [{ on: 'special', to: 'strong2', after: 8 }],
  },
  strong2: {
    actions: [{ id: 10510, lengthTicks: 20 }],
    ...NORMAL,
    areas: [strike(1, 5, [10, -50, 55, -10], { damage: 3, hitstun: 22, push: 3 })],
    events: [fx(5, 'slashLines', [20, -30], { scale: [0.3, 0.2] })],
    cancels: [{ on: 'special', to: 'strong3', after: 8 }],
  },
  // 10520/10530/10540: vai e volta atravessando o oponente, cortando.
  strong3: {
    actions: [{ id: 10520, lengthTicks: 48 }],
    noPush: true,
    areas: [strike(0, 99, [-25, -55, 40, 5], { damage: 1, hitstun: 20, push: 1, every: 4, count: 10 })],
    events: [{ at: 0, vx: 10 }, { at: 16, vx: -10 }, { at: 32, vx: 10 }, { at: 46, vx: 0 }],
  },

  // ---- No ar: 10600 (cortes), 10610 (giro), 620 ----
  airLight: {
    actions: [{ id: 10510, lengthTicks: 20 }],
    air: true,
    ...NORMAL,
    areas: [strike(0, 5, [10, -50, 55, -10], { damage: 3, hitstun: 20, push: 4 })],
    events: [fx(0, 'slashLines', [20, -30], { scale: [0.3, 0.1] })],
    cancels: [{ on: 'kick', to: 'airMedium', after: 6 }, { on: 'special', to: 'airStrong', after: 6 }],
  },
  airMedium: {
    actions: [{ id: 10610, lengthTicks: 25 }],
    air: true,
    ...NORMAL,
    areas: [strike(0, 99, [-30, -60, 30, 0], { damage: 2, hitstun: 20, push: 3, every: 6, count: 3 })],
    events: [fx(3, 'redSlash', [-25, -30], { scale: 0.8 })],
  },
  airStrong: {
    actions: [620],
    air: true,
    ...NORMAL,
    areas: [strike(0, 2, [0, -50, 42, 0], { damage: 4, hitstun: 28, push: 8, heavy: true })],
  },

  // ---- Segurando ↓ ----
  // Pisada (11550/11551): o chao racha dos dois lados.
  stomp: {
    actions: [{ id: 11550, times: { 3: 20 } }],
    cooldown: 60,
    areas: [strike(2, 3, [-60, -25, 60, 5], { damage: 5, hitstun: 30, push: 8, heavy: true })],
    events: [fx(3, 'rocks', [0, 0], { scale: 0.35 }), fx(3, 'slashLine', [0, 0], { scale: [0.4, 0.4] })],
  },

  // ---- Especiais ----
  // Dismantle (11000 -> 11001 -> 11002): encara, some e reaparece cortando.
  dismantle: {
    actions: [{ id: 11000, times: { 0: 25 } }, { id: 11001, lengthTicks: 14 }, { id: 11002, lengthTicks: 30 }],
    cooldown: 120,
    areas: [strike(8, 20, [0, -60, 50, 0], { damage: 8, hitstun: 36, push: 12, heavy: true })],
    events: [{ action: 11001, at: 0, teleport: 15 }, { action: 11002, at: 0, vx: 6 }, { action: 11002, at: 6, effect: { id: 'debris', pos: [40, 10], scale: 0.2 } }, { action: 11002, at: 7, effect: { id: 'slashLine', pos: [30, 5], scale: [0.4, 0.2] } }],
  },
  // Cleave (11070): o chao a frente se abre em cortes.
  cleave: {
    actions: [{ id: 11070, lengthTicks: 30 }],
    cooldown: 100,
    events: [fx(7, 'cleaveField', [70, 0]), fx(8, 'slashLine', [70, 5], { scale: [0.8, 0.4] })],
  },
  // Arranque do coracao (11250 -> 11251 -> 11252): o bote; se pegar, segura
  // o coracao e fecha.
  heartRip: {
    actions: [{ id: 11250, lengthTicks: 20 }],
    cooldown: 240,
    noPush: true,
    friction: false,
    areas: [strike(0, 99, [0, -55, 35, 0], { damage: 3, hitstun: 120, push: 0 })],
    events: [{ at: 6, vx: 22 }, { at: 12, vx: 0 }, fx(0, 'redSlash', [60, -30], { scale: [0.65, 0.13] })],
    onHit: { to: 'heartHold' },
  },
  heartHold: {
    actions: [{ id: 11251, lengthTicks: 50 }],
    events: [{ at: 0, teleport: 10 }, fx(0, 'heart', [25, -26])],
    next: 'heartFinish',
  },
  heartFinish: {
    actions: [{ id: 11253, lengthTicks: 30 }],
    areas: [strike(0, 2, [0, -55, 35, 0], { damage: 14, hitstun: 40, push: 10, heavy: true, unblockable: true })],
    events: [fx(0, 'blood', [30, -35])],
  },
  // Fuga (11300 -> 11301 -> 11303 -> 11304): a flecha de fogo; ao pegar,
  // a coluna de chamas.
  fuga: {
    actions: [{ id: 11300, times: { 3: 30 } }, { id: 11302, lengthTicks: 20 }],
    cooldown: 240,
    events: [fx(23, 'fireBurst', [5, -7], { scale: 0.12 }), fx(40, 'fugaArrow', [20, -38]), { action: 11302, at: 0, vx: -5 }],
  },
  // Cometas (11130): tres bolas de fogo mergulham atras dele e caem a frente.
  fireComets: {
    actions: [{ id: 11101, lengthTicks: 70 }],
    cooldown: 200,
    events: [
      fx(10, 'flame', [8, -35]),
      fx(40, 'comet', [-200, -200]),
      fx(50, 'comet', [-140, -200]),
      fx(60, 'comet', [-80, -200]),
    ],
  },
  // Tiny Airelith Lock (11420): quatro bolas de fogo que aceleram.
  fireballs: {
    actions: [{ id: 11101, lengthTicks: 70 }],
    cooldown: 150,
    events: [fx(10, 'flame', [8, -35]), ...[10, 20, 30, 40].map((at, index) => fx(at, 'fireball', [15, -40 + index * 8]))],
  },

  // ---- Troca de forma (↓↓K; no pacote, o botao y) ----
  // Sukuna devolve o corpo (1310) e o Yuji chama o Sukuna de volta (1300).
  toYuji: {
    actions: [{ id: 10000, lengthTicks: 30 }],
    invulnerable: [0, 29],
    events: [{ at: 20, setMode: 'yuji' }, fx(0, 'markFlash', [0, -35])],
  },
  toSukuna: {
    actions: [{ id: 1300, lengthTicks: 60 }],
    invulnerable: [0, 59],
    events: [fx(10, 'cursedAura', [0, -35]), { at: 50, setMode: '' }],
  },

  // ---- Forma Yuji ----
  yujiIdle: { actions: [0], loop: true },
  yujiWalkForward: { actions: [20], loop: true },
  yujiWalkBackward: { actions: [21], loop: true },
  yujiJump: { actions: [40, 41] },
  yujiCrouch: { actions: [11], loop: true },
  yujiHit: { actions: [5000] },
  yujiKo: { actions: [5030, 5050, 5100, 5110] },
  yujiVictory: { actions: [180] },
  yujiDashForward: {
    actions: [{ id: 100, lengthTicks: 16 }],
    dash: { distance: 180, moveFrom: 0, moveUntil: 6, invulnerableFrom: 1, invulnerableUntil: 4, cancel: true },
  },
  yujiDashBackward: {
    actions: [{ id: 105, lengthTicks: 16 }],
    dash: { distance: 140, moveFrom: 0, moveUntil: 3, invulnerableFrom: 1, invulnerableUntil: 3, cancel: true },
  },
  // Socos: 200 (com arranque) -> 210 -> 220 (lancador) -> 221 (salto para tras).
  yujiPunch: {
    actions: [{ id: 200, lengthTicks: 30 }],
    ...NORMAL,
    areas: [strike(1, 2, [5, -52, 36, -15], { damage: 2, hitstun: 18, push: 4 })],
    events: [{ at: 0, vx: 6 }],
    cancels: [{ on: 'punch', to: 'yujiPunch2', after: 6 }, { on: 'kick', to: 'yujiKick', after: 6 }, { on: 'special', to: 'yujiStrong', after: 6 }],
  },
  yujiPunch2: {
    actions: [{ id: 210, lengthTicks: 30 }],
    ...NORMAL,
    areas: [strike(1, 2, [5, -52, 36, -15], { damage: 3, hitstun: 20, push: 4 })],
    events: [{ at: 0, vx: 5 }],
    cancels: [{ on: 'punch', to: 'yujiPunch3', after: 8 }, { on: 'special', to: 'yujiStrong', after: 8 }],
  },
  yujiPunch3: {
    actions: [{ id: 220, lengthTicks: 40 }],
    ...NORMAL,
    areas: [strike(3, 4, [5, -60, 40, -5], { damage: 4, hitstun: 32, push: 9, heavy: true })],
    events: [fx(20, 'dust', [-5, 3], { scale: 0.25 })],
    next: 'yujiHop',
  },
  yujiHop: {
    actions: [221],
    events: [{ at: 0, vx: -3, vy: -3 }],
  },
  // Chutes: 400 -> 410 (varios) -> 420 (rasteira que desliza).
  yujiKick: {
    actions: [{ id: 400, lengthTicks: 28 }],
    ...NORMAL,
    areas: [strike(2, 3, [5, -45, 42, 0], { damage: 3, hitstun: 20, push: 4 })],
    events: [{ at: 3, vx: 5 }, fx(3, 'blueArc', [18, -30], { scale: [0.4, 0.2] })],
    cancels: [{ on: 'kick', to: 'yujiKick2', after: 8 }, { on: 'special', to: 'yujiStrong', after: 8 }],
  },
  yujiKick2: {
    actions: [410],
    ...NORMAL,
    areas: [strike(1, 99, [0, -60, 42, 0], { damage: 1, hitstun: 20, push: 2, every: 4, count: 5 })],
    events: [fx(10, 'slashLines', [0, -30], { scale: [0.3, 0.1] })],
    cancels: [{ on: 'kick', to: 'yujiKick3', after: 20 }],
  },
  yujiKick3: {
    actions: [{ id: 420, lengthTicks: 42 }],
    ...NORMAL,
    friction: false,
    areas: [strike(3, 6, [0, -30, 42, 5], { damage: 4, hitstun: 30, push: 8, heavy: true })],
    events: [{ at: 5, vx: 4 }, { at: 18, vx: 8 }, { at: 26, vx: 0 }],
  },
  // Especial: o soco divergente (1102), com a energia amaldicoada no punho.
  yujiStrong: {
    actions: [{ id: 1102, lengthTicks: 26 }],
    ...NORMAL,
    areas: [strike(2, 4, [5, -50, 45, -10], { damage: 5, hitstun: 30, push: 10, heavy: true })],
    events: [fx(0, 'cursedFist', [-6, -8], { scale: 0.7 }), fx(12, 'slashLine', [30, 0], { scale: [0.8, 0.4] })],
  },
  // No ar: 600, 610 (chute subindo), 620 -> 621 (mergulho que racha o chao).
  yujiAirLight: {
    actions: [600],
    air: true,
    ...NORMAL,
    areas: [strike(0, 99, [0, -50, 36, 0], { damage: 3, hitstun: 20, push: 4 })],
  },
  yujiAirMedium: {
    actions: [610],
    air: true,
    ...NORMAL,
    areas: [strike(0, 99, [0, -55, 36, 5], { damage: 3, hitstun: 22, push: 5 })],
    events: [{ at: 0, vx: 3, vy: -6 }, fx(6, 'blueCrescent', [10, -30], { scale: [0.6, 0.3] })],
  },
  yujiAirStrong: {
    actions: [620, { id: 621, lengthTicks: 16 }],
    air: true,
    areas: [strike(3, 99, [-30, -25, 55, 5], { damage: 5, hitstun: 30, push: 8, heavy: true, unblockable: true })],
    events: [{ at: 0, vx: 7, vy: 6 }, { action: 621, at: 0, vx: 0 }, { action: 621, at: 0, effect: { id: 'rocks', pos: [20, 0], scale: 0.3 } }],
  },
  // ↓→P: a pedra arremessada (1200 -> 1201).
  yujiThrow: {
    actions: [{ id: 1200, lengthTicks: 30 }],
    cooldown: 50,
    events: [fx(10, 'stone', [20, -20]), fx(10, 'dust', [40, -20], { scale: 0.2 })],
  },
  // ↓←P: investida com a onda do punho (1250 -> 1251).
  yujiRush: {
    actions: [{ id: 1250, lengthTicks: 50 }],
    cooldown: 90,
    friction: false,
    events: [{ at: 25, vx: 8 }, { at: 40, vx: 0 }, fx(25, 'rushWave', [30, -25])],
  },
  // ↓→K: o chao racha numa onda que avanca (1100 -> 1101).
  yujiGroundWave: {
    actions: [{ id: 1100, times: { 0: 25 } }],
    cooldown: 120,
    events: [fx(5, 'cursedFist', [-6, -3], { scale: 1.3 }), fx(40, 'groundWave', [20, 10])],
  },
  // ↓←K: agarra correndo (1000) e soca segurando (1001).
  yujiGrab: {
    actions: [{ id: 1000, lengthTicks: 20 }],
    cooldown: 120,
    friction: false,
    areas: [strike(0, 99, [0, -55, 32, 0], { damage: 1, hitstun: 90, push: 0, unblockable: true })],
    events: [{ at: 0, vx: 10 }, { at: 15, vx: 0 }],
    onHit: { to: 'yujiPummel' },
  },
  yujiPummel: {
    actions: [{ id: 1001, times: { 0: 30 } }],
    invulnerable: [0, 72],
    areas: [strike(1, 3, [0, -60, 40, 0], { damage: 8, hitstun: 40, push: 12, heavy: true, unblockable: true })],
    events: [{ at: 0, teleport: 12 }],
  },
  // ↓→S (1 barra): Black Flash (1400 -> 1401 -> 1402).
  yujiBlackFlash: {
    cooldown: 600,
    actions: [1400, { id: 1401, times: { 2: 12 } }, { id: 1402, lengthTicks: 34 }],
    invulnerable: [0, 50],
    areas: [strike(5, 9, [0, -60, 42, 0], { damage: 14, hitstun: 60, push: 16, heavy: true, unblockable: true })],
    events: [
      fx(0, 'bfLines', [0, -106], { target: 'stage' }),
      { action: 1401, at: 12, teleport: 12 },
      { action: 1402, at: 0, effect: { id: 'bfSpark', pos: [20, -30] } },
      { action: 1402, at: 2, effect: { id: 'bfBurst', pos: [30, -30] } },
    ],
  },

  // ---- Super: Malevolent Shrine (13000) ----
  shrine: {
    actions: [{ id: 13000, lengthTicks: 240 }],
    cooldown: 1200,
    invulnerable: [0, 240],
    events: [
      { at: 20, standAt: -90, pinOpponent: { dx: 0, lift: 0, ticks: 200 } },
      fx(20, 'shrineSmoke', [-80, -40], { target: 'stage' }),
      fx(20, 'shrineGate', [-150, 0], { target: 'stage' }),
      ...SHRINE_CUTS,
      fx(200, 'finalCut', [0, -40], { target: 'opponent' }),
    ],
  },
};

const EFFECTS = {
  markFlash: { actions: [7042], size: 0.2, harmless: true },
  cursedAura: { actions: [7057], size: 0.2, harmless: true },
  blueArc: { actions: [7035], harmless: true },
  blueCrescent: { actions: [7065], harmless: true },
  cursedFist: { actions: [7011], size: 0.15, harmless: true },
  stone: {
    actions: [1201],
    loop: true,
    lifetime: 60,
    velocityX: 12,
    destroyOnHit: true,
    endAtWall: true,
    area: { rect: [-8, -8, 8, 8], damage: 3, hitstun: 24, push: 6 },
  },
  rushWave: {
    actions: [{ id: 1251, times: { 0: 30 } }],
    size: 0.8,
    lifetime: 30,
    motion: [{ at: 0, vx: 5 }, { at: 8, vx: 9 }, { at: 16, vx: 13 }],
    destroyOnHit: true,
    area: { rect: [-20, -10, 20, 10], damage: 6, hitstun: 40, push: 10, heavy: true },
  },
  groundWave: {
    actions: [{ id: 7013, lengthTicks: 80 }],
    size: 0.5,
    loop: true,
    lifetime: 80,
    velocityX: 4.5,
    endAtWall: true,
    area: { rect: [-100, -90, 100, 10], damage: 1, hitstun: 22, push: 3, every: 6, count: 6 },
  },
  bfLines: { actions: [{ id: 8000, times: { 23: 20 } }], scale: 0.25, cover: [920, 520], alpha: 0.5, harmless: true },
  bfSpark: { actions: [7069], size: 0.15, harmless: true },
  bfBurst: { actions: [7068], size: 0.15, harmless: true },
  dust: { actions: [7030], harmless: true },
  debris: { actions: [7030], harmless: true },
  redSlash: { actions: [7056], harmless: true },
  slashLines: { actions: [7036], harmless: true },
  slashLine: { actions: [{ id: 7017, times: { 0: 20 } }], harmless: true },
  rocks: { actions: [7033], harmless: true },
  blood: { actions: [7019], size: 1.3, harmless: true },
  fireBurst: { actions: [7038], scale: 0.5, harmless: true },
  flame: { actions: [7039], harmless: true },
  heart: { actions: [{ id: 11252, times: { 0: 40, 1: 10 } }], harmless: true },
  cleaveField: {
    actions: [{ id: 7009, lengthTicks: 30 }],
    size: 0.25,
    loop: true,
    lifetime: 30,
    area: { rect: [-400, -240, 400, 20], damage: 2, hitstun: 22, push: 3, every: 6, count: 4 },
  },
  fugaArrow: {
    actions: [7060],
    loop: true,
    lifetime: 90,
    motion: [{ at: 0, vx: 0 }, { at: 15, vx: 14 }],
    hitDelay: 15,
    destroyOnHit: true,
    endAtWall: true,
    area: { rect: [-48, -9, 48, 9], damage: 4, hitstun: 36, push: 0 },
    onDeathSpawn: { id: 'fugaBlast' },
  },
  fugaBlast: {
    actions: [{ id: 7063, lengthTicks: 60 }],
    size: 0.4,
    scale: 0.6,
    loop: true,
    lifetime: 60,
    area: { rect: [-300, -150, 300, 20], damage: 2, hitstun: 24, push: 2, every: 10, count: 5 },
  },
  comet: {
    actions: [{ id: 7052, lengthTicks: 40 }],
    size: 0.3,
    scale: 0.6,
    loop: true,
    lifetime: 40,
    velocityX: 20,
    velocityY: 15,
    endOnGround: true,
    destroyOnHit: true,
    area: { rect: [-80, -80, 80, 80], damage: 4, hitstun: 30, push: 8, heavy: true },
    onDeathSpawn: { id: 'cometBlast' },
  },
  cometBlast: {
    actions: [7053],
    size: 0.35,
    scale: 0.6,
    area: { rect: [-100, -170, 100, 0], until: 3, damage: 3, hitstun: 30, push: 8, heavy: true },
  },
  fireball: {
    actions: [{ id: 7052, lengthTicks: 60 }],
    size: 0.2,
    scale: 0.6,
    loop: true,
    lifetime: 60,
    motion: [{ at: 0, vx: 4 }, { at: 10, vx: 7 }, { at: 20, vx: 10 }, { at: 30, vx: 13 }],
    destroyOnHit: true,
    endAtWall: true,
    area: { rect: [-80, -80, 80, 80], damage: 3, hitstun: 24, push: 5 },
  },
  shrineGate: { actions: [{ id: 13001, times: { 0: 220 } }], size: 0.5, lifetime: 220, layer: 'back', harmless: true },
  shrineSmoke: { actions: [{ id: 7024, times: { 0: 220 } }], size: 0.4, lifetime: 220, layer: 'back', alpha: 0.7, harmless: true },
  cutA: {
    actions: [7025],
    size: 0.3,
    scale: 0.6,
    area: { rect: [-60, -40, 60, 40], until: 3, damage: 1, hitstun: 40, push: 0, unblockable: true },
  },
  cutB: {
    actions: [7026],
    size: 0.3,
    scale: 0.6,
    area: { rect: [-60, -40, 60, 40], until: 3, damage: 1, hitstun: 40, push: 0, unblockable: true },
  },
  finalCut: {
    actions: [7027],
    size: 0.6,
    scale: 0.6,
    area: { rect: [-150, -60, 150, 60], until: 2, damage: 8, hitstun: 50, push: 14, heavy: true, unblockable: true },
  },
};

// Forma Yuji: combos do modo "yuji".
const YUJI = (combo) => ({ ...combo, mode: 'yuji' });
const COMBOS = [
  { id: 'to-yuji', input: '↓↓K', animation: 'toYuji' },
  YUJI({ id: 'to-sukuna', input: '↓↓K', animation: 'toSukuna' }),
  YUJI({ id: 'yuji-black-flash', input: '↓→S', animation: 'yujiBlackFlash' }),
  YUJI({ id: 'yuji-throw', input: '↓→P', animation: 'yujiThrow' }),
  YUJI({ id: 'yuji-rush', input: '↓←P', animation: 'yujiRush' }),
  YUJI({ id: 'yuji-wave', input: '↓→K', animation: 'yujiGroundWave' }),
  YUJI({ id: 'yuji-grab', input: '↓←K', animation: 'yujiGrab' }),
  { id: 'shrine', input: '↓→↓→P', animation: 'shrine' },
  { id: 'dismantle', input: '↓→P', animation: 'dismantle' },
  { id: 'cleave', input: '↓←P', animation: 'cleave' },
  { id: 'heart', input: '↓→K', animation: 'heartRip' },
  { id: 'fuga', input: '↓←K', animation: 'fuga' },
  { id: 'comets', input: '↓→S', animation: 'fireComets' },
  { id: 'fireballs', input: '↓←S', animation: 'fireballs' },
  { id: 'stomp', input: 'P', hold: '↓', animation: 'stomp' },
  { id: 'sweep', input: 'K', hold: '↓', animation: 'kick2' },
  { id: 'zip', input: 'S', hold: '↓', animation: 'punch3' },
];

const BUTTONS = {
  ground: { punch: 'punch', kick: 'kick', special: 'strong' },
  air: { punch: 'airLight', kick: 'airMedium', special: 'airStrong' },
};

const MOVE_LIST = [
  { section: 'Forma', name: 'Trocar Sukuna / Yuji', input: '↓↓K', note: 'Cada forma tem os próprios golpes' },
  { section: 'Yuji', name: 'Socos', input: 'PPP', note: 'O terceiro lança; também cancela no chute e no especial' },
  { section: 'Yuji', name: 'Chutes', input: 'KKK', note: 'Fecha com a rasteira deslizando' },
  { section: 'Yuji', name: 'Soco divergente', input: 'S' },
  { section: 'Yuji', name: 'No ar', input: 'PKS', note: 'O especial mergulha e racha o chão' },
  { section: 'Yuji', name: 'Pedra', input: '↓→P' },
  { section: 'Yuji', name: 'Investida', input: '↓←P', note: 'Com a onda do punho' },
  { section: 'Yuji', name: 'Onda no chão', input: '↓→K', note: 'Vários acertos' },
  { section: 'Yuji', name: 'Agarrão', input: '↓←K', note: 'Não dá para defender' },
  { section: 'Yuji', name: 'Black Flash', input: '↓→S', note: 'Some e reaparece no soco' },
  { section: 'Movimento', name: 'Corrida', input: '→→', note: 'Atravessa o oponente; emenda num golpe' },
  { section: 'Movimento', name: 'Pulo para trás', input: '←←' },
  { section: 'Movimento', name: 'Dash aéreo', input: '→→', note: 'No ar' },
  { section: 'Movimento', name: 'Pulo duplo', input: '↑↑', note: 'No ar, aperte para cima de novo' },
  { section: 'Golpes', name: 'Sequência do soco', input: 'PPP', note: 'O terceiro atravessa o oponente' },
  { section: 'Golpes', name: 'Sequência do chute', input: 'KKK', note: 'A rasteira não dá para defender' },
  { section: 'Golpes', name: 'Sequência do especial', input: 'SSS', note: 'Fecha indo e voltando pelo oponente' },
  { section: 'Golpes', name: 'No ar', input: 'PKS' },
  { section: 'Golpes', name: 'Pisada', input: 'P', hold: '↓', note: 'Racha o chão dos dois lados' },
  { section: 'Golpes', name: 'Rasteira', input: 'K', hold: '↓', note: 'Não dá para defender' },
  { section: 'Golpes', name: 'Atravessar', input: 'S', hold: '↓' },
  { section: 'Especiais', name: 'Dismantle', input: '↓→P', note: 'Some e reaparece cortando' },
  { section: 'Especiais', name: 'Cleave', input: '↓←P', note: 'O chão à frente se abre em cortes' },
  { section: 'Especiais', name: 'Arrancar o coração', input: '↓→K', note: 'Bote rápido; se pegar, o golpe final' },
  { section: 'Especiais', name: 'Fuga', input: '↓←K', note: 'Flecha de fogo; coluna de chamas ao pegar' },
  { section: 'Especiais', name: 'Cometas', input: '↓→S', note: 'Três bolas de fogo caem à frente' },
  { section: 'Especiais', name: 'Bolas de fogo', input: '↓←S', note: 'Quatro, cada vez mais rápidas' },
  { section: 'Super', name: 'Domain Expansion: Malevolent Shrine', input: '↓→↓→P', note: 'Prende o oponente sob uma chuva de cortes' },
];

importMugenCharacter({
  root: ROOT,
  sffPath: resolve(PACK, 'Yuji Itadori.sff'),
  airPath: resolve(PACK, 'Yuji Itadori.air'),
  outDir: 'public/assets/characters/sukuna',
  id: 'sukuna',
  name: 'Sukuna',
  description: 'O rei das maldições',
  template: 'public/assets/characters/dummy/dummy_config.json',
  animations: ANIMATIONS,
  effects: EFFECTS,
  combos: COMBOS,
  buttons: BUTTONS,
  moveList: MOVE_LIST,
  spriteScale: 1.7,
  hurtboxFrom: 'punch',
  modes: {
    yuji: {
      buttons: {
        ground: { punch: 'yujiPunch', kick: 'yujiKick', special: 'yujiStrong' },
        air: { punch: 'yujiAirLight', kick: 'yujiAirMedium', special: 'yujiAirStrong' },
      },
      animations: {
        idle: 'yujiIdle',
        walkForward: 'yujiWalkForward',
        walkBackward: 'yujiWalkBackward',
        jump: 'yujiJump',
        crouch: 'yujiCrouch',
        hitReaction: 'yujiHit',
        ko: 'yujiKo',
        victoryPose: 'yujiVictory',
        dashForward: 'yujiDashForward',
        dashBackward: 'yujiDashBackward',
      },
    },
  },
  portrait: { sprite: [9000, 1], crop: [0, 0, 120, 132], width: 50, height: 55, background: '#221416' },
});
