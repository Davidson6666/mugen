// Importa a Reze do pacote MUGEN "BombDevil" (DrAnimation; creditos em
// CREDITS.md) - substitui a Yoruichi no elenco.
//
// O pacote fica em assets-src/reze/mugen/ (fora do git). SFF v1 (a paleta vem
// embutida nos sprites). Para regerar: npm run assets:reze
//
// Como o da Sukuna, o pacote guarda cada golpe em dois niveis: o estado do
// personagem (a pose, que quase nunca tem caixa de ataque) e os Helper/Explod
// que ele solta (a bomba, as explosoes, os misseis), que e onde esta o dano e o
// visual. Aqui o primeiro vira a animacao do golpe e o segundo vira EFFECTS que
// andam (velocityX) e acertam.
//
// O pacote tem duas formas, var(11) = 0 (a Reze mascarada, estados 200-1500) e
// var(11) = 10000 (Bomb Devil, a mesma serie somada a 10000). Esta primeira
// versao e a forma base inteira.
//
// Botoes: soco = a, chute = b, especial = c (o missil).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importMugenCharacter } from './lib/mugen-import.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = resolve(ROOT, 'assets-src/reze/mugen');

const fx = (at, id, pos = [0, 0], extra = {}) => ({ at, effect: { id, pos, ...extra } });
const fxLoop = (at, id, pos, every, until, extra = {}) => ({ at, repeat: { every, until }, effect: { id, pos, ...extra } });
const strike = (from, until, rect, data) => ({ from, until, rect, ...data });
const NORMAL = { specialCancel: true };

// Sorteio deterministico (a folha gerada nao pode mudar de uma importacao para
// outra): posicoes dos estouros do super.
function seeded(seed) {
  let state = seed >>> 0;
  return (low = 0, high = 1) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return low + (state / 4294967296) * (high - low);
  };
}
const rnd = seeded(11);
const SUPER_BLASTS = Array.from({ length: 12 }, (_, index) => fx(24 + index * 12, 'superBlast', [rnd(-26, 30), -rnd(8, 62)], { target: 'opponent' }));

