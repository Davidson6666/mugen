// Importa o Tanjiro do pacote MUGEN "Tanjiro Jus v2" (Entah99; creditos em
// CREDITS.md), no estilo Jump Ultimate Stars.
//
// O pacote fica em assets-src/tanjiro/mugen/ (fora do git). SFF v2 (RLE8)
// com a paleta 1.act. Para regerar: npm run assets:tanjiro
//
// Golpes: os cortes (a/b/c do J-Stars), o corte mergulhando no ar, as
// Respiracoes da Agua do .cmd (os golpes sao helpers com animacao e caixa
// propria, aqui efeitos), os tres assistentes de ↓ + botao (Nezuko, Zenitsu
// e Inosuke) e os dois supers (Hinokami Kagura e a Dança do Deus do Fogo).
// O sprite e pequeno (47 px parado): spriteScale 2 poe o Tanjiro na altura do
// elenco.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importMugenCharacter } from './lib/mugen-import.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = resolve(ROOT, 'assets-src/tanjiro/mugen');

const fx = (at, id, pos = [0, 0], extra = {}) => ({ at, effect: { id, pos, ...extra } });
const fxFrame = (frame, id, pos = [0, 0], extra = {}) => ({ frame, effect: { id, pos, ...extra } });
const sound = (at, key) => ({ at, sound: key });

const NORMAL = { specialCancel: true };
const chain = (on, to, after = 4) => ({ on, to, after });
// Flash de Respiracao (7400 azul) no inicio dos especiais.
const breath = (pos = [-3, -20]) => fx(0, 'breathFlash', pos);

