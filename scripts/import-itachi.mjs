// Importa o Itachi do pacote MUGEN "Uchiha Itachi" (CobraG6, sprites de
// spectrososuke, om Hy e sumairu14; creditos em CREDITS.md).
//
// O pacote fica em assets-src/itachi/mugen/ (fora do git: o .sff tem 59 MB).
// Para regerar: npm run assets:itachi
//
// Todo o "Normal Mode" do pacote: as tres sequencias de chao (A/B/C = soco,
// chute, especial), a sequencia aerea, os oito jutsus de meia-lua, o dash de
// corvos, o corvo do Shisui com o Kotoamatsukami e os tres supers (↓ + botao).
// Os numeros de acao e os tempos (ticks) vem do .cns do pacote: estado 200 =
// acao 200, "time = 34" = at: 34. Dano ajustado para a vida de 100 do jogo
// (o MUGEN usa 1000), mantendo a proporcao entre os golpes.
//
// Ficaram de fora o "Armor Break Mode" e o "Susanoo Mode" (modos com outro
// conjunto de golpes, liberados por barra de energia, que o jogo nao tem) e a
// carga de chakra, que so existe para encher essa barra.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportFightFx, importMugenCharacter } from './lib/mugen-import.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = resolve(ROOT, 'assets-src/itachi/mugen');

// Pedido de efeito num tick do golpe (ou do efeito pai). pos no estilo do
// .cns: x para frente, y negativo para cima.
const fx = (at, id, pos = [0, 0], extra = {}) => ({ at, effect: { id, pos, ...extra } });
const fxAt = (action, at, id, pos, extra) => ({ action, ...fx(at, id, pos, extra) });
// O mesmo pedido a cada "every" ticks, de at ate until (timemod do .cns).
const every = (at, until, step, id, pos, extra) => ({ ...fx(at, id, pos, extra), repeat: { every: step, until } });
// Corvos se espalhando nas quatro diagonais (as quatro Explod 1610 do .cns).
const scatter = (at, pos = [0, -35]) => [
  fx(at, 'crowScatter', pos, { velocityX: -1.6, velocityY: -1.4, flip: true }),
  fx(at, 'crowScatter', pos, { velocityX: -1.6, velocityY: 1.2, flip: true }),
  fx(at, 'crowScatter', pos, { velocityX: 1.6, velocityY: -1.4 }),
  fx(at, 'crowScatter', pos, { velocityX: 1.6, velocityY: 1.2 }),
];
// Brilho de chakra que abre todo jutsu (Explod 7400, preso ao corpo).
const flash = (pos = [1, -40]) => fx(0, 'chakraFlash', pos, { follow: 'owner' });
// Olho do Sharingan em primeiro plano: abre (3030 + 3033) e fecha (3031,
// 3032, 3035), como nos genjutsus do pacote.
const eyeOpen = (at, pos = [0, -35], action) => [
  { ...fx(at, 'eyeOpen', pos, { follow: 'owner' }), ...(action ? { action } : {}) },
  { ...fx(at, 'eyeStill', pos), ...(action ? { action } : {}) },
];
const eyeClose = (at, pos = [0, -35], action) => [
  { ...fx(at, 'eyeClose', pos, { follow: 'owner' }), ...(action ? { action } : {}) },
  { ...fx(at, 'eyeShut', [pos[0], pos[1] + 30]), ...(action ? { action } : {}) },
  { ...fx(at, 'eyeFade', pos), ...(action ? { action } : {}) },
];

// Hitstun por peso do golpe (ticks): leve, medio e o que fecha a sequencia.
const LIGHT = 18;
const MEDIUM = 22;
const HARD = 28;

