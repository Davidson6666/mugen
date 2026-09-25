// Importa o Zenitsu do pacote MUGEN "Zenitsu Agatsuma" (SaulPRO; creditos em
// CREDITS.md), no estilo Jump Ultimate Stars.
//
// O pacote fica em assets-src/zenitsu/mugen/ (fora do git). SFF v1; a
// paleta vem dos proprios sprites (o 1.act nao bate com eles). Para regerar: npm run assets:zenitsu
//
// Respiracao do Trovao: o Relampago em disparada (↓P, o x do pacote), a
// investida que desce do alto, o contra-ataque, a disparada com a rajada de
// cortes, o golpe duplo com os clones, o ziguezague e o mergulho; e o super
// Deus do Trovao Flamejante (Sétima Forma). O sprite parado tem 45 px:
// spriteScale 2.1 poe o Zenitsu na altura do elenco.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importMugenCharacter } from './lib/mugen-import.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = resolve(ROOT, 'assets-src/zenitsu/mugen');

const fx = (at, id, pos = [0, 0], extra = {}) => ({ at, effect: { id, pos, ...extra } });
const sound = (at, key) => ({ at, sound: key });

const NORMAL = { specialCancel: true };
const chain = (on, to, after = 4) => ({ on, to, after });
const breath = (pos) => fx(0, 'breathFlash', pos);

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
  victoryPose: { actions: [{ id: 180, times: { 2: 60 } }] },
  defeatPose: { actions: [{ id: 170, times: { 2: 60 } }] },

  dashForward: {
    actions: [100],
    dash: { distance: 170, moveFrom: 0, moveUntil: 3, invulnerableFrom: 9, invulnerableUntil: 0, cancel: true },
  },
  dashBackward: {
    actions: [105],
    dash: { distance: 100, moveFrom: 0, moveUntil: 2, invulnerableFrom: 0, invulnerableUntil: 0 },
  },
  airDashForward: {
    actions: [100],
    dash: { distance: 140, moveFrom: 0, moveUntil: 3, invulnerableFrom: 9, invulnerableUntil: 0 },
  },
  airDashBackward: {
    actions: [105],
    dash: { distance: 100, moveFrom: 0, moveUntil: 2, invulnerableFrom: 9, invulnerableUntil: 0 },
  },

  // ---- a (golpe), b (corte fraco 300 -> 310), c (corte forte 400) ----
  punch: {
    actions: [200],
    ...NORMAL,
    hit: { damage: 2, hitstun: 18, push: 3 },
    events: [sound(0, 'voice5'), sound(0, 'swing'), { at: 0, vx: 1 }],
    cancels: [chain('punch', 'kick'), chain('kick', 'kick'), chain('special', 'strong')],
  },
  kick: {
    actions: [300],
    ...NORMAL,
    hit: { damage: 2, hitstun: 20, push: 3 },
    events: [sound(0, 'voice5'), sound(0, 'slash'), { at: 0, vx: 2 }, fx(7, 'slashA', [-8, -20])],
    cancels: [chain('kick', 'kick2'), chain('special', 'strong')],
  },
  kick2: {
    actions: [310],
    ...NORMAL,
    hit: { damage: 3, hitstun: 22, push: 5 },
    events: [sound(0, 'voice6'), sound(0, 'slash'), { at: 0, vx: 2 }, fx(7, 'slashB', [10, -28])],
    cancels: [chain('special', 'strong')],
  },
  strong: {
    actions: [400],
    ...NORMAL,
    hit: { damage: 4, hitstun: 28, push: 9, heavy: true },
    events: [sound(0, 'voice7'), sound(0, 'slashHeavy'), { at: 0, vx: 1 }, fx(8, 'slashC', [10, -30])],
  },
  // Relampago (410, ↓P): a disparada com o corte, deixando o rastro amarelo.
  thunderclap: {
    actions: [410],
    cooldown: 40,
    friction: false,
    hit: { damage: 4, hitstun: 30, push: 10, heavy: true },
    events: [sound(0, 'voice4'), sound(0, 'slash'), { at: 6, vx: 20 }, { at: 21, vx: 2 }, fx(6, 'dust', [10, 0]), fx(6, 'afterimage', [100, -27])],
  },

  // ---- No ar ----
  airPunch: {
    actions: [600],
    air: true,
    ...NORMAL,
    hit: { damage: 2, hitstun: 20, push: 4 },
    events: [sound(0, 'swing')],
    cancels: [chain('kick', 'airKick'), chain('special', 'airStrong')],
  },
  airKick: {
    actions: [610],
    air: true,
    ...NORMAL,
    hit: { damage: 2, hitstun: 20, push: 4 },
    events: [sound(0, 'slash'), fx(7, 'slashA', [0, -20])],
    cancels: [chain('special', 'airStrong')],
  },
  airStrong: {
    actions: [620],
    air: true,
    hit: { damage: 3, hitstun: 26, push: 6, heavy: true },
    events: [sound(0, 'slashHeavy'), { at: 0, vx: 2, vy: -4 }, { frame: 2, vx: 2, vy: -6 }, { frame: 2, effect: { id: 'upSlash', pos: [0, 0] } }],
  },

  // ---- Especiais ----
  // 1000 (↓→P): salta e desce na diagonal com o corte (1001); no ar, direto.
  thunderDive: {
    actions: [1000],
    cooldown: 90,
    events: [breath([-2, -12]), sound(0, 'voiceDive'), { at: 30, vx: 0, vy: -12 }, { at: 40, vx: -2, vy: -4 }, fx(30, 'dust', [-15, 8]), fx(30, 'dust', [10, 8])],
    next: 'thunderDiveStrike',
  },
  airThunderDive: {
    actions: [1080],
    air: true,
    float: true,
    cooldown: 90,
    events: [breath([-5, -10]), sound(0, 'voiceDive'), { at: 0, vx: 0, vy: 0 }],
    next: 'thunderDiveStrike',
  },
  thunderDiveStrike: {
    actions: [{ id: 1001, lengthTicks: 40 }],
    air: true,
    friction: false,
    hit: { damage: 6, hitstun: 36, push: 12, heavy: true },
    events: [sound(0, 'slashHeavy'), { at: 0, vx: 12, vy: 8 }, fx(0, 'lightning', [0, 0])],
    onLand: 'thunderDiveLand',
  },
  thunderDiveLand: { actions: [1002] },
  // 1100 (↓←P): guarda; quem bater leva o corte em disparada (1101).
  counter: {
    actions: [1100],
    cooldown: 90,
    counter: { from: 30, until: 85, to: 'counterSlash' },
    events: [breath([1, -25]), sound(0, 'voiceCounter')],
  },
  counterSlash: {
    actions: [1101],
    invulnerable: [0, 25],
    friction: false,
    hit: { damage: 6, hitstun: 36, push: 12, heavy: true },
    events: [sound(0, 'slashHeavy'), { at: 2, vx: 20 }, { at: 12, vx: 0 }, fx(17, 'slashC', [10, -30])],
  },
  // 1200 (↓→K): disparada; se pegar, a rajada de cortes em volta do oponente.
  flashSlash: {
    actions: [1200],
    cooldown: 120,
    friction: false,
    hit: { damage: 2, hitstun: 60, push: 0 },
    events: [breath([-1, -20]), sound(0, 'voiceFlash'), sound(30, 'thunder'), { at: 30, vx: 25 }, { at: 40, vx: 2 }, fx(30, 'dust', [-15, 0])],
    onHit: { to: 'flashStorm' },
  },
  flashStorm: {
    actions: [{ id: 1200, pick: [4], times: { 0: 50 } }],
    invulnerable: [0, 50],
    events: [
      { at: 0, vx: 0 },
      ...[0, 10, 20, 30, 40].map((at) => fx(at, 'stormCut', [0, -40], { target: 'opponent', spread: [25, 25] })),
      ...[0, 20, 40].map((at) => sound(at, 'slash')),
    ],
  },
  // 1300 (↓←K): o corte, o segundo corte e os dois clones (1350/1351).
  sixfold: {
    actions: [1300, 1301],
    cooldown: 120,
    friction: false,
    hits: [{ damage: 2, hitstun: 40, push: 1 }, { damage: 3, hitstun: 30, push: 4, heavy: true }],
    events: [
      breath([2, -28]), sound(30, 'voice7'), { at: 30, vx: 2 }, fx(31, 'slashB', [10, -28]),
      { action: 1301, at: 0, vx: 5 }, { action: 1301, at: 10, vx: 0 },
      { action: 1301, at: 0, effect: { id: 'cloneA', pos: [30, 0] } },
      { action: 1301, at: 10, effect: { id: 'cloneB', pos: [-30, 0] } },
      { action: 1301, at: 30, effect: { id: 'sparks', pos: [0, 0] } },
      { action: 1301, at: 30, vx: 4, vy: -10 },
    ],
  },
  // 1400 (↓→S): o ziguezague; se pegar, os cortes relampago e o golpe final.
  zigzag: {
    actions: [1400],
    cooldown: 120,
    friction: false,
    hits: [{ damage: 2, hitstun: 60, push: 0 }, { damage: 2, hitstun: 60, push: 0 }],
    events: [breath([0, -25]), sound(0, 'voiceZigzag'), { at: 32, vx: 10 }, { frame: 2, vx: 30 }, { frame: 5, vx: -30 }, { frame: 7, vx: 0 }, sound(33, 'thunder')],
    onHit: { to: 'zigzagStrikes', minHits: 1 },
  },
  zigzagStrikes: {
    actions: [{ id: 1402, times: { 2: 40 } }, 1415],
    invulnerable: [0, 90],
    hits: [{ damage: 1, hitstun: 60, push: 0 }, { damage: 5, hitstun: 40, push: 14, heavy: true }],
    events: [
      { at: 0, vx: 0 },
      fx(5, 'lightningCol', [-15, -70]),
      ...[8, 14, 20, 26, 32].map((at) => fx(at, 'strikeSpark', [0, -40], { target: 'opponent', spread: [30, 30] })),
      { action: 1415, at: 19, vx: 20 }, { action: 1415, at: 26, vx: 0 },
      { action: 1415, at: 10, effect: { id: 'boltTrail', pos: [0, -30] } },
    ],
  },
  // 111200 (↓←S): salta e mergulha; o raio cai onde ele pousa.
  plunge: {
    actions: [{ id: 111200, lengthTicks: 110 }],
    cooldown: 120,
    events: [breath([2, -20]), sound(0, 'voice3'), { at: 30, vx: 3, vy: -6 }, { at: 50, vx: 3, vy: 10 }, fx(30, 'dust', [-15, 8])],
    onLand: 'plungeImpact',
  },
  plungeImpact: {
    actions: [111201],
    hit: { damage: 4, hitstun: 30, push: 8, heavy: true },
    events: [sound(0, 'thunder'), fx(0, 'impactBolt', [0, 45]), fx(0, 'impactSmoke', [-20, 0])],
  },

  // ---- Super: Deus do Trovao Flamejante (3000 -> 3005 -> 3010) ----
  flamingThunderGod: {
    actions: [3000],
    cooldown: 900,
    friction: false,
    invulnerable: [0, 50],
    hit: { damage: 3, hitstun: 80, push: 0 },
    events: [fx(0, 'superFlash', [0, -23]), sound(0, 'voiceSuper'), { frame: 9, vx: 30 }, { frame: 11, vx: 2 }],
    onHit: { to: 'thunderGodRise' },
  },
  thunderGodRise: {
    actions: [3005],
    invulnerable: [0, 70],
    events: [
      { at: 0, vx: 0, pinOpponent: { dx: 50, lift: 0, ticks: 200, relative: 'self' } },
      fx(9, 'dragonAura', [0, 0]),
      { frame: 7, effect: { id: 'dragonGlow', pos: [2, -25] } },
      sound(9, 'thunder'),
    ],
    next: 'thunderGodStrike',
  },
  thunderGodStrike: {
    actions: [3010],
    invulnerable: [0, 176],
    hit: { damage: 14, hitstun: 60, push: 16, heavy: true, unblockable: true },
    events: [sound(0, 'voiceSuper2'), sound(40, 'thunder'), fx(40, 'dragonFire', [0, -30], { target: 'opponent' })],
  },
};

