// Importa o Aizen do pacote MUGEN "Aizen Sosuke TYBW" (Null, a partir do
// Salah; creditos em CREDITS.md).
//
// O pacote fica em assets-src/aizen/mugen/ (fora do git). SFF v2; cores da
// paleta 1.act. Para regerar: npm run assets:aizen
//
// O pacote original e "apelao" (Supernull: golpes que tiram a vida inteira,
// truques contra outros personagens). Aqui fica so o que e golpe, com dano
// normal: as duas sequencias (a e b), o clone (c), os golpes aereos, os
// kidou (Danku, Rikujokoro, Raikohou, Sokatsui, Shakkaho, Byakurai, Haien),
// os seis especiais de meia-lua, a hipnose completa (uma vez por round) e o
// super Goryu Tenmetsu. A carga de energia fica de fora: o jogo nao tem
// barra de energia (os supers usam tempo de recarga). O sprite e pequeno (53 px parado):
// spriteScale 1.8 poe ele na altura do elenco.
// Botoes: soco = a, chute = b, especial = c.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importMugenCharacter } from './lib/mugen-import.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = resolve(ROOT, 'assets-src/aizen/mugen');

const fx = (at, id, pos = [0, 0], extra = {}) => ({ at, effect: { id, pos, ...extra } });

const NORMAL = { specialCancel: true };
const TO_STRONG = { on: 'special', to: 'strong', after: 3 };

// Bastoes de luz do Rikujokoro (explods 1303-1308 do estado 1302).
const RODS = [
  ['rodA', [0, 20], [0, -10]],
  ['rodB', [40, 0], [-8, -6]],
  ['rodC', [40, -50], [-8, 4]],
  ['rodD', [0, -90], [0, 8]],
  ['rodE', [-40, -50], [8, 4]],
  ['rodF', [-40, 0], [8, -6]],
];