const ANIMATIONS = {
  idle: { actions: [0], loop: true },
  walkForward: { actions: [20], loop: true },
  walkBackward: { actions: [21], loop: true },
  // Subindo e caindo numa animacao so: o motor ainda nao separa as fases.
  jump: { actions: [41, 44] },
  crouch: { actions: [11], loop: true },
  blockStanding: { actions: [130], loop: true },
  blockCrouching: { actions: [131], loop: true },
  hitReaction: { actions: [5000] },
  // Cai, bate no chao e fica deitado.
  ko: { actions: [5030, 5050, 5100, 5110] },
  // So a parte da pose: o resto da acao 180 e a transformacao em corvos.
  victoryPose: { actions: [180], pick: [0, 1, 2, 3, 4] },
  defeatPose: { actions: [170] },

  // Dash por toque duplo: o teleporte do Itachi (some deixando um rastro de
  // fumaca e reaparece). Anda e fica invulneravel so enquanto some.
  dashForward: {
    actions: [60, 61, 62],
    dash: { distance: 160, moveFrom: 2, moveUntil: 5, invulnerableFrom: 2, invulnerableUntil: 6 },
    effect: { id: 'dashTrail', spawnFrame: 2 },
  },
  dashBackward: {
    actions: [70, 71, 72],
    dash: { distance: 110, moveFrom: 2, moveUntil: 4, invulnerableFrom: 2, invulnerableUntil: 5 },
    effect: { id: 'backdashTrail', spawnFrame: 2 },
  },

  // ---- Sequencia A (soco): estados 200 -> 210 -> 220 -> 230/240 -> 250 ----
  // Cada golpe encadeia no seguinte apertando o botao depois de conectar.
  punch: {
    actions: [200],
    hit: { damage: 4, hitstun: 22, push: 5 },
    events: [{ at: 8, vx: 2 }],
    cancels: [
      { on: 'punch', to: 'punch2', after: 13 },
      { on: 'kick', to: 'kick2', after: 14, need: 'hit' },
    ],
  },
  punch2: {
    actions: [210],
    hit: { damage: 4, hitstun: 26, push: 5 },
    events: [{ at: 7, vx: 1 }, fx(7, 'slashArc', [10, 0])],
    cancels: [{ on: 'punch', to: 'punch3' }],
    next: 'punch2End',
  },
  punch2End: { actions: [215], events: [{ atEnd: true, dx: 20 }] },
  punch3: {
    actions: [220],
    hit: { damage: 4, hitstun: 38, push: 6 },
    events: [fx(11, 'groundSlash', [25, 8])],
    // Como no .cns: longe da parede, o clone surge por tras e o Itachi
    // avanca (230); encostado nela, o corte com investida (240).
    cancels: [
      { on: 'punch', to: 'punch4Far', need: 'hit', frontEdge: { min: 101 } },
      { on: 'punch', to: 'punch4', need: 'hit' },
    ],
    next: 'punch3End',
  },
  punch3End: { actions: [225], events: [{ atEnd: true, dx: 20 }] },
  punch4Far: {
    actions: [230],
    hit: { damage: 6, hitstun: HARD, push: 12, heavy: true },
    events: [
      fx(0, 'cloneStrike', [0, 0], { target: 'opponent', flip: true }),
      { at: 39, vx: 23 },
      fx(43, 'speedLine', [0, -45]),
      fx(53, 'dustBurst', [37, 3]),
      { atEnd: true, dx: 15 },
    ],
  },
  punch4: {
    actions: [240],
    hit: { damage: 6, hitstun: 40, push: 6, heavy: true },
    events: [{ at: 36, vx: 4.5 }, fx(35, 'lowSlash', [-10, 7]), fx(36, 'crescent', [45, -47]), { atEnd: true, dx: 10 }],
    cancels: [{ on: 'punch', to: 'punch5', need: 'hit' }],
  },
  punch5: {
    actions: [250],
    hit: { damage: 8, hitstun: HARD, push: 12, heavy: true },
    events: [fx(16, 'swirl', [0, 3], { flip: true }), { at: 30, vx: 3 }, fx(31, 'bigSlash', [10, -40])],
  },

  // ---- Sequencia B (chute): 300 -> 310 -> 320 -> 330 -> 340 ----
  kick: {
    actions: [300],
    hit: { damage: 4, hitstun: 24, push: 5 },
    events: [fx(3, 'kickArc', [12, -35]), { at: 9, vx: 2 }],
    cancels: [
      { on: 'kick', to: 'kick2' },
      { on: 'punch', to: 'punch2' },
      { on: 'special', to: 'slash2' },
    ],
  },
  kick2: {
    actions: [310],
    hit: { damage: 4, hitstun: 30, push: 5 },
    events: [fx(6, 'swirl', [0, 3], { flip: true }), { at: 15, vx: 2 }],
    cancels: [
      { on: 'kick', to: 'kick3', need: 'hit' },
      { on: 'punch', to: 'punch3', need: 'hit' },
    ],
    next: 'kick2End',
  },
  kick2End: { actions: [311] },
  // Chute saltado: o .cns troca a velocidade a cada quadro (animelem), sem
  // gravidade, e desce no fim.
  kick3: {
    actions: [{ id: 320, lengthTicks: 50 }],
    float: true,
    hits: [
      { damage: 3, hitstun: MEDIUM, push: 6 },
      { damage: 3, hitstun: 70, push: 3, heavy: true },
    ],
    events: [
      fx(15, 'dustBurst', [5, 8], { flip: true }),
      { frame: 6, vx: 4, vy: -4 },
      { frame: 7, vx: 2, vy: -2 },
      { frame: 10, vx: 2, vy: -1 },
      { frame: 11, vx: 3, vy: -1 },
      { frame: 13, vy: -1 },
      { frame: 14, vx: 2, vy: -1 },
      { frame: 16, vx: 2, vy: 4 },
    ],
    next: 'kick4',
  },
  // Pousa, e um clone salta para o alto e atira tres corvos para baixo.
  kick4: {
    actions: [330],
    events: [{ at: 0, land: true, dx: 45, vx: 0 }, fx(0, 'cloneLeap', [-30, -15])],
    cancels: [{ on: 'kick', to: 'kick5', after: 10, need: 'none' }],
  },
  // Redemoinho de corvos: acerta a cada 20 ticks, cinco vezes.
  kick5: {
    actions: [{ id: 340, lengthTicks: 126 }],
    events: [fx(26, 'wind', [15, 0]), fx(26, 'crowTornado', [25, -40]), every(26, 120, 8, 'ember', [130, -25], { spread: [70, 25] })],
    next: 'kick5End',
  },
  kick5End: { actions: [350] },

  // ---- Sequencia C (botao especial): 400 -> 410 -> 420 -> 430 -> 440 ----
  slash1: {
    actions: [400],
    hit: { damage: 4, hitstun: 24, push: 5 },
    events: [fx(6, 'bigSlash', [5, -43]), { at: 6, vx: 1.5 }],
    cancels: [
      { on: 'special', to: 'slash2' },
      { on: 'punch', to: 'punch2' },
      { on: 'kick', to: 'kick2' },
    ],
    next: 'slash1End',
  },
  slash1End: { actions: [401] },
  slash2: {
    actions: [410],
    hit: { damage: 4, hitstun: 30, push: 7, heavy: true },
    events: [{ at: 12, vx: 3 }, fx(12, 'groundSlash', [25, 8], { flip: true }), { atEnd: true, dx: 10 }],
    cancels: [{ on: 'special', to: 'slash3' }],
  },
  // Investida com o corte: segura o oponente para o genjutsu seguinte.
  slash3: {
    actions: [420],
    hit: { damage: 5, hitstun: 34, push: 0 },
    events: [
      { at: 21, vx: -0.5 },
      fx(21, 'dashSlash', [10, 5]),
      fx(21, 'rushTrail', [18, 0], { follow: 'owner' }),
      { at: 28, vx: 10 },
      { atEnd: true, dx: 20 },
    ],
    cancels: [{ on: 'special', to: 'slash4', need: 'hit' }],
  },
  // Olhar do Sharingan: prende o oponente parado.
  slash4: {
    actions: [430],
    hit: { damage: 4, hitstun: 80, push: 0 },
    events: [...eyeOpen(25, [30, -35]), ...eyeClose(45, [30, -35])],
    cancels: [
      { on: 'special', to: 'slash5', after: 67, need: 'hit' },
      { on: 'kick', to: 'kick5', after: 67, need: 'hit' },
    ],
    next: 'slash4End',
  },
  slash4End: { actions: [431], events: [{ atEnd: true, dx: 10 }] },
  slash5: {
    actions: [440],
    hit: { damage: 3, hitstun: MEDIUM, push: 12, heavy: true },
    events: [{ at: 0, dx: 23 }],
  },

  // ---- Sequencia aerea (soco no ar): 600 -> 610 -> 620 -> 630 -> 640 ----
  airPunch: {
    actions: [600],
    air: true,
    hit: { damage: 4, hitstun: LIGHT, push: 2 },
    events: [{ at: 0, vy: -3 }, fx(7, 'crescent', [15, -40]), { at: 10, vx: 2 }],
    cancels: [{ on: 'punch', to: 'airPunch2' }],
  },
  airPunch2: {
    actions: [610],
    air: true,
    hit: { damage: 4, hitstun: MEDIUM, push: 1 },
    events: [{ at: 0, vy: -3 }, { at: 12, vx: 1 }, { at: 15, vx: 2, vy: -1 }],
    cancels: [{ on: 'punch', to: 'airPunch3' }],
  },
  airPunch3: {
    actions: [620],
    air: true,
    hit: { damage: 4, hitstun: MEDIUM, push: 2 },
    events: [{ at: 0, vy: -2 }, { at: 3, vy: -0.4, repeat: { every: 3, until: 12 } }, fx(11, 'crescent', [33, -33]), { at: 14, vx: 3 }],
    cancels: [{ on: 'punch', to: 'airPunch4', need: 'hit' }],
  },
  airPunch4: {
    actions: [630],
    air: true,
    hit: { damage: 4, hitstun: HARD, push: 4, heavy: true },
    events: [{ at: 0, vy: -1 }, { at: 4, vx: 3, vy: -0.6, repeat: { every: 4, until: 16 } }, { at: 20, vx: 5, vy: -1 }],
    cancels: [{ on: 'punch', to: 'airPunch5', need: 'hit' }],
  },
  // Fecha com uma bola de fogo para baixo e o recuo para tras.
  airPunch5: {
    actions: [{ id: 640, lengthTicks: 43 }],
    air: true,
    float: true,
    events: [
      { at: 0, vy: -1 },
      { at: 8, vx: 0, vy: 0 },
      { at: 18, vx: -4, vy: -5 },
      fx(18, 'airKatonBall', [25, -5]),
      fx(18, 'fireBurst', [15, -8]),
      { at: 24, vx: -2, vy: -1 },
    ],
  },
  // Chute no ar: para, recua e atira tres corvos em diagonal.
  airKick: {
    actions: [650],
    air: true,
    float: true,
    events: [
      { at: 0, vx: 0, vy: 0 },
      { at: 13, vx: -3, vy: -1 },
      fx(13, 'thrownCrow', [18, -38], { velocityX: 7, damage: 3 }),
      fx(13, 'thrownCrow', [20, -40], { velocityX: 8, damage: 3 }),
      fx(13, 'thrownCrow', [22, -42], { velocityX: 9, damage: 3 }),
    ],
  },

  // ---- Jutsus (meia-lua + botao) ----
  // ↓↘→ + soco: chuva de shuriken (estado 1000: uma a cada 3 ticks).
  shuriken: {
    actions: [{ id: 1000, lengthTicks: 174 }, 1001],
    cooldown: 120,
    events: [flash([1, -40]), every(45, 171, 5, 'shuriken', [8, -36], { spread: [8, 6] })],
  },
  // No ar: dez shuriken de fogo em leque para baixo (1080-1082).
  housenka: {
    actions: [1080, 1081, 1082],
    air: true,
    float: true,
    cooldown: 120,
    events: [
      { action: 1080, at: 0, vx: 0, vy: 0 },
      { action: 1080, ...flash([3, -36]) },
      { action: 1081, at: 0, vx: 0, vy: 0 },
      { action: 1081, at: 12, vx: -2, vy: -2 },
      fxAt(1081, 12, 'fireBreath', [20, -43], { velocityX: 0.4, velocityY: 0.4 }),
      { action: 1081, at: 16, vx: 0, vy: 0 },
      { action: 1082, at: 0, vx: 0, vy: 0 },
      { action: 1082, at: 13, vx: -2, vy: -3 },
      ...[[0, 15], [20, 5], [35, -15], [45, -35], [55, -60], [-15, -10], [5, -20], [18, -32], [25, -50], [35, -70]]
        .map((pos) => fxAt(1082, 13, 'fireShuriken', pos)),
    ],
  },
  // ↓↙← + soco: Katon Goukakyuu, a bola de fogo que explode no oponente ou
  // na parede.
  katon: {
    actions: [{ id: 1100, lengthTicks: 78 }, 1110],
    cooldown: 150,
    events: [
      flash([2, -40]),
      fx(34, 'fireCloud', [35, -35]),
      fx(34, 'fireBurst', [55, -30]),
      fx(34, 'groundFire', [55, 0]),
      fx(34, 'katonBall', [55, -30]),
      fx(39, 'fireRing', [85, -30]),
    ],
  },
  // No ar: a bola de fogo desce em diagonal e explode no chao.
  airKaton: {
    actions: [{ id: 1180, lengthTicks: 64 }],
    air: true,
    float: true,
    cooldown: 150,
    events: [
      { at: 0, vx: 0, vy: 0 },
      flash([3, -35]),
      { at: 39, vx: -4, vy: -5 },
      fx(39, 'airKatonBall', [25, -5]),
      fx(39, 'fireBurst', [15, -8]),
      { at: 45, vx: -2, vy: -1 },
    ],
  },
  // ↓↘→ + chute: Genjutsu dos corvos. Se doze corvos acertarem, os corvos
  // cercam o oponente e o Itachi aparece com o corte final (1202-1204).
  crowGenjutsu: {
    actions: [{ id: 1200, lengthTicks: 191 }, 1201],
    cooldown: 180,
    events: [flash([0, -40]), every(46, 150, 5, 'genjutsuCrow', [-15, -30], { spread: [3, 10] })],
    onHit: { to: 'crowFinisher', minHits: 12 },
  },
  crowFinisher: {
    actions: [{ id: 1202, times: { 10: 110 } }, 1203, 1204],
    hits: [{ damage: 8, hitstun: 40, push: 4, heavy: true }],
    events: [
      fxAt(1202, 0, 'crowBind', [0, -45], { target: 'opponent' }),
      fxAt(1202, 5, 'crowBurst', [0, -40]),
      ...[[10, [-90, -80]], [20, [-110, -110]], [30, [120, -130]], [40, [-100, -50]], [50, [85, -85]], [10, [125, -35]]]
        .map(([at, pos]) => fxAt(1202, at, 'circlingCrow', pos, { target: 'opponent', flip: pos[0] > 0 })),
      fxAt(1202, 23, 'sharinganGlint', [0, 0]),
      { action: 1203, at: 0, teleport: 80, vx: 2.5 },
      { action: 1204, at: 0, teleport: 100, vx: 0 },
      fxAt(1204, 4, 'longSlash', [-100, -35]),
    ],
    invulnerable: [0, 400],
  },
  // ↓↙← + chute: Genjutsu do Sharingan. O olhar prende e, se pegar, quatro
  // cortes de ilusao aparecem no oponente (1300 -> 1304 -> 1309).
  sharingan: {
    actions: [1300],
    cooldown: 150,
    hit: { damage: 1, hitstun: 100, push: 8 },
    events: [flash([1, -40]), ...eyeOpen(33, [0, -35]), ...eyeClose(53, [0, -35])],
    onHit: { to: 'sharinganIllusion', after: 53 },
  },
  sharinganIllusion: {
    actions: [{ id: 1304, lengthTicks: 131 }, 1309],
    invulnerable: [0, 170],
    events: [
      fxAt(1304, 0, 'genjutsuVeil', [0, -35], { follow: 'owner' }),
      fxAt(1304, 27, 'illusionAura', [0, 0]),
      fxAt(1304, 49, 'illusionStab1', [7, -50], { target: 'opponent', flip: true }),
      fxAt(1304, 69, 'illusionStab2', [-10, -35], { target: 'opponent', flip: true }),
      fxAt(1304, 89, 'illusionStab3', [7, -25], { target: 'opponent', flip: true }),
      fxAt(1304, 109, 'illusionStab4', [-7, -57], { target: 'opponent', flip: true }),
      fxAt(1309, 0, 'illusionFade', [0, 0]),
    ],
  },
  // ↓↘→ + especial: Amaterasu. As chamas negras nascem em cima do oponente e,
  // se pegarem, continuam queimando (1400 -> 1401, helper 1450 -> 1460).
  amaterasu: {
    actions: [1400, 1401],
    cooldown: 180,
    events: [
      flash([2, -40]),
      ...eyeOpen(70, [0, -35], 1400).slice(0, 2),
      fxAt(1400, 90, 'amaterasuIgnite', [0, -30], { target: 'opponent', follow: 'target', flip: true }),
      ...eyeClose(0, [0, -35], 1401),
      fxAt(1401, 15, 'amaterasuFlame', [0, -20], { target: 'opponent' }),
    ],
  },
  // ↓↙← + especial: Genjutsu do dedo. Se pegar, por vinte segundos metade dos
  // golpes recebidos viram corvos e deixam um clone explosivo.
  finger: {
    actions: [1500],
    cooldown: 240,
    hit: { damage: 1, hitstun: 40, push: 2 },
    onHitBuff: { kind: 'crowEvade', ticks: 1200 },
    events: [flash([2, -40]), fx(59, 'fingerRing', [26, -35], { flip: true })],
  },
  // A esquiva do Genjutsu do dedo (1510 -> 1520): vira corvos, reaparece
  // em outro ponto e deixa o clone junto de quem atacou.
  crowEvade: {
    actions: [1510, 1520],
    invulnerable: [0, 60],
    events: [
      fxAt(1510, 11, 'crowBurst', [0, -40]),
      ...scatter(12).map((event) => ({ ...event, action: 1510 })),
      { action: 1520, at: 0, randomX: 250 },
      fxAt(1520, 5, 'crowBurst', [0, -40]),
      fxAt(1520, 20, 'explosiveClone', [0, 0], { target: 'opponent', spread: [40, 0] }),
    ],
  },
  // ↓↓ + soco: dash de corvos (1600). Avanca virando corvos, acertando a cada
  // 10 ticks.
  crowDash: {
    actions: [1600],
    cooldown: 120,
    friction: false,
    noPush: true,
    invulnerable: [41, 112],
    hit: { every: 10, count: 7, damage: 1, hitstun: 16, push: 5 },
    events: [
      flash([0, -40]),
      fx(41, 'crowBurst', [0, -40]),
      ...Array.from({ length: 9 }, () => fx(43, 'dashCrow', [0, -37], { spread: [25, 18] })),
      { at: 54, vx: 4 },
      every(54, 108, 6, 'feather', [0, -40], { spread: [25, 27], velocitySpread: [2, 1] }),
      { at: 113, vx: 0 },
    ],
  },
  // ↓↓ + chute: invoca o corvo do Shisui, que fica voando ate ser usado.
  shisuiCrow: {
    actions: [1800],
    cooldown: 300,
    events: [flash([2, -40]), fx(48, 'shisuiCrowFamiliar', [25, -45])],
  },
  // ↓↓ + especial (com o corvo em campo): Kotoamatsukami. O corvo lanca o
  // selo no oponente: sem defesa ou sem pulo por dez segundos.
  kotoamatsukami: {
    actions: [{ id: 1900, lengthTicks: 137 }],
    requires: 'shisuiCrow',
    cooldown: 300,
    events: [
      flash([0, -40]),
      { at: 0, consume: 'shisuiCrow' },
      fx(0, 'shisuiCrowCast', [45, -80]),
      fx(30, 'kotoAura', [0, 0], { follow: 'owner' }),
    ],
  },

  // ---- Supers (↓ + botao) ----
  // ↓ + soco: chute, clones e o Mangekyou (3000 -> 3009).
  mangekyou: {
    actions: [3000, 3001, 3002],
    cooldown: 900,
    invulnerable: [0, 41],
    hit: { damage: 5, hitstun: 80, push: 6, heavy: true },
    events: [
      flash([1, -40]),
      fxAt(3000, 32, 'afterimage', [0, 0]),
      fxAt(3000, 32, 'wind', [-5, 0], { follow: 'owner' }),
      { action: 3001, at: 4, teleport: 50 },
      fxAt(3001, 4, 'dustBurst', [5, 3]),
      { action: 3002, at: 8, vx: 3 },
    ],
    onHit: { to: 'mangekyouClones' },
  },
  mangekyouClones: {
    actions: [{ id: 3003, lengthTicks: 140 }],
    invulnerable: [0, 140],
    events: [
      fx(36, 'kickClone', [-35, 0], { target: 'opponent' }),
      fx(100, 'backClone', [28, 0], { target: 'opponent' }),
    ],
    onHit: { to: 'mangekyouFinish', minHits: 4 },
  },
  mangekyouFinish: {
    actions: [3007, 3008, 3009],
    invulnerable: [0, 260],
    hit: { damage: 12, hitstun: 90, push: 3, heavy: true },
    events: [
      fxAt(3007, 11, 'crowBurst', [0, -25]),
      ...scatter(12, [0, -25]).map((event) => ({ ...event, action: 3007 })),
      { action: 3008, at: 0, teleport: 42 },
      fxAt(3008, 0, 'wind', [-5, 0], { follow: 'owner' }),
      ...eyeOpen(53, [0, -35], 3008),
      ...eyeClose(73, [0, -35], 3008),
      fxAt(3008, 73, 'genjutsuScreen', [0, 0], { follow: 'owner' }),
      fxAt(3008, 120, 'bloodSlash', [37, -60]),
      fxAt(3008, 166, 'redFlash', [0, -100], { target: 'stage' }),
      fxAt(3008, 184, 'blackFlash', [0, -100], { target: 'stage' }),
    ],
  },
  // ↓ + chute: Tsukuyomi. Se o olhar pegar, o mundo vira o do genjutsu
  // (encurtado: no pacote a ilusao dura 13 segundos).
  tsukuyomi: {
    actions: [3100],
    cooldown: 900,
    hit: { damage: 1, hitstun: 400, push: 0 },
    events: [flash([2, -45]), fx(40, 'eyeSpin', [0, 0])],
    onHit: { to: 'tsukuyomiWorld' },
  },
  tsukuyomiWorld: {
    actions: [{ id: 3101, times: { 0: 60, 1: 250 } }],
    invulnerable: [0, 360],
    events: [
      ...eyeOpen(35, [0, -35]).slice(0, 1),
      fx(35, 'eyeFade', [0, -35]),
      fx(50, 'eyeSpiral', [0, -35]),
      // Como no .cns (3196: PosSet x = 0, y = -40): o oponente fica preso no
      // centro da arena, suspenso, e o Itachi a sua frente.
      { at: 60, standAt: -110, pinOpponent: { dx: 0, lift: 40, ticks: 250 } },
      // O ceu cobre a area visivel inteira (a camera mostra ~850x480 px).
      fx(60, 'worldSky', [0, -180], { target: 'stage' }),
      fx(60, 'worldMoon', [0, -220], { target: 'stage' }),
      fx(60, 'worldHalo', [0, -220], { target: 'stage' }),
      fx(60, 'worldCloudA', [-100, -200], { target: 'stage' }),
      fx(60, 'worldCloudB', [80, -240], { target: 'stage' }),
      fx(60, 'worldCloudC', [-220, -250], { target: 'stage' }),
      fx(60, 'worldCloudD', [250, -180], { target: 'stage' }),
      fx(60, 'tsukuyomiStabs', [0, -10], { target: 'stage' }),
      fx(255, 'worldShatter', [150, -95], { target: 'stage' }),
      fx(305, 'worldBreak', [0, 0], { target: 'stage' }),
      fx(310, 'tsukuyomiEnd', [0, -40], { target: 'opponent' }),
    ],
  },
  // ↓ + especial: Susanoo com a espada de Totsuka. O primeiro golpe do
  // gigante, se pegar, emenda na espada (3200 -> 3250 -> 3251).
  susanoo: {
    actions: [{ id: 0, lengthTicks: 75 }],
    cooldown: 900,
    events: [flash([1, -40]), fx(30, 'susanooSwing', [0, 0])],
    onHit: { to: 'susanooHold' },
  },
  susanooHold: { actions: [{ id: 0, lengthTicks: 125 }] },
};

