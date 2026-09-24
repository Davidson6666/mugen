// Importa a Yoruichi do pacote MUGEN "Yoruichi Shihoin (Bleach Mugen
// Project)" (Sixfortyfive + Alchemist; creditos em CREDITS.md).
//
// O pacote fica em assets-src/yoruichi/mugen/ (fora do git). SFF v1: as cores
// do personagem vem da paleta yoruichi1.act.
// Para regerar: npm run assets:yoruichi
//
// Tudo o que o pacote tem ligado (Bleach DS): golpes fraco/medio/forte em pe,
// agachada e no ar, que encadeiam do mais fraco para o mais forte e cancelam
// nos especiais; os quatro especiais (Anken, Kokubyouenbu, Oruka Mono,
// Owarija) nas tres forcas; o super Bakamonoga; o flash step (Shunpo), o dash
// aereo e o pulo duplo. Botoes: soco = fraco (x), chute = medio (a),
// especial = forte (b). Os tempos (ticks) e as caixas vem do .air/.cns.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importMugenCharacter } from './lib/mugen-import.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = resolve(ROOT, 'assets-src/yoruichi/mugen');

const fx = (at, id, pos = [0, 0], extra = {}) => ({ at, effect: { id, pos, ...extra } });

// Kunais do Anken (helpers 1007-1013): abrem em leque ao redor dela, param e
// disparam contra o oponente, uma de cada vez. [vx, vy, parada, disparo por
// forca (fraco, medio, forte)].
const KUNAI = {
  1007: [-2, 2, 20, [null, null, 120]],
  1008: [-2, 0, 30, [null, 100, 110]],
  1009: [-2, -2, 20, [80, 90, 100]],
  1010: [0, -2, 30, [70, 80, 90]],
  1011: [2, -2, 20, [60, 70, 80]],
  1012: [2, 0, 30, [null, 60, 70]],
  1013: [2, 2, 20, [null, null, 60]],
};
const kunaiFan = (strength) => Object.values(KUNAI)
  .filter(([, , , launch]) => launch[strength] !== null)
  .map(([vx, vy, stop, launch]) => fx(10, 'kunai', [0, -60], {
    motion: [{ at: 0, vx, vy }, { at: stop, vx: 0, vy: 0 }, { at: launch[strength], aim: 12 }],
    hitDelay: launch[strength],
    lifetime: launch[strength] + 50,
  }));

