// Importa a Unohana do pacote MUGEN "RetsuUnohana" (Mounir; creditos em
// CREDITS.md).
//
// O pacote fica em assets-src/unohana/mugen/ (fora do git). SFF v2 (RLE8).
// Para regerar: npm run assets:unohana
//
// Tudo o que o pacote tem ligado: a sequencia de corte (a, a, b, b) que fecha
// no golpe forte (c); os golpes aereos (o c no ar avanca e solta as garras de
// reiatsu); os seis especiais de meia-lua; os tres golpes de segurar para
// baixo; a cura (Minazuki) e o Bankai. O sprite do pacote e pequeno (57 px de
// altura parada): spriteScale 1.7 poe ela na altura do resto do elenco.
// Botoes: soco = a, chute = b, especial = c. Os tempos (ticks) e as caixas
// vem do .air/.cns.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importMugenCharacter } from './lib/mugen-import.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = resolve(ROOT, 'assets-src/unohana/mugen');

const fx = (at, id, pos = [0, 0], extra = {}) => ({ at, effect: { id, pos, ...extra } });

// Todo golpe normal cancela nos especiais ao conectar.
const NORMAL = { specialCancel: true };
// Qualquer golpe da sequencia fecha no forte (c) ao conectar.
const TO_STRONG = { on: 'special', to: 'strong', after: 4 };

// Laminas do 1100 (helpers 1150): nascem atras dela, esperam 20 ticks e
// disparam para a frente. Posicoes sorteadas no pacote; aqui, fixas.
const BLADES = [[-70, -20], [-45, -42], [-60, -10], [-35, -30], [-80, -36], [-50, -18], [-40, -46], [-65, -28]];