// Esferas do Goryu Tenmetsu (helpers 3050-3054 que disparam 3060): nascem em
// volta dele e voam no oponente.
const ORBS = [[-40, -90], [-10, -110], [25, -100], [50, -75], [-55, -55]];

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
  victoryPose: { actions: [181] },
  defeatPose: { actions: [170] },

  // Corrida curta (60/70); atravessa o oponente e emenda num golpe.
  dashForward: {
    actions: [100],
    dash: { distance: 180, moveFrom: 1, moveUntil: 1, invulnerableFrom: 1, invulnerableUntil: 1, cancel: true },
  },
  dashBackward: {
    actions: [105],
    dash: { distance: 150, moveFrom: 1, moveUntil: 1, invulnerableFrom: 1, invulnerableUntil: 1, cancel: true },
  },
  airDashForward: {
    actions: [100],
    dash: { distance: 140, moveFrom: 1, moveUntil: 1, invulnerableFrom: 9, invulnerableUntil: 0 },
  },
  airDashBackward: {
    actions: [105],
    dash: { distance: 110, moveFrom: 1, moveUntil: 1, invulnerableFrom: 9, invulnerableUntil: 0 },
  },

  // ---- Sequencia do a: 200 -> 210 -> 230 (some e reaparece cortando) ----
  punch: {
    actions: [200],
    ...NORMAL,
    hit: { damage: 2, hitstun: 18, push: 3 },
    events: [{ at: 0, vx: 2 }],
    cancels: [{ on: 'punch', to: 'punch2', after: 4 }, { on: 'kick', to: 'kick', after: 4 }, TO_STRONG],
  },
  punch2: {
    actions: [210],
    ...NORMAL,
    hit: { damage: 3, hitstun: 20, push: 4 },
    events: [{ at: 0, vx: 3 }],
    cancels: [{ on: 'punch', to: 'punch3', after: 4, need: 'hit' }, { on: 'kick', to: 'kick', after: 4 }, TO_STRONG],
  },
  punch3: {
    actions: [230],
    hit: { damage: 5, hitstun: 45, push: 7, heavy: true },
    events: [{ at: 5, teleport: 12 }],
  },

  // ---- Sequencia do b: 300 -> 310 -> 320 -> 330 -> 340 -> 350 -> 360 -> 370 ----
  kick: {
    actions: [300],
    ...NORMAL,
    hit: { damage: 2, hitstun: 20, push: 4 },
    events: [{ at: 2, vx: 7 }],
    cancels: [{ on: 'kick', to: 'kick2', after: 6 }, TO_STRONG],
  },
  kick2: {
    actions: [310],
    ...NORMAL,
    hit: { damage: 2, hitstun: 20, push: 4 },
    events: [{ at: 0, vx: 7 }],
    cancels: [{ on: 'kick', to: 'kick3', after: 5 }, TO_STRONG],
  },
  kick3: {
    actions: [320],
    ...NORMAL,
    hit: { damage: 3, hitstun: 24, push: 3 },
    events: [{ at: 3, vx: 8 }, { at: 8, vx: 0 }],
    cancels: [{ on: 'kick', to: 'kick4', after: 10 }],
  },
  kick4: {
    actions: [330],
    ...NORMAL,
    hit: { damage: 4, hitstun: 30, push: 12, heavy: true },
    events: [fx(3, 'darkRing', [17, -37])],
    cancels: [{ on: 'kick', to: 'kick5', after: 5 }],
  },
  // Onda escura que corre pelo chao (helper 345).
  kick5: {
    actions: [1000],
    events: [fx(6, 'darkWave', [25, -30])],
    cancels: [{ on: 'kick', to: 'kick6', after: 8, need: 'none' }],
  },
  // Rajada de cortes colado no oponente (350: 80 ticks no pacote).
  kick6: {
    actions: [{ id: 350, lengthTicks: 48 }],
    hit: { damage: 1, hitstun: 20, push: 1 },
    events: [{ at: 0, teleport: 8 }, fx(4, 'slashArc', [10, -40])],
    cancels: [{ on: 'kick', to: 'kick7', after: 40 }, { on: 'special', to: 'strong', after: 40 }],
  },
  kick7: {
    actions: [360],
    hit: { damage: 4, hitstun: 30, push: 4 },
    events: [{ at: 0, vx: 3 }],
    cancels: [{ on: 'kick', to: 'kick8', after: 12 }],
  },
  kick8: {
    actions: [370],
    hit: { damage: 6, hitstun: 36, push: 18, heavy: true },
    events: [{ at: 0, vx: 4 }],
  },

  // c: o clone que avanca cortando (helper 410).
  strong: {
    actions: [{ id: 400, times: { 1: 18 } }],
    cooldown: 30,
    events: [fx(12, 'cloneDash', [30, 0])],
  },

  // ---- No ar: 605 -a-> 600, b = 610 (garras), c = 900 (clone mergulha) ----
  airLight: {
    actions: [605],
    air: true,
    ...NORMAL,
    hit: { damage: 2, hitstun: 20, push: 3 },
    cancels: [{ on: 'punch', to: 'airLight2', after: 5 }, { on: 'kick', to: 'airMedium', after: 5 }],
  },
  airLight2: {
    actions: [600],
    air: true,
    ...NORMAL,
    hit: { damage: 3, hitstun: 24, push: 6, heavy: true },
    events: [{ at: 0, vx: 3, vy: -5 }],
    cancels: [{ on: 'kick', to: 'airMedium', after: 5 }],
  },
  airMedium: {
    actions: [610],
    air: true,
    float: true,
    events: [
      { frame: 2, vx: 9, vy: 0 },
      { frame: 5, vx: 2, vy: -2 },
      ...[0, 2, 4, 6, 8].map((delay, index) => fx(5 + delay, 'claw', [14 + index * 6, -12], { spread: [12, 18] })),
    ],
  },
  airStrong: {
    actions: [{ id: 400, times: { 1: 18 } }],
    air: true,
    events: [{ at: 5, vx: -2, vy: -4 }, fx(12, 'cloneDive', [30, 0])],
  },

  // ---- Kidou ----
  // Haien (800): a bola de fogo roxa-negra.
  haien: {
    actions: [620],
    cooldown: 60,
    events: [fx(8, 'haien', [15, -30])],
  },
  // Sokatsui (1800): fogo azul a frente; o golpe e o proprio corpo (caixa
  // longa no .air).
  sokatsui: {
    actions: [1800],
    cooldown: 90,
    hit: { damage: 10, hitstun: 36, push: 12, heavy: true },
    events: [fx(5, 'sokatsuiWave', [150, 5]), fx(5, 'sokatsuiFire', [125, -38])],
  },
  // Shakkaho (13000): a esfera vermelha.
  shakkaho: {
    actions: [13000],
    cooldown: 90,
    events: [fx(5, 'shakkahoCharge', [25, -35]), fx(55, 'shakkaho', [25, -35])],
  },
  // Byakurai (1700): o raio azul (helper 1750).
  byakurai: {
    actions: [1700],
    cooldown: 60,
    events: [fx(5, 'byakurai', [0, 0])],
  },
  // Shunpo (480): reaparece do outro lado do oponente.
  shunpo: {
    actions: [100],
    cooldown: 40,
    invulnerable: [0, 12],
    events: [{ at: 8, teleport: -45, turn: true }],
  },
  // Danku (1000): a parede que segura projeteis.
  danku: {
    actions: [1000],
    cooldown: 400,
    events: [fx(5, 'dankuWall', [50, 0])],
  },
  // Rikujokoro (1300): a mira aparece e o feixe cai direto no oponente.
  rikujokoro: {
    actions: [1300],
    cooldown: 300,
    events: [fx(5, 'crosshair', [22, -31]), fx(45, 'rikujokoro', [0, -20], { target: 'opponent' })],
  },
  // Raikohou (1200): a bola de raios a frente, varios acertos.
  raikoho: {
    actions: [{ id: 1200, times: { 1: 80 } }],
    cooldown: 200,
    events: [fx(30, 'raikohoCharge', [23, -46]), fx(42, 'raikoho', [160, -47])],
  },

  // ---- Especiais ----
  // Silent Slash (1900 -> 1901 -> 1920): o corte que congela; se pegar, passa
  // pelo oponente, o clone corta de volta e o golpe final arremessa.
  silentSlash: {
    actions: [{ id: 1900, lengthTicks: 60 }],
    cooldown: 150,
    hit: { damage: 4, hitstun: 100, push: 0 },
    events: [{ at: 30, vx: 5 }],
    onHit: { to: 'silentDash' },
  },
  silentDash: {
    actions: [1901],
    noPush: true,
    invulnerable: [0, 39],
    events: [{ frame: 1, vx: 15 }, { frame: 2, vx: 0 }, fx(20, 'silentClone', [25, 0], { target: 'opponent', flip: true })],
    next: 'silentFinish',
  },
  silentFinish: {
    actions: [1920],
    events: [{ at: 0, teleport: 14 }],
    hit: { damage: 12, hitstun: 40, push: 18, heavy: true },
  },
  // Kyouka Suigetsu (1100): postura; quem bater nele acerta a ilusao e ele
  // reaparece do outro lado cortando, com o vidro quebrando na tela.
  kyouka: {
    actions: [{ id: 1100, lengthTicks: 100 }],
    cooldown: 240,
    counter: { from: 0, until: 99, to: 'kyoukaStrike' },
  },
  kyoukaStrike: {
    actions: [1101],
    invulnerable: [0, 59],
    hit: { damage: 14, hitstun: 50, push: 14, heavy: true, unblockable: true },
    events: [fx(0, 'illusionMark', [0, -70], { target: 'opponent' }), { at: 1, teleport: -30 }, fx(10, 'glassBreak', [0, -100], { target: 'stage' })],
  },
  // Hipnose completa (4000-4007, uma vez por round): por 8 s o oponente luta
  // com uma ilusao (Aizen fica meio transparente); o primeiro golpe que ele
  // acertar e no reflexo: o vidro quebra, o dano nao acontece e o Aizen de
  // verdade reaparece atras dele, prendendo.
  hypnosis: {
    actions: [{ id: 1100, lengthTicks: 30 }],
    perRound: 1,
    illusion: { ticks: 480, to: 'hypnosisBreak' },
    events: [fx(0, 'hypnosisFlash', [2, -30])],
  },
  hypnosisBreak: {
    actions: [1101],
    invulnerable: [0, 59],
    hit: { damage: 4, hitstun: 80, push: 2, unblockable: true },
    events: [{ at: 1, teleport: -30 }, fx(0, 'glassBreak', [0, -100], { target: 'stage' })],
  },
  // Dark Waves (2000): as pontas verdes que sobem do chao e explodem.
  darkWaves: {
    actions: [{ id: 2000, times: { 1: 40 } }],
    cooldown: 200,
    events: [fx(30, 'darkSpikes', [70, 0], { spread: [40, 0] })],
  },
  // Reiatsu Crushing (1600): a pressao espiritual que nao da para defender;
  // se pegar duas vezes, o esmagamento (1650/1670) no oponente.
  reiatsuCrush: {
    actions: [1600],
    cooldown: 300,
    hit: { damage: 3, hitstun: 70, push: 0, unblockable: true, every: 50, count: 2 },
    events: [fx(30, 'pressure', [0, -110], { target: 'opponent' })],
    onHit: { to: 'reiatsuFinish', minHits: 2 },
  },
  reiatsuFinish: {
    actions: [1601],
    events: [fx(5, 'crush', [0, 30], { target: 'opponent' })],
  },
  // Kurohitsugi (2200 segurando c): solta o botao e o caixao negro fecha no
  // oponente, varios cortes, e quebra.
  kurohitsugi: {
    actions: [{ id: 2200, lengthTicks: 150 }],
    cooldown: 400,
    charge: { button: 'special', to: 'kurohitsugiCast', min: 30, max: 150 },
  },
  kurohitsugiCast: {
    actions: [2201],
    events: [fx(0, 'coffin', [0, 0], { target: 'opponent' })],
  },
  // Death Impact (1400 -> 1406 -> 1420): some e reaparece de um lado e do
  // outro, a rajada e o golpe final.
  deathImpact: {
    actions: [1400],
    cooldown: 300,
    noPush: true,
    hit: { damage: 3, hitstun: 40, push: 2 },
    events: [{ frame: 6, teleport: 30, through: true }],
    onHit: { to: 'deathImpact2' },
  },
  deathImpact2: {
    actions: [1401],
    noPush: true,
    hit: { damage: 2, hitstun: 40, push: 2 },
    events: [{ frame: 6, teleport: 30, through: true }],
    onHit: { to: 'deathImpact3' },
  },
  deathImpact3: {
    actions: [1402],
    noPush: true,
    hit: { damage: 2, hitstun: 40, push: 2 },
    events: [{ frame: 6, teleport: 30, through: true }],
    onHit: { to: 'deathImpact4' },
  },
  deathImpact4: {
    actions: [1403],
    noPush: true,
    hit: { damage: 2, hitstun: 40, push: 2 },
    events: [{ frame: 6, teleport: 20 }],
    onHit: { to: 'deathImpact5' },
  },
  deathImpact5: {
    actions: [{ id: 1404, lengthTicks: 50 }],
    hit: { damage: 1, hitstun: 30, push: 1 },
    events: [{ at: 6, teleport: 22 }, fx(11, 'slashArc', [10, -40])],
    next: 'deathImpact6',
  },
  deathImpact6: {
    actions: [1405],
    hit: { damage: 5, hitstun: 40, push: 2 },
    events: [{ at: 0, vx: 2 }],
    onHit: { to: 'deathImpactFinish' },
  },
  deathImpactFinish: {
    actions: [1420],
    noPush: true,
    hit: { damage: 12, hitstun: 50, push: 18, heavy: true },
    events: [{ frame: 5, teleport: 28 }, { frame: 10, vx: 12 }, fx(14, 'blueBurst', [0, -30], { target: 'opponent' })],
  },

  // ---- Super: Goryu Tenmetsu (3000 -> 3010) ----
  goryu: {
    actions: [{ id: 3000, lengthTicks: 70 }],
    cooldown: 900,
    invulnerable: [0, 69],
    events: [
      fx(0, 'cutIn', [0, -125], { target: 'stage' }),
      ...ORBS.map(([x, y], index) => fx(20 + index * 4, 'darkOrb', [x, y], { hitDelay: 30 - index * 4 })),
    ],
    next: 'goryuFinal',
  },
  goryuFinal: {
    actions: [3010],
    invulnerable: [0, 90],
    noPush: true,
    hit: { damage: 22, hitstun: 70, push: 18, heavy: true, unblockable: true },
    events: [{ frame: 6, teleport: -50 }, { frame: 10, vx: 12 }, fx(31, 'bloodSplash', [10, -50], { target: 'opponent' })],
  },
};