// Cancelamentos comuns: todo golpe normal cancela nos especiais ao conectar.
const NORMAL = { specialCancel: true };

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

  // Flash step (Shunpo, estados 20000/20001): some e reaparece adiante,
  // intocavel no caminho; da para emendar um golpe no fim.
  dashForward: {
    actions: [20000, { id: 20001, times: { 0: 16 } }],
    dash: { distance: 190, moveFrom: 3, moveUntil: 4, invulnerableFrom: 1, invulnerableUntil: 4, cancel: true },
    effect: { id: 'flashStep', spawnFrame: 0, pos: [0, -20] },
  },
  dashBackward: {
    actions: [20000, { id: 20005, times: { 0: 14 } }],
    dash: { distance: 150, moveFrom: 3, moveUntil: 4, invulnerableFrom: 1, invulnerableUntil: 4, cancel: true },
    effect: { id: 'flashStep', spawnFrame: 0, pos: [0, -20] },
  },
  // Dash aereo (estado 110): para no ar e dispara na horizontal.
  airDashForward: {
    actions: [{ id: 110, times: { 1: 15 } }],
    dash: { distance: 90, moveFrom: 1, moveUntil: 1, invulnerableFrom: 9, invulnerableUntil: 0 },
  },
  airDashBackward: {
    actions: [{ id: 110, times: { 1: 12 } }],
    dash: { distance: 70, moveFrom: 1, moveUntil: 1, invulnerableFrom: 9, invulnerableUntil: 0 },
  },

  // ---- Normais em pe (200 fraco, 210 medio, 220 forte) ----
  punch: {
    actions: [200],
    ...NORMAL,
    hit: { damage: 3, hitstun: 18, push: 5 },
    cancels: [
      { on: 'punch', to: 'punch', after: 6, down: false },
      { on: 'kick', to: 'kick', after: 5, down: false },
      { on: 'special', to: 'strong', after: 5, down: false },
      { on: 'punch', to: 'crouchLight', down: true },
      { on: 'kick', to: 'crouchMedium', down: true },
    ],
  },
  kick: {
    actions: [210],
    ...NORMAL,
    hit: { damage: 4, hitstun: 20, push: 5 },
    events: [{ frame: 2, vx: 3 }, { frame: 3, vx: 0 }],
    cancels: [{ on: 'special', to: 'strong', after: 3 }],
  },
  // Lancador: joga para cima (sem malabarismo no motor, vira empurrao forte).
  strong: {
    actions: [220],
    ...NORMAL,
    hit: { damage: 4, hitstun: 30, push: 8, heavy: true },
    cancels: [
      { on: 'punch', to: 'crouchLight', down: true },
      { on: 'kick', to: 'crouchMedium', down: true },
    ],
  },

  // ---- Agachada (400/410/420) ----
  crouchLight: {
    actions: [400],
    ...NORMAL,
    hit: { damage: 3, hitstun: 18, push: 3 },
    cancels: [
      { on: 'kick', to: 'crouchMedium', after: 6, down: true },
      { on: 'special', to: 'crouchStrong', after: 6, down: true },
      { on: 'kick', to: 'kick', down: false },
    ],
  },
  crouchMedium: {
    actions: [410],
    ...NORMAL,
    hit: { damage: 3, hitstun: 20, push: 3 },
    cancels: [{ on: 'special', to: 'crouchStrong', after: 13, down: true }],
  },
  // Rasteira que desliza.
  crouchStrong: {
    actions: [420],
    ...NORMAL,
    hit: { damage: 4, hitstun: 26, push: 6, heavy: true },
    events: [{ frame: 3, vx: 8 }],
  },

  // ---- No ar (600/610/620) ----
  airLight: { actions: [600], air: true, ...NORMAL, hit: { damage: 3, hitstun: 18, push: 6 } },
  airMedium: { actions: [610], air: true, ...NORMAL, hit: { damage: 4, hitstun: 20, push: 7 } },
  airStrong: { actions: [620], air: true, ...NORMAL, hit: { damage: 5, hitstun: 24, push: 10, heavy: true } },

  // ---- Anken (↓→ + botao): kunais em leque que disparam no oponente ----
  ankenLight: { actions: [1000], cooldown: 90, events: kunaiFan(0) },
  ankenMedium: { actions: [1001], cooldown: 110, events: kunaiFan(1) },
  ankenStrong: { actions: [1002], cooldown: 130, events: kunaiFan(2) },

  // ---- Kokubyouenbu (←↓→ + botao): investida; se pegar, a sequencia com o
  // clone (1025 + helper 1026); se errar, desliza (1028-1030) ----
  kokuLight: {
    actions: [{ id: 1020, times: { 1: 15 } }],
    cooldown: 90,
    friction: false,
    hit: { damage: 3, hitstun: 30, push: 0 },
    events: [{ frame: 2, vx: 11.5 }],
    onHit: { to: 'kokuFlurry' },
    next: 'kokuSlideLight',
  },
  kokuMedium: {
    actions: [{ id: 1021, times: { 1: 26 } }],
    cooldown: 100,
    friction: false,
    hit: { damage: 3, hitstun: 30, push: 0 },
    events: [{ frame: 2, vx: 11.5 }],
    onHit: { to: 'kokuFlurry' },
    next: 'kokuSlideMedium',
  },
  kokuStrong: {
    actions: [{ id: 1022, times: { 1: 36 } }],
    cooldown: 110,
    friction: false,
    hit: { damage: 3, hitstun: 30, push: 0 },
    events: [{ frame: 2, vx: 11.5 }],
    onHit: { to: 'kokuFlurry' },
    next: 'kokuSlideStrong',
  },
  kokuFlurry: {
    actions: [1025],
    friction: false,
    hits: [
      { damage: 2, hitstun: 26, push: 1 },
      { damage: 2, hitstun: 26, push: 1 },
      { damage: 3, hitstun: 30, push: 10, heavy: true },
    ],
    events: [{ at: 0, vx: 2.5 }, { frame: 10, vx: 0 }, fx(0, 'kokuClone', [-20, 0])],
  },
  kokuSlideLight: { actions: [1028], events: [{ at: 0, vx: 5 }] },
  kokuSlideMedium: { actions: [1029], events: [{ at: 0, vx: 5 }] },
  kokuSlideStrong: { actions: [1030], events: [{ at: 0, vx: 5 }] },

  // ---- Oruka Mono (↓↑ + botao): chutes subindo, 1, 3 ou 7 acertos ----
  orukaLight: {
    actions: [{ id: 1050, times: { 6: 20 } }],
    air: true,
    cooldown: 80,
    hit: { damage: 3, hitstun: 26, push: 6, heavy: true },
    events: [{ frame: 2, vx: 1.25, vy: -6 }],
  },
  orukaMedium: {
    actions: [{ id: 1051, times: { 13: 20 } }],
    air: true,
    cooldown: 90,
    hits: [
      { damage: 2, hitstun: 22, push: 1 },
      { damage: 2, hitstun: 22, push: 1 },
      { damage: 3, hitstun: 28, push: 7, heavy: true },
    ],
    events: [{ frame: 2, vx: 1, vy: -7 }],
  },
  orukaStrong: {
    actions: [{ id: 1052, times: { 25: 20 } }],
    air: true,
    float: true,
    cooldown: 100,
    hit: { damage: 1, hitstun: 22, push: 1 },
    events: [{ frame: 2, vx: 0.8, vy: -2.8 }, { frame: 12, vy: 0 }, { frame: 24, vy: 4 }],
  },

  // ---- Owarija (→↓→ + botao): agarra (1070) e arremessa (1071) ----
  owarija: {
    actions: [1070],
    cooldown: 90,
    hit: { damage: 1, hitstun: 60, push: 0, unblockable: true },
    onHit: { to: 'owarijaThrow' },
  },
  owarijaThrow: {
    actions: [1071],
    invulnerable: [0, 31],
    events: [
      { at: 0, pinOpponent: { dx: 45, lift: 0, ticks: 18, relative: 'self' } },
      fx(18, 'throwImpact', [45, -40]),
    ],
  },

  // ---- Super Bakamonoga (↓→↓→ + botao): investida e a rajada com o clone ----
  bakamonoga: {
    actions: [{ id: 3000, times: { 1: 45 } }],
    cooldown: 600,
    friction: false,
    hit: { damage: 3, hitstun: 40, push: 0 },
    events: [{ frame: 2, vx: 11.5 }],
    onHit: { to: 'bakaFlurry' },
    next: 'kokuSlideLight',
  },
  bakaFlurry: {
    actions: [3001],
    friction: false,
    invulnerable: [0, 129],
    hit: { damage: 1, hitstun: 24, push: 1 },
    events: [{ at: 0, vx: 2.5 }, { frame: 36, vx: 0 }, fx(0, 'bakaClone', [-20, 0])],
  },
};

