// Importa o Pikachu do pacote MUGEN "SC_Pikachu" (TheTimster1998,
// Gladiacloud 'n Dylanius e Scrumble Bumble; creditos em CREDITS.md).
//
// O pacote fica em assets-src/pikachu/mugen/ (fora do git). SFF v2 (RLE8).
// Para regerar: npm run assets:pikachu
//
// Golpes do pacote: soco, cauda e cabecada (em pe, agachado e no ar), os
// especiais Thunder Jolt, Electro Ball, Thunder, Iron Tail e Thunder Punch
// (com as versoes EX no especial) e os supers Thundershock, Volt Tackle e
// 10,000 Volt Thunderbolt. O sprite e pequeno (62 px parado): spriteScale 1.3
// deixa o Pikachu pequeno como ele e, mas visivel. Botoes: soco = x, chute =
// a/b, especial = z/EX.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importMugenCharacter } from './lib/mugen-import.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = resolve(ROOT, 'assets-src/pikachu/mugen');
const SCALE = 1.3;

const fx = (at, id, pos = [0, 0], extra = {}) => ({ at, effect: { id, pos, ...extra } });
const fxFrame = (frame, id, pos = [0, 0], extra = {}) => ({ frame, effect: { id, pos, ...extra } });
const sound = (at, key) => ({ at, sound: key });
// Cut-in do super (7001, a arte grande do Pikachu), preso a tela.
const cutIn = (at) => fx(at, 'cutIn', [-230 / SCALE, -170 / SCALE], { target: 'stage' });

const NORMAL = { specialCancel: true };
const chain = (on, to, after = 4) => ({ on, to, after });