const EFFECTS = {
  darkRing: { actions: [335], size: 0.18 },
  slashArc: { actions: [{ id: 355, lengthTicks: 30 }], size: 0.3 },
  darkWave: {
    actions: [345],
    size: 0.2,
    loop: true,
    lifetime: 70,
    velocityX: 5,
    destroyOnHit: true,
    endAtWall: true,
    hit: { damage: 5, hitstun: 30, push: 8, heavy: true },
  },
  cloneDash: {
    actions: [410],
    loop: true,
    lifetime: 30,
    velocityX: 10,
    destroyOnHit: true,
    hit: { damage: 4, hitstun: 26, push: 6 },
  },
  cloneDive: {
    actions: [910],
    loop: true,
    lifetime: 40,
    velocityX: 7,
    velocityY: 7,
    destroyOnHit: true,
    endOnGround: true,
    hit: { damage: 4, hitstun: 26, push: 6, heavy: true },
  },
  claw: { actions: [225], size: 0.35, hit: { damage: 1, hitstun: 16, push: 2 } },
  haien: {
    actions: [625],
    size: 0.11,
    loop: true,
    lifetime: 150,
    velocityX: 6,
    destroyOnHit: true,
    endAtWall: true,
    hit: { damage: 7, hitstun: 34, push: 10, heavy: true },
    onDeathSpawn: { id: 'haienBlast' },
  },
  haienBlast: { actions: [628], size: 0.2 },
  sokatsuiWave: { actions: [2430], size: 0.3, scale: 0.6 },
  sokatsuiFire: { actions: [1850], size: 0.18, scale: 0.6 },
  shakkahoCharge: { actions: [{ id: 1350, lengthTicks: 50 }], loop: true },
  shakkaho: {
    actions: [1360],
    loop: true,
    lifetime: 90,
    velocityX: 13,
    destroyOnHit: true,
    endAtWall: true,
    hit: { damage: 12, hitstun: 36, push: 12, heavy: true },
    onHitSpawn: { id: 'redBurst', target: 'opponent', pos: [0, -30] },
  },
  redBurst: { actions: [1370], size: 0.8 },
  byakurai: {
    actions: [1750],
    size: 0.6,
    scale: 0.7,
    hit: { damage: 1, hitstun: 18, push: 2, every: 4, count: 7 },
  },
  dankuWall: {
    actions: [1050],
    size: 0.4,
    scale: 0.6,
    lifetime: 300,
    loop: true,
    harmless: true,
    alpha: 0.75,
    shield: [-14, -130, 14, 12],
  },
  crosshair: { actions: [1320], size: 0.3 },
  rikujokoro: {
    actions: [1301],
    hit: { damage: 1, hitstun: 150, push: 0 },
    onHitSpawn: { id: 'rods', target: 'opponent' },
  },
  rods: {
    actions: [{ id: 1301, lengthTicks: 6 }],
    harmless: true,
    spawns: RODS.map(([id, pos, [vx, vy]]) => fx(0, id, pos, { motion: [{ at: 0, vx, vy }, { at: 4, vx: 0, vy: 0 }] })),
  },
  ...Object.fromEntries(RODS.map(([id], index) => [id, {
    actions: [1303 + index],
    size: 0.3,
    loop: true,
    lifetime: 140,
    harmless: true,
  }])),
  raikohoCharge: { actions: [1230], size: 0.25 },
  raikoho: {
    actions: [{ id: 1260, lengthTicks: 110 }],
    size: 0.3,
    scale: 0.6,
    endWithMove: true,
    area: { rect: [-150, -150, 150, 150], damage: 1, hitstun: 20, push: 2, every: 6, count: 12 },
  },
  silentClone: { actions: [1910], hit: { damage: 6, hitstun: 40, push: 0 } },
  hypnosisFlash: { actions: [7400], size: 0.2, harmless: true },
  illusionMark: { actions: [1110], size: 0.5 },
  glassBreak: { actions: [1120], cover: [920, 520], layer: 'front' },
  darkSpikes: {
    actions: [2050],
    size: 0.35,
    loop: true,
    lifetime: 60,
    velocityX: 1.5,
    hit: { damage: 1, hitstun: 22, push: 1, every: 8, count: 6 },
    onDeathSpawn: { id: 'darkDome' },
  },
  darkDome: { actions: [2060], size: 0.25, hit: { damage: 8, hitstun: 40, push: 12, heavy: true } },
  pressure: { actions: [{ id: 1650, lengthTicks: 80 }], size: 0.4, scale: 0.6, loop: true, harmless: true },
  crush: {
    actions: [1670],
    size: 0.45,
    shade: true,
    hit: { damage: 12, hitstun: 50, push: 8, heavy: true, unblockable: true },
  },
  coffin: {
    actions: [{ id: 2260, lengthTicks: 110 }],
    size: 0.45,
    shade: true,
    alpha: 0.85,
    loop: true,
    hit: { damage: 1, hitstun: 30, push: 0, unblockable: true, every: 10, count: 10 },
    onDeathSpawn: { id: 'coffinBreak' },
  },
  coffinBreak: {
    actions: [2265],
    size: 0.45,
    shade: true,
    hit: { damage: 10, hitstun: 45, push: 10, heavy: true, unblockable: true },
  },
  blueBurst: { actions: [1851], size: 0.2, scale: 0.5 },
  cutIn: { actions: [{ id: 3070, lengthTicks: 45 }], size: 0.2, harmless: true },
  darkOrb: {
    actions: [3060],
    size: 0.12,
    loop: true,
    lifetime: 90,
    motion: [{ at: 0, vx: 0, vy: 0 }, { at: 30, aim: 10 }],
    destroyOnHit: true,
    hit: { damage: 3, hitstun: 60, push: 0 },
  },
  bloodSplash: { actions: [9075], size: 0.4, scale: 0.6 },
};

