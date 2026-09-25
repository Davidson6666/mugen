// Importa a Nezuko do pacote MUGEN "Nezuko By Santoryu" (SantoryuMUGENJUS;
// creditos em CREDITS.md), no estilo Jump Ultimate Stars.
//
// O pacote fica em assets-src/nezuko/mugen/ (fora do git). SFF v2 (RLE8/LZ5)
// com a paleta 1.act. Para regerar: npm run assets:nezuko
//
// Golpes: soco, a sequencia de chutes que termina no lancador, as garras
// (c), os aereos e os especiais do .cmd: o chute em disparada, o chute
// projetado, a sequencia de chutes, a investida aerea, a Arte Demoniaca do
// Sangue Explosivo e a regeneracao; e o super (a rajada de chutes e o chute
// final). O sprite parado tem 47 px: spriteScale 2 poe a Nezuko na altura do
// elenco.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importMugenCharacter } from './lib/mugen-import.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = resolve(ROOT, 'assets-src/nezuko/mugen');

const fx = (at, id, pos = [0, 0], extra = {}) => ({ at, effect: { id, pos, ...extra } });
const sound = (at, key) => ({ at, sound: key });

const NORMAL = { specialCancel: true };
const chain = (on, to, after = 4) => ({ on, to, after });
const demon = (pos) => fx(0, 'demonFlash', pos);