const ANIMATIONS = {
  idle: { actions: [0], loop: true },
  walkForward: { actions: [20], loop: true },
  walkBackward: { actions: [21], loop: true },
  jump: { actions: [40, 41] },
  crouch: { actions: [{ id: 11, times: { 0: 30 } }], loop: true },
  blockStanding: { actions: [130], loop: true },
  blockCrouching: { actions: [131], loop: true },
  hitReaction: { actions: [5000] },
  ko: { actions: [5030, { id: 5050, times: { 1: 20 } }, 5100, 5110] },
  victoryPose: { actions: [{ id: 180, times: { 3: 60 } }] },
  defeatPose: { actions: [{ id: 190, times: { 6: 60 } }] },

  dashForward: {
    actions: [100],
    dash: { distance: 170, moveFrom: 0, moveUntil: 7, invulnerableFrom: 9, invulnerableUntil: 0, cancel: true },
  },
  dashBackward: {
    actions: [105],
    dash: { distance: 100, moveFrom: 0, moveUntil: 1, invulnerableFrom: 0, invulnerableUntil: 0 },
  },
  airDashForward: {
    actions: [100],
    dash: { distance: 140, moveFrom: 0, moveUntil: 7, invulnerableFrom: 9, invulnerableUntil: 0 },
  },
  airDashBackward: {
    actions: [105],
    dash: { distance: 100, moveFrom: 0, moveUntil: 1, invulnerableFrom: 9, invulnerableUntil: 0 },
  },

  // ---- Cortes: a (200 -> 210), b (300 -> 310), c (400) ----
  punch: {
    actions: [200],
    ...NORMAL,
    hit: { damage: 2, hitstun: 18, push: 3 },
    events: [sound(0, 'voice0'), sound(0, 'slash1'), { at: 0, vx: 2 }],
    cancels: [chain('punch', 'punch2'), chain('kick', 'kick'), chain('special', 'strong')],
  },
  punch2: {
    actions: [210],
    ...NORMAL,
    hit: { damage: 2, hitstun: 20, push: 3 },
    events: [sound(0, 'voice1'), sound(0, 'slash2'), { at: 0, vx: 2 }, fxFrame(2, 'swing')],
    cancels: [chain('kick', 'kick'), chain('special', 'strong')],
  },
  kick: {
    actions: [300],
    ...NORMAL,
    hit: { damage: 2, hitstun: 20, push: 4 },
    events: [sound(0, 'voice2'), sound(0, 'slash3'), { at: 0, vx: 2 }, fxFrame(2, 'swing')],
    cancels: [chain('kick', 'kick2'), chain('special', 'strong')],
  },
  kick2: {
    actions: [310],
    ...NORMAL,
    hit: { damage: 3, hitstun: 24, push: 6 },
    events: [sound(0, 'voice8'), sound(0, 'slash4'), { at: 0, vx: 2 }, fxFrame(2, 'swing')],
    cancels: [chain('special', 'strong')],
  },
  strong: {
    actions: [400],
    ...NORMAL,
    hit: { damage: 4, hitstun: 28, push: 9, heavy: true },
    events: [sound(0, 'voice8'), sound(0, 'slashHeavy'), { at: 0, vx: 2 }],
  },

  // ---- No ar: o corte mergulhando (610) e o corte (620) ----
  airSlash: {
    actions: [610],
    air: true,
    hit: { damage: 3, hitstun: 24, push: 5, heavy: true },
    events: [sound(0, 'voice7'), sound(0, 'slash4'), { at: 0, vx: 1, vy: -4 }, { at: 8, vx: 0, vy: 10 }, fx(8, 'diveTrail')],
    onLand: 'airSlashLand',
  },
  airSlashLand: { actions: [611] },
  airStrong: {
    actions: [620],
    air: true,
    ...NORMAL,
    hit: { damage: 3, hitstun: 24, push: 6 },
    events: [sound(0, 'voice2'), sound(0, 'slash3'), fxFrame(2, 'swing')],
  },

  // ---- Respiracoes da Agua ----
  // 1000 (↓→P): corte da agua em disparada; se pegar, a rajada de cortes.
  waterSlash: {
    actions: [1000],
    cooldown: 90,
    friction: false,
    hit: { damage: 3, hitstun: 50, push: 0 },
    events: [breath(), sound(0, 'voiceWater1'), sound(30, 'slash4'), { at: 30, vx: 30 }, { at: 40, vx: 2 }],
    onHit: { to: 'waterFlurry' },
  },
  waterFlurry: {
    actions: [{ id: 1000, pick: [3], times: { 0: 40 } }],
    invulnerable: [0, 40],
    events: [
      { at: 0, vx: 0 },
      ...[0, 4, 8, 12, 16, 20, 24, 28].map((at) => fx(at, 'waterCut', [0, -40], { target: 'opponent', spread: [25, 25] })),
      ...[0, 8, 16, 24].map((at) => sound(at, 'slash2')),
    ],
  },
  // 1200 (↓←P): o redemoinho em volta dele.
  whirlpool: {
    actions: [1200],
    cooldown: 120,
    events: [breath([1, -25]), sound(0, 'voiceWater2'), sound(0, 'water'), fx(0, 'whirlpool')],
  },
  // 1300 (↓→K): a onda que avanca a frente.
  waterSurface: {
    actions: [1300],
    cooldown: 90,
    events: [breath(), sound(0, 'voiceWater3'), sound(30, 'water'), fx(30, 'waterWave', [50, 5]), fx(30, 'splash', [-15, 20])],
  },
  // 1900 (↓←K): o giro em disparada; tambem no ar (1950).
  spinDash: {
    actions: [1900],
    cooldown: 90,
    friction: false,
    hits: [{ damage: 1, hitstun: 20, push: 1, every: 5, count: 3 }],
    events: [breath(), sound(0, 'voiceSpin'), ...[3, 6, 9, 12, 15, 18].map((at) => sound(27 + at, 'water')), { at: 30, vx: 6 }, fxFrame(6, 'spinRing', [2, -20]), fxFrame(7, 'spinRing', [-2, -25])],
  },
  airSpinDash: {
    actions: [1950],
    air: true,
    float: true,
    cooldown: 90,
    hits: [{ damage: 1, hitstun: 20, push: 1, every: 5, count: 3 }],
    events: [breath([-4, -25]), sound(0, 'voiceSpin'), { at: 0, vx: 2, vy: 2 }, { at: 35, vx: 6, vy: 0 }, fxFrame(6, 'spinRing', [2, -20]), fxFrame(7, 'spinRing', [-2, -25])],
  },
  // 1400 (↓→S): a roda d'agua rolando para a frente.
  waterWheel: {
    actions: [1400],
    cooldown: 90,
    friction: false,
    hits: [{ damage: 1, hitstun: 18, push: 1, every: 2, count: 5 }],
    events: [breath([1, -18]), sound(30, 'voiceWater4'), sound(30, 'slash4'), { at: 30, vx: 8, vy: 0 }, ...[30, 36].map((at) => fx(at, 'wheelSlash'))],
  },
  // 1500 (↓←S): a coluna de agua a frente.
  waterPillar: {
    actions: [1500],
    cooldown: 120,
    events: [breath([-1, -18]), sound(0, 'voiceWater5'), sound(32, 'water'), fx(32, 'pillar', [60, 35]), fx(32, 'pillarSplash', [60, 10])],
  },
  // Assistentes (↓ + botao): Nezuko chuta, Zenitsu e Inosuke passam cortando.
  nezuko: {
    actions: [1600],
    cooldown: 300,
    events: [sound(0, 'voiceNezuko'), fx(0, 'nezukoAssist', [50, 0])],
  },
  zenitsu: {
    actions: [1600],
    cooldown: 300,
    events: [sound(0, 'voiceZenitsu'), fx(0, 'zenitsuAssist', [-40, 0])],
  },
  inosuke: {
    actions: [1600],
    cooldown: 300,
    events: [sound(0, 'voiceInosuke'), fx(0, 'inosukeAssist', [-40, 0])],
  },

  // ---- Supers (recarga no lugar da barra) ----
  // Hinokami Kagura (3000 -> 3003): o corte, dois golpes e a danca de fogo.
  hinokami: {
    actions: [3000],
    cooldown: 900,
    friction: false,
    invulnerable: [0, 32],
    hit: { damage: 4, hitstun: 40, push: 0 },
    events: [fx(0, 'fireFlash', [-2, -20]), sound(0, 'voiceHinokami'), sound(32, 'slashHeavy'), { at: 32, vx: 6 }],
    onHit: { to: 'hinokamiCombo' },
  },
  hinokamiCombo: {
    actions: [210, 300],
    invulnerable: [0, 40],
    hits: [{ damage: 2, hitstun: 40, push: 0 }, { damage: 2, hitstun: 60, push: 0 }],
    events: [{ at: 0, vx: 2 }, sound(6, 'slash2'), { action: 300, at: 0, vx: 4 }, { action: 300, at: 0, sound: 'slash3' }],
    next: 'hinokamiDance',
  },
  hinokamiDance: {
    actions: [3003],
    invulnerable: [0, 150],
    events: [
      { at: 0, vx: 0, pinOpponent: { dx: 40, lift: 0, ticks: 110, relative: 'self' } },
      sound(0, 'voiceHinokami2'),
      fx(35, 'fireWave', [15, 1]), fx(35, 'fireWave', [-15, 1], { flip: true }), sound(35, 'fire'),
      ...[40, 50, 60, 70, 80, 90].map((at) => fx(at, 'fireCut', [0, -40], { target: 'opponent', spread: [30, 30] })),
      { at: 100, vx: 30 }, { at: 110, vx: 4 },
      fx(100, 'fireFinish', [0, -40], { target: 'opponent' }),
      sound(100, 'slashHeavy'),
    ],
  },
  // 3100 (↓→↓→K): a disparada e a tempestade de cortes azuis.
  waterDance: {
    actions: [3100],
    cooldown: 900,
    friction: false,
    invulnerable: [0, 30],
    events: [fx(0, 'waterFlash', [-1, -22]), sound(0, 'voiceDance'), fx(10, 'danceGlow', [0, 0]), { at: 30, vx: 10 }, sound(30, 'water')],
    next: 'waterDanceStrike',
  },
  waterDanceStrike: {
    actions: [3101],
    friction: false,
    hit: { damage: 4, hitstun: 60, push: 2, heavy: true },
    events: [sound(0, 'slashHeavy'), { at: 0, vx: 20 }, { at: 8, vx: 0 }],
    onHit: { to: 'waterDanceStorm', minHits: 1 },
  },
  waterDanceStorm: {
    actions: [{ id: 3101, pick: [4], times: { 0: 60 } }],
    invulnerable: [0, 60],
    events: [
      { at: 0, vx: 0 },
      ...[0, 5, 10, 15, 20, 25, 30, 35, 40, 45].map((at) => fx(at, 'waterCut', [0, -40], { target: 'opponent', spread: [25, 25] })),
      ...[0, 10, 20, 30, 40].map((at) => sound(at, 'slash2')),
    ],
  },
};

