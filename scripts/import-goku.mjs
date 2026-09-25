// Importa o Goku SSGSS do pacote MUGEN "GokuSSGSS" (Kronos; creditos em
// CREDITS.md).
//
// O pacote fica em assets-src/goku/mugen/ (fora do git). SFF v2 (PNG) com a
// paleta 1.act. Para regerar: npm run assets:goku
//
// Golpes: as sequencias de soco e chute, a rajada de ki (c) em pe e no ar, e
// os especiais do .cmd: God Shock (contra-ataque), Explosao Espiritual,
// rajada de energia, Teletransporte, Kamehameha e Kamehameha para cima. O
// Kaioken (↓↓S) acende a aura por 15 s; com ela, ↓←↓←P solta a sequencia
// final. O Super Kamehameha fica em ↓→↓→S. Os raios sao desenhados enormes
// (3253 px) e reduzidos no .cns (AngleDraw 0.35), daqui o "size" deles.
// O sprite parado tem 58 px: spriteScale 1.7 poe o Goku na altura do elenco.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importMugenCharacter } from './lib/mugen-import.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = resolve(ROOT, 'assets-src/goku/mugen');

const fx = (at, id, pos = [0, 0], extra = {}) => ({ at, effect: { id, pos, ...extra } });
const fxFrame = (frame, id, pos = [0, 0], extra = {}) => ({ frame, effect: { id, pos, ...extra } });
const sound = (at, key) => ({ at, sound: key });

const NORMAL = { specialCancel: true };
const chain = (on, to, after = 4) => ({ on, to, after });