const EFFECTS = {
  breathFlash: { actions: [7400], size: 0.2, harmless: true },
  superFlash: { actions: [7405], size: 0.3, harmless: true },
  slashA: { actions: [7202], size: 0.6, harmless: true },
  slashB: { actions: [7200], size: 0.6, harmless: true },
  slashC: { actions: [7205], size: 0.8, harmless: true },
  dust: { actions: [7022], size: 0.4, harmless: true },
  afterimage: { actions: [405], harmless: true, motion: [{ at: 0, vx: -1 }] },
  upSlash: { actions: [625], harmless: true },
  lightning: { actions: [580], size: 0.5, harmless: true },
  stormCut: { actions: [1260], hit: { damage: 1, hitstun: 30, push: 0 }, maxHits: 1 },
  cloneA: { actions: [1350], hit: { damage: 2, hitstun: 30, push: 2 } },
  cloneB: { actions: [1351], hit: { damage: 2, hitstun: 30, push: 2 } },
  sparks: { actions: [1380], harmless: true },
  lightningCol: { actions: [1450], size: 0.3, harmless: true },
  strikeSpark: { actions: [581], size: 0.5, area: { rect: [-60, -60, 60, 60], damage: 1, hitstun: 60, push: 0 }, maxHits: 1 },
  boltTrail: { actions: [581], size: 0.4, harmless: true },
  impactBolt: { actions: [712], hit: { damage: 2, hitstun: 30, push: 6 } },
  impactSmoke: { actions: [8240], size: 0.5, harmless: true, lifetime: 40 },
  dragonAura: { actions: [3022], size: 0.65, harmless: true },
  dragonGlow: { actions: [3030], size: 0.3, harmless: true },
  dragonFire: { actions: [3032], size: 0.9, harmless: true },
};