// Assistente: o corpo dele aparece e golpeia com a caixa do pacote; Zenitsu e
// Inosuke disparam (velset 30 por 10 ticks), a Nezuko chuta parada.
const assist = (enter, strike, damage, dash = true) => ({
  actions: [{ id: enter, lengthTicks: 10 }, strike],
  layer: 'front',
  ...(dash ? { motion: [{ at: 20, vx: 30 }, { at: 30, vx: 2 }] } : {}),
  maxHits: 1,
  hit: { damage, hitstun: 36, push: 14, heavy: true },
});

const EFFECTS = {
  breathFlash: { actions: [7400], size: 0.2, harmless: true },
  fireFlash: { actions: [7405], size: 0.3, harmless: true },
  waterFlash: { actions: [7405], size: 0.3, harmless: true },
  swing: { actions: [7250], harmless: true },
  diveTrail: { actions: [615], harmless: true },
  waterCut: { actions: [1050], hit: { damage: 1, hitstun: 30, push: 0 }, maxHits: 1 },
  whirlpool: {
    actions: [1250],
    area: { rect: [-60, -70, 60, 10], damage: 1, hitstun: 20, push: 2, every: 6, count: 10 },
  },
  waterWave: { actions: [1350], hit: { damage: 1, hitstun: 22, push: 3, every: 3, count: 3 } },
  splash: { actions: [550], size: 0.6, harmless: true },
  spinRing: { actions: [7200], size: 0.6, harmless: true },
  wheelSlash: { actions: [1450], harmless: true },
  pillar: { actions: [1550, 1550, 1550], hit: { damage: 1, hitstun: 24, push: 2, every: 5, count: 5 } },
  pillarSplash: { actions: [1557], harmless: true },
  nezukoAssist: assist(1610, 1602, 5, false),
  zenitsuAssist: {
    ...assist(1710, 1702, 3),
    onHitSpawn: { id: 'zenitsuFlurry', target: 'opponent', pos: [0, -25] },
  },
  zenitsuFlurry: {
    actions: [{ id: 1750, lengthTicks: 24 }],
    loop: true,
    lifetime: 24,
    hit: { damage: 1, hitstun: 24, push: 0, every: 4, count: 5 },
  },
  inosukeAssist: assist(1810, 1802, 5),
  fireWave: { actions: [2430], size: 0.12, harmless: true },
  fireCut: { actions: [2205], size: 0.25, area: { rect: [-100, -300, 100, 20], damage: 1, hitstun: 40, push: 0 }, maxHits: 1 },
  fireFinish: { actions: [2205], size: 0.4, area: { rect: [-100, -300, 100, 20], damage: 5, hitstun: 40, push: 14, heavy: true } },
  danceGlow: { actions: [3130], size: 0.4, harmless: true },
};

