// Importa a Chun-Li do pacote MUGEN "SF3 Chun Li" (MGMURROW; creditos em
// CREDITS.md), port do Street Fighter III: 3rd Strike.
//
// O pacote fica em assets-src/chunli/mugen/ (fora do git). SFF v1 com a
// paleta SF3CHUN.act. Para regerar: npm run assets:chunli
//
// Dos seis botoes do SF3: soco = x/y/z em sequencia, chute = a/b/c em
// sequencia, especial = o Hyakuretsukyaku (as pernas relampago, "a,a,a" no
// pacote). Especiais: Kikoken, Spinning Bird Kick (tambem no ar), Hazanshu e
// Tenshokyaku; supers: Kikosho, Houyoku-sen, Tensei Ranka e a rajada de
// chutes (3300). O sprite ja tem o tamanho do elenco (101 px parada).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importMugenCharacter } from './lib/mugen-import.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = resolve(ROOT, 'assets-src/chunli/mugen');

const fx = (at, id, pos = [0, 0], extra = {}) => ({ at, effect: { id, pos, ...extra } });
const soundFrame = (frame, key) => ({ frame, sound: key });

const NORMAL = { specialCancel: true };
const chain = (on, to, after = 3) => ({ on, to, after });

const ANIMATIONS = {
  idle: { actions: [0], loop: true },
  walkForward: { actions: [20], loop: true },
  walkBackward: { actions: [21], loop: true },
  jump: { actions: [40, 41] },
  crouch: { actions: [11], loop: true },
  blockStanding: { actions: [130], loop: true },
  blockCrouching: { actions: [131], loop: true },
  hitReaction: { actions: [5000] },
  ko: { actions: [5030, { id: 5050, times: { 1: 20 } }, 5100, 5110] },
  victoryPose: { actions: [{ id: 181, times: { 42: 60 } }] },
  defeatPose: { actions: [{ id: 5050, times: { 1: 60 } }] },

  dashForward: {
    actions: [100],
    dash: { distance: 130, moveFrom: 1, moveUntil: 5, invulnerableFrom: 9, invulnerableUntil: 0, cancel: true },
  },
  dashBackward: {
    actions: [105],
    dash: { distance: 110, moveFrom: 1, moveUntil: 7, invulnerableFrom: 1, invulnerableUntil: 3 },
  },
  airDashForward: {
    actions: [{ id: 101, times: { 4: 6 } }],
    dash: { distance: 110, moveFrom: 0, moveUntil: 3, invulnerableFrom: 9, invulnerableUntil: 0 },
  },
  airDashBackward: {
    actions: [105],
    dash: { distance: 90, moveFrom: 1, moveUntil: 7, invulnerableFrom: 9, invulnerableUntil: 0 },
  },

  // ---- Socos: 200 (fraco) -> 210 (medio) -> 220 (forte) ----
  punch: {
    actions: [200],
    ...NORMAL,
    hit: { damage: 1, hitstun: 14, push: 3 },
    events: [soundFrame(2, 'voiceLight')],
    cancels: [chain('punch', 'punch2'), chain('kick', 'kick'), chain('special', 'lightningLegs')],
  },
  punch2: {
    actions: [210],
    ...NORMAL,
    hit: { damage: 2, hitstun: 18, push: 4 },
    events: [soundFrame(1, 'voiceMid'), soundFrame(2, 'swingMid'), { frame: 2, dx: 8 }, { frame: 3, dx: 23 }, { frame: 6, dx: -20 }, { frame: 8, dx: -11 }],
    cancels: [chain('punch', 'punch3'), chain('kick', 'kick2'), chain('special', 'lightningLegs')],
  },
  punch3: {
    actions: [220],
    ...NORMAL,
    hit: { damage: 4, hitstun: 26, push: 8, heavy: true },
    events: [soundFrame(3, 'swingHeavy'), soundFrame(4, 'voiceMid'), { frame: 1, dx: 6 }, { frame: 4, dx: 10 }, { frame: 5, dx: 32 }, { frame: 13, dx: -15 }, { frame: 14, dx: -20 }],
    cancels: [chain('special', 'lightningLegs')],
  },
  // ---- Chutes: 230 (fraco) -> 240 (medio) -> 250 (forte) ----
  kick: {
    actions: [230],
    ...NORMAL,
    hit: { damage: 1, hitstun: 14, push: 3 },
    events: [soundFrame(2, 'voiceLight')],
    cancels: [chain('kick', 'kick2'), chain('special', 'lightningLegs')],
  },
  kick2: {
    actions: [240],
    ...NORMAL,
    hit: { damage: 2, hitstun: 18, push: 5 },
    events: [soundFrame(2, 'swingMid'), soundFrame(3, 'voiceMid'), { frame: 1, dx: 30 }, { frame: 2, dx: 5 }],
    cancels: [chain('kick', 'kick3'), chain('special', 'lightningLegs')],
  },
  kick3: {
    actions: [250],
    ...NORMAL,
    hit: { damage: 4, hitstun: 26, push: 9, heavy: true },
    events: [soundFrame(3, 'voiceHeavy'), soundFrame(5, 'swingMid')],
    cancels: [chain('special', 'lightningLegs')],
  },
  // Hyakuretsukyaku (1300 -> 1310): as pernas relampago.
  lightningLegs: {
    actions: [1300, 1310, 1310, 1310],
    cooldown: 30,
    hits: [...Array(12)].map(() => ({ damage: 1, hitstun: 14, push: 0 })),
    events: [{ at: 0, sound: 'legs' }, ...[0, 15, 30].map((at) => ({ action: 1310, at, sound: 'voiceLight' }))],
  },

  // ---- Agachada (segurando ↓) ----
  crouchPunch: { actions: [410], ...NORMAL, hit: { damage: 2, hitstun: 16, push: 3 }, events: [soundFrame(2, 'swingMid')] },
  crouchKick: { actions: [440], ...NORMAL, hit: { damage: 2, hitstun: 18, push: 4 }, events: [soundFrame(2, 'swingMid')] },
  sweep: { actions: [450], ...NORMAL, hit: { damage: 3, hitstun: 26, push: 8, heavy: true }, events: [soundFrame(3, 'voiceHeavy')] },

  // ---- No ar ----
  airPunch: {
    actions: [621],
    air: true,
    ...NORMAL,
    hit: { damage: 2, hitstun: 18, push: 4 },
    events: [soundFrame(2, 'voiceLight')],
    cancels: [chain('kick', 'airKick'), chain('special', 'airHeavy')],
  },
  airKick: {
    actions: [635],
    air: true,
    ...NORMAL,
    hit: { damage: 2, hitstun: 18, push: 4 },
    events: [soundFrame(2, 'swingMid')],
    cancels: [chain('special', 'airHeavy')],
  },
  airHeavy: {
    actions: [650],
    air: true,
    ...NORMAL,
    hit: { damage: 4, hitstun: 24, push: 8, heavy: true },
    events: [soundFrame(2, 'voiceHeavy')],
  },
  // 645 (↓K no ar): o pisao que quica.
  stomp: {
    actions: [645],
    air: true,
    hit: { damage: 3, hitstun: 22, push: 4 },
    events: [soundFrame(2, 'voiceMid'), { at: 0, vy: 2 }, { at: 12, vx: 3, vy: -5 }],
  },

  // ---- Especiais ----
  // Kikoken (1100): a bola de energia (helper 1101, anim 6003).
  kikoken: {
    actions: [1100],
    cooldown: 60,
    events: [soundFrame(5, 'voiceKikoken'), { frame: 9, effect: { id: 'kikoken', pos: [70, -20] } }],
  },
  // Spinning Bird Kick (1200): de cabeca para baixo girando; no ar (1250).
  spinningBird: {
    actions: [1202],
    cooldown: 60,
    friction: false,
    hit: { damage: 1, hitstun: 16, push: 2 },
    events: [soundFrame(3, 'voiceBird'), { frame: 6, vx: 5 }, { frame: 37, vx: 0 }],
    next: 'spinningBirdLand',
  },
  spinningBirdLand: { actions: [1203] },
  airSpinningBird: {
    actions: [1250],
    air: true,
    float: true,
    cooldown: 60,
    hit: { damage: 1, hitstun: 16, push: 2 },
    events: [soundFrame(3, 'voiceBird'), { at: 0, vx: 5, vy: 0 }, { frame: 21, vy: 4 }],
  },
  // Hazanshu (1000): o salto com o calcanhar que desce (overhead).
  hazanshu: {
    actions: [1002],
    cooldown: 60,
    friction: false,
    hit: { damage: 4, hitstun: 24, push: 6, heavy: true },
    events: [soundFrame(11, 'voiceMid'), { frame: 2, vx: 5, vy: -6 }],
    onLand: 'hazanshuLand',
  },
  hazanshuLand: { actions: [1003], hit: { damage: 1, hitstun: 14, push: 3 } },
  // Tenshokyaku (1400 -> 1410): os chutes subindo.
  tenshokyaku: {
    actions: [1400, 1412],
    cooldown: 60,
    hits: [...Array(5)].map((_, index) => ({ damage: index === 4 ? 3 : 1, hitstun: 24, push: index === 4 ? 8 : 1, heavy: index === 4 })),
    events: [{ at: 0, sound: 'voiceTensho' }, { action: 1412, at: 3, vx: 3, vy: -7 }, { action: 1412, frame: 18, vx: 1 }],
  },

  // ---- Supers (recarga no lugar da barra) ----
  // Kikosho (3000): a esfera de energia em volta dela.
  kikosho: {
    actions: [3000],
    cooldown: 900,
    invulnerable: [0, 40],
    events: [soundFrame(3, 'voiceSuper'), soundFrame(16, 'voiceKikosho'), fx(17, 'superFlash', [11, -92]), { frame: 15, effect: { id: 'kikosho', pos: [70, -40] } }],
  },
  // Houyoku-sen (3100 -> 3105): a investida e a rajada de chutes subindo.
  houyokusen: {
    actions: [3100],
    cooldown: 900,
    invulnerable: [0, 30],
    friction: false,
    hit: { damage: 1, hitstun: 50, push: 0 },
    events: [soundFrame(1, 'voiceSuper'), { frame: 8, vx: 8 }, { frame: 14, vx: 0 }, soundFrame(7, 'swingHeavy')],
    onHit: { to: 'houyokusenRise' },
  },
  houyokusenRise: {
    actions: [3105],
    invulnerable: [0, 126],
    hit: { damage: 1, hitstun: 60, push: 0 },
    events: [
      { at: 0, pinOpponent: { dx: 30, lift: 0, ticks: 100, relative: 'self' } },
      ...[23, 31, 39, 47, 55, 63, 71].map((frame) => ({ frame, sound: 'voiceLight' })),
    ],
    next: 'houyokusenLand',
  },
  houyokusenLand: { actions: [3111] },
  // Tensei Ranka (3200): o giro que sobe acertando varias vezes.
  tenseiRanka: {
    actions: [3200],
    cooldown: 900,
    invulnerable: [0, 20],
    hits: [{ damage: 2, hitstun: 30, push: 1, every: 4, count: 6 }],
    events: [{ at: 0, sound: 'voiceSuper' }, fx(0, 'superFlash', [2, -85]), { frame: 2, vx: 3, vy: -12.7 }, { frame: 12, vx: 1.5, vy: -0.5 }, { frame: 14, vx: 1.5, vy: 8 }],
    onLand: 'tenseiRankaLand',
  },
  tenseiRankaLand: { actions: [3201], events: [fx(0, 'landDust', [0, 4])] },
  // Rajada de chutes (3300 -> 3301): a pose e a tempestade de chutes.
  kickStorm: {
    actions: [{ id: 3300, times: { 19: 20 } }, 3301],
    cooldown: 900,
    invulnerable: [0, 40],
    hits: [{ damage: 1, hitstun: 20, push: 0, every: 4, count: 13 }],
    events: [{ at: 0, sound: 'voiceSuper' }, { action: 3301, frame: 5, sound: 'voiceLight' }],
    next: 'kickStormEnd',
  },
  kickStormEnd: { actions: [3302] },
};