const ANIMATIONS = {
  idle: { actions: [{ id: 0, pick: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }], loop: true },
  walkForward: { actions: [20], loop: true },
  walkBackward: { actions: [21], loop: true },
  jump: { actions: [40, 41] },
  crouch: { actions: [11], loop: true },
  blockStanding: { actions: [130], loop: true },
  blockCrouching: { actions: [131], loop: true },
  hitReaction: { actions: [5000] },
  ko: { actions: [5030, { id: 5050, times: { 1: 20 } }, 5100, 5110] },
  victoryPose: { actions: [{ id: 181, times: { 17: 60 } }] },
  defeatPose: { actions: [{ id: 170, times: { 3: 60 } }] },

  // Corrida (100, 12 por tick) e o pulinho para tras (105).
  dashForward: {
    actions: [{ id: 101, times: { 0: 4, 1: 4, 2: 4, 3: 4 } }],
    dash: { distance: 150, moveFrom: 0, moveUntil: 3, invulnerableFrom: 9, invulnerableUntil: 0, cancel: true },
  },
  dashBackward: {
    actions: [105],
    dash: { distance: 90, moveFrom: 0, moveUntil: 3, invulnerableFrom: 0, invulnerableUntil: 1 },
  },
  airDashForward: {
    actions: [{ id: 101, times: { 0: 4, 1: 4, 2: 4, 3: 4 } }],
    dash: { distance: 120, moveFrom: 0, moveUntil: 3, invulnerableFrom: 9, invulnerableUntil: 0 },
  },
  airDashBackward: {
    actions: [105],
    dash: { distance: 90, moveFrom: 0, moveUntil: 3, invulnerableFrom: 9, invulnerableUntil: 0 },
  },

  // ---- Em pe: soco (200) -> cauda (210) -> cabecada eletrica (230) ----
  punch: {
    actions: [200],
    ...NORMAL,
    hit: { damage: 2, hitstun: 16, push: 4 },
    events: [sound(0, 'voice1')],
    cancels: [chain('punch', 'punch', 5), chain('kick', 'kick'), chain('special', 'headbutt')],
  },
  kick: {
    actions: [210],
    ...NORMAL,
    hit: { damage: 3, hitstun: 20, push: 5 },
    events: [sound(0, 'voice3'), fxFrame(3, 'tailSwipe', [0, 0])],
    cancels: [chain('special', 'headbutt')],
  },
  headbutt: {
    actions: [220],
    ...NORMAL,
    friction: false,
    hit: { damage: 4, hitstun: 26, push: 9, heavy: true },
    events: [sound(0, 'voice3'), { at: 0, vx: 2.5 }, { frame: 10, vx: 0 }, fxFrame(8, 'spark', [42, -30])],
  },

  // ---- Agachado (segurando ↓) ----
  crouchPunch: { actions: [400], ...NORMAL, hit: { damage: 2, hitstun: 16, push: 4 } },
  crouchSlide: {
    actions: [420],
    ...NORMAL,
    friction: false,
    hit: { damage: 3, hitstun: 22, push: 6 },
    events: [sound(0, 'voice3'), { at: 0, vx: 4 }, { frame: 5, vx: 0 }],
  },
  // 420: o lancador (anim 700).
  upper: {
    actions: [700],
    ...NORMAL,
    friction: false,
    hit: { damage: 3, hitstun: 30, push: 4, heavy: true },
    events: [sound(0, 'voice3'), { at: 0, vx: 2 }, { frame: 7, vx: 0 }],
  },

  // ---- No ar ----
  airPunch: {
    actions: [600],
    air: true,
    ...NORMAL,
    hit: { damage: 2, hitstun: 18, push: 4 },
    cancels: [chain('kick', 'airKick')],
  },
  airKick: {
    actions: [610],
    air: true,
    ...NORMAL,
    hit: { damage: 3, hitstun: 20, push: 5 },
    cancels: [chain('kick', 'airFlip'), chain('special', 'airHeadbutt')],
  },
  airHeadbutt: {
    actions: [630],
    air: true,
    ...NORMAL,
    hit: { damage: 3, hitstun: 24, push: 8, heavy: true },
    events: [fxFrame(8, 'spark', [42, -55])],
  },
  // 640: a cambalhota forte (anim 620).
  airFlip: {
    actions: [620],
    air: true,
    ...NORMAL,
    hit: { damage: 5, hitstun: 26, push: 9, heavy: true },
  },

  // ---- Especiais ----
  // Thunder Jolt (1000/1010): a faisca que corre pelo chao. A do chute e mais
  // rapida e o Pikachu recua.
  thunderJolt: {
    actions: [{ id: 1000, lengthTicks: 40 }],
    cooldown: 60,
    events: [sound(0, 'jolt'), fxFrame(3, 'jolt', [30, 0])],
  },
  thunderJoltFast: {
    actions: [{ id: 1000, lengthTicks: 40 }],
    cooldown: 60,
    friction: false,
    events: [sound(0, 'jolt'), { frame: 3, vx: -5 }, { frame: 4, vx: 0 }, fxFrame(3, 'joltFast', [30, 0])],
  },
  // Electro Ball (1020, EX): a bola eletrica; o Pikachu pula para tras.
  electroBall: {
    actions: [1050],
    cooldown: 150,
    events: [
      fx(0, 'exFlash', [0, -50]),
      sound(0, 'jolt'),
      { frame: 13, vx: -8, vy: -3 },
      fxFrame(13, 'electroBall', [-10, -50]),
    ],
  },
  // Thunder (1050/1060): o raio que cai do ceu na frente (perto ou longe).
  thunderNear: {
    actions: [1100],
    cooldown: 90,
    events: [sound(0, 'voice11'), sound(10, 'thunder'), fxFrame(4, 'thunderBolt', [56, 0])],
  },
  thunderFar: {
    actions: [1100],
    cooldown: 90,
    events: [sound(0, 'voice11'), sound(10, 'thunder'), fxFrame(4, 'thunderBolt', [116, 0])],
  },
  // Thunder EX (1070): o raio cai nele mesmo e o corpo eletrificado acerta.
  thunderSelf: {
    actions: [{ id: 1101, lengthTicks: 40 }],
    cooldown: 150,
    hits: [{ damage: 1, hitstun: 20, push: 3, every: 3, count: 6 }],
    events: [fx(0, 'exFlash', [0, -50]), sound(0, 'voice11'), sound(4, 'thunderBig'), fx(0, 'thunderBolt', [0, 0]), fxFrame(4, 'selfCharge', [0, 0])],
  },
  // Iron Tail (1130/1140/1150): a cambalhota que desce a cauda; o EX explode.
  ironTail: {
    actions: [1200],
    cooldown: 60,
    hits: [{ damage: 2, hitstun: 22, push: 5 }, { damage: 3, hitstun: 26, push: 7, heavy: true }],
    events: [sound(0, 'voice5'), sound(0, 'tail'), { frame: 2, vx: 6, vy: -3 }],
    onLand: 'ironTailLand',
  },
  ironTailLand: {
    actions: [1205],
    hit: { damage: 2, hitstun: 22, push: 5 },
    events: [sound(0, 'voice8'), fx(0, 'dust', [0, 0])],
  },
  ironTailEx: {
    actions: [1200],
    cooldown: 150,
    hits: [{ damage: 2, hitstun: 22, push: 5 }, { damage: 3, hitstun: 26, push: 7 }],
    events: [fx(0, 'exFlash', [0, -50]), sound(0, 'voice5'), sound(0, 'tail'), { frame: 2, vx: 7, vy: -3 }],
    onLand: 'ironTailBlast',
  },
  ironTailBlast: {
    actions: [1205],
    hit: { damage: 5, hitstun: 36, push: 14, heavy: true },
    events: [sound(0, 'boom'), fx(0, 'blast', [0, 0]), fx(0, 'dust', [0, 0])],
  },
  // Thunder Punch (1200/1210/1220): o soco eletrico que lanca para cima.
  thunderPunch: {
    actions: [1400],
    cooldown: 60,
    friction: false,
    hit: { damage: 4, hitstun: 32, push: 5, heavy: true },
    events: [sound(0, 'punchZap'), { frame: 6, vx: 4 }, { frame: 8, vx: 0 }, fxFrame(7, 'punchZap', [0, 0])],
  },
  thunderPunchEx: {
    actions: [1400],
    cooldown: 150,
    friction: false,
    areas: [
      { rect: [12, -85, 49, 0], from: 6, until: 6, damage: 3, hitstun: 30, push: 1 },
      { rect: [12, -85, 49, 0], from: 7, until: 7, damage: 5, hitstun: 40, push: 10, heavy: true },
    ],
    events: [fx(0, 'exFlash', [0, -50]), sound(0, 'punchZap'), { frame: 6, vx: 10 }, { frame: 8, vx: 0 }, fxFrame(7, 'punchZap', [0, 0])],
  },

  // ---- Supers (↓→↓→ e ↓←↓←; recarga no lugar da barra) ----
  // Thundershock (3000): a esfera de eletricidade em volta dele, 220 ticks.
  thundershock: {
    actions: [3000, { id: 3000, pick: [4, 5], lengthTicks: 200 }],
    cooldown: 900,
    invulnerable: [0, 60],
    events: [cutIn(0), sound(0, 'superVoice'), fxFrame(5, 'shockSphere', [0, -30])],
  },
  // Volt Tackle (3050 -> 3051 -> 3053): carrega, dispara envolto em
  // eletricidade atropelando e fecha com a explosao.
  voltTackle: {
    actions: [3500],
    cooldown: 900,
    invulnerable: [0, 58],
    events: [cutIn(0), sound(0, 'superVoice')],
    next: 'voltDash',
  },
  voltDash: {
    actions: [{ id: 3505, lengthTicks: 50 }],
    invulnerable: [0, 50],
    friction: false,
    hits: [{ damage: 1, hitstun: 20, push: 0, every: 4, count: 12 }],
    events: [sound(0, 'jolt'), { at: 0, vx: 12 }, ...[0, 12, 24, 36].map((at) => fx(at, 'voltTrail', [0, -20]))],
    next: 'voltFinish',
  },
  voltFinish: {
    actions: [3507],
    hit: { damage: 5, hitstun: 40, push: 14, heavy: true },
    events: [sound(0, 'boom'), fxFrame(4, 'voltBlast', [0, 0])],
  },
  // 10,000 Volt Thunderbolt (3100): a faisca corre pelo chao; se pegar, o
  // raio gigante cai no oponente e fecha na coluna de trovao.
  thunderbolt: {
    actions: [{ id: 3603, times: { 1: 60 } }, { id: 3604, times: { 2: 60 } }],
    cooldown: 1200,
    invulnerable: [0, 60],
    events: [cutIn(0), sound(0, 'superVoice'), fxFrame(5, 'boltRing', [0, 0]), fxFrame(5, 'boltSeeker', [0, -40])],
  },
};