const ANIMATIONS = {
  idle: { actions: [{ id: 0, pick: [0, 1, 2, 3, 4, 5, 6, 7] }], loop: true },
  walkForward: { actions: [20], loop: true },
  walkBackward: { actions: [21], loop: true },
  jump: { actions: [40, 41] },
  crouch: { actions: [{ id: 11, times: { 0: 30 } }], loop: true },
  blockStanding: { actions: [130], loop: true },
  blockCrouching: { actions: [131], loop: true },
  hitReaction: { actions: [5000] },
  ko: { actions: [5030, { id: 5050, times: { 1: 20 } }, 5100, 5110] },
  victoryPose: { actions: [{ id: 180, times: { 2: 60 } }] },
  defeatPose: { actions: [{ id: 190, times: { 10: 60 } }] },

  dashForward: {
    actions: [100],
    dash: { distance: 160, moveFrom: 0, moveUntil: 2, invulnerableFrom: 9, invulnerableUntil: 0, cancel: true },
  },
  dashBackward: {
    actions: [105],
    dash: { distance: 100, moveFrom: 0, moveUntil: 2, invulnerableFrom: 0, invulnerableUntil: 0 },
  },
  airDashForward: {
    actions: [100],
    dash: { distance: 130, moveFrom: 0, moveUntil: 2, invulnerableFrom: 9, invulnerableUntil: 0 },
  },
  airDashBackward: {
    actions: [105],
    dash: { distance: 100, moveFrom: 0, moveUntil: 2, invulnerableFrom: 9, invulnerableUntil: 0 },
  },

  // ---- a (soco), b (chutes 300 -> 310 -> 320 -> 330), c (garras 410 -> 420) ----
  punch: {
    actions: [200],
    ...NORMAL,
    hit: { damage: 1, hitstun: 16, push: 2 },
    events: [sound(0, 'swing'), { at: 0, vx: 2 }],
    cancels: [chain('punch', 'kick'), chain('kick', 'kick'), chain('special', 'claw')],
  },
  kick: {
    actions: [300],
    ...NORMAL,
    hit: { damage: 1, hitstun: 18, push: 2 },
    events: [sound(0, 'swing'), { at: 0, vx: 2 }],
    cancels: [chain('kick', 'kick2'), chain('special', 'claw')],
  },
  kick2: {
    actions: [310],
    ...NORMAL,
    hit: { damage: 2, hitstun: 20, push: 4 },
    events: [sound(0, 'swing2'), { at: 0, vx: 5 }],
    cancels: [chain('kick', 'kick3'), chain('special', 'claw')],
  },
  kick3: {
    actions: [320],
    ...NORMAL,
    friction: false,
    hit: { damage: 2, hitstun: 24, push: 5 },
    events: [sound(0, 'voice7'), { at: 4, vx: 5.5 }, { at: 18, vx: 0 }, { frame: 4, effect: { id: 'dustRing', pos: [5, 3] } }],
    cancels: [chain('kick', 'kick4'), chain('special', 'claw')],
  },
  kick4: {
    actions: [330],
    ...NORMAL,
    hit: { damage: 2, hitstun: 30, push: 4, heavy: true },
    events: [sound(0, 'voice16'), { at: 5, vx: 3, vy: -8 }, fx(5, 'dust', [-5, 5])],
  },
  claw: {
    actions: [410],
    ...NORMAL,
    hit: { damage: 2, hitstun: 22, push: 4 },
    events: [sound(0, 'voice24'), sound(0, 'hit4'), { at: 0, vx: 2 }],
    cancels: [chain('special', 'bigKick')],
  },
  bigKick: {
    actions: [420],
    ...NORMAL,
    hit: { damage: 4, hitstun: 30, push: 14, heavy: true },
    events: [sound(0, 'voice27'), sound(0, 'hit9'), { at: 0, vx: 4 }, fx(0, 'dust', [-5, 0])],
  },

  // ---- No ar ----
  airPunch: {
    actions: [600],
    air: true,
    ...NORMAL,
    hit: { damage: 1, hitstun: 18, push: 3 },
    events: [sound(0, 'swing')],
    cancels: [chain('kick', 'airKick'), chain('special', 'airStrong')],
  },
  airKick: {
    actions: [610],
    air: true,
    ...NORMAL,
    hit: { damage: 2, hitstun: 20, push: 4 },
    events: [sound(0, 'swing')],
    cancels: [chain('special', 'airStrong')],
  },
  airStrong: {
    actions: [620],
    air: true,
    hit: { damage: 3, hitstun: 24, push: 6, heavy: true },
    events: [sound(0, 'swing2'), { at: 1, vx: 2 }],
  },

  // ---- Especiais ----
  // 1000 (↓←P): o chute em disparada que arremessa.
  dashKick: {
    actions: [1000],
    cooldown: 90,
    friction: false,
    hit: { damage: 6, hitstun: 36, push: 16, heavy: true },
    events: [demon([2, -21]), sound(0, 'voice4'), sound(30, 'hit9'), { at: 30, vx: 15 }, { at: 42, vx: 0 }],
  },
  // 1100 (↓→P): o chute que solta a onda (1750) a frente.
  projectedKick: {
    actions: [1100],
    cooldown: 90,
    events: [demon([-1, -21]), sound(30, 'voice7'), sound(32, 'hit9'), fx(32, 'dust', [-10, 0]), fx(32, 'kickWave', [30, -10])],
  },
  // 1200 (↓→K): a investida; se pegar, os tres chutes (1401).
  kickFlurry: {
    actions: [1400],
    cooldown: 120,
    friction: false,
    hit: { damage: 2, hitstun: 40, push: 0 },
    events: [demon([0, -21]), sound(30, 'voice7'), { at: 30, vx: 8 }, { at: 34, vx: 2 }, fx(32, 'ghost', [0, 0])],
    onHit: { to: 'kickFlurryHits' },
  },
  kickFlurryHits: {
    actions: [1401],
    hits: [{ damage: 2, hitstun: 40, push: 0 }, { damage: 2, hitstun: 40, push: 0 }, { damage: 3, hitstun: 30, push: 12, heavy: true }],
    events: [{ at: 0, vx: 4 }, { at: 12, vx: 0 }, ...[5, 22, 38].map((at) => fx(at, 'ghost', [0, 0])), ...[7, 23, 39].map((at) => sound(at, 'hit4'))],
  },
  // 1300 (↓←K): a investida; se pegar, salta e desce com o chute (1302/1303).
  aerialRush: {
    actions: [1300],
    cooldown: 120,
    friction: false,
    hit: { damage: 2, hitstun: 60, push: 0 },
    events: [demon([0, -21]), sound(30, 'voice5'), { at: 30, vx: 15 }, { at: 38, vx: 0 }],
    onHit: { to: 'aerialRushDive' },
  },
  aerialRushDive: {
    actions: [1301, 1302, { id: 1303, lengthTicks: 30 }],
    float: true,
    invulnerable: [0, 40],
    hit: { damage: 5, hitstun: 36, push: 12, heavy: true },
    events: [
      { at: 2, vx: 3, vy: -6 },
      // No pacote ela cruza a tela (velset 30); aqui reaparece junto do
      // oponente e desce com o chute.
      { action: 1302, at: 0, vx: 0, vy: 0, teleport: 20 },
      { action: 1303, at: 0, vx: 2, vy: 4 },
      { action: 1303, at: 0, sound: 'hit4' },
    ],
    onLand: 'aerialRushLand',
  },
  aerialRushLand: { actions: [1304] },
  // 1400 (↓→S): o chute; se pegar, o Sangue Explosivo queima o oponente.
  explodingBlood: {
    actions: [4001],
    cooldown: 150,
    friction: false,
    hit: { damage: 4, hitstun: 60, push: 0 },
    events: [demon([8, -23]), sound(30, 'voice5'), sound(30, 'hit9'), { at: 30, vx: 6 }, { at: 40, vx: 0 }],
    onHit: { to: 'explodingBloodBurst' },
  },
  explodingBloodBurst: {
    actions: [{ id: 3001, times: { 0: 30, 1: 30 } }],
    invulnerable: [0, 60],
    events: [
      { at: 0, vx: 0 },
      sound(0, 'voice7'),
      ...[4, 12, 20, 28, 36, 44].map((at) => fx(at, 'bloodBurst', [0, -40], { target: 'opponent', spread: [12, 12] })),
    ],
  },
  // 1500 (↓←S): regenera (LifeAdd no pacote), com a esfera verde.
  regenerate: {
    actions: [1500],
    cooldown: 900,
    events: [demon([2, -18]), sound(25, 'heal'), fx(25, 'healOrb', [1, -17]), { at: 25, repeat: { every: 5, until: 90 }, heal: 1 }],
  },

  // ---- Super (↓→↓→P): o chute, a rajada de chutes e o chute final ----
  demonRush: {
    actions: [3000],
    cooldown: 900,
    friction: false,
    invulnerable: [0, 32],
    hit: { damage: 2, hitstun: 60, push: 0 },
    events: [fx(0, 'superFlash', [2, -19]), sound(1, 'voice7'), { at: 30, vx: 6 }, { at: 36, vx: 0 }],
    onHit: { to: 'demonRushFlurry' },
  },
  demonRushFlurry: {
    actions: [3003, { id: 3003, pick: [12, 13, 14, 15, 16, 17] }],
    invulnerable: [0, 90],
    friction: false,
    hits: [{ damage: 2, hitstun: 50, push: 0 }, { damage: 2, hitstun: 50, push: 0 }, { damage: 2, hitstun: 50, push: 0 }, { damage: 2, hitstun: 50, push: 0 }],
    events: [
      { at: 30, vx: 3 },
      ...[30, 38, 46, 54, 62, 70].map((at) => fx(at, 'bloodBurst', [0, -40], { target: 'opponent', spread: [12, 12] })),
      ...[33, 43, 53, 63].map((at) => sound(at, 'hit4')),
    ],
    next: 'demonRushFinish',
  },
  demonRushFinish: {
    actions: [3004],
    invulnerable: [0, 55],
    friction: false,
    hit: { damage: 7, hitstun: 40, push: 18, heavy: true },
    events: [sound(0, 'voice5'), { at: 30, vx: 10 }, { at: 40, vx: 0 }, sound(35, 'hit9')],
  },
};