const EFFECTS = {
  kikoken: {
    actions: [{ id: 6003, lengthTicks: 120 }],
    loop: true,
    lifetime: 120,
    velocityX: 4.4,
    destroyOnHit: true,
    endAtWall: true,
    hit: { damage: 3, hitstun: 24, push: 6 },
    onDeathSpawn: { id: 'kikokenPop' },
  },
  kikokenPop: { actions: [6004], harmless: true },
  kikosho: {
    actions: [6000],
    hit: { damage: 2, hitstun: 30, push: 1 },
  },
  superFlash: { actions: [6022], harmless: true },
  landDust: { actions: [7011], harmless: true },
};

const COMBOS = [
  { id: 'kikosho', input: '↓→↓→P', animation: 'kikosho' },
  { id: 'houyokusen', input: '↓→↓→K', animation: 'houyokusen' },
  { id: 'tenseiRanka', input: '↓←↓←K', animation: 'tenseiRanka' },
  { id: 'kickStorm', input: '↓←↓←P', animation: 'kickStorm' },
  { id: 'tenshokyaku', input: '→↓→K', animation: 'tenshokyaku' },
  { id: 'kikoken', input: '↓→P', animation: 'kikoken' },
  { id: 'hazanshu', input: '↓→K', animation: 'hazanshu' },
  { id: 'spinningBird', input: '↓←K', animation: 'spinningBird', airAnimation: 'airSpinningBird' },
  { id: 'crouchPunch', input: 'P', hold: '↓', animation: 'crouchPunch' },
  { id: 'crouchKick', input: 'K', hold: '↓', animation: 'crouchKick', airAnimation: 'stomp' },
  { id: 'sweep', input: 'S', hold: '↓', animation: 'sweep' },
];