// Notacao relativa ao lado que ele encara.
const COMBOS = [
  { id: 'goryu', input: '↓↓P', animation: 'goryu' },
  { id: 'hypnosis', input: '↓↓K', animation: 'hypnosis' },
  { id: 'silent', input: '↓→P', animation: 'silentSlash' },
  { id: 'kyouka', input: '↓←P', animation: 'kyouka' },
  { id: 'waves', input: '↓→K', animation: 'darkWaves' },
  { id: 'crush', input: '↓←K', animation: 'reiatsuCrush' },
  { id: 'kurohitsugi', input: '↓→S', animation: 'kurohitsugi' },
  { id: 'death', input: '↓←S', animation: 'deathImpact' },
  { id: 'byakurai', input: '→↓→P', animation: 'byakurai' },
  { id: 'shunpo', input: '→↓→K', animation: 'shunpo' },
  { id: 'haien', input: '↓↑P', animation: 'haien' },
  { id: 'sokatsui', input: '↓↑K', animation: 'sokatsui' },
  { id: 'shakkaho', input: '↓↑S', animation: 'shakkaho' },
  { id: 'danku', input: 'P', hold: '↓', animation: 'danku' },
  { id: 'rikujokoro', input: 'K', hold: '↓', animation: 'rikujokoro' },
  { id: 'raikoho', input: 'S', hold: '↓', animation: 'raikoho' },
];