const EFFECTS = {
  demonFlash: { actions: [7400], size: 0.2, harmless: true },
  superFlash: { actions: [7405], size: 0.3, harmless: true },
  dust: { actions: [7022], size: 0.4, harmless: true },
  dustRing: { actions: [8260], size: 0.4, harmless: true, lifetime: 20 },
  kickWave: {
    actions: [1750],
    velocityX: 15,
    destroyOnHit: true,
    endAtWall: true,
    hit: { damage: 5, hitstun: 30, push: 12, heavy: true },
  },
  ghost: { actions: [{ id: 305, times: { 0: 12 } }], harmless: true, alpha: 0.5, blend: 'add' },
  bloodBurst: {
    actions: [3055],
    size: 0.32,
    area: { rect: [-90, -90, 90, 90], damage: 1, hitstun: 50, push: 0 },
    maxHits: 1,
  },
  healOrb: { actions: [1550], size: 0.7, harmless: true },
};

const COMBOS = [
  { id: 'demonRush', input: '↓→↓→P', animation: 'demonRush' },
  { id: 'projectedKick', input: '↓→P', animation: 'projectedKick' },
  { id: 'dashKick', input: '↓←P', animation: 'dashKick' },
  { id: 'kickFlurry', input: '↓→K', animation: 'kickFlurry' },
  { id: 'aerialRush', input: '↓←K', animation: 'aerialRush' },
  { id: 'explodingBlood', input: '↓→S', animation: 'explodingBlood' },
  { id: 'regenerate', input: '↓←S', animation: 'regenerate' },
];