const COMBOS = [
  { id: 'hinokami', input: '↓→↓→P', animation: 'hinokami' },
  { id: 'waterDance', input: '↓→↓→K', animation: 'waterDance' },
  { id: 'waterSlash', input: '↓→P', animation: 'waterSlash' },
  { id: 'whirlpool', input: '↓←P', animation: 'whirlpool' },
  { id: 'waterSurface', input: '↓→K', animation: 'waterSurface' },
  { id: 'spinDash', input: '↓←K', animation: 'spinDash', airAnimation: 'airSpinDash' },
  { id: 'waterWheel', input: '↓→S', animation: 'waterWheel' },
  { id: 'waterPillar', input: '↓←S', animation: 'waterPillar' },
  { id: 'nezuko', input: 'P', hold: '↓', animation: 'nezuko' },
  { id: 'zenitsu', input: 'K', hold: '↓', animation: 'zenitsu' },
  { id: 'inosuke', input: 'S', hold: '↓', animation: 'inosuke' },
];

const BUTTONS = {
  ground: { punch: 'punch', kick: 'kick', special: 'strong' },
  air: { punch: 'airSlash', kick: 'airSlash', special: 'airStrong' },
};

const MOVE_LIST = [
  { section: 'Movimento', name: 'Corrida', input: '→→' },
  { section: 'Movimento', name: 'Pulo duplo', input: '↑↑', note: 'No ar, aperte para cima de novo' },
  { section: 'Golpes', name: 'Cortes', input: 'PP KK S', note: 'Encadeiam ao conectar' },
  { section: 'Golpes', name: 'No ar', input: 'P ou K', note: 'Corte mergulhando; S: corte' },
  { section: 'Especiais', name: 'Primeira Forma', input: '↓→P', note: 'Corte em disparada; se pegar, a rajada' },
  { section: 'Especiais', name: 'Redemoinho', input: '↓←P' },
  { section: 'Especiais', name: 'Superfície da Água', input: '↓→K', note: 'A onda à frente' },
  { section: 'Especiais', name: 'Giro', input: '↓←K', note: 'Também no ar' },
  { section: 'Especiais', name: "Roda d'Água", input: '↓→S' },
  { section: 'Especiais', name: 'Coluna de água', input: '↓←S' },
  { section: 'Especiais', name: 'Nezuko', input: 'P', hold: '↓', note: 'Assistente' },
  { section: 'Especiais', name: 'Zenitsu', input: 'K', hold: '↓', note: 'Assistente' },
  { section: 'Especiais', name: 'Inosuke', input: 'S', hold: '↓', note: 'Assistente' },
  { section: 'Super', name: 'Hinokami Kagura', input: '↓→↓→P', note: 'Se o corte pegar, a dança de fogo' },
  { section: 'Super', name: 'Tempestade de cortes', input: '↓→↓→K', note: 'Disparada e cortes em volta do oponente' },
];

