// Importa o Escanor do pacote MUGEN "Escanor RSK OP" (Rimihf, editado por
// Kuro; primeira edicao de Inseph; personagem original de Soulfire; creditos
// em CREDITS.md).
//
// O pacote fica em assets-src/escanor/mugen/ (fora do git).
// Para regerar: npm run assets:escanor
//
// Os dois modos do pacote:
// - Normal: sequencias de A (200-203) e B (300-302) que cruzam entre si, o
//   agarrao de ↓+A (210/211), a onda de energia de C (segurar e soltar,
//   400/401/460), os golpes aereos (600-620), os seis especiais de meia-lua
//   (todos de segurar e soltar, 1000-1700), o Pride Flash (1103/1104), o golpe
//   atordoante (9620) e os dashes (9610, 105).
// - The One (7000-7280): no pacote o sol do meio-dia chega depois de um tempo
//   de luta (helper 9005) e o Escanor se transforma (3500), trocando de
//   golpes. Aqui a transformacao vem na metade do round.
// Botoes: soco = A, chute = B, especial = C. Os tempos (ticks) e as caixas vem
// do .air/.cns; dano ajustado para a vida de 100 do jogo.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importMugenCharacter } from './lib/mugen-import.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = resolve(ROOT, 'assets-src/escanor/mugen/files');

const fx = (at, id, pos = [0, 0], extra = {}) => ({ at, effect: { id, pos, ...extra } });
const fxAt = (frame, id, pos, extra) => ({ frame, effect: { id, pos, ...extra } });
const every = (at, until, step, id, pos, extra) => ({ ...fx(at, id, pos, extra), repeat: { every: step, until } });

// Segurar para carregar: o botao do comando mantem a pose; solta (ou acaba a
// carga) e sai o golpe.
const charge = (button, to, min = 12, max = 50) => ({ button, to, min, max });