const BUTTONS = {
  ground: { punch: 'punch', kick: 'kick', special: 'claw' },
  air: { punch: 'airPunch', kick: 'airKick', special: 'airStrong' },
};

const MOVE_LIST = [
  { section: 'Movimento', name: 'Corrida', input: '→→' },
  { section: 'Movimento', name: 'Pulo duplo', input: '↑↑', note: 'No ar, aperte para cima de novo' },
  { section: 'Golpes', name: 'Chutes', input: 'KKKK', note: 'O quarto lança' },
  { section: 'Golpes', name: 'Garras', input: 'SS', note: 'O segundo é o chute que arremessa' },
  { section: 'Golpes', name: 'No ar', input: 'PKS' },
  { section: 'Especiais', name: 'Chute projetado', input: '↓→P', note: 'A onda à frente' },
  { section: 'Especiais', name: 'Chute em disparada', input: '↓←P' },
  { section: 'Especiais', name: 'Sequência de chutes', input: '↓→K', note: 'Se a investida pegar' },
  { section: 'Especiais', name: 'Investida aérea', input: '↓←K', note: 'Se pegar, desce com o chute' },
  { section: 'Especiais', name: 'Sangue Explosivo', input: '↓→S', note: 'Se o chute pegar, o sangue explode' },
  { section: 'Especiais', name: 'Regeneração', input: '↓←S', note: 'Recupera vida' },
  { section: 'Super', name: 'Fúria demoníaca', input: '↓→↓→P', note: 'A rajada de chutes e o chute final' },
];

const SOUNDS = {
  swing: [5, 1], swing2: [5, 6], hit4: [5, 4], hit9: [5, 9], heal: [5, 48],
  voice4: [0, 4], voice5: [0, 5], voice7: [0, 7], voice16: [0, 6], voice24: [0, 2], voice27: [0, 8],
};

importMugenCharacter({
  root: ROOT,
  sffPath: resolve(PACK, 'Nezuko.sff'),
  sffOptions: { actPath: resolve(PACK, '1.act') },
  airPath: resolve(PACK, 'Nezuko.air'),
  outDir: 'public/assets/characters/nezuko',
  id: 'nezuko',
  name: 'Nezuko',
  description: 'A oni que protege',
  template: 'public/assets/characters/dummy/dummy_config.json',
  animations: ANIMATIONS,
  effects: EFFECTS,
  combos: COMBOS,
  buttons: BUTTONS,
  moveList: MOVE_LIST,
  sndPath: resolve(PACK, 'Nezuko.snd'),
  sounds: SOUNDS,
  spriteScale: 2,
  portrait: { sprite: [9000, 1], crop: [0, 0, 120, 132], width: 50, height: 55, background: '#2A1420' },
});