const BUTTONS = {
  ground: { punch: 'punch', kick: 'kick', special: 'lightningLegs' },
  air: { punch: 'airPunch', kick: 'airKick', special: 'airHeavy' },
};

const MOVE_LIST = [
  { section: 'Movimento', name: 'Corrida', input: '→→' },
  { section: 'Movimento', name: 'Pulo duplo', input: '↑↑', note: 'No ar, aperte para cima de novo' },
  { section: 'Golpes', name: 'Socos', input: 'PPP', note: 'Fraco, médio e forte' },
  { section: 'Golpes', name: 'Chutes', input: 'KKK', note: 'Fraco, médio e forte' },
  { section: 'Golpes', name: 'Hyakuretsukyaku', input: 'S', note: 'As pernas relâmpago' },
  { section: 'Golpes', name: 'Agachada', input: 'P K S', hold: '↓', note: 'S é a rasteira' },
  { section: 'Golpes', name: 'No ar', input: 'PKS', note: '↓K: pisão' },
  { section: 'Especiais', name: 'Kikoken', input: '↓→P' },
  { section: 'Especiais', name: 'Hazanshu', input: '↓→K', note: 'O calcanhar que desce' },
  { section: 'Especiais', name: 'Spinning Bird Kick', input: '↓←K', note: 'Também no ar' },
  { section: 'Especiais', name: 'Tenshokyaku', input: '→↓→K', note: 'Chutes subindo' },
  { section: 'Super', name: 'Kikosho', input: '↓→↓→P', note: 'A esfera de energia' },
  { section: 'Super', name: 'Houyoku-sen', input: '↓→↓→K', note: 'Se a investida pegar, a rajada subindo' },
  { section: 'Super', name: 'Tensei Ranka', input: '↓←↓←K', note: 'O giro que sobe' },
  { section: 'Super', name: 'Rajada de chutes', input: '↓←↓←P' },
];