const ANIMATIONS = {
  idle: { actions: [0], loop: true },
  walkForward: { actions: [20], loop: true },
  walkBackward: { actions: [21], loop: true },
  jump: { actions: [40, 41] },
  crouch: { actions: [11], loop: true },
  blockStanding: { actions: [130], loop: true },
  blockCrouching: { actions: [131], loop: true },
  hitReaction: { actions: [5000] },
  ko: { actions: [5030, 5050, 5100, 5110] },
  victoryPose: { actions: [180] },
  defeatPose: { actions: [170] },

  // Corrida (state 60) e recuo (state 70): o pacote deixa um rastro de poeira.
  dashForward: {
    actions: [{ id: 100, lengthTicks: 20 }],
    dash: { distance: 170, moveFrom: 0, moveUntil: 14, invulnerableFrom: 99, invulnerableUntil: 0, cancel: true },
    events: [fx(0, 'dashDust', [-20, 4])],
  },
  dashBackward: {
    actions: [{ id: 105, lengthTicks: 16 }],
    dash: { distance: 130, moveFrom: 0, moveUntil: 5, invulnerableFrom: 1, invulnerableUntil: 4, cancel: true },
    events: [fx(0, 'dashDust', [30, 4])],
  },
  airDashForward: {
    actions: [{ id: 100, lengthTicks: 12 }],
    dash: { distance: 140, moveFrom: 0, moveUntil: 11, invulnerableFrom: 99, invulnerableUntil: 0 },
  },
  airDashBackward: {
    actions: [{ id: 106, lengthTicks: 10 }],
    dash: { distance: 110, moveFrom: 0, moveUntil: 9, invulnerableFrom: 99, invulnerableUntil: 0 },
  },

  // ---- Corrente do soco (200 -> 210 -> 220 -> 230) ----
  punch: {
    actions: [200],
    ...NORMAL,
    hit: { damage: 3, hitstun: 18, push: 4 },
    events: [{ at: 6, vx: 3 }],
    cancels: [{ on: 'punch', to: 'punch2', after: 7 }, { on: 'kick', to: 'kick', after: 7 }, { on: 'special', to: 'missile', after: 7 }],
  },
  punch2: {
    actions: [210],
    ...NORMAL,
    hit: { damage: 3, hitstun: 18, push: 4 },
    events: [{ at: 5, vx: 3 }],
    cancels: [{ on: 'punch', to: 'punch3', after: 6 }, { on: 'kick', to: 'kick2', after: 6 }, { on: 'special', to: 'missile', after: 6 }],
  },
  punch3: {
    actions: [220],
    ...NORMAL,
    hit: { damage: 3, hitstun: 20, push: 5 },
    cancels: [{ on: 'punch', to: 'punch4', after: 10 }, { on: 'kick', to: 'kick4', after: 10 }, { on: 'special', to: 'missile', after: 10 }],
  },
  // 230: o chute baixo que fecha a serie e lanca com um estouro no pe.
  punch4: {
    launch: { vx: 4, vy: 5 },
    actions: [230],
    hit: { damage: 4, hitstun: 30, push: 8, heavy: true },
    events: [fx(7, 'smallBlast', [40, -20])],
  },

  // ---- Corrente do chute (300 -> 310 -> 320 -> 330) ----
  kick: {
    actions: [300],
    ...NORMAL,
    hit: { damage: 3, hitstun: 18, push: 4 },
    cancels: [{ on: 'punch', to: 'punch2', after: 7 }, { on: 'kick', to: 'kick2', after: 7 }, { on: 'special', to: 'missile', after: 7 }],
  },
  kick2: {
    actions: [310],
    ...NORMAL,
    hit: { damage: 3, hitstun: 18, push: 4 },
    cancels: [{ on: 'punch', to: 'punch3', after: 9 }, { on: 'kick', to: 'kick3', after: 9 }, { on: 'special', to: 'missile', after: 9 }],
  },
  // 320: o chute que sobe (DiagUp no pacote), com o gancho de baixo se segurar ↓.
  kick3: {
    actions: [320],
    ...NORMAL,
    hit: { damage: 3, hitstun: 22, push: 3 },
    events: [fx(8, 'whooshArc', [10, -40], { angle: 55 })],
    cancels: [{ on: 'punch', to: 'punch4', after: 8 }, { on: 'kick', to: 'kick4', after: 8 }, { on: 'special', to: 'missile', after: 8 }],
  },
  kick4: {
    launch: { vx: 4, vy: 5 },
    actions: [330],
    hit: { damage: 4, hitstun: 30, push: 8, heavy: true },
    events: [fx(19, 'smallBlast', [45, -22])],
  },

  // ---- ↓ + botao ----
  // 201 (↓P): o gancho que lanca para cima; 301 (↓K): o chute que arma uma
  // explosao no chao a frente; 401 (↓S): cinco granadas lancadas em arco.
  uppercut: {
    actions: [201],
    hit: { damage: 4, hitstun: 30, push: 2 },
    launch: { vx: 1, vy: 8 },
    cooldown: 40,
    events: [fx(10, 'whooshArc', [10, -45], { angle: 80 })],
  },
  groundBomb: {
    actions: [301],
    cooldown: 90,
    areas: [strike(2, 3, [10, -30, 70, 2], { damage: 5, hitstun: 32, push: 6, heavy: true })],
    events: [
      fx(6, 'groundBurst', [48, 0]),
      fx(6, 'smallBlast', [48, -20]),
      fx(7, 'dust', [30, 2]),
    ],
  },
  grenades: {
    actions: [{ id: 401, times: { 3: 14 } }],
    cooldown: 150,
    events: [
      fx(12, 'miniBomb', [24, -22], { velocityX: 5, velocityY: -2 }),
      fx(14, 'miniBomb', [24, -26], { velocityX: 7, velocityY: -4 }),
      fx(16, 'miniBomb', [24, -18], { velocityX: 9, velocityY: -3 }),
      fx(18, 'miniBomb', [24, -30], { velocityX: 11, velocityY: -5 }),
      fx(20, 'miniBomb', [24, -22], { velocityX: 13, velocityY: -2 }),
    ],
  },

  // ---- C: o missil (400). No pacote e o helper 450, que voa a 20 e acompanha a
  // altura do oponente. ----
  missile: {
    actions: [400],
    cooldown: 70,
    events: [
      fx(20, 'missile', [20, -25]),
      fx(20, 'dust', [-30, 4]),
    ],
  },

  // ---- Especiais ----
  // 1000 (↓→P): a bomba. O helper 1005 sai da mao no tick 35, acelera e
  // explode no que encontrar (150, o maior dano normal do pacote).
  bomb: {
    actions: [{ id: 1000, times: { 0: 20 } }],
    cooldown: 150,
    events: [
      fx(4, 'sparkBurst', [30, -40], { follow: 'owner' }),
      fx(20, 'bombOrb', [32, -40]),
      fx(20, 'sparkBurst', [34, -40]),
    ],
  },
  // 1100 (↓←P): quatro explosoes empilhadas a frente, de baixo para cima (os
  // helpers 1101 nos quadros 5 a 8).
  blastColumn: {
    actions: [1100],
    cooldown: 200,
    events: [
      fx(23, 'colBlast', [38, -10]),
      fx(28, 'colBlast', [44, -30]),
      fx(33, 'colBlast', [36, -45]),
      fx(36, 'colBlastLast', [26, -65]),
    ],
  },
  // 1200 (↓→B): ela salta (VelSet y = -20), mira o oponente e mergulha com o
  // pe, explodindo dos dois lados no impacto.
  bombKick: {
    launch: { vx: 4, vy: 7 },
    actions: [{ id: 1200, times: { 0: 14, 4: 60 } }],
    air: true,
    cooldown: 220,
    onLand: 'bombKickLand',
    areas: [strike(3, 4, [-18, -48, 38, 8], { damage: 6, hitstun: 36, push: 10, heavy: true })],
    events: [
      fx(0, 'dust', [-20, 4]),
      { at: 14, vx: 3, vy: -9 },
      fx(14, 'groundBurst', [0, 4]),
      { at: 28, teleport: 62, vx: 4, vy: 8 },
    ],
  },
  bombKickLand: {
    launch: { vx: 5, vy: 8 },
    actions: [{ id: 1200, pick: [4], times: { 0: 12 } }],
    noPush: true,
    areas: [strike(0, 11, [-45, -60, 60, 5], { damage: 8, hitstun: 44, push: 14, heavy: true })],
    events: [fx(0, 'bigBlast', [22, 0]), fx(0, 'bigBlast', [-22, 0]), fx(0, 'groundBurst', [0, 2])],
  },
  // 1300 (↓←B): o soco em investida. Ela cresce no chao, avanca (velset x) e
  // acerta com a caixa do quadro 3; o pacote ainda estala uma onda escura.
  dashPunch: {
    launch: { vx: 5, vy: 5 },
    actions: [{ id: 1300, times: { 0: 10 } }],
    cooldown: 180,
    areas: [strike(3, 4, [-10, -55, 62, -1], { damage: 7, hitstun: 34, push: 10, heavy: true })],
    events: [
      fx(0, 'dust', [-24, 4]),
      { at: 10, vx: 12 },
      fx(10, 'dashRing', [0, -30], { follow: 'owner' }),
      fx(16, 'dashSwirl', [28, -32]),
    ],
  },
  // 1400 (↓→S): a rajada de misseis. Tres saem nos quadros 7, 10 e 14, e o
  // grande no 20.
  missileBarrage: {
    actions: [1400],
    cooldown: 320,
    events: [
      fxLoop(30, 'sparkBurst', [10, -30], 10, 110, { follow: 'owner' }),
      fx(35, 'missileHoming', [20, -28]),
      fx(55, 'missileHoming', [20, -34]),
      fx(75, 'missileHoming', [20, -24]),
      fx(100, 'missileBig', [24, -30]),
      fx(100, 'smallBlast', [24, -30]),
    ],
  },

  // ---- Super ----
  // 3000 (x): ela avanca (VelSet x 20), agarra e, se pegar, vira a cena longa do
  // estado 3001: a tela escurece, linhas de velocidade, uma explosao apos a
  // outra no oponente e, no fim, o helper 1455 (100 de dano e a bola de fogo
  // gigante).
  super: {
    actions: [{ id: 3000, times: { 0: 22 } }],
    cooldown: 1500,
    invulnerable: [0, 40],
    areas: [strike(2, 3, [-5, -57, 46, -2], { damage: 1, hitstun: 100, push: 0, unblockable: true })],
    onHit: { to: 'superBlast' },
    events: [
      fx(0, 'sparkBurst', [20, -40], { follow: 'owner' }),
      { at: 22, vx: 14 },
      fx(22, 'dashRing', [0, -30], { follow: 'owner' }),
      fx(22, 'dust', [-20, 4]),
    ],
  },
  superBlast: {
    launch: { vx: 5, vy: 9 },
    actions: [{ id: 3001, times: { 0: 1, 1: 190 } }, { id: 3002, times: { 0: 1, 1: 30, 2: 5, 3: 5, 4: 5 } }],
    noPush: true,
    invulnerable: [0, 260],
    events: [
      { at: 0, pinOpponent: { dx: 44, lift: 0, ticks: 215, relative: 'self' } },
      fx(0, 'superDark', [0, -200], { target: 'stage' }),
      fx(2, 'superLines', [0, -140], { target: 'stage' }),
      ...SUPER_BLASTS,
      fx(192, 'whiteFlash', [0, -200], { target: 'stage' }),
      fx(196, 'hugeBlast', [0, -30], { target: 'opponent' }),
      fx(196, 'hugeFire', [0, 0], { target: 'opponent' }),
    ],
  },

  // ---- No ar (600/601, 610/611, 620/621) ----
  airPunch: {
    actions: [600],
    air: true,
    ...NORMAL,
    hit: { damage: 3, hitstun: 20, push: 4 },
    cancels: [{ on: 'punch', to: 'airPunch2', after: 8 }, { on: 'kick', to: 'airKick', after: 8 }, { on: 'special', to: 'airSpecial', after: 8 }],
  },
  airPunch2: {
    actions: [601],
    air: true,
    hit: { damage: 3, hitstun: 22, push: 5 },
  },
  airKick: {
    actions: [610],
    air: true,
    ...NORMAL,
    hit: { damage: 3, hitstun: 22, push: 5 },
    events: [fx(7, 'whooshArc', [20, -35], { angle: 20 })],
    cancels: [{ on: 'punch', to: 'airPunch', after: 12 }, { on: 'kick', to: 'airKick2', after: 12 }, { on: 'special', to: 'airSpecial', after: 12 }],
  },
  airKick2: {
    actions: [611],
    air: true,
    hit: { damage: 3, hitstun: 22, push: 5 },
  },
  // 620: o chute mergulhado, com explosao na hora de acertar.
  airSpecial: {
    actions: [620],
    air: true,
    hit: { damage: 4, hitstun: 30, push: 8, heavy: true },
    launch: { vx: 3, vy: 6 },
    events: [{ at: 0, vx: 5, vy: 4 }, fx(18, 'smallBlast', [30, -30])],
  },
};