const ANIMATIONS = {
  idle: { actions: [0], loop: true },
  walkForward: { actions: [20], loop: true },
  walkBackward: { actions: [21], loop: true },
  jump: { actions: [40, 41, 44] },
  crouch: { actions: [11], loop: true },
  blockStanding: { actions: [130], loop: true },
  blockCrouching: { actions: [131], loop: true },
  hitReaction: { actions: [5000] },
  ko: { actions: [5030, 5050, 5100, 5110] },
  victoryPose: { actions: [181], loop: true },
  defeatPose: { actions: [5110] },

  // Dash (x, estado 9610): investida curta que pode emendar em golpe;
  // recuo (BB, estado 105): pulinho para tras.
  dashForward: {
    actions: [910, 101],
    dash: { distance: 120, moveFrom: 3, moveUntil: 5, invulnerableFrom: 9, invulnerableUntil: 0, cancel: true },
  },
  dashBackward: {
    actions: [105],
    dash: { distance: 70, moveFrom: 1, moveUntil: 1, invulnerableFrom: 9, invulnerableUntil: 0 },
  },

  // ---- Sequencia A (200 -> 201 -> 202 -> 203) ----
  punch: {
    actions: [200],
    hit: { damage: 5, hitstun: 34, push: 4, heavy: true },
    events: [{ frame: 4, vx: 3 }, fxAt(5, 'sunSlash', [-18, -10], { scale: 0.27 })],
    cancels: [
      { on: 'punch', to: 'grab', after: 34, need: 'none', down: true },
      { on: 'punch', to: 'punch2', after: 34, need: 'none' },
      { on: 'kick', to: 'kick', after: 34, need: 'none' },
    ],
  },
  punch2: {
    actions: [201],
    hit: { damage: 5, hitstun: 30, push: 4, heavy: true },
    events: [{ frame: 3, vx: 4 }, fxAt(4, 'sunSlash', [-29, -52], { scale: 0.27, flip: true })],
    cancels: [
      { on: 'punch', to: 'grab', after: 13, need: 'none', down: true },
      { on: 'punch', to: 'punch3', after: 13, need: 'none' },
      { on: 'kick', to: 'kick2', after: 13, need: 'none' },
    ],
  },
  // Rajada: acerta a cada 6 ticks enquanto avanca devagar.
  punch3: {
    actions: [{ id: 202, lengthTicks: 55 }, 208],
    friction: false,
    hit: { damage: 1, hitstun: 20, push: 1 },
    events: [{ at: 15, vx: 1.2 }, { at: 50, vx: 0 }, every(15, 45, 6, 'sunSpark', [45, -45], { scale: [0.35, 0.45], spread: [8, 8] })],
    cancels: [
      { on: 'punch', to: 'grab', after: 40, need: 'none', down: true },
      { on: 'punch', to: 'punch4', after: 40, need: 'none' },
      { on: 'kick', to: 'kick3', after: 40, need: 'none' },
    ],
  },
  punch4: {
    actions: [203],
    hit: { damage: 6, hitstun: 30, push: 10, heavy: true },
    events: [{ frame: 4, vx: 4 }, fxAt(5, 'sunSlash', [-55, -70], { scale: 0.27 })],
  },
  // ↓ + A: agarra (210) e derruba (211).
  grab: {
    actions: [210],
    hit: { damage: 1, hitstun: 60, push: 0 },
    events: [{ frame: 3, vx: 5 }],
    onHit: { to: 'grabSlam', after: 25 },
  },
  grabSlam: {
    actions: [211],
    events: [{ frame: 3, vx: 2 }, fxAt(3, 'slamImpact', [30, 0])],
  },

  // ---- Sequencia B (300 -> 301 -> 302) ----
  kick: {
    actions: [300],
    hit: { damage: 5, hitstun: 30, push: 4, heavy: true },
    events: [{ frame: 5, vx: 4 }, fxAt(5, 'sunSpark', [48, -42], { scale: [0.35, 0.45] })],
    cancels: [
      { on: 'punch', to: 'grab', after: 14, need: 'none', down: true },
      { on: 'punch', to: 'punch2', after: 14, need: 'none' },
      { on: 'kick', to: 'kick2', after: 14, need: 'none' },
    ],
  },
  kick2: {
    actions: [301],
    hit: { damage: 5, hitstun: 30, push: 4, heavy: true },
    events: [{ frame: 3, vx: 3 }, fxAt(3, 'sunSlash', [-15, -2], { scale: 0.27 })],
    cancels: [
      { on: 'punch', to: 'grab', after: 15, need: 'none', down: true },
      { on: 'punch', to: 'punch3', after: 15, need: 'none' },
      { on: 'kick', to: 'kick3', after: 15, need: 'none' },
    ],
  },
  // Fecha jogando o oponente contra a parede (estado 9050: -18 px/tick).
  kick3: {
    actions: [302],
    hit: { damage: 6, hitstun: 36, push: 16, heavy: true },
    events: [{ frame: 4, vx: 6 }, fxAt(4, 'sunSlash', [-32, 0], { scale: 0.27 })],
  },

  // ---- C: segura carregando e solta a onda de energia (400 -> 401 + 460) ----
  special: {
    actions: [{ id: 400, lengthTicks: 50 }],
    cooldown: 60,
    charge: charge('special', 'energyWave', 20, 50),
  },
  energyWave: {
    actions: [401],
    events: [{ frame: 2, vx: 2 }, fxAt(2, 'energyWave', [20, -40])],
  },

  // ---- No ar: A (600) -> B (610 -> 611) ou C (620) ----
  airPunch: {
    actions: [600],
    air: true,
    hit: { damage: 5, hitstun: 26, push: 3, heavy: true },
    events: [{ at: 0, vx: 2, vy: -2 }, { frame: 4, vx: 2, vy: -3 }],
    cancels: [{ on: 'kick', to: 'airKick', need: 'none', after: 20 }, { on: 'special', to: 'airSpecial', need: 'none', after: 20 }],
  },
  airKick: {
    actions: [{ id: 610, lengthTicks: 25 }],
    air: true,
    hit: { every: 6, count: 4, damage: 1, hitstun: 18, push: 1 },
    events: [{ at: 0, vx: 1, vy: -1 }],
    cancels: [{ on: 'kick', to: 'airKick2', need: 'none', after: 20 }, { on: 'special', to: 'airSpecial', need: 'none', after: 20 }],
  },
  airKick2: {
    actions: [611],
    air: true,
    hit: { damage: 6, hitstun: 30, push: 6, heavy: true },
    events: [{ at: 0, vx: 1, vy: -1 }, { frame: 4, vx: 2, vy: 4 }, fxAt(4, 'sunSlash', [-45, -80], { scale: 0.3 })],
  },
  airSpecial: {
    actions: [620],
    air: true,
    hit: { damage: 6, hitstun: 32, push: 4, heavy: true },
    events: [{ at: 0, vx: 1, vy: -5 }, { frame: 4, vx: 3, vy: 6 }, fxAt(4, 'sunSlash', [-14, -14], { scale: 0.25 })],
  },

  // ---- Especiais (meia-lua + botao; todos de segurar e soltar) ----
  // ↓↘→ + A: investida (1001) e gancho (1002) que ergue um pilar de fogo.
  sunRush: { actions: [{ id: 1000, lengthTicks: 50 }], cooldown: 90, charge: charge('punch', 'sunRushDash') },
  sunRushDash: {
    actions: [1001],
    friction: false,
    events: [{ at: 0, vx: 22 }, { at: 5, vx: 1.5 }],
    next: 'sunRushUppercut',
  },
  sunRushUppercut: {
    actions: [1002],
    hit: { damage: 6, hitstun: 34, push: 3, heavy: true },
    events: [fxAt(2, 'sunSlash', [-50, -32], { scale: 0.27, flip: true }), { frame: 2, at: 10, effect: { id: 'firePillar', pos: [10, 0] } }],
  },
  // ↓↙← + A: postura de contra-ataque (1100); se apanhar (ou soltar), avanca
  // com o golpe (1101) e, acertando, ergue o pilar de fogo no oponente.
  sunCounter: {
    actions: [{ id: 1100, lengthTicks: 80 }],
    cooldown: 120,
    charge: charge('punch', 'sunStrike', 12, 80),
    counter: { from: 15, to: 'sunStrike' },
  },
  sunStrike: {
    actions: [1101],
    friction: false,
    hit: { damage: 7, hitstun: 40, push: 2, heavy: true },
    events: [{ frame: 2, vx: 10 }, { frame: 3, vx: 30 }, { frame: 4, vx: 0 }, { frame: 5, vx: 10 }],
    onHit: { to: 'sunStrikeFinish' },
  },
  sunStrikeFinish: {
    actions: [1102],
    events: [fxAt(3, 'flamePillar', [0, 0], { target: 'opponent' })],
  },
  // ↓↘→ + B: salto e queda com o machado (1201), onda de choque no chao (1250).
  sunDrop: { actions: [{ id: 1200, lengthTicks: 50 }], cooldown: 100, charge: charge('kick', 'sunDropJump') },
  sunDropJump: {
    actions: [{ id: 1201, lengthTicks: 26 }],
    friction: false,
    hit: { damage: 6, hitstun: 34, push: 4, heavy: true },
    events: [{ frame: 1, vx: 12, vy: -3 }, { frame: 2, vx: 10, vy: -2 }, { frame: 3, vx: 5, vy: 8 }],
    next: 'sunDropLand',
  },
  sunDropLand: {
    actions: [1202],
    events: [{ at: 0, land: true, vx: 0 }, fx(0, 'shockwave', [0, 0])],
  },
  // ↓↙← + B: onda de fogo rasteira (1301 + 1350).
  fireWave: { actions: [{ id: 1300, lengthTicks: 50 }], cooldown: 100, charge: charge('kick', 'fireWaveThrow') },
  fireWaveThrow: {
    actions: [1301],
    events: [{ frame: 1, vx: 3 }, fxAt(1, 'fireWave', [25, 5])],
  },
  // ↓↘→ + C: Cruel Sun, o sol que atravessa a tela (1401 + 1450).
  cruelSun: { actions: [{ id: 1400, lengthTicks: 50 }], cooldown: 120, charge: charge('special', 'cruelSunThrow', 18, 50) },
  cruelSunThrow: {
    actions: [1401],
    events: [{ frame: 2, vx: 2 }, fxAt(2, 'sunBall', [40, -45])],
  },
  // ↓↙← + C: chuva de sois (1700): sobem de perto dele e caem por toda a arena.
  sunRain: {
    actions: [{ id: 1700, lengthTicks: 170 }, 1701],
    cooldown: 360,
    invulnerable: [0, 30],
    events: [
      fx(0, 'bigSun', [0, 0]),
      every(30, 100, 10, 'risingSun', [0, -30], { spread: [20, 0] }),
      ...[40, 120, 230].flatMap((x, k) => [
        every(60 + k * 10, 150, 30, 'fallingSun', [x, 400], { velocityX: 2 }),
        every(75 + k * 10, 160, 30, 'fallingSun', [-x, 400], { velocityX: -2 }),
      ]),
    ],
  },
  // ↓↓ + C: Pride Flash (1103/1104): 80 ticks juntando o sol e a explosao.
  prideFlash: {
    actions: [{ id: 1103, lengthTicks: 80 }, 1104],
    cooldown: 600,
    hit: { damage: 12, hitstun: 50, push: 12, heavy: true },
    events: [fxAt(3, 'prideSun', [0, -40], { follow: 'owner' }), { action: 1104, at: 0, vx: 2 }, { action: 1104, ...fx(0, 'shockwave', [0, 0]) }],
  },
  // ↓↓ + A: golpe atordoante (9620): prende o oponente e emenda A ou B.
  stunStrike: {
    actions: [920],
    hit: { damage: 1, hitstun: 50, push: 1 },
    events: [{ frame: 3, vx: 6 }],
    cancels: [
      { on: 'punch', to: 'punch', need: 'contact' },
      { on: 'kick', to: 'kick', need: 'contact' },
    ],
  },

  // ---- The One ----
  // Transformacao (3500): brilho do sol, aura e troca de modo.
  transformTheOne: {
    actions: [{ id: 4000, lengthTicks: 100 }],
    invulnerable: [0, 100],
    events: [
      every(30, 98, 4, 'sunParticle', [0, -40], { spread: [15, 40], velocityY: -1 }),
      fxAt(5, 'theOneAura', [0, 0]),
      fx(40, 'theOneSun', [-40, 150]),
      { atEnd: true, setMode: 'theOne' },
    ],
  },
  theOneIdle: { actions: [6000], loop: true },
  theOneWalkForward: { actions: [6020], loop: true },
  theOneWalkBackward: { actions: [6021], loop: true },
  theOneJump: { actions: [6040, 6041, 6044] },
  theOneCrouch: { actions: [6011], loop: true },
  theOneDashForward: {
    actions: [6100],
    dash: { distance: 140, moveFrom: 0, moveUntil: 3, invulnerableFrom: 9, invulnerableUntil: 0, cancel: true },
  },
  theOneDashBackward: {
    actions: [6105],
    dash: { distance: 80, moveFrom: 0, moveUntil: 1, invulnerableFrom: 9, invulnerableUntil: 0 },
  },
  // A (7270 -> 7275 -> 7278): tres golpes do machado Rhitta; o ultimo ergue o
  // pilar de fogo.
  theOnePunch: {
    actions: [6270],
    hit: { damage: 5, hitstun: 30, push: 4, heavy: true },
    events: [{ at: 0, vx: 2 }],
    cancels: [{ on: 'punch', to: 'theOnePunch2', need: 'hit' }],
  },
  theOnePunch2: {
    actions: [6275],
    hit: { damage: 4, hitstun: 30, push: 4, heavy: true },
    events: [{ at: 0, vx: 4 }],
    cancels: [{ on: 'punch', to: 'theOnePunch3', need: 'hit' }],
  },
  theOnePunch3: {
    actions: [6279],
    hit: { damage: 6, hitstun: 34, push: 10, heavy: true },
    events: [{ at: 0, vx: 1 }, fxAt(4, 'firePillar', [0, 0])],
  },
  // B (7250 -> 7255): agarra e ergue o oponente, batendo a cada 15 ticks.
  theOneGrab: {
    actions: [6255],
    hit: { damage: 2, hitstun: 40, push: 0 },
    events: [{ at: 0, vx: 3 }],
    onHit: { to: 'theOneLift' },
  },
  theOneLift: {
    actions: [6254],
    hit: { every: 15, count: 9, damage: 2, hitstun: 30, push: 0, unblockable: true },
    events: [{ at: 0, vx: 0, pinOpponent: { dx: 30, lift: 50, ticks: 150, relative: 'self' } }],
  },
  // C (7240): sol que para no ar, mira e dispara (7245), explodindo (7246).
  theOneSun: {
    actions: [6245],
    cooldown: 120,
    events: [fxAt(3, 'theOneSunShot', [100, -65])],
  },
  // ↓↓ + A (7260): postura de contra-ataque.
  theOneCounter: {
    actions: [6260],
    cooldown: 90,
    counter: { from: 0, to: 'theOnePunch3' },
  },
  // ↓↓ + B (7280): Divine Sword Escanor.
  divineSword: {
    actions: [6280],
    cooldown: 240,
    hits: [
      { damage: 1, hitstun: 60, push: 0 },
      { damage: 9, hitstun: 50, push: 12, heavy: true },
    ],
    events: [{ frame: 3, vx: 12 }, fxAt(3, 'divineSlash', [60, -60], { scale: 0.5 })],
  },
  // ↓↓ + C (7230): o golpe final (4001): segura e fecha com o sol.
  theOneFinisher: {
    actions: [4001],
    cooldown: 600,
    hit: { every: 30, count: 3, damage: 4, hitstun: 90, push: 0, heavy: true },
    events: [fxAt(2, 'finisherSun', [78, -105], { scale: 0.5 })],
  },
};