const BUTTONS = {
  ground: { punch: 'punch', kick: 'kick', special: 'strong' },
  air: { punch: 'airLight', kick: 'airMedium', special: 'airStrong' },
};

const MOVE_LIST = [
  { section: 'Movimento', name: 'Corrida', input: '→→', note: 'Atravessa o oponente; emenda num golpe' },
  { section: 'Movimento', name: 'Corrida para trás', input: '←←' },
  { section: 'Movimento', name: 'Shunpo', input: '→↓→K', note: 'Reaparece do outro lado do oponente' },
  { section: 'Movimento', name: 'Pulo duplo', input: '↑↑', note: 'No ar, aperte para cima de novo' },
  { section: 'Golpes', name: 'Sequência do soco', input: 'PPP', note: 'O terceiro some e reaparece cortando' },
  { section: 'Golpes', name: 'Sequência do chute', input: 'KKKKKKKK', note: 'Oito golpes: onda escura, rajada e o arremesso' },
  { section: 'Golpes', name: 'Clone', input: 'S', note: 'Um clone avança cortando' },
  { section: 'Golpes', name: 'No ar', input: 'PKS', note: 'Garras de reiatsu no chute, clone mergulhando no especial' },
  { section: 'Kidō', name: 'Hadō #32: Ōkasen (Haien)', input: '↓↑P', note: 'Bola de fogo' },
  { section: 'Kidō', name: 'Hadō #33: Sōkatsui', input: '↓↑K', note: 'Fogo azul à frente' },
  { section: 'Kidō', name: 'Hadō #31: Shakkahō', input: '↓↑S', note: 'Esfera vermelha' },
  { section: 'Kidō', name: 'Hadō #4: Byakurai', input: '→↓→P', note: 'Raio azul, vários acertos' },
  { section: 'Kidō', name: 'Bakudō #81: Danku', input: 'P', hold: '↓', note: 'Parede que segura projéteis' },
  { section: 'Kidō', name: 'Bakudō #61: Rikujōkōrō', input: 'K', hold: '↓', note: 'Prende o oponente onde ele estiver' },
  { section: 'Kidō', name: 'Hadō #63: Raikōhō', input: 'S', hold: '↓', note: 'Bola de raios à frente' },
  { section: 'Especiais', name: 'Corte silencioso', input: '↓→P', note: 'Congela; se pegar, o clone e o golpe final' },
  { section: 'Especiais', name: 'Kyōka Suigetsu', input: '↓←P', note: 'Postura: quem bater acerta a ilusão' },
  { section: 'Especiais', name: 'Ondas escuras', input: '↓→K', note: 'Pontas verdes que sobem do chão' },
  { section: 'Especiais', name: 'Pressão espiritual', input: '↓←K', note: 'Não dá para defender' },
  { section: 'Especiais', name: 'Hadō #90: Kurohitsugi', input: '↓→S', note: 'Segure S; solte para o caixão negro' },
  { section: 'Especiais', name: 'Hipnose completa', input: '↓↓K', note: 'Uma vez por round: por 8 s, o primeiro golpe dele acerta a ilusão' },
  { section: 'Especiais', name: 'Death Impact', input: '↓←S', note: 'Some e reaparece golpeando dos dois lados' },
  { section: 'Super', name: 'Goryū Tenmetsu', input: '↓↓P', note: 'Esferas escuras e o golpe final' },
];

importMugenCharacter({
  root: ROOT,
  sffPath: resolve(PACK, 'Aizen_TYBW.sff'),
  sffOptions: { actPath: resolve(PACK, '1.act') },
  airPath: resolve(PACK, 'Aizen_TYBW.air'),
  outDir: 'public/assets/characters/aizen',
  id: 'aizen',
  name: 'Aizen',
  description: 'O ilusionista do Hogyoku',
  template: 'public/assets/characters/dummy/dummy_config.json',
  animations: ANIMATIONS,
  effects: EFFECTS,
  combos: COMBOS,
  buttons: BUTTONS,
  moveList: MOVE_LIST,
  spriteScale: 1.8,
  portrait: { sprite: [9000, 1], crop: [8, 6, 112, 120], width: 50, height: 55, background: '#1A1620' },
});