const EFFECTS = {
  tailSwipe: { actions: [211] },
  spark: { actions: [221] },
  exFlash: { actions: [8200], size: 0.5, harmless: true },
  jolt: {
    actions: [1002],
    size: 0.45,
    loop: true,
    lifetime: 90,
    velocityX: 4,
    destroyOnHit: true,
    endAtWall: true,
    area: { rect: [-16, -50, 16, 0], damage: 3, hitstun: 22, push: 4 },
  },
  joltFast: {
    actions: [1002],
    size: 0.45,
    loop: true,
    lifetime: 70,
    velocityX: 10,
    destroyOnHit: true,
    endAtWall: true,
    area: { rect: [-16, -50, 16, 0], damage: 3, hitstun: 22, push: 4 },
  },
  electroBall: {
    actions: [1055],
    loop: true,
    lifetime: 80,
    velocityX: 12,
    destroyOnHit: true,
    endAtWall: true,
    hit: { damage: 5, hitstun: 30, push: 12, heavy: true },
  },
  thunderBolt: {
    actions: [1105],
    area: { rect: [-20, -120, 25, 0], damage: 3, hitstun: 26, push: 3, heavy: true },
  },
  selfCharge: { actions: [1106], harmless: true },
  dust: { actions: [1206], size: 0.5, scale: 1, harmless: true },
  blast: { actions: [1502], size: 0.6, harmless: true },
  punchZap: { actions: [1405], harmless: true },
  cutIn: { actions: [{ id: 7001, times: { 0: 60 } }], size: 0.55, center: true, layer: 'front', harmless: true, lifetime: 60 },
  shockSphere: {
    actions: [3002],
    size: 0.6,
    loop: true,
    lifetime: 180,
    blend: 'add',
    area: { rect: [-105, -165, 104, 46], damage: 1, hitstun: 20, push: 2, every: 6, count: 30 },
    follow: 'owner',
  },
  voltTrail: { actions: [3506], size: 0.6, harmless: true },
  voltBlast: { actions: [3508], harmless: true },
  boltRing: { actions: [1502], size: 0.5, harmless: true },
  boltSeeker: {
    actions: [{ id: 3506, lengthTicks: 90 }],
    size: 0.6,
    loop: true,
    lifetime: 90,
    velocityX: 8,
    destroyOnHit: true,
    endAtWall: true,
    area: { rect: [-49, -83, 44, -1], damage: 1, hitstun: 150, push: 0 },
    onHitSpawn: { id: 'boltStorm', target: 'opponent', follow: 'target' },
  },
  boltStorm: {
    actions: [{ id: 3601, lengthTicks: 100 }],
    size: 0.5,
    lifetime: 100,
    area: { rect: [-86, -300, 89, 9], damage: 1, hitstun: 30, push: 0, every: 5, count: 18 },
    onDeathSpawn: { id: 'boltPillar', target: 'opponent' },
  },
  boltPillar: {
    actions: [3602],
    size: 0.5,
    area: { rect: [-86, -300, 89, 9], damage: 6, hitstun: 40, push: 14, heavy: true },
  },
};