// Enfeite: so desenho, sem acerto.
const look = (actions, extra = {}) => ({ actions: Array.isArray(actions) ? actions : [actions], harmless: true, ...extra });
// Um quadro sim, um nao, com o dobro da duracao: brilho e fumaca de muitos
// quadros grandes ficam iguais na tela e ocupam metade do atlas.
const half = (frames) => ({ pick: Array.from({ length: Math.ceil(frames / 2) }, (_, k) => k * 2), durationScale: 2 });

const EFFECTS = {
  // Rastros do dash (teleporte).
  dashTrail: look(63, { layer: 'back' }),
  backdashTrail: look(73, { layer: 'back' }),

  // Enfeites dos golpes.
  chakraFlash: look(7400, { scale: 0.35, ...half(27) }),
  slashArc: look(211, { scale: 0.5 }),
  groundSlash: look(221, { scale: 0.5 }),
  speedLine: look(231, { scale: 0.5 }),
  dustBurst: look(12125, { scale: 0.5 }),
  crescent: look(236, { scale: 0.5 }),
  lowSlash: look(226, { scale: 0.5 }),
  swirl: look(252, { scale: 0.5 }),
  bigSlash: look(251, { scale: 0.5 }),
  kickArc: look(301, { scale: 0.5 }),
  dashSlash: look(422, { scale: 0.5 }),
  rushTrail: look(421, { scale: 0.5 }),
  wind: look(12122, { scale: 0.5 }),
  afterimage: look(61),
  fireBurst: look(1120, { scale: 0.5 }),
  fireCloud: look(1153, { scale: 0.5 }),
  groundFire: look(1123, { scale: 0.5 }),
  fireRing: look(1119, { scale: 0.5 }),
  fireBreath: look(1083),
  ember: look(1125),
  crowBurst: look(1216),
  crowScatter: look(1610, { lifetime: 48 }),
  feather: look(1602, { lifetime: 30, loop: true }),
  sharinganGlint: look(1206),
  longSlash: look(1245, { scale: 0.5 }),
  fingerRing: look(1501, { scale: 0.5 }),
  kotoAura: look(1856),

  // Sharingan em primeiro plano.
  eyeOpen: look(3030, { scale: 0.5 }),
  eyeStill: look(3033),
  eyeClose: look(3031, { scale: 0.5 }),
  eyeShut: look(3032, { scale: 0.5 }),
  eyeFade: look(3035),
  eyeSpin: look(3111, { scale: 0.5 }),

  // Sequencia A: o clone que surge no oponente e ataca por tras (helper 235).
  cloneStrike: {
    actions: [235],
    hit: { damage: 5, hitstun: HARD, push: 3 },
    motion: [{ at: 0, vx: 6 }, { at: 12, vx: 0 }],
    spawns: [fx(13, 'dustBurst', [5, 3]), fx(24, 'crescent', [-28, -48], { flip: true }), fx(84, 'crowBurst', [-15, -40]), ...scatter(76, [-15, -35])],
  },
  // Sequencia B: o clone que salta e atira corvos (helper 331 -> 332-334).
  cloneLeap: {
    actions: [331],
    harmless: true,
    motion: [{ at: 5, vx: -1.5, vy: -8 }, { at: 26, vx: 0, vy: 0 }],
    spawns: [
      fx(22, 'thrownCrow', [18, -38], { velocityX: 7 }),
      fx(22, 'thrownCrow', [20, -40], { velocityX: 8 }),
      fx(22, 'thrownCrow', [22, -42], { velocityX: 9 }),
      fx(43, 'crowBurst', [0, -40]),
      ...scatter(44, [8, -35]),
    ],
  },
  thrownCrow: {
    actions: [332],
    loop: true,
    lifetime: 90,
    velocityX: 8,
    velocityY: 8,
    hit: { damage: 1, hitstun: MEDIUM, push: 3 },
    destroyOnHit: true,
    endOnGround: true,
    onDeathSpawn: { id: 'crowPoof', pos: [0, 5] },
  },
  crowPoof: look(7020, { scale: 0.5 }),
  crowTornado: {
    actions: [345],
    loop: true,
    lifetime: 100,
    hit: { every: 20, count: 5, damage: 1, hitstun: 24, push: 3 },
    onDeathSpawn: { id: 'crowTornadoEnd' },
    spawns: [
      fx(30, 'tornadoBase', [80, 37]),
      fx(30, 'tornadoShadow', [95, 40]),
      every(30, 90, 10, 'tornadoCrows', [80, 25], { spread: [40, 15], flip: true }),
    ],
  },
  crowTornadoEnd: { ...look(346, { scale: 0.5 }), spawns: [fx(0, 'tornadoDissipate', [90, 35])] },
  tornadoBase: look(344, half(33)),
  tornadoShadow: look(347, { lifetime: 70 }),
  tornadoCrows: look(343, { scale: 0.5 }),
  tornadoDissipate: look(348, { scale: 0.5 }),

  // Shuriken e shuriken de fogo.
  shuriken: {
    actions: [1051],
    loop: true,
    velocityX: 9,
    lifetime: 120,
    hit: { damage: 1, hitstun: 10, push: 1 },
    destroyOnHit: true,
  },
  fireShuriken: {
    actions: [1050],
    loop: true,
    velocityX: 5,
    velocityY: 3,
    gravity: 0.2,
    lifetime: 90,
    hit: { damage: 2, hitstun: 16, push: 3 },
    destroyOnHit: true,
    endOnGround: true,
    spawns: [fx(6, 'fireTrail', [2, 1], { follow: 'parent' })],
    onDeathSpawn: { id: 'fireSpark', pos: [8, 8] },
  },
  fireTrail: look(1084),
  fireSpark: look(2647),

  // Katon: a bola (caixa invisivel 1152 com o fogo 1154 preso nela).
  katonBall: {
    actions: [1152],
    loop: true,
    velocityX: 6,
    lifetime: 160,
    hit: { damage: 2, hitstun: MEDIUM, push: 3 },
    destroyOnHit: true,
    endAtWall: true,
    onDeathSpawn: { id: 'katonExplosion' },
    spawns: [
      fx(0, 'fireball', [0, 0], { follow: 'parent' }),
      every(15, 150, 15, 'fireRing', [20, 0]),
      every(10, 150, 15, 'groundGlow', [-25, 32]),
      every(2, 150, 4, 'ember', [-10, -20], { spread: [10, 30], velocityX: -1, velocitySpread: [0, 1.5] }),
    ],
  },
  fireball: look(1154, { scale: 0.5, loop: true, lifetime: 200 }),
  groundGlow: look(1124, { lifetime: 50 }),
  katonExplosion: {
    actions: [1151],
    hit: { damage: 8, hitstun: HARD, push: 6, heavy: true },
    spawns: [fx(0, 'explosion', [0, 0]), fx(0, 'blastWave', [0, 35]), fx(11, 'fireWall', [0, 35]), fx(12, 'scorch', [10, 38])],
  },
  explosion: look(1122, { scale: 0.5 }),
  blastWave: look(1158, { scale: 0.5 }),
  fireWall: look(1156, { scale: 0.5, ...half(32) }),
  scorch: look(1157, { lifetime: 60, scale: 0.5 }),
  airKatonBall: {
    actions: [1150],
    loop: true,
    velocityX: 3,
    velocityY: 5,
    lifetime: 120,
    hit: { every: 5, count: 4, damage: 1, hitstun: 16, push: 2 },
    endOnGround: true,
    onDeathSpawn: { id: 'katonBlast' },
    spawns: [
      fx(0, 'fireball', [-6, -6], { follow: 'parent' }),
      fx(2, 'fireRing', [-9, -9]),
      every(1, 60, 3, 'ember', [-10, -20], { spread: [10, 30], velocityX: -2, velocityY: -4, velocitySpread: [1, 2] }),
    ],
  },
  katonBlast: {
    actions: [1160],
    hit: { damage: 8, hitstun: HARD, push: 6, heavy: true },
    spawns: [
      fx(0, 'fireCloud', [0, 0]),
      fx(0, 'blastWave', [0, 5]),
      fx(10, 'bigBlast', [5, 5]),
      fx(11, 'fireWall', [0, 5]),
      fx(12, 'scorch', [0, 8]),
    ],
  },
  bigBlast: look(1159, { scale: 0.5, ...half(16) }),

  // Genjutsu dos corvos.
  genjutsuCrow: {
    actions: [1210],
    lifetime: 111,
    velocityX: 4.5,
    motion: [{ at: 10, vy: -0.6 }, { at: 30, vy: 0.4 }, { at: 60, vy: -0.3 }],
    hit: { damage: 1, hitstun: 24, push: 1 },
  },
  crowBind: {
    actions: [1222],
    area: { from: 0, until: 4, damage: 1, hitstun: 200, push: 0 },
    lifetime: 30,
  },
  circlingCrow: {
    actions: [1221],
    loop: true,
    velocityX: 0.3,
    lifetime: 110,
    harmless: true,
    onDeathSpawn: { id: 'divingCrow' },
  },
  divingCrow: {
    actions: [1230],
    loop: true,
    velocityX: 7,
    velocityY: 8,
    lifetime: 40,
    hit: { damage: 1, hitstun: 30, push: 0 },
    destroyOnHit: true,
    endOnGround: true,
    onDeathSpawn: { id: 'crowPoof' },
  },

  // Genjutsu do Sharingan.
  genjutsuVeil: look(1311, { lifetime: 160, scale: 0.5, alpha: 0.6, layer: 'back' }),
  illusionAura: look(1305, { lifetime: 104 }),
  illusionFade: look(1306),
  illusionStab1: { actions: [1321], hit: { damage: 2, hitstun: 40, push: 0, unblockable: true } },
  illusionStab2: { actions: [1322], hit: { damage: 2, hitstun: 40, push: 0, unblockable: true } },
  illusionStab3: { actions: [1323], hit: { damage: 2, hitstun: 40, push: 0, unblockable: true } },
  illusionStab4: { actions: [1324], hit: { damage: 3, hitstun: 60, push: 0, heavy: true, unblockable: true } },

  // Amaterasu: a chama que surge (caixa invisivel 1450 + fogo) e a que fica
  // queimando grudada no oponente.
  amaterasuIgnite: look(1467, { scale: 0.5 }),
  amaterasuFlame: {
    actions: [1450],
    hit: { damage: 10, hitstun: 55, push: 0, heavy: true },
    onHitSpawn: { id: 'amaterasuBurn', pos: [0, 0], follow: 'target', target: 'opponent' },
    spawns: [
      fx(0, 'blackFlameRise', [0, -5], { flip: true }),
      fx(24, 'blackFlame', [0, -5], { flip: true }),
      every(25, 44, 10, 'flameLick', [0, 0], { spread: [35, 10] }),
      every(25, 44, 5, 'flamePillar', [0, 0], { spread: [35, 10] }),
    ],
  },
  blackFlameRise: look(1463, { scale: 0.5 }),
  blackFlame: look(1464, { scale: 0.5 }),
  flameLick: look(1476),
  flamePillar: look(1465),
  amaterasuBurn: {
    actions: [1460],
    loop: true,
    follow: 'target',
    lifetime: 600,
    hitDelay: 90,
    hit: { every: 150, count: 4, damage: 2, hitstun: 12, push: 0 },
    spawns: [every(90, 560, 38, 'smallBlackFlame', [0, 25], { follow: 'parent' })],
  },
  smallBlackFlame: look(1415),

  // Genjutsu do dedo: o clone explosivo.
  explosiveClone: {
    actions: [1530],
    loop: true,
    lifetime: 100,
    harmless: true,
    onDeathSpawn: { id: 'cloneBlast' },
    spawns: [fx(5, 'crowBurst', [0, -40])],
  },
  cloneBlast: {
    actions: [1532],
    hit: { damage: 4, hitstun: HARD, push: 4, heavy: true },
    spawns: [fx(21, 'crowBurst', [0, -40]), fx(21, 'cloneBoom', [0, -35]), fx(21, 'cloneFlash', [0, -35]), ...scatter(22)],
  },
  cloneBoom: look(1505, { scale: 0.5 }),
  cloneFlash: look(1506, { scale: 0.5 }),

  // Dash de corvos.
  dashCrow: {
    actions: [1610],
    loop: true,
    lifetime: 80,
    endWithMove: true,
    harmless: true,
    motion: [{ at: 8, vx: 3.5, vy: 0.5 }, { at: 25, vy: -0.8 }, { at: 45, vy: 0.5 }],
  },

  // Corvo do Shisui: fica voando ate o Kotoamatsukami.
  shisuiCrowFamiliar: {
    actions: [1850],
    loop: true,
    tag: 'shisuiCrow',
    lifetime: 3600,
    harmless: true,
    motion: [{ at: 0, vx: 0.5, vy: -0.5 }, { at: 60, vx: 0, vy: 0 }],
    spawns: [every(20, 3500, 42, 'feather', [0, 0], { velocitySpread: [1.5, 1] })],
  },
  shisuiCrowCast: {
    actions: [1851],
    harmless: true,
    lifetime: 90,
    spawns: [
      fx(0, 'crowBurst', [0, 0]),
      fx(18, 'eyeOpen', [0, 0]),
      fx(18, 'kotoRing', [70, 7], { flip: true }),
      fx(48, 'eyeClose', [0, 0]),
      fx(48, 'kotoWave', [0, 2]),
      fx(48, 'kotoFlash', [0, 0]),
      fx(75, 'kotoSeal', [0, -40], { target: 'opponent' }),
    ],
  },
  kotoRing: look(1855, { scale: 0.5 }),
  kotoWave: look(1802, { scale: 0.5 }),
  kotoFlash: look(1803),
  kotoSeal: {
    actions: [1801],
    hit: { damage: 1, hitstun: 65, push: 0 },
    unblockable: true,
    seal: {
      kinds: [{ kind: 'noGuard', mark: 'sealRed' }, { kind: 'noJump', mark: 'sealGreen' }],
      ticks: 600,
    },
    spawns: [fx(0, 'sealRing', [1, 6])],
  },
  sealRing: look(1809, { scale: 0.5 }),
  sealRed: look(1805, { loop: true, lifetime: 600, follow: 'target' }),
  sealGreen: look(1807, { loop: true, lifetime: 600, follow: 'target' }),

  // Mangekyou: os clones que chutam, o que prende por tras e o genjutsu.
  kickClone: {
    actions: [3004],
    hits: [
      { damage: 2, hitstun: 45, push: 0 },
      { damage: 4, hitstun: 45, push: 0 },
      { damage: 4, hitstun: 60, push: 0, heavy: true },
    ],
    lifetime: 70,
    onDeathSpawn: { id: 'crowBurst', pos: [0, -40] },
  },
  backClone: {
    actions: [3005],
    hit: { damage: 3, hitstun: 120, push: 0 },
    lifetime: 60,
    spawns: [fx(24, 'afterimage', [0, 0])],
    onDeathSpawn: { id: 'crowBurst', pos: [0, -40] },
  },
  genjutsuScreen: look(3036, { scale: 0.5, layer: 'back' }),
  bloodSlash: look(3037, { scale: 0.5 }),
  redFlash: look(3038, { scale: 0.5 }),
  blackFlash: look(3039, { scale: 0.5, ...half(12) }),

  // Tsukuyomi: o mundo do genjutsu (encurtado de 760 para ~250 ticks).
  eyeSpiral: look(3113, { scale: 0.4, ...half(32) }),
  worldSky: look(3114, { scale: 0.5, lifetime: 250, loop: true, layer: 'back', cover: [920, 520], opaque: true }),
  worldGround: look(3115, { scale: 0.5, lifetime: 250, loop: true, layer: 'back' }),
  worldMoon: look(3117, { scale: 0.5, lifetime: 250, loop: true, layer: 'back' }),
  worldHalo: look(3119, { scale: 0.5, loop: true, lifetime: 250, layer: 'back', ...half(25) }),
  worldCloudA: look(3122, { scale: 0.5, lifetime: 250, loop: true, velocityX: 0.05, layer: 'back' }),
  worldCloudB: look(3125, { scale: 0.5, lifetime: 250, loop: true, velocityX: 0.05, layer: 'back' }),
  worldCloudC: look(3123, { scale: 0.5, lifetime: 250, loop: true, velocityX: 0.05, layer: 'back' }),
  worldCloudD: look(3124, { scale: 0.5, lifetime: 250, loop: true, velocityX: 0.05, layer: 'back' }),
  worldFlash: look(3103, { scale: 0.5 }),
  worldShatter: look(3104, { scale: 0.5, ...half(29) }),
  worldBreak: look(3105, { scale: 0.5, ...half(16) }),
  tsukuyomiStabs: look(3102, { scale: 0.5, layer: 'back', durationScale: 0.33 }),
  tsukuyomiEnd: {
    actions: [1801],
    hit: { damage: 25, hitstun: 60, push: 4, heavy: true },
    unblockable: true,
  },

  // Susanoo: o primeiro golpe do gigante (3250) e a espada de Totsuka (39410).
  susanooSwing: {
    actions: [3250],
    layer: 'back',
    // O primeiro golpe arremessa para longe: a espada acerta a distancia.
    hit: { damage: 4, hitstun: 70, push: 16, heavy: true },
    onHitSpawn: { id: 'totsuka', pos: [0, 0] },
    spawns: [
      fx(0, 'susanooSeal', [0, 0]),
      fx(0, 'susanooRibs', [0, -5], { follow: 'parent' }),
      fx(0, 'susanooFlame', [0, 5], { follow: 'parent' }),
      fx(0, 'susanooAura', [5, 10]),
      fx(21, 'susanooSpark', [30, -70]),
    ],
  },
  totsuka: {
    actions: [39410],
    layer: 'back',
    hits: [
      { damage: 8, hitstun: 50, push: 3, heavy: true },
      { damage: 12, hitstun: 60, push: 8, heavy: true },
    ],
    spawns: [
      fx(0, 'susanooRibs', [0, -5], { follow: 'parent' }),
      fx(0, 'susanooFlame', [0, 5], { follow: 'parent' }),
      fx(37, 'totsukaSlash', [100, 5]),
      fx(37, 'totsukaArc', [100, -20]),
      ...[[42, 110], [47, 180], [52, 250]].map(([at, x]) => fx(at, 'totsukaSeal', [x, 5])),
      ...[[42, 155], [47, 200], [52, 245], [72, 155], [77, 200], [82, 245]].map(([at, x]) => fx(at, 'swirl', [x, 5])),
      fx(67, 'totsukaSpikes', [200, 5]),
      fx(67, 'totsukaDust', [200, 5]),
      fx(67, 'totsukaCrack', [115, 0]),
      fx(67, 'totsukaBeamA', [230, 3]),
      fx(67, 'totsukaBeamB', [230, -2]),
      fx(67, 'totsukaBeamC', [230, 3]),
      ...[[72, [110, -5]], [77, [180, -15]], [82, [250, -25]]].map(([at, pos]) => fx(at, 'totsukaFlame', pos)),
    ],
  },
  susanooSeal: look(3255),
  susanooRibs: look(3224, { scale: 0.5, layer: 'back', loop: true, lifetime: 42 }),
  susanooFlame: look(3221, { scale: 0.5, layer: 'back', loop: true, lifetime: 42 }),
  susanooAura: look(3244, { scale: 0.5, layer: 'back' }),
  susanooSpark: look(3245),
  totsukaSlash: look(39411, { scale: 0.5 }),
  totsukaArc: look(39412, { scale: 0.5 }),
  totsukaCrack: look(39413, { scale: 0.5 }),
  totsukaSeal: look(39416, { scale: 0.5 }),
  totsukaFlame: look(39417, { scale: 0.5 }),
  totsukaBeamA: look(39418, { scale: 0.5 }),
  totsukaBeamB: look(39419, { scale: 0.5 }),
  totsukaBeamC: look(39420, { scale: 0.5 }),
  totsukaSpikes: look(39421, { scale: 0.5 }),
  totsukaDust: look(39422, { scale: 0.5 }),
};