const COMBOS = [
  { id: 'flamingThunderGod', input: '↓→↓→P', animation: 'flamingThunderGod' },
  { id: 'thunderDive', input: '↓→P', animation: 'thunderDive', airAnimation: 'airThunderDive' },
  { id: 'counter', input: '↓←P', animation: 'counter' },
  { id: 'flashSlash', input: '↓→K', animation: 'flashSlash' },
  { id: 'sixfold', input: '↓←K', animation: 'sixfold' },
  { id: 'zigzag', input: '↓→S', animation: 'zigzag' },
  { id: 'plunge', input: '↓←S', animation: 'plunge' },
  { id: 'thunderclap', input: 'P', hold: '↓', animation: 'thunderclap' },
];

const BUTTONS = {
  ground: { punch: 'punch', kick: 'kick', special: 'strong' },
  air: { punch: 'airPunch', kick: 'airKick', special: 'airStrong' },
};

const MOVE_LIST = [
  { section: 'Movimento', name: 'Corrida', input: '→→' },
  { section: 'Movimento', name: 'Pulo duplo', input: '↑↑', note: 'No ar, aperte para cima de novo' },
  { section: 'Golpes', name: 'Golpe e cortes', input: 'P KK S', note: 'Encadeiam ao conectar' },
  { section: 'Golpes', name: 'No ar', input: 'PKS', note: 'S: corte para cima' },
  { section: 'Especiais', name: 'Relâmpago', input: 'P', hold: '↓', note: 'A disparada com o corte' },
  { section: 'Especiais', name: 'Investida do alto', input: '↓→P', note: 'Também no ar' },
  { section: 'Especiais', name: 'Contra-ataque', input: '↓←P' },
  { section: 'Especiais', name: 'Disparada', input: '↓→K', note: 'Se pegar, a rajada de cortes' },
  { section: 'Especiais', name: 'Corte duplo', input: '↓←K', note: 'Os clones cortam junto' },
  { section: 'Especiais', name: 'Ziguezague', input: '↓→S', note: 'Se pegar, os cortes relâmpago' },
  { section: 'Especiais', name: 'Mergulho', input: '↓←S', note: 'O raio cai onde ele pousa' },
  { section: 'Super', name: 'Deus do Trovão Flamejante', input: '↓→↓→P', note: 'Se a disparada pegar, o dragão de fogo' },
];