const EFFECTS = {
  // Poeira e brilhos
  dust: { actions: [7022], size: 0.3, harmless: true },
  dashDust: { actions: [7002], size: 0.4, harmless: true },
  sparkBurst: { actions: [7071], size: 0.1, harmless: true },
  whooshArc: { actions: [7011], size: 0.25, harmless: true },
  groundBurst: { actions: [7018], size: 0.16, harmless: true },
  dashRing: { actions: [7043], size: 0.35, harmless: true },
  dashSwirl: { actions: [7699], size: 0.35, harmless: true },
  smoke: { actions: [7014], size: 0.12, harmless: true },
  // Explosoes: a de fogo (7084), a azul (7085) e o anel (7013) sao as tres que
  // o pacote solta juntas em quase todo estouro.
  smallBlast: { actions: [7084], size: 0.16, harmless: true },
  bigBlast: {
    actions: [7084],
    size: 0.3,
    harmless: true,
    spawns: [
      { at: 0, effect: { id: 'blastBlue', pos: [0, 0] } },
      { at: 0, effect: { id: 'blastRing', pos: [0, 0] } },
    ],
  },
  blastBlue: { actions: [7085], size: 0.3, layer: 'back', harmless: true },
  blastRing: { actions: [7013], size: 0.7, harmless: true },

  // Bomba (helper 1005): a bola que acelera e explode
  bombOrb: {
    actions: [1005],
    loop: true,
    size: 0.3,
    velocityX: 6,
    motion: [{ at: 14, vx: 9 }, { at: 30, vx: 12 }],
    lifetime: 70,
    destroyOnHit: true,
    endAtWall: true,
    launch: { vx: 4, vy: 7 },
    area: { widthRatio: 0.85, heightRatio: 0.85, damage: 9, hitstun: 44, push: 12, heavy: true },
    onDeathSpawn: { id: 'bombBlast', pos: [0, 0] },
    spawns: [{ at: 0, repeat: { every: 3, until: 68 }, effect: { id: 'smoke', pos: [-24, 0] } }],
  },
  bombBlast: {
    actions: [7084],
    size: 0.3,
    harmless: true,
    spawns: [
      { at: 0, effect: { id: 'blastBlue', pos: [0, 0] } },
      { at: 0, effect: { id: 'blastRing', pos: [0, 0] } },
      { at: 2, effect: { id: 'groundBurst', pos: [0, -10] } },
    ],
  },
  // Coluna de explosoes (helper 1101): cada uma acerta uma vez
  colBlast: {
    actions: [7084],
    size: 0.18,
    area: { widthRatio: 0.8, heightRatio: 0.8, until: 3, damage: 3, hitstun: 20, push: 2 },
    spawns: [{ at: 0, effect: { id: 'blastBlue', pos: [0, 0], scale: 0.6 } }, { at: 0, effect: { id: 'blastRing', pos: [0, 0], scale: 0.4 } }],
  },
  colBlastLast: {
    actions: [7084],
    size: 0.22,
    launch: { vx: 3, vy: 8 },
    area: { widthRatio: 0.8, heightRatio: 0.8, until: 3, damage: 5, hitstun: 36, push: 6, heavy: true },
    spawns: [{ at: 0, effect: { id: 'blastBlue', pos: [0, 0], scale: 0.8 } }, { at: 0, effect: { id: 'blastRing', pos: [0, 0], scale: 0.6 } }],
  },

  // Missil (helper 450/1450): voa a 20 e acompanha a altura do oponente
  missile: {
    actions: [1450],
    size: 1.8,
    loop: true,
    velocityX: 14,
    lifetime: 60,
    destroyOnHit: true,
    endAtWall: true,
    area: { widthRatio: 1, heightRatio: 2.4, damage: 4, hitstun: 26, push: 8 },
    onDeathSpawn: { id: 'missileBlast', pos: [0, 0] },
    spawns: [{ at: 0, repeat: { every: 4, until: 58 }, effect: { id: 'smoke', pos: [-18, 0] } }],
  },
  missileHoming: {
    actions: [1450],
    size: 1.8,
    loop: true,
    velocityX: 12,
    motion: [{ at: 4, aim: 12 }],
    lifetime: 70,
    destroyOnHit: true,
    endAtWall: true,
    area: { widthRatio: 1, heightRatio: 2.4, damage: 4, hitstun: 26, push: 8 },
    onDeathSpawn: { id: 'missileBlast', pos: [0, 0] },
    spawns: [{ at: 0, repeat: { every: 4, until: 68 }, effect: { id: 'smoke', pos: [-18, 0] } }],
  },
  missileBig: {
    actions: [1450],
    size: 2.8,
    loop: true,
    velocityX: 13,
    motion: [{ at: 4, aim: 13 }],
    lifetime: 80,
    destroyOnHit: true,
    endAtWall: true,
    launch: { vx: 4, vy: 7 },
    area: { widthRatio: 1, heightRatio: 2.4, damage: 8, hitstun: 40, push: 12, heavy: true },
    onDeathSpawn: { id: 'bombBlast', pos: [0, 0] },
    spawns: [{ at: 0, repeat: { every: 3, until: 78 }, effect: { id: 'smoke', pos: [-22, 0] } }],
  },
  missileBlast: {
    actions: [7084],
    size: 0.18,
    harmless: true,
    spawns: [{ at: 0, effect: { id: 'blastRing', pos: [0, 0], scale: 0.4 } }],
  },

  // Super: a tela escurece, linhas de velocidade (41000), uma explosao apos a
  // outra e a bola de fogo final.
  superDark: {
    solid: { color: [6, 4, 16], steps: [[0.3, 4], [0.7, 8], [0.78, 190], [0.5, 10], [0.1, 10]] },
    cover: [1900, 1900],
    layer: 'back',
    harmless: true,
  },
  superLines: { actions: [{ id: 41000, lengthTicks: 150 }], scale: 0.4, cover: [1500, 720], alpha: 0.85, harmless: true },
  whiteFlash: {
    solid: { color: [255, 250, 240], steps: [[0.4, 3], [0.97, 6], [0.6, 6], [0.2, 8]] },
    cover: [1900, 1900],
    harmless: true,
  },
  superBlast: {
    actions: [7084],
    size: 0.2,
    area: { widthRatio: 0.9, heightRatio: 0.9, until: 3, damage: 2, hitstun: 30, push: 0 },
    spawns: [
      { at: 0, effect: { id: 'blastBlue', pos: [0, 0], scale: 0.7 } },
      { at: 0, effect: { id: 'blastRing', pos: [0, 0], scale: 0.5 } },
      { at: 1, effect: { id: 'groundBurst', pos: [0, -20], scale: 0.7 } },
    ],
  },
  hugeBlast: {
    actions: [7084],
    size: 0.85,
    launch: { vx: 5, vy: 9 },
    area: { widthRatio: 0.7, heightRatio: 0.7, until: 4, damage: 14, hitstun: 70, push: 18, heavy: true, unblockable: true },
    spawns: [
      { at: 0, effect: { id: 'blastBlue', pos: [0, 0], scale: 2.3 } },
      { at: 0, effect: { id: 'blastRing', pos: [0, 0], scale: 2 } },
    ],
  },
  hugeFire: { actions: [7033], size: 1.1, harmless: true },

  // Granada (helper 410): arco, gravidade e uma explosao pequena onde cai
  miniBomb: {
    actions: [1006],
    size: 0.12,
    loop: true,
    velocityX: 6,
    velocityY: -2,
    gravity: 0.34,
    lifetime: 80,
    endOnGround: true,
    destroyOnHit: true,
    area: { widthRatio: 1, heightRatio: 1, damage: 3, hitstun: 24, push: 4 },
    onDeathSpawn: { id: 'miniBlast', pos: [0, 0] },
  },
  miniBlast: {
    actions: [7084],
    size: 0.14,
    harmless: true,
    spawns: [{ at: 0, effect: { id: 'groundBurst', pos: [0, 0], scale: 0.6 } }],
  },
};