const SOUNDS = {
  voiceLight: [0, 0], voiceMid: [0, 2], voiceHeavy: [0, 3],
  swingMid: [2, 6], swingHeavy: [2, 4],
  legs: [2, 12], voiceKikoken: [2, 9], voiceBird: [2, 13], voiceTensho: [2, 26],
  voiceSuper: [2, 10], voiceKikosho: [2, 11],
};

importMugenCharacter({
  root: ROOT,
  sffPath: resolve(PACK, 'SF3CHUN.sff'),
  sffOptions: { actPath: resolve(PACK, 'SF3CHUN.act') },
  airPath: resolve(PACK, 'SF3CHUN.air'),
  outDir: 'public/assets/characters/chunli',
  id: 'chunli',
  name: 'Chun-Li',
  description: 'A mais forte do mundo',
  template: 'public/assets/characters/dummy/dummy_config.json',
  animations: ANIMATIONS,
  effects: EFFECTS,
  combos: COMBOS,
  buttons: BUTTONS,
  moveList: MOVE_LIST,
  sndPath: resolve(PACK, 'SF3CHUN.snd'),
  sounds: SOUNDS,
  portrait: { sprite: [9000, 1], crop: [0, 0, 123, 135], width: 50, height: 55, background: '#101C38' },
});