// Limpeza visual: enfeites do pacote que mais poluem a tela do que ajudam
// (chao destruido em PNG, poeira a cada golpe, discos e olhos gigantes na
// frente da luta). O golpe continua igual; so esses desenhos nao aparecem.
const HIDDEN = new Set([
  // Katon: chao rachado, chao em chamas e a explosao gigante do aereo.
  'groundFire', 'scorch', 'groundGlow', 'fireWall', 'blastWave', 'bigBlast',
  // Susanoo: pedras, espinhos, rachaduras e riscos no chao.
  'totsukaSeal', 'totsukaFlame', 'totsukaSpikes', 'totsukaDust', 'totsukaCrack',
  'totsukaBeamA', 'totsukaBeamB', 'totsukaBeamC', 'susanooFlame',
  // Poeira no pe a cada golpe comum.
  'groundSlash', 'lowSlash', 'swirl', 'rushTrail', 'dustBurst', 'dashSlash',
  // Discos e olhos em primeiro plano, flash preto e nuvens pretas.
  'genjutsuVeil', 'eyeOpen', 'eyeClose', 'eyeShut', 'kotoWave', 'cloneFlash', 'blackFlash',
  'worldCloudA', 'worldCloudB', 'worldCloudC', 'worldCloudD', 'tornadoShadow',
  // Tsukuyomi: clarao, espiral e o fim que "quebra" so um pedaco da tela.
  'worldHalo', 'eyeSpiral', 'worldShatter', 'worldBreak', 'worldGround', 'worldFlash',
  // Arcos brancos gigantes dos golpes comuns (atravessam o chao e a tela).
  'slashArc', 'bigSlash', 'crescent', 'kickArc',
  // Redemoinho de corvos: pedras pretas da base e a dispersao gigante.
  'tornadoBase', 'tornadoDissipate',
  // Quadros 200x200 e 640x480 do pacote (feitos para outra tela): viram
  // retangulos escuros cobrindo so um pedaco da luta.
  'susanooSeal', 'genjutsuScreen', 'sharinganGlint', 'kotoAura', 'redFlash',
  // Discos que cobrem o oponente (Mangekyou, anel do genjutsu do dedo).
  'eyeFade', 'fingerRing',
]);