// Enfeite: so desenho, sem acerto.
const look = (actions, extra = {}) => ({ actions: Array.isArray(actions) ? actions : [actions], harmless: true, ...extra });

// Cores dos efeitos: os sprites sao em tons de cinza (paleta 3,0) e cada
// Explod troca a paleta (remappal): 3,11 = fogo, 3,14 = ouro do sol.
const FIRE = [3, 11];
const GOLD = [3, 14];

const EFFECTS = {
  // Desenhados grandes no pacote e exibidos reduzidos (scale das Explod):
  // guardados perto do tamanho de tela.
  sunSlash: look(8300, { scale: 0.3, remap: GOLD }),
  sunSpark: look(8302, { scale: 0.45, remap: GOLD }),
  // Impacto da derrubada: caixa rente ao chao onde o oponente cai.
  slamImpact: {
    actions: [{ id: 8240, lengthTicks: 20 }], remap: FIRE,
    area: { rect: [-40, -60, 40, 0], from: 0, until: 3, damage: 4, hitstun: 50, push: 6, heavy: true, unblockable: true },
    scale: 0.8,
  },
  energyWave: {
    actions: [460], remap: FIRE,
    loop: true,
    velocityX: 9,
    lifetime: 100,
    endAtWall: true,
    hit: { every: 8, count: 8, damage: 1, hitstun: 16, push: 3 },
    onDeathSpawn: { id: 'energyBurst' },
  },
  energyBurst: { actions: [465], remap: FIRE, scale: 0.4, hit: { damage: 3, hitstun: 30, push: 8, heavy: true } },
  firePillar: { actions: [1050], remap: FIRE, scale: 0.5, hit: { every: 6, count: 9, damage: 1, hitstun: 22, push: 1 } },
  flamePillar: { actions: [1150], remap: FIRE, scale: 0.5, hit: { every: 6, count: 10, damage: 1, hitstun: 22, push: 0 } },
  shockwave: { actions: [1250], remap: FIRE, hit: { every: 3, count: 6, damage: 1, hitstun: 20, push: 2 } },
  fireWave: {
    actions: [1350], remap: FIRE,
    loop: true,
    velocityX: 13,
    lifetime: 70,
    endAtWall: true,
    hit: { every: 4, count: 10, damage: 1, hitstun: 18, push: 2 },
  },
  sunBall: {
    actions: [1450], remap: FIRE,
    loop: true,
    velocityX: 11,
    lifetime: 200,
    endAtWall: true,
    hit: { every: 6, count: 8, damage: 1, hitstun: 18, push: 2 },
    onDeathSpawn: { id: 'sunBallBurst' },
  },
  sunBallBurst: { actions: [1455], remap: FIRE, hit: { damage: 3, hitstun: 30, push: 8, heavy: true } },
  bigSun: look(1520, { lifetime: 170, loop: true, scale: 0.4, remap: GOLD }),
  // Cometas: o sprite e horizontal e o pacote gira (AngleDraw 90 / -90).
  risingSun: {
    actions: [1750],
    angle: 90, remap: FIRE,
    loop: true,
    velocityY: -12,
    lifetime: 40,
    hit: { damage: 1, hitstun: 20, push: 2 },
  },
  fallingSun: {
    actions: [1750],
    angle: -90, remap: FIRE,
    loop: true,
    velocityY: 16,
    lifetime: 60,
    endOnGround: true,
    hit: { damage: 1, hitstun: 20, push: 2 },
    onDeathSpawn: { id: 'sunImpact' },
  },
  sunImpact: { actions: [1770], remap: FIRE, scale: 0.5, hit: { damage: 1, hitstun: 20, push: 2 } },
  prideSun: look(1190, { lifetime: 60, loop: true, scale: 0.5, remap: GOLD }),
  sunParticle: look(4015, { scale: 0.4, remap: FIRE }),
  theOneAura: look(4010),
  theOneSun: look(4020, { lifetime: 200, loop: true, scale: 0.5, remap: GOLD }),
  theOneSunShot: {
    actions: [461], remap: FIRE,
    loop: true,
    lifetime: 200,
    endAtWall: true,
    motion: [{ at: 40, aim: 8 }],
    hitDelay: 40,
    hit: { every: 8, count: 10, damage: 1, hitstun: 18, push: 2 },
    onDeathSpawn: { id: 'theOneSunBurst' },
  },
  theOneSunBurst: { actions: [466], remap: FIRE, scale: 0.4, hit: { damage: 5, hitstun: 36, push: 10, heavy: true } },
  divineSlash: look(8200),
  finisherSun: look(4050),
};