const ANIMATIONS = {
  idle: { actions: [0], loop: true },
  walkForward: { actions: [20], loop: true },
  walkBackward: { actions: [21], loop: true },
  jump: { actions: [40, 41] },
  crouch: { actions: [{ id: 11, times: { 0: 30 } }], loop: true },
  blockStanding: { actions: [130], loop: true },
  blockCrouching: { actions: [131], loop: true },
  hitReaction: { actions: [5000] },
  ko: { actions: [5030, { id: 5050, pick: [0, 1, 2, 3, 4], times: { 4: 20 } }, 5100, 5110] },
  victoryPose: { actions: [{ id: 180, times: { 5: 60 } }] },
  defeatPose: { actions: [{ id: 170, times: { 2: 60 } }] },

  // Passo instantaneo (60/70): voa rente ao chao.
  dashForward: {
    actions: [{ id: 100, times: { 0: 4, 1: 4, 2: 4 } }],
    dash: { distance: 170, moveFrom: 0, moveUntil: 2, invulnerableFrom: 0, invulnerableUntil: 1, cancel: true },
  },
  dashBackward: {
    actions: [{ id: 105, times: { 0: 4, 1: 4, 2: 4 } }],
    dash: { distance: 120, moveFrom: 0, moveUntil: 2, invulnerableFrom: 0, invulnerableUntil: 1 },
  },
  airDashForward: {
    actions: [{ id: 100, times: { 0: 4, 1: 4, 2: 4 } }],
    dash: { distance: 150, moveFrom: 0, moveUntil: 2, invulnerableFrom: 9, invulnerableUntil: 0 },
  },
  airDashBackward: {
    actions: [{ id: 105, times: { 0: 4, 1: 4, 2: 4 } }],
    dash: { distance: 110, moveFrom: 0, moveUntil: 2, invulnerableFrom: 9, invulnerableUntil: 0 },
  },

  // ---- a (soco): 200 -> 210 -> 220 (rajada) -> 230 ----
  punch: {
    actions: [200],
    ...NORMAL,
    friction: false,
    hit: { damage: 2, hitstun: 16, push: 2 },
    events: [sound(0, 'swing'), { at: 0, vx: 5 }, { frame: 5, vx: 0 }],
    cancels: [chain('punch', 'punch2'), chain('kick', 'kick2')],
  },
  punch2: {
    actions: [210],
    ...NORMAL,
    friction: false,
    hit: { damage: 2, hitstun: 18, push: 3 },
    events: [sound(0, 'swing'), { at: 0, vx: 6 }, { frame: 4, vx: 0 }],
    cancels: [chain('punch', 'punchRush'), chain('kick', 'kick3')],
  },
  punchRush: {
    actions: [220],
    ...NORMAL,
    hits: [1, 1, 1, 1, 1].map((damage) => ({ damage, hitstun: 16, push: 0 })),
    events: [sound(0, 'swing')],
    cancels: [chain('punch', 'punch4', 10), chain('kick', 'kick3', 10)],
  },
  punch4: {
    actions: [230],
    ...NORMAL,
    hit: { damage: 4, hitstun: 28, push: 10, heavy: true },
    events: [sound(0, 'voiceHa'), { at: 0, vx: 5 }, { frame: 5, vx: 0 }],
  },

  // ---- b (chute): 300 -> 310 -> 320 -> 330 ----
  kick: {
    actions: [300],
    ...NORMAL,
    friction: false,
    hit: { damage: 3, hitstun: 20, push: 4 },
    events: [sound(0, 'swing'), { at: 5, vx: 12 }, { at: 12, vx: 0 }, fx(0, 'dust', [0, 0])],
    cancels: [chain('kick', 'kick2'), chain('punch', 'punch2')],
  },
  kick2: {
    actions: [310],
    ...NORMAL,
    friction: false,
    hit: { damage: 2, hitstun: 18, push: 3 },
    events: [sound(0, 'swing'), { at: 4, vx: 8 }, { at: 10, vx: 0 }, fx(3, 'kickFlash', [0, -20])],
    cancels: [chain('kick', 'kick3'), chain('punch', 'punchRush')],
  },
  kick3: {
    actions: [320],
    ...NORMAL,
    friction: false,
    hit: { damage: 2, hitstun: 20, push: 4 },
    events: [sound(0, 'swing'), { at: 5, vx: 6 }, { at: 12, vx: 0 }],
    cancels: [chain('kick', 'kick4'), chain('punch', 'punch4')],
  },
  kick4: {
    actions: [330],
    ...NORMAL,
    hit: { damage: 4, hitstun: 30, push: 6, heavy: true },
    events: [sound(0, 'voiceHa')],
  },
  // 340: o chute giratorio (segurando ↓ + K).
  spinKick: {
    actions: [340],
    ...NORMAL,
    hit: { damage: 3, hitstun: 24, push: 7, heavy: true },
    events: [sound(0, 'swing')],
  },

  // ---- c: a rajada de ki (400) ----
  kiBlast: {
    actions: [400],
    ...NORMAL,
    cooldown: 20,
    events: [sound(0, 'kiShot'), fx(6, 'kiBall', [30, -31])],
  },

  // ---- No ar ----
  airPunch: {
    actions: [600],
    air: true,
    ...NORMAL,
    hit: { damage: 3, hitstun: 24, push: 6, heavy: true },
    events: [sound(0, 'swing'), { at: 8, vx: 1.5, vy: -1.5 }],
    cancels: [chain('kick', 'airKick')],
  },
  airKick: {
    actions: [610],
    air: true,
    ...NORMAL,
    hit: { damage: 2, hitstun: 18, push: 4 },
    events: [sound(0, 'swing'), { at: 0, vx: 3, vy: -1 }, fx(5, 'kickFlash', [13, -11])],
    cancels: [chain('punch', 'airPunch')],
  },
  airKi: {
    actions: [615],
    air: true,
    float: true,
    events: [sound(0, 'kiShot'), fx(4, 'kiBallDown', [11, -25]), fx(4, 'kiBallDown', [23, -28])],
  },

  // ---- Especiais ----
  // God Shock (1000): guarda; quem bater leva o soco que atravessa (1001).
  godShock: {
    actions: [1000],
    cooldown: 90,
    counter: { from: 6, until: 33, to: 'godShockStrike' },
    events: [sound(0, 'voiceHa')],
  },
  godShockStrike: {
    actions: [1001],
    invulnerable: [0, 30],
    friction: false,
    areas: [{ rect: [-10, -60, 60, 0], from: 1, until: 2, damage: 8, hitstun: 40, push: 14, heavy: true }],
    events: [sound(0, 'hitHeavy'), { at: 0, vx: 15 }, { at: 8, vx: 0 }, fx(1, 'godSlash', [23, -25]), fx(1, 'godFlash', [20, -25])],
  },
  // Explosao Espiritual (1100): a esfera de energia em volta dele.
  spiritExplosion: {
    actions: [1100],
    cooldown: 150,
    hit: { damage: 7, hitstun: 40, push: 16, heavy: true },
    events: [sound(0, 'voiceExplosion'), fx(3, 'chargeGlow', [4, -22]), fxFrame(5, 'spiritBlast', [0, 0]), fxFrame(5, 'spiritRing', [-2, 46])],
  },
  // Rajada de energia (1200 -> 1201): dois tiros e a bola grande.
  energyBlast: {
    actions: [1200, 1201],
    cooldown: 150,
    events: [
      sound(0, 'kiShot'),
      fxFrame(3, 'energyShot', [35, -31]),
      fxFrame(7, 'energyShot', [35, -31]),
      { action: 1201, at: 0, sound: 'voiceHa' },
      { action: 1201, frame: 6, effect: { id: 'energyBall', pos: [25, -32] } },
      { action: 1201, frame: 6, sound: 'kiShot' },
    ],
  },
  // Teletransporte (1300): some e reaparece do outro lado do oponente.
  teleport: {
    actions: [1300, 1302],
    cooldown: 60,
    invulnerable: [0, 30],
    events: [sound(0, 'teleport'), fxFrame(4, 'teleportFlash', [-1, 1]), { frame: 5, teleport: 40, through: true }],
  },
  // Kamehameha (1400 -> 1402): carrega a bola nas maos e dispara o raio.
  kamehameha: {
    actions: [{ id: 1400, lengthTicks: 40 }, 1402],
    cooldown: 150,
    events: [
      sound(0, 'voiceKame'),
      fx(6, 'charge', [-10, -30]),
      { action: 1402, at: 0, sound: 'voiceBeamFire' },
      { action: 1402, at: 4, effect: { id: 'kameBeam', pos: [35, -25] } },
      { action: 1402, at: 4, effect: { id: 'kameFlash', pos: [35, -25] } },
      { action: 1402, at: 4, sound: 'beam' },
    ],
  },
  // No ar (1401 -> 1403): o raio sai na diagonal para baixo.
  airKamehameha: {
    actions: [{ id: 1401, lengthTicks: 30 }, 1403],
    air: true,
    float: true,
    cooldown: 150,
    events: [
      sound(0, 'voiceKame'),
      { at: 0, vx: 0, vy: 0 },
      fx(6, 'charge', [-10, -30]),
      { action: 1403, at: 4, effect: { id: 'kameBeamDown', pos: [35, -25] } },
      { action: 1403, at: 4, sound: 'beam' },
    ],
  },
  // Kamehameha para cima (1500 -> 1502): o raio sai em diagonal (antiaereo).
  upKamehameha: {
    actions: [{ id: 1500, lengthTicks: 40 }, 1501],
    cooldown: 150,
    events: [
      sound(0, 'voiceKame'),
      fx(6, 'charge', [-10, -30]),
      { action: 1501, at: 5, effect: { id: 'kameBeamUp', pos: [35, -25] } },
      { action: 1501, at: 5, sound: 'beam' },
    ],
  },
  // Kaioken (800): a aura vermelha por 15 s; libera a sequencia final.
  kaioken: {
    actions: [800],
    cooldown: 1200,
    invulnerable: [0, 120],
    events: [
      sound(0, 'voiceKaioken'),
      fx(119, 'kaiokenFlash', [0, 5]),
      // Aura_Kaioken (helper 551): a chama vermelha por fora, a azul do Blue
      // e o brilho por dentro.
      fx(120, 'kaiokenAura', [0, 8], { scale: [1.35, 1.75] }),
      fx(120, 'kaiokenFlame', [0, 5]),
      fx(120, 'kaiokenGlow', [0, 5], { scale: [0.93, 1] }),
    ],
  },

  // ---- Supers (recarga no lugar da barra) ----
  // Super Kamehameha (3000 -> 3001): carrega e solta o raio grosso.
  superKamehameha: {
    actions: [3000, 3001],
    cooldown: 900,
    invulnerable: [0, 60],
    events: [
      sound(0, 'voiceSuperKame'),
      fx(0, 'superCharge', [0, -30]),
      { action: 3001, at: 1, effect: { id: 'superBeam', pos: [40, -30] } },
      { action: 3001, at: 1, sound: 'beam' },
    ],
  },
  // Sequencia final (3100, so com o Kaioken): a arrancada; se pegar, os
  // socos (3101/3102) e o Kamehameha a queima-roupa (3103).
  finalRush: {
    actions: [3100],
    cooldown: 1200,
    requires: 'kaioken',
    friction: false,
    invulnerable: [0, 47],
    hit: { damage: 2, hitstun: 60, push: 0 },
    events: [sound(0, 'voiceFinal'), { frame: 8, vx: 20 }, { frame: 9, vx: 10 }, { frame: 10, vx: 5 }, { frame: 12, vx: 0 }],
    onHit: { to: 'finalCombo' },
  },
  finalCombo: {
    actions: [3101, 3102],
    invulnerable: [0, 60],
    hits: [...Array(4)].map(() => ({ damage: 1, hitstun: 40, push: 0 })).concat([{ damage: 2, hitstun: 150, push: 0 }]),
    events: [...[4, 10, 17, 22].map((frame) => ({ frame, vx: 2 })), ...[4, 10, 17, 22].map((frame) => ({ frame, sound: 'hitHeavy' }))],
    next: 'finalKamehameha',
  },
  finalKamehameha: {
    actions: [3103],
    invulnerable: [0, 234],
    events: [
      { at: 0, pinOpponent: { dx: 45, lift: 0, ticks: 140, relative: 'self' } },
      sound(0, 'voiceSuperKame'),
      fx(9, 'finalCharge', [0, -30]),
      fx(115, 'superBeam', [40, -30]),
      sound(115, 'beam'),
    ],
  },
};