// Corvos e penas bem menores que no pacote: la um corvo de asa aberta tem
// quase o dobro da altura do Itachi, e o bando vira uma mancha preta.
for (const id of ['crowScatter', 'genjutsuCrow', 'crowBind', 'circlingCrow', 'dashCrow', 'tornadoCrows']) {
  EFFECTS[id].size = 0.32;
}
for (const id of ['crowBurst', 'feather', 'crowPoof']) EFFECTS[id].size = 0.45;
// O Sharingan que sobra fica pequeno, como um sinal do genjutsu.
for (const id of ['eyeStill', 'kotoRing']) EFFECTS[id].size = 0.4;
// Estacas da ilusao, chamas do Amaterasu e fumaca do Katon cobriam meia tela.
for (const id of ['illusionStab1', 'illusionStab2', 'illusionStab3', 'illusionStab4']) EFFECTS[id].size = 0.35;
EFFECTS.crowTornado.size = 0.7;
for (const id of ['blackFlameRise', 'blackFlame', 'amaterasuIgnite', 'fireCloud']) EFFECTS[id].size = 0.55;
EFFECTS.worldMoon.size = 0.7;

// Tira os escondidos e todo pedido que aponta para eles.
const visible = (entry) => !HIDDEN.has(entry.effect?.id);
for (const id of HIDDEN) delete EFFECTS[id];
for (const animation of Object.values(ANIMATIONS)) {
  if (animation.events) animation.events = animation.events.filter(visible);
}
for (const effect of Object.values(EFFECTS)) {
  if (effect.spawns) effect.spawns = effect.spawns.filter(visible);
  for (const key of ['onHitSpawn', 'onDeathSpawn']) {
    if (HIDDEN.has(effect[key]?.id)) delete effect[key];
  }
}