const SOUNDS = {
  voice3: [0, 13], voice4: [0, 16], voice5: [0, 23], voice6: [0, 20], voice7: [0, 30],
  voiceDive: [0, 22], voiceCounter: [0, 17], voiceFlash: [0, 18], voiceZigzag: [0, 12], voiceSuper: [0, 12], voiceSuper2: [0, 18],
  swing: [5, 6], slash: [5, 30], slashHeavy: [5, 16], thunder: [5, 44],
};

importMugenCharacter({
  root: ROOT,
  sffPath: resolve(PACK, 'Zenitsu Agatsuma.sff'),
  // O 1.act do pacote pinta a pose parada de preto: a paleta do personagem
  // vem dos quadros de ataque (200,1), que saem com as cores certas.
  sffOptions: { actFromSprite: [200, 1] },
  airPath: resolve(PACK, 'Zenitsu Agatsuma.air'),
  outDir: 'public/assets/characters/zenitsu',
  id: 'zenitsu',
  name: 'Zenitsu',
  description: 'O trovão adormecido',
  template: 'public/assets/characters/dummy/dummy_config.json',
  animations: ANIMATIONS,
  effects: EFFECTS,
  combos: COMBOS,
  buttons: BUTTONS,
  moveList: MOVE_LIST,
  sndPath: resolve(PACK, 'Zenitsu Agatsuma.snd'),
  sounds: SOUNDS,
  spriteScale: 2.1,
  portrait: { sprite: [9000, 1], crop: [0, 0, 120, 132], width: 50, height: 55, background: '#2A2210' },
});