// Bastoes de luz do Rikujokoro (explods 523-528 do estado 522): fecham sobre
// o oponente e param.
const RODS = [
  ['rodA', [0, 20], [0, -10]],
  ['rodB', [40, 0], [-8, -6]],
  ['rodC', [40, -50], [-8, 4]],
  ['rodD', [0, -90], [0, 8]],
  ['rodE', [-40, -50], [8, 4]],
  ['rodF', [-40, 0], [8, -6]],
];

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
  victoryPose: { actions: [180] },
  defeatPose: { actions: [170] },

  // Shunpo (estados 60/70): dispara na horizontal e para; atravessa o
  // oponente e emenda num golpe. O mesmo no ar.
  dashForward: {
    actions: [100],
    dash: { distance: 200, moveFrom: 1, moveUntil: 3, invulnerableFrom: 1, invulnerableUntil: 3, cancel: true },
  },
  dashBackward: {
    actions: [105],
    dash: { distance: 160, moveFrom: 1, moveUntil: 3, invulnerableFrom: 1, invulnerableUntil: 3, cancel: true },
  },
  airDashForward: {
    actions: [100],
    dash: { distance: 150, moveFrom: 1, moveUntil: 3, invulnerableFrom: 9, invulnerableUntil: 0 },
  },
  airDashBackward: {
    actions: [105],
    dash: { distance: 120, moveFrom: 1, moveUntil: 3, invulnerableFrom: 9, invulnerableUntil: 0 },
  },

  // ---- Sequencia em pe: 200 -a-> 210 -b-> 300 -b-> 310; c fecha (400) ----
  punch: {
    actions: [200],
    ...NORMAL,
    hit: { damage: 3, hitstun: 18, push: 4 },
    cancels: [{ on: 'punch', to: 'punch2', after: 6 }, TO_STRONG],
  },
  punch2: {
    actions: [210],
    ...NORMAL,
    hit: { damage: 3, hitstun: 20, push: 5 },
    events: [{ at: 0, vx: 2 }, { frame: 4, vx: 0 }],
    cancels: [{ on: 'kick', to: 'kick', after: 4 }, TO_STRONG],
  },
  kick: {
    actions: [300],
    ...NORMAL,
    hit: { damage: 3, hitstun: 20, push: 5 },
    events: [{ at: 0, vx: 2 }, { frame: 4, vx: 0 }],
    cancels: [{ on: 'kick', to: 'kick2', after: 5 }, TO_STRONG],
  },
  // Lancador (Fall = 1 no pacote): vira empurrao forte.
  kick2: {
    actions: [310],
    ...NORMAL,
    hit: { damage: 4, hitstun: 28, push: 9, heavy: true },
    events: [{ at: 0, vx: 2 }, { frame: 4, vx: 0 }],
    cancels: [TO_STRONG],
  },
  strong: {
    actions: [400],
    ...NORMAL,
    hit: { damage: 6, hitstun: 30, push: 10, heavy: true },
    events: [fx(4, 'strongSlash', [38, -32])],
  },

  // ---- No ar: 600 -b-> 610; c (620) avanca soltando as garras ----
  airLight: {
    actions: [600],
    air: true,
    ...NORMAL,
    hit: { damage: 3, hitstun: 18, push: 5 },
    cancels: [{ on: 'kick', to: 'airMedium', after: 5 }, { on: 'special', to: 'airStrong', after: 5 }],
  },
  airMedium: {
    actions: [210],
    air: true,
    ...NORMAL,
    hit: { damage: 4, hitstun: 24, push: 8, heavy: true },
    cancels: [{ on: 'special', to: 'airStrong', after: 4 }],
  },
  airStrong: {
    actions: [620],
    air: true,
    float: true,
    events: [
      { frame: 2, vx: 9, vy: 0 },
      { frame: 5, vx: 2, vy: -2 },
      ...[0, 2, 4, 6, 8].map((delay, index) => fx(5 + delay, 'claw', [14 + index * 6, -12], { spread: [12, 18] })),
    ],
  },

  // ---- Especiais (↓→ / ↓← + botao) ----
  // 1100: laminas que esperam atras dela e disparam.
  flyingBlades: {
    actions: [1100],
    cooldown: 120,
    events: BLADES.map(([x, y], index) => fx(index * 2, 'flyingBlade', [x, y], { hitDelay: 20 - index * 2 })),
  },
  // 1800: Bakudo #81 Danku, a parede que segura os projeteis do oponente.
  danku: {
    actions: [1800],
    cooldown: 400,
    invulnerable: [0, 10],
    events: [fx(46, 'dankuWall', [30, 0])],
  },
  // 1300: Hadou (1350): relampago na frente dela, quatro acertos.
  byakurai: {
    actions: [1300],
    cooldown: 120,
    events: [fx(40, 'lightning', [29, -33])],
  },
  // 1400: o tornado de reiatsu em volta dela (1450), 50 ticks.
  tornado: {
    actions: [1400],
    cooldown: 200,
    events: [fx(30, 'tornado', [0, -45])],
  },
  // 1000: laminas que caem sobre o oponente (1051).
  bladeRain: {
    actions: [1000],
    cooldown: 300,
    events: Array.from({ length: 12 }, (_, index) => fx(20 + index * 6, 'fallingBlade', [0, -230], { target: 'opponent', spread: [45, 0] })),
  },
  // 1200: Bakudo, o cinturao de luz que prende (1250 -> 1205: preso 90 ticks).
  bindingBelt: {
    actions: [1200],
    cooldown: 240,
    events: [fx(30, 'belt', [20, -33])],
  },

  // ---- Segurando ↓ ----
  // 1600: o espadachim fantasma (helper 1610/1602) surge e corta avancando.
  phantomSlash: {
    actions: [1600],
    cooldown: 180,
    events: [fx(0, 'phantom', [50, 0])],
  },
  // 520: Bakudo #61 Rikujokoro: o feixe (521) prende o oponente; os seis
  // bastoes de luz fecham nele.
  rikujokoro: {
    actions: [520],
    cooldown: 300,
    events: [fx(45, 'rikujokoro', [44, 0])],
  },
  // 320: investida com corte para cima.
  risingSlash: {
    actions: [320],
    ...NORMAL,
    cooldown: 40,
    friction: false,
    hit: { damage: 4, hitstun: 30, push: 8, heavy: true },
    events: [{ at: 7, vx: 12 }, { at: 15, vx: 0 }, fx(10, 'risingArc', [-12, -33])],
  },

  // ---- Supers (↓↓ + botao) ----
  // 1700: Minazuki, a arraia que cura (LifeAdd 2 por tick de 75 a 120).
  minazuki: {
    actions: [{ id: 1700, times: { 2: 80 } }],
    cooldown: 900,
    events: [
      fx(20, 'manta', [-5, -35]),
      fx(55, 'healRings', [0, -35]),
      fx(66, 'healOrb', [-5, -27]),
      { at: 60, repeat: { every: 5, until: 105 }, heal: 1 },
    ],
  },
  // 3000 -> 3001 -> 3002: Bankai. O corte de abertura, se pegar, prende o
  // oponente no meio da arena sob a cortina de sangue e fecha no golpe final.
  bankai: {
    actions: [{ id: 3000, pick: [1, 2, 3, 4, 5, 6, 7, 8, 9] }],
    cooldown: 900,
    hit: { damage: 2, hitstun: 120, push: 0 },
    events: [fx(0, 'superFlash', [-1, -28])],
    onHit: { to: 'bankaiCharge' },
  },
  bankaiCharge: {
    actions: [{ id: 3001, lengthTicks: 100 }],
    invulnerable: [0, 100],
    events: [
      { at: 0, standAt: -60, pinOpponent: { dx: 0, lift: 0, ticks: 170 } },
      // A camera mostra ~850x480 px centrados 180 px acima do chao (em px de
      // tela; aqui em unidades do pacote, 1.7 px cada).
      fx(4, 'bloodCurtain', [0, -106], { target: 'stage' }),
    ],
    next: 'bankaiSlash',
  },
  bankaiSlash: {
    actions: [{ id: 3002, times: { 4: 20, 8: 30 } }],
    invulnerable: [0, 120],
    hit: { damage: 25, hitstun: 80, push: 14, heavy: true, unblockable: true },
    events: [{ at: 0, teleport: 33 }],
  },
};