const COMBOS = [
  { id: 'bomb', input: '↓→P', animation: 'bomb' },
  { id: 'blast-column', input: '↓←P', animation: 'blastColumn' },
  { id: 'bomb-kick', input: '↓→K', animation: 'bombKick' },
  { id: 'dash-punch', input: '↓←K', animation: 'dashPunch' },
  { id: 'missile-barrage', input: '↓→S', animation: 'missileBarrage' },
  { id: 'super', input: '↓→↓→P', animation: 'super' },
  { id: 'uppercut', input: 'P', hold: '↓', animation: 'uppercut' },
  { id: 'ground-bomb', input: 'K', hold: '↓', animation: 'groundBomb' },
  { id: 'grenades', input: 'S', hold: '↓', animation: 'grenades' },
];

const BUTTONS = {
  ground: { punch: 'punch', kick: 'kick', special: 'missile' },
  air: { punch: 'airPunch', kick: 'airKick', special: 'airSpecial' },
};

const MOVE_LIST = [
  { section: 'Movimento', name: 'Corrida', input: '→→', note: 'Deixa poeira para trás' },
  { section: 'Movimento', name: 'Recuo', input: '←←' },
  { section: 'Golpes', name: 'Sequência do soco', input: 'PPPP', note: 'O último lança com um estouro' },
  { section: 'Golpes', name: 'Sequência do chute', input: 'KKKK', note: 'Mistura com o soco' },
  { section: 'Golpes', name: 'Míssil', input: 'S', note: 'Voa a 20 e acompanha a altura do oponente' },
  { section: 'Golpes', name: 'Gancho', input: 'P', hold: '↓', note: 'Lança para cima' },
  { section: 'Golpes', name: 'Chute-bomba', input: 'K', hold: '↓', note: 'Explode no chão à frente' },
  { section: 'Golpes', name: 'Granadas', input: 'S', hold: '↓', note: 'Cinco, lançadas em arco' },
  { section: 'Golpes', name: 'No ar', input: 'PKS', note: 'O especial é o chute mergulhado' },
  { section: 'Especiais', name: 'Bomba', input: '↓→P', note: 'Acelera e explode no que encontrar' },
  { section: 'Especiais', name: 'Coluna de explosões', input: '↓←P', note: 'Quatro estouros empilhados à frente' },
  { section: 'Especiais', name: 'Chute-bomba', input: '↓→K', note: 'Salta e mergulha explodindo dos dois lados' },
  { section: 'Especiais', name: 'Soco em investida', input: '↓←K', note: 'Avança e lança' },
  { section: 'Especiais', name: 'Rajada de mísseis', input: '↓→S', note: 'Três mísseis teleguiados e um grande' },
  { section: 'Super', name: 'Detonação', input: '↓→↓→P', note: 'Agarra e explode o oponente em cadeia' },
];

importMugenCharacter({
  root: ROOT,
  sffPath: resolve(PACK, 'BombDevil.sff'),
  airPath: resolve(PACK, 'BombDevil.air'),
  outDir: 'public/assets/characters/reze',
  id: 'reze',
  sndPath: resolve(PACK, 'BombDevil.snd'),
  soundsFromDef: resolve(PACK, 'BombDevil.def'),
  name: 'Reze',
  description: 'A garota bomba',
  template: 'public/assets/characters/dummy/dummy_config.json',
  spriteScale: 1.9,
  animations: ANIMATIONS,
  effects: EFFECTS,
  combos: COMBOS,
  buttons: BUTTONS,
  moveList: MOVE_LIST,
  portrait: { sprite: [192, 2], crop: [2, 0, 30, 28], width: 54, height: 50, background: '#1A1418' },
});