// Camadas da aura do Kaioken: presas ao Goku, atras dele, 15 s.
const AURA = { size: 0.3, loop: true, lifetime: 900, follow: 'owner', layer: 'back', blend: 'add', harmless: true };

const EFFECTS = {
  dust: { actions: [7022], size: 0.15, harmless: true },
  kickFlash: { actions: [7016], size: 0.15, harmless: true },
  kiBall: {
    actions: [{ id: 407, lengthTicks: 60 }],
    size: 0.06,
    lifetime: 60,
    velocityX: 13,
    destroyOnHit: true,
    endAtWall: true,
    blend: 'add',
    area: { rect: [-380, -350, 370, 370], damage: 2, hitstun: 20, push: 4 },
    onDeathSpawn: { id: 'kiBoom' },
  },
  kiBallDown: {
    actions: [{ id: 407, lengthTicks: 40 }],
    size: 0.05,
    lifetime: 40,
    velocityX: 8,
    velocityY: 10,
    destroyOnHit: true,
    endOnGround: true,
    blend: 'add',
    area: { rect: [-380, -350, 370, 370], damage: 2, hitstun: 20, push: 4 },
    onDeathSpawn: { id: 'kiBoom' },
  },
  kiBoom: { actions: [410], size: 0.12, harmless: true, blend: 'add' },
  godSlash: { actions: [1050], size: 0.25, harmless: true },
  godFlash: { actions: [1055], size: 0.25, harmless: true },
  chargeGlow: { actions: [1105], size: 0.5, harmless: true },
  spiritBlast: { actions: [1120], size: 0.35, harmless: true },
  spiritRing: { actions: [7019], size: 0.5, harmless: true },
  energyShot: {
    actions: [{ id: 1205, lengthTicks: 50 }],
    size: 0.08,
    loop: true,
    lifetime: 50,
    velocityX: 18,
    destroyOnHit: true,
    endAtWall: true,
    blend: 'add',
    area: { rect: [-120, -120, 120, 120], damage: 1, hitstun: 20, push: 3 },
  },
  energyBall: {
    actions: [{ id: 1220, lengthTicks: 60 }],
    size: 0.12,
    loop: true,
    lifetime: 60,
    motion: [{ at: 0, vx: 20 }, { at: 6, vx: 26 }],
    destroyOnHit: true,
    endAtWall: true,
    blend: 'add',
    area: { rect: [-170, -170, 170, 170], damage: 6, hitstun: 36, push: 14, heavy: true },
    onDeathSpawn: { id: 'bigBoom' },
  },
  bigBoom: { actions: [1230], size: 0.25, harmless: true, blend: 'add' },
  teleportFlash: { actions: [7014], size: 0.3, harmless: true },
  charge: { actions: [1420], size: 0.25, harmless: true, blend: 'add' },
  // O raio do Kamehameha (1415, AngleDraw 0.35): acerta ao longo dele.
  kameBeam: {
    actions: [{ id: 1415, lengthTicks: 60 }],
    size: 0.35,
    lifetime: 60,
    blend: 'add',
    area: { rect: [0, -70, 2000, 70], damage: 1, hitstun: 20, push: 1, every: 3, count: 12 },
  },
  kameBeamDown: {
    actions: [{ id: 1415, lengthTicks: 50 }],
    size: 0.3,
    lifetime: 50,
    angle: -30,
    blend: 'add',
    area: { rect: [0, 0, 900, 700], damage: 1, hitstun: 20, push: 1, every: 3, count: 10 },
  },
  kameBeamUp: {
    actions: [{ id: 1415, lengthTicks: 50 }],
    size: 0.3,
    lifetime: 50,
    angle: 40,
    blend: 'add',
    area: { rect: [60, -900, 700, -115], damage: 1, hitstun: 20, push: 1, every: 3, count: 10 },
  },
  kameFlash: { actions: [1428], size: 0.3, harmless: true, blend: 'add' },
  kaiokenFlash: { actions: [7023], size: 0.55, harmless: true },
  // A chama de fora (anim 545) com o PalFX do pacote (mul 512,50,50): vermelha.
  kaiokenAura: {
    ...AURA,
    actions: [{ id: 545, lengthTicks: 900 }],
    palfx: { mul: [512, 50, 50], add: [10, 10, 10] },
    tag: 'kaioken',
    // Os raios que estalam em volta (anim 570).
    spawns: Array.from({ length: 30 }, (_, index) => fx(index * 30 + 7, 'kaiokenSpark', [index % 2 ? 12 : -12, -40], { spread: [15, 25] })),
  },
  kaiokenFlame: { ...AURA, actions: [{ id: 555, lengthTicks: 900 }], size: 0.28, alpha: 0.55 },
  kaiokenGlow: { ...AURA, actions: [{ id: 540, lengthTicks: 900 }], alpha: 0.35 },
  kaiokenSpark: { actions: [570], size: 0.2, harmless: true, follow: 'owner', blend: 'add' },
  superCharge: { actions: [3005], size: 0.12, harmless: true, blend: 'add' },
  superBeam: {
    actions: [{ id: 1415, lengthTicks: 90 }],
    size: 0.55,
    lifetime: 90,
    blend: 'add',
    area: { rect: [0, -80, 1600, 80], damage: 1, hitstun: 24, push: 1, every: 3, count: 25 },
  },
  finalCharge: { actions: [3125], size: 0.3, harmless: true, blend: 'add' },
};