const COMBOS = [
  { id: 'thundershock', input: '↓→↓→P', animation: 'thundershock' },
  { id: 'voltTackle', input: '↓←↓←K', animation: 'voltTackle' },
  { id: 'thunderbolt', input: '↓→↓→S', animation: 'thunderbolt' },
  { id: 'thunderPunch', input: '→↓→P', animation: 'thunderPunch' },
  { id: 'thunderPunchEx', input: '→↓→S', animation: 'thunderPunchEx' },
  { id: 'joltP', input: '↓→P', animation: 'thunderJolt' },
  { id: 'joltK', input: '↓→K', animation: 'thunderJoltFast' },
  { id: 'electroBall', input: '↓→S', animation: 'electroBall' },
  { id: 'thunderP', input: '↓←P', animation: 'thunderNear' },
  { id: 'thunderK', input: '↓←K', animation: 'thunderFar' },
  { id: 'thunderS', input: '↓←S', animation: 'thunderSelf' },
  { id: 'ironTail', input: '↓↓K', animation: 'ironTail' },
  { id: 'ironTailEx', input: '↓↓S', animation: 'ironTailEx' },
  { id: 'crouchPunch', input: 'P', hold: '↓', animation: 'crouchPunch' },
  { id: 'crouchSlide', input: 'K', hold: '↓', animation: 'crouchSlide' },
  { id: 'upper', input: 'S', hold: '↓', animation: 'upper' },
];