// Tamanho na tela: no pacote cada sol tem ~390 px (quatro Escanors); a chuva
// de sois cobria a tela inteira de fogo. Caixas de acerto acompanham.
for (const id of ['risingSun', 'fallingSun']) EFFECTS[id].size = 0.4;
EFFECTS.sunImpact.size = 0.35;
EFFECTS.bigSun.size = 0.6;
for (const id of ['energyWave', 'sunBall', 'theOneSunShot']) EFFECTS[id].size = 0.75;

// Notacao relativa ao lado que ele encara. Os golpes do The One so valem no
// modo "theOne".
const COMBOS = [
  { id: 'sunRush', input: '↓↘→P', animation: 'sunRush' },
  { id: 'sunCounter', input: '↓↙←P', animation: 'sunCounter' },
  { id: 'sunDrop', input: '↓↘→K', animation: 'sunDrop' },
  { id: 'fireWave', input: '↓↙←K', animation: 'fireWave' },
  { id: 'cruelSun', input: '↓↘→S', animation: 'cruelSun' },
  { id: 'sunRain', input: '↓↙←S', animation: 'sunRain' },
  { id: 'stunStrike', input: '↓↓P', animation: 'stunStrike' },
  { id: 'prideFlash', input: '↓↓S', animation: 'prideFlash' },
  { id: 'grab', input: 'P', hold: '↓', animation: 'grab' },
  { id: 'theOneCounter', input: '↓↓P', animation: 'theOneCounter', mode: 'theOne' },
  { id: 'divineSword', input: '↓↓K', animation: 'divineSword', mode: 'theOne' },
  { id: 'theOneFinisher', input: '↓↓S', animation: 'theOneFinisher', mode: 'theOne' },
];