// Notacao relativa ao lado que o personagem encara. "hold" = direcao segurada
// no aperto do botao (os supers do pacote sao "↓ + botao").
const COMBOS = [
  { id: 'shuriken', input: '↓↘→P', animation: 'shuriken', airAnimation: 'housenka' },
  { id: 'katon', input: '↓↙←P', animation: 'katon', airAnimation: 'airKaton' },
  { id: 'crowGenjutsu', input: '↓↘→K', animation: 'crowGenjutsu' },
  { id: 'sharingan', input: '↓↙←K', animation: 'sharingan' },
  { id: 'amaterasu', input: '↓↘→S', animation: 'amaterasu' },
  { id: 'finger', input: '↓↙←S', animation: 'finger' },
  { id: 'crowDash', input: '↓↓P', animation: 'crowDash' },
  { id: 'shisuiCrow', input: '↓↓K', animation: 'shisuiCrow' },
  { id: 'kotoamatsukami', input: '↓↓S', animation: 'kotoamatsukami' },
  { id: 'mangekyou', input: 'P', hold: '↓', animation: 'mangekyou' },
  { id: 'tsukuyomi', input: 'K', hold: '↓', animation: 'tsukuyomi' },
  { id: 'susanoo', input: 'S', hold: '↓', animation: 'susanoo' },
];