const EFFECTS = {
  flashStep: { actions: [7009], harmless: true },
  kunai: {
    actions: [1010],
    loop: true,
    lifetime: 150,
    hit: { damage: 2, hitstun: 20, push: 3 },
    destroyOnHit: true,
    endOnOwnerHit: true,
  },
  // Clones: em branco ate a hora de atacar (helper 1026/3002: anim 96443 por
  // 20 ticks, depois a mesma sequencia dela).
  kokuClone: {
    actions: [{ id: 96443, times: { 0: 20 } }, 1025],
    velocityX: 2.5,
    hit: { damage: 1, hitstun: 26, push: 1 },
    endOnOwnerHit: true,
  },
  bakaClone: {
    actions: [{ id: 96443, times: { 0: 20 } }, 3001],
    velocityX: 2.5,
    hit: { damage: 1, hitstun: 24, push: 1 },
    endOnOwnerHit: true,
  },
  throwImpact: {
    actions: [{ id: 96443, times: { 0: 4 } }],
    area: { rect: [-20, -40, 20, 40], from: 0, until: 0, damage: 4, hitstun: 50, push: 8, heavy: true, unblockable: true },
  },
};

// Notacao relativa ao lado que ela encara. Forca pelo botao: soco = fraco,
// chute = medio, especial = forte.
const special = (id, input, names) => [
  { id: `${id}-p`, input: `${input}P`, animation: names[0] },
  { id: `${id}-k`, input: `${input}K`, animation: names[1] },
  { id: `${id}-s`, input: `${input}S`, animation: names[2] },
];
const COMBOS = [
  ...special('baka', '↓→↓→', ['bakamonoga', 'bakamonoga', 'bakamonoga']),
  ...special('koku', '←↓→', ['kokuLight', 'kokuMedium', 'kokuStrong']),
  ...special('owarija', '→↓→', ['owarija', 'owarija', 'owarija']),
  ...special('anken', '↓→', ['ankenLight', 'ankenMedium', 'ankenStrong']),
  ...special('oruka', '↓↑', ['orukaLight', 'orukaMedium', 'orukaStrong']),
  { id: 'crouch-p', input: 'P', hold: '↓', animation: 'crouchLight' },
  { id: 'crouch-k', input: 'K', hold: '↓', animation: 'crouchMedium' },
  { id: 'crouch-s', input: 'S', hold: '↓', animation: 'crouchStrong' },
];