const EFFECTS = {
  strongSlash: { actions: [425], size: 0.2 },
  risingArc: { actions: [329], size: 0.2, scale: 0.5 },
  superFlash: { actions: [7405], size: 0.3, scale: 0.5 },
  // Garras de reiatsu (650, anim 626): cada uma acerta uma vez.
  claw: { actions: [626], size: 0.35, hit: { damage: 1, hitstun: 16, push: 2 } },
  flyingBlade: {
    actions: [1150],
    size: 0.6,
    loop: true,
    lifetime: 80,
    motion: [{ at: 20, vx: 15 }],
    destroyOnHit: true,
    endOnOwnerHit: true,
    endAtWall: true,
    area: { rect: [-35, -8, 41, 2], damage: 2, hitstun: 16, push: 3 },
  },
  dankuWall: {
    actions: [511],
    size: 0.4,
    scale: 0.6,
    lifetime: 250,
    loop: true,
    harmless: true,
    alpha: 0.75,
    shield: [-14, -130, 14, 12],
  },
  lightning: {
    actions: [1350],
    scale: 0.6,
    size: 1,
    hit: { damage: 3, hitstun: 14, push: 2, every: 6, count: 4 },
  },
  tornado: {
    actions: [1450],
    loop: true,
    lifetime: 50,
    scale: 0.25,
    size: 0.17,
    endWithMove: true,
    area: { rect: [-350, -350, 350, 330], damage: 2, hitstun: 20, push: 3, every: 8, count: 6 },
  },
  fallingBlade: {
    actions: [1051],
    size: 0.45,
    loop: true,
    lifetime: 60,
    velocityY: 12,
    endOnGround: true,
    destroyOnHit: true,
    hit: { damage: 2, hitstun: 22, push: 1 },
  },
  belt: {
    actions: [1250],
    hits: [{ damage: 1, hitstun: 90, push: 0 }],
    maxHits: 1,
    onHitSpawn: { id: 'beltLock', target: 'opponent', follow: 'target', pos: [0, -25] },
  },
  beltLock: { actions: [{ id: 1257, lengthTicks: 80 }], size: 0.8, loop: true, lifetime: 80, harmless: true },
  phantom: {
    actions: [{ id: 1610, lengthTicks: 7 }, 1602],
    motion: [{ at: 18, vx: 18 }, { at: 27, vx: 2 }],
    hit: { damage: 10, hitstun: 40, push: 12, heavy: true },
  },
  rikujokoro: {
    actions: [521],
    hit: { damage: 1, hitstun: 150, push: 0 },
    onHitSpawn: { id: 'rods', target: 'opponent' },
  },
  // Invisivel: so solta os seis bastoes em volta do oponente.
  rods: {
    actions: [{ id: 521, lengthTicks: 6 }],
    harmless: true,
    spawns: RODS.map(([id, pos, [vx, vy]]) => fx(0, id, pos, { motion: [{ at: 0, vx, vy }, { at: 4, vx: 0, vy: 0 }] })),
  },
  ...Object.fromEntries(RODS.map(([id], index) => [id, {
    actions: [523 + index],
    size: 0.3,
    loop: true,
    lifetime: 140,
    harmless: true,
  }])),
  manta: { actions: [1710], size: 0.7, loop: true, lifetime: 120 },
  healRings: { actions: [1720], size: 0.3 },
  healOrb: { actions: [1750], size: 0.4 },
  bloodCurtain: {
    actions: [{ id: 3572, times: { 6: 200 } }],
    scale: 0.4,
    lifetime: 165,
    cover: [920, 520],
    layer: 'front',
  },
};