const SOUNDS = {
  voice0: [0, 0], voice1: [0, 1], voice2: [0, 2], voice7: [0, 7], voice8: [0, 8],
  slash1: [5, 51], slash2: [5, 52], slash3: [5, 45], slash4: [5, 46], slashHeavy: [5, 4],
  water: [5, 54], fire: [5, 57],
  voiceWater1: [0, 109], voiceWater2: [0, 107], voiceWater3: [0, 105], voiceWater4: [0, 108], voiceWater5: [0, 106],
  voiceSpin: [0, 121], voiceNezuko: [0, 113], voiceZenitsu: [0, 116], voiceInosuke: [0, 119],
  voiceHinokami: [0, 102], voiceHinokami2: [0, 103], voiceDance: [0, 118],
};

importMugenCharacter({
  root: ROOT,
  sffPath: resolve(PACK, 'Tanjiro.sff'),
  sffOptions: { actPath: resolve(PACK, '1.act') },
  airPath: resolve(PACK, 'Tanjiro.air'),
  outDir: 'public/assets/characters/tanjiro',
  id: 'tanjiro',
  name: 'Tanjiro',
  description: 'O caçador de onis',
  template: 'public/assets/characters/dummy/dummy_config.json',
  animations: ANIMATIONS,
  effects: EFFECTS,
  combos: COMBOS,
  buttons: BUTTONS,
  moveList: MOVE_LIST,
  sndPath: resolve(PACK, 'Tanjiro.snd'),
  sounds: SOUNDS,
  spriteScale: 2,
  portrait: { sprite: [9000, 1], crop: [0, 0, 120, 132], width: 50, height: 55, background: '#12241E' },
});