const COMBOS = [
  { id: 'superKame', input: '↓→↓→S', animation: 'superKamehameha' },
  { id: 'finalRush', input: '↓←↓←P', animation: 'finalRush' },
  { id: 'kaioken', input: '↓↓S', animation: 'kaioken' },
  { id: 'godShock', input: '↓→P', animation: 'godShock' },
  { id: 'spirit', input: '↓←P', animation: 'spiritExplosion' },
  { id: 'energy', input: '↓→K', animation: 'energyBlast' },
  { id: 'teleport', input: '↓←K', animation: 'teleport' },
  { id: 'kame', input: '↓→S', animation: 'kamehameha', airAnimation: 'airKamehameha' },
  { id: 'upKame', input: '↓←S', animation: 'upKamehameha' },
  { id: 'spinKick', input: 'K', hold: '↓', animation: 'spinKick' },
];

const BUTTONS = {
  ground: { punch: 'punch', kick: 'kick', special: 'kiBlast' },
  air: { punch: 'airPunch', kick: 'airKick', special: 'airKi' },
};

const MOVE_LIST = [
  { section: 'Movimento', name: 'Passo instantâneo', input: '→→', note: 'Também para trás e no ar' },
  { section: 'Movimento', name: 'Pulo duplo', input: '↑↑', note: 'No ar, aperte para cima de novo' },
  { section: 'Golpes', name: 'Socos', input: 'PPPP', note: 'O terceiro é a rajada de socos' },
  { section: 'Golpes', name: 'Chutes', input: 'KKKK', note: 'Alternam com os socos' },
  { section: 'Golpes', name: 'Rajada de ki', input: 'S', note: 'No ar, dois tiros para baixo' },
  { section: 'Golpes', name: 'Chute giratório', input: 'K', hold: '↓' },
  { section: 'Especiais', name: 'God Shock', input: '↓→P', note: 'Contra-ataque' },
  { section: 'Especiais', name: 'Explosão Espiritual', input: '↓←P', note: 'Esfera de energia em volta' },
  { section: 'Especiais', name: 'Rajada de energia', input: '↓→K', note: 'Dois tiros e a bola grande' },
  { section: 'Especiais', name: 'Teletransporte', input: '↓←K', note: 'Reaparece do outro lado' },
  { section: 'Especiais', name: 'Kamehameha', input: '↓→S', note: 'No ar, em diagonal para baixo' },
  { section: 'Especiais', name: 'Kamehameha para cima', input: '↓←S', note: 'Antiaéreo' },
  { section: 'Especiais', name: 'Kaioken', input: '↓↓S', note: 'Aura por 15 s; libera a sequência final' },
  { section: 'Super', name: 'Super Kamehameha', input: '↓→↓→S' },
  { section: 'Super', name: 'Sequência final', input: '↓←↓←P', note: 'Só com o Kaioken ligado' },
];