// Notacao relativa ao lado que ela encara.
const COMBOS = [
  { id: 'bankai', input: '↓↓P', animation: 'bankai' },
  { id: 'minazuki', input: '↓↓K', animation: 'minazuki' },
  { id: 'blades', input: '↓→P', animation: 'flyingBlades' },
  { id: 'danku', input: '↓←P', animation: 'danku' },
  { id: 'byakurai', input: '↓→K', animation: 'byakurai' },
  { id: 'tornado', input: '↓←K', animation: 'tornado' },
  { id: 'rain', input: '↓→S', animation: 'bladeRain' },
  { id: 'belt', input: '↓←S', animation: 'bindingBelt' },
  { id: 'phantom', input: 'P', hold: '↓', animation: 'phantomSlash' },
  { id: 'rikujokoro', input: 'K', hold: '↓', animation: 'rikujokoro' },
  { id: 'rising', input: 'S', hold: '↓', animation: 'risingSlash' },
];

const BUTTONS = {
  ground: { punch: 'punch', kick: 'kick', special: 'strong' },
  air: { punch: 'airLight', kick: 'airMedium', special: 'airStrong' },
};

const MOVE_LIST = [
  { section: 'Movimento', name: 'Shunpo', input: '→→', note: 'Atravessa o oponente; emenda num golpe' },
  { section: 'Movimento', name: 'Shunpo para trás', input: '←←' },
  { section: 'Movimento', name: 'Dash aéreo', input: '→→', note: 'No ar' },
  { section: 'Movimento', name: 'Pulo duplo', input: '↑↑', note: 'No ar, aperte para cima de novo' },
  { section: 'Golpes', name: 'Sequência de corte', input: 'PPKK', note: 'Ao conectar; o especial fecha com o corte forte' },
  { section: 'Golpes', name: 'No ar', input: 'PKS', note: 'O especial avança soltando garras de reiatsu' },
  { section: 'Golpes', name: 'Corte ascendente', input: 'S', hold: '↓', note: 'Investida com corte para cima' },
  { section: 'Especiais', name: 'Lâminas voadoras', input: '↓→P', note: 'Esperam atrás dela e disparam' },
  { section: 'Especiais', name: 'Bakudō #81: Danku', input: '↓←P', note: 'Parede que segura projéteis' },
  { section: 'Especiais', name: 'Hadō: relâmpago', input: '↓→K', note: 'Quatro acertos à frente' },
  { section: 'Especiais', name: 'Tornado de reiatsu', input: '↓←K', note: 'Em volta dela' },
  { section: 'Especiais', name: 'Chuva de lâminas', input: '↓→S', note: 'Caem sobre o oponente' },
  { section: 'Especiais', name: 'Bakudō: cinturão de luz', input: '↓←S', note: 'Prende o oponente' },
  { section: 'Especiais', name: 'Espadachim fantasma', input: 'P', hold: '↓', note: 'Surge à frente e corta avançando' },
  { section: 'Especiais', name: 'Bakudō #61: Rikujōkōrō', input: 'K', hold: '↓', note: 'Seis bastões de luz prendem o oponente' },
  { section: 'Super', name: 'Minazuki (cura)', input: '↓↓K', note: 'Recupera vida' },
  { section: 'Super', name: 'Bankai: Minazuki', input: '↓↓P', note: 'Se o corte pegar, a cortina de sangue e o golpe final' },
];

importMugenCharacter({
  root: ROOT,
  sffPath: resolve(PACK, 'Unohana.sff'),
  airPath: resolve(PACK, 'Unohana.air'),
  outDir: 'public/assets/characters/unohana',
  id: 'unohana',
  name: 'Unohana',
  description: 'A primeira Kenpachi',
  template: 'public/assets/characters/dummy/dummy_config.json',
  animations: ANIMATIONS,
  effects: EFFECTS,
  combos: COMBOS,
  buttons: BUTTONS,
  moveList: MOVE_LIST,
  spriteScale: 1.7,
  portrait: { sprite: [9000, 1], crop: [8, 6, 112, 120], width: 50, height: 55, background: '#15201A' },
});