const BUTTONS = {
  ground: { punch: 'punch', kick: 'kick', special: 'headbutt' },
  air: { punch: 'airPunch', kick: 'airKick', special: 'airHeadbutt' },
};

const MOVE_LIST = [
  { section: 'Movimento', name: 'Corrida', input: '→→' },
  { section: 'Movimento', name: 'Pulinho para trás', input: '←←' },
  { section: 'Movimento', name: 'Pulo duplo', input: '↑↑', note: 'No ar, aperte para cima de novo' },
  { section: 'Golpes', name: 'Soco, cauda e cabeçada', input: 'PKS', note: 'Encadeiam ao conectar' },
  { section: 'Golpes', name: 'No ar', input: 'PKS', note: 'K duas vezes: a cambalhota forte' },
  { section: 'Golpes', name: 'Agachado', input: 'P K S', hold: '↓', note: 'Soco, rasteira e lançador' },
  { section: 'Especiais', name: 'Thunder Jolt', input: '↓→P', note: 'Faísca pelo chão; com K, mais rápida' },
  { section: 'Especiais', name: 'Electro Ball', input: '↓→S', note: 'A bola elétrica' },
  { section: 'Especiais', name: 'Thunder', input: '↓←P', note: 'O raio cai à frente; com K, mais longe' },
  { section: 'Especiais', name: 'Thunder EX', input: '↓←S', note: 'O raio cai nele e o corpo eletrifica' },
  { section: 'Especiais', name: 'Iron Tail', input: '↓↓K', note: 'Com S, a versão que explode' },
  { section: 'Especiais', name: 'Thunder Punch', input: '→↓→P', note: 'Com S, dois acertos' },
  { section: 'Super', name: 'Thundershock', input: '↓→↓→P', note: 'Esfera elétrica em volta dele' },
  { section: 'Super', name: 'Volt Tackle', input: '↓←↓←K', note: 'Atropela envolto em eletricidade' },
  { section: 'Super', name: '10,000 Volt Thunderbolt', input: '↓→↓→S', note: 'Se a faísca pegar, o raio gigante' },
];

const SOUNDS = {
  voice1: [0, 0], voice3: [0, 2], voice5: [0, 5], voice8: [0, 8], voice11: [0, 11], superVoice: [0, 11],
  jolt: [12345, 6], thunder: [12345, 2], thunderBig: [12345, 18], tail: [12345, 15], punchZap: [12345, 9], boom: [12345, 1],
};

importMugenCharacter({
  root: ROOT,
  sffPath: resolve(PACK, 'Sprites.sff'),
  airPath: resolve(PACK, 'Anims.air'),
  outDir: 'public/assets/characters/pikachu',
  id: 'pikachu',
  name: 'Pikachu',
  description: 'O rato elétrico',
  template: 'public/assets/characters/dummy/dummy_config.json',
  animations: ANIMATIONS,
  effects: EFFECTS,
  combos: COMBOS,
  buttons: BUTTONS,
  moveList: MOVE_LIST,
  sndPath: resolve(PACK, 'Sounds.snd'),
  sounds: SOUNDS,
  spriteScale: SCALE,
  portrait: { sprite: [9000, 1], crop: [0, 0, 120, 132], width: 50, height: 55, background: '#2A2410' },
});