const BUTTONS = {
  ground: { punch: 'punch', kick: 'kick', special: 'strong' },
  air: { punch: 'airLight', kick: 'airMedium', special: 'airStrong' },
};

const MOVE_LIST = [
  { section: 'Movimento', name: 'Flash step (Shunpo)', input: '→→', note: 'Some e reaparece adiante; emenda num golpe' },
  { section: 'Movimento', name: 'Flash step para trás', input: '←←' },
  { section: 'Movimento', name: 'Dash aéreo', input: '→→', note: 'No ar' },
  { section: 'Movimento', name: 'Pulo duplo', input: '↑↑', note: 'No ar, aperte para cima de novo' },
  { section: 'Golpes', name: 'Fraco / médio / forte', input: 'PKS', note: 'Encadeia do mais fraco para o mais forte' },
  { section: 'Golpes', name: 'Agachada (fraco, médio, rasteira)', input: 'P', hold: '↓', note: 'Também com chute e especial' },
  { section: 'Golpes', name: 'No ar (fraco, médio, forte)', input: 'PKS', note: 'No ar' },
  { section: 'Especiais', name: 'Anken', input: '↓→P', note: 'Kunais que disparam no oponente (3, 5 ou 7 com P/K/S)' },
  { section: 'Especiais', name: 'Kokubyouenbu', input: '←↓→P', note: 'Investida; se pegar, rajada com o clone' },
  { section: 'Especiais', name: 'Oruka Mono', input: '↓↑P', note: 'Chutes subindo (1, 3 ou 7 com P/K/S)' },
  { section: 'Especiais', name: 'Owarija', input: '→↓→P', note: 'Agarra e arremessa (não dá para defender)' },
  { section: 'Super', name: 'Bakamonoga', input: '↓→↓→P', note: 'Investida e a rajada de 12 golpes com o clone' },
];

importMugenCharacter({
  root: ROOT,
  sffPath: resolve(PACK, 'yoruichi.sff'),
  sffOptions: { actPath: resolve(PACK, 'yoruichi1.act') },
  airPath: resolve(PACK, 'yoruichi.air'),
  outDir: 'public/assets/characters/yoruichi',
  id: 'yoruichi',
  name: 'Yoruichi',
  description: 'A deusa do Shunpo',
  template: 'public/assets/characters/dummy/dummy_config.json',
  animations: ANIMATIONS,
  effects: EFFECTS,
  combos: COMBOS,
  buttons: BUTTONS,
  moveList: MOVE_LIST,
  portrait: { sprite: [9000, 1], crop: [10, 4, 92, 101], width: 50, height: 55, background: '#1B1622' },
});