const SOUNDS = {
  swing: [5, 5], hitHeavy: [5, 6], kiShot: [5, 16], beam: [5, 18], teleport: [5, 22], charge: [5, 17],
  voiceHa: [0, 5], voiceExplosion: [5, 19], voiceKame: [0, 49], voiceKaioken: [0, 64], voiceSuperKame: [0, 71],
  voiceFinal: [0, 74], voiceBeamFire: [0, 23],
};

importMugenCharacter({
  root: ROOT,
  sffPath: resolve(PACK, 'GokuSSGSS.sff'),
  sffOptions: { actPath: resolve(PACK, '1.act') },
  airPath: resolve(PACK, 'GokuSSGSS.air'),
  outDir: 'public/assets/characters/goku',
  id: 'goku',
  name: 'Goku',
  description: 'Super Saiyajin Blue',
  template: 'public/assets/characters/dummy/dummy_config.json',
  animations: ANIMATIONS,
  effects: EFFECTS,
  combos: COMBOS,
  buttons: BUTTONS,
  moveList: MOVE_LIST,
  sndPath: resolve(PACK, 'GokuSSGSS.snd'),
  sounds: SOUNDS,
  spriteScale: 1.7,
  portrait: { sprite: [9000, 1], crop: [0, 0, 120, 132], width: 50, height: 55, background: '#101C30' },
});