const BUTTONS = {
  ground: { punch: 'punch', kick: 'kick', special: 'special' },
  air: { punch: 'airPunch', kick: 'airKick', special: 'airSpecial' },
};

const MODES = {
  theOne: {
    // Metade do round (45 s a 60 ticks por segundo).
    after: 2700,
    transform: 'transformTheOne',
    buttons: {
      ground: { punch: 'theOnePunch', kick: 'theOneGrab', special: 'theOneSun' },
      air: { punch: 'airPunch', kick: 'airKick', special: 'airSpecial' },
    },
    animations: {
      idle: 'theOneIdle',
      walkForward: 'theOneWalkForward',
      walkBackward: 'theOneWalkBackward',
      jump: 'theOneJump',
      crouch: 'theOneCrouch',
      dashForward: 'theOneDashForward',
      dashBackward: 'theOneDashBackward',
    },
  },
};

const MOVE_LIST = [
  { section: 'Movimento', name: 'Investida', input: '→→', note: 'Emenda num golpe' },
  { section: 'Movimento', name: 'Recuo', input: '←←' },
  { section: 'Movimento', name: 'Pulo duplo', input: '↑↑', note: 'No ar, aperte para cima de novo' },
  { section: 'Sequências', name: 'Machado (A)', input: 'PPPP', note: 'Cruza com o chute: P, K, P...' },
  { section: 'Sequências', name: 'Chutes (B)', input: 'KKK', note: 'O último joga o oponente na parede' },
  { section: 'Sequências', name: 'Onda de energia (C)', input: 'S', note: 'Segure para carregar e solte' },
  { section: 'Sequências', name: 'Agarrão', input: 'P', hold: '↓' },
  { section: 'Sequências', name: 'No ar', input: 'PKS', note: 'No ar' },
  { section: 'Especiais', name: 'Investida Solar', input: '↓↘→P', note: 'Segure e solte; ergue um pilar de fogo' },
  { section: 'Especiais', name: 'Contra-ataque Solar', input: '↓↙←P', note: 'Se apanhar na postura, contra-ataca' },
  { section: 'Especiais', name: 'Queda do Sol', input: '↓↘→K', note: 'Salta e cai com o machado' },
  { section: 'Especiais', name: 'Onda de Fogo', input: '↓↙←K', note: 'Segure e solte' },
  { section: 'Especiais', name: 'Cruel Sun', input: '↓↘→S', note: 'O sol que atravessa a tela' },
  { section: 'Especiais', name: 'Chuva de Sóis', input: '↓↙←S', note: 'Sóis caem por toda a arena' },
  { section: 'Especiais', name: 'Golpe Atordoante', input: '↓↓P', note: 'Prende e emenda A ou B' },
  { section: 'Especiais', name: 'Pride Flash', input: '↓↓S', note: 'Demora para juntar o sol, mas dói' },
  { section: 'The One', name: 'Transformação', input: '', note: 'Sozinho, na metade do round' },
  { section: 'The One', name: 'Rhitta (A)', input: 'PPP', note: 'Três golpes; o último ergue o pilar' },
  { section: 'The One', name: 'Agarrão e erguer (B)', input: 'K' },
  { section: 'The One', name: 'Sol teleguiado (C)', input: 'S' },
  { section: 'The One', name: 'Contra-ataque', input: '↓↓P' },
  { section: 'The One', name: 'Divine Sword Escanor', input: '↓↓K' },
  { section: 'The One', name: 'Golpe final', input: '↓↓S' },
];

importMugenCharacter({
  root: ROOT,
  sffPath: resolve(PACK, 'spr.sff'),
  airPath: resolve(PACK, 'anim.air'),
  outDir: 'public/assets/characters/escanor',
  id: 'escanor',
  name: 'Escanor',
  description: 'O Leão do Orgulho',
  template: 'public/assets/characters/dummy/dummy_config.json',
  animations: ANIMATIONS,
  effects: EFFECTS,
  combos: COMBOS,
  buttons: BUTTONS,
  modes: MODES,
  moveList: MOVE_LIST,
  portrait: { sprite: [9000, 1], crop: [14, 0, 92, 101], width: 50, height: 55, background: '#1B1622' },
});