// Lista de golpes da tela de pausa, na mesma notacao dos combos.
const MOVE_LIST = [
  { section: 'Movimento', name: 'Teleporte', input: '→→', note: 'Some na fumaça e reaparece à frente' },
  { section: 'Movimento', name: 'Recuo', input: '←←' },
  { section: 'Movimento', name: 'Pulo duplo', input: '↑↑', note: 'No ar, aperte para cima de novo' },
  { section: 'Sequências', name: 'Sequência de socos', input: 'PPPPP', note: 'Longe da parede, o 4º golpe chama um clone' },
  { section: 'Sequências', name: 'Sequência de chutes', input: 'KKKKK', note: 'Termina no redemoinho de corvos' },
  { section: 'Sequências', name: 'Sequência de cortes', input: 'SSSSS', note: 'O Sharingan prende no 4º golpe' },
  { section: 'Sequências', name: 'Socos no ar', input: 'PPPPP', note: 'No ar; fecha com uma bola de fogo' },
  { section: 'Sequências', name: 'Corvos no ar', input: 'K', note: 'No ar; tres corvos em diagonal' },
  { section: 'Jutsus', name: 'Shuriken', input: '↓↘→P', note: 'No ar: shuriken de fogo' },
  { section: 'Jutsus', name: 'Katon Goukakyuu', input: '↓↙←P', note: 'Explode no oponente ou na parede' },
  { section: 'Jutsus', name: 'Genjutsu dos corvos', input: '↓↘→K', note: '12 corvos acertando: golpe final' },
  { section: 'Jutsus', name: 'Genjutsu do Sharingan', input: '↓↙←K', note: 'De perto; cortes de ilusão' },
  { section: 'Jutsus', name: 'Amaterasu', input: '↓↘→S', note: 'Chamas negras em cima do oponente' },
  { section: 'Jutsus', name: 'Genjutsu do dedo', input: '↓↙←S', note: 'De perto; metade dos golpes viram corvos' },
  { section: 'Jutsus', name: 'Dash de corvos', input: '↓↓P', note: 'Atravessa o oponente' },
  { section: 'Jutsus', name: 'Corvo do Shisui', input: '↓↓K', note: 'Fica voando até ser usado' },
  { section: 'Jutsus', name: 'Kotoamatsukami', input: '↓↓S', note: 'Com o corvo: sem defesa ou sem pulo' },
  { section: 'Supers', name: 'Mangekyou', input: 'P', hold: '↓', note: 'Chute, clones e genjutsu' },
  { section: 'Supers', name: 'Tsukuyomi', input: 'K', hold: '↓', note: 'De perto; o mundo da ilusão' },
  { section: 'Supers', name: 'Susanoo', input: 'S', hold: '↓', note: 'A espada de Totsuka' },
];

const BUTTONS = {
  ground: { punch: 'punch', kick: 'kick', special: 'slash1' },
  air: { punch: 'airPunch', kick: 'airKick', special: 'airKick' },
};

importMugenCharacter({
  root: ROOT,
  sffPath: resolve(PACK, 'Uchiha Itachi.sff'),
  airPath: resolve(PACK, 'Uchiha Itachi.air'),
  outDir: 'public/assets/characters/itachi',
  id: 'itachi',
  name: 'Itachi',
  description: 'Sombra do cla Uchiha',
  template: 'public/assets/characters/dummy/dummy_config.json',
  animations: ANIMATIONS,
  effects: EFFECTS,
  combos: COMBOS,
  buttons: BUTTONS,
  moveList: MOVE_LIST,
  // Pulo duplo (o pacote nao tem): some numa revoada de corvos no impulso.
  airJumpEffect: { id: 'crowBurst', pos: [0, -30] },
  // Rosto recortado do retrato grande do pacote (120x140), com fundo escuro
  // como os outros retratos da grade.
  portrait: { sprite: [9000, 1], crop: [14, 4, 92, 101], width: 50, height: 55, background: '#1B1622' },
});

// Faiscas de impacto do pacote, usadas por todo o elenco. Escalas iguais as
// que o autor usa nos Explod do .cns (7026 a .14, 7000 a .3-.5).
exportFightFx({
  root: ROOT,
  sffPath: resolve(PACK, 'Uchiha Itachi.sff'),
  airPath: resolve(PACK, 'Uchiha Itachi.air'),
  outDir: 'public/assets/fx',
  effects: {
    hit: { actions: [7026], scale: 0.3 },
    heavy: { actions: [7025], scale: 0.3 },
    block: { actions: [7000], scale: 0.4 },
  },
});
