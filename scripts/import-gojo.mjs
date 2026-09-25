// Importa o Gojo do pacote MUGEN/Ikemen "WR-Gojo" (Witherower; creditos em
// CREDITS.md).
//
// O pacote fica em assets-src/gojo/mugen/ (fora do git). SFF v1; cores do
// personagem na paleta PALETTE/1.act (os efeitos trazem as proprias).
// Para regerar: npm run assets:gojo
//
// O pacote desenha em alta resolucao (Gojo tem 107 px parado), entao fica na
// escala 1. Tudo o que e golpe: as sequencias do soco (cinco golpes), do chute
// e do especial, os agachados e aereos, o Guard Break, o Black Flash, os seis
// especiais (Wind Burst, Blue Strafe, Blue Max, Red Counter, Red Reversal,
// Blue Field) e os tres supers (Red Blast, Hollow Purple, Infinite Void).
// Os clarões de tela inteira do pacote (fundo que pisca vermelho/azul/branco)
// ficaram de fora: poluem a tela. O fundo do Infinite Void fica, como o
// mundo do Tsukuyomi. As esquivas, o parry e o agarrao (no pacote, com um
// quarto botao) viram comandos; o Origin Mode (medidor proprio que enche
// apanhando) e o Hollow Nuke vem do 2.cns. De fora: provocacao e carga de
// energia (o jogo nao tem barra de energia; os supers usam tempo de recarga).
// Botoes: soco = x (fraco), chute = y (medio), especial = z (forte).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importMugenCharacter } from './lib/mugen-import.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = resolve(ROOT, 'assets-src/gojo/mugen');

const fx = (at, id, pos = [0, 0], extra = {}) => ({ at, effect: { id, pos, ...extra } });

// Caixa declarada no golpe (areas): quadros from..until, px do pacote.
const strike = (from, until, rect, data) => ({ from, until, rect, ...data });

const NORMAL = { specialCancel: true };
// Todo golpe em pe cancela no chute e no especial ao conectar (y/z do .cns).
const TO_KICK = { on: 'kick', to: 'kick', after: 4 };
const TO_STRONG = { on: 'special', to: 'strong', after: 4 };

// Mira de novo a cada 10 ticks: os orbes seguem o oponente (velset por atan).
const homing = (speed, until) => Array.from({ length: Math.ceil(until / 10) }, (_, index) => ({ at: index * 10, aim: speed }));

const ANIMATIONS = {
  idle: { actions: [0], loop: true },
  walkForward: { actions: [20], loop: true },
  walkBackward: { actions: [21], loop: true },
  jump: { actions: [40, { id: 41, times: { 7: 20 } }] },
  crouch: { actions: [11], loop: true },
  blockStanding: { actions: [130], loop: true },
  blockCrouching: { actions: [131], loop: true },
  hitReaction: { actions: [5000] },
  ko: { actions: [5030, { id: 5050, times: { 4: 30 } }, 5100, 5110] },
  victoryPose: { actions: [{ id: 180, times: { 30: 60 } }] },
  defeatPose: { actions: [{ id: 170, times: { 2: 60 } }] },

  // Corrida (100), pulo para tras (105) e dash aereo (101).
  dashForward: {
    actions: [{ id: 100, lengthTicks: 20 }],
    dash: { distance: 200, moveFrom: 0, moveUntil: 9, invulnerableFrom: 1, invulnerableUntil: 5, cancel: true },
  },
  dashBackward: {
    actions: [105],
    dash: { distance: 150, moveFrom: 0, moveUntil: 7, invulnerableFrom: 1, invulnerableUntil: 4, cancel: true },
  },
  airDashForward: {
    actions: [{ id: 101, times: { 3: 12 } }],
    dash: { distance: 150, moveFrom: 0, moveUntil: 3, invulnerableFrom: 9, invulnerableUntil: 0 },
  },
  airDashBackward: {
    actions: [{ id: 101, times: { 3: 10 } }],
    dash: { distance: 120, moveFrom: 0, moveUntil: 3, invulnerableFrom: 9, invulnerableUntil: 0 },
  },

  // ---- Soco (x): 200 -> 201 -> 202 (rajada) -> 203 (rajada) -> 204 ----
  punch: {
    actions: [200],
    ...NORMAL,
    hit: { damage: 2, hitstun: 18, push: 3 },
    events: [{ frame: 3, vx: 4 }],
    cancels: [{ on: 'punch', to: 'punch2', after: 8 }, TO_KICK, TO_STRONG],
  },
  punch2: {
    actions: [201],
    ...NORMAL,
    hit: { damage: 3, hitstun: 20, push: 3 },
    events: [{ frame: 2, vx: 5 }],
    cancels: [{ on: 'punch', to: 'punch3', after: 8 }, TO_KICK, TO_STRONG],
  },
  punch3: {
    actions: [202],
    ...NORMAL,
    hit: { damage: 1, hitstun: 16, push: 2, every: 9, count: 5 },
    events: [{ frame: 2, vx: 2 }, { frame: 11, vx: 2 }, { frame: 20, vx: 2 }],
    cancels: [{ on: 'punch', to: 'punch4', after: 30 }, TO_KICK, TO_STRONG],
  },
  punch4: {
    actions: [203],
    ...NORMAL,
    hit: { damage: 1, hitstun: 16, push: 2, every: 6, count: 7 },
    events: [{ frame: 2, vx: 3 }, { frame: 15, vx: 3 }, { frame: 24, vx: 3 }],
    cancels: [{ on: 'punch', to: 'punch5', after: 30 }, TO_KICK, TO_STRONG],
  },
  punch5: {
    actions: [204],
    ...NORMAL,
    hit: { damage: 3, hitstun: 32, push: 14, heavy: true },
    events: [{ frame: 1, vx: -6 }, { frame: 4, vx: 14 }],
    cancels: [TO_KICK, TO_STRONG],
  },
  // ---- Chute (y): 210 -> 211 (lancador baixo) ----
  kick: {
    actions: [210],
    ...NORMAL,
    hit: { damage: 3, hitstun: 20, push: 4 },
    events: [{ frame: 4, vx: 5 }],
    cancels: [{ on: 'kick', to: 'kick2', after: 7 }, TO_STRONG],
  },
  kick2: {
    actions: [211],
    ...NORMAL,
    hit: { damage: 5, hitstun: 32, push: 9, heavy: true },
    cancels: [TO_STRONG],
  },
  // ---- Especial (z): 220 (rajada avancando) -> 221 (arremesso) ----
  strong: {
    actions: [220],
    ...NORMAL,
    hit: { damage: 1, hitstun: 16, push: 2, every: 8, count: 8 },
    events: [{ frame: 8, vx: 7 }],
    cancels: [{ on: 'special', to: 'strong2', after: 50 }],
  },
  strong2: {
    actions: [{ id: 221, times: { 15: 12 } }],
    ...NORMAL,
    hit: { damage: 3, hitstun: 36, push: 14, heavy: true },
    events: [{ frame: 6, vx: 10, vy: -3 }],
  },

  // ---- Agachado (segurando ↓): 400 -> 410 -> 420 ----
  crouchLight: {
    actions: [400],
    ...NORMAL,
    hit: { damage: 2, hitstun: 16, push: 2 },
    cancels: [{ on: 'kick', to: 'crouchMedium', after: 4, down: true }, { on: 'special', to: 'crouchStrong', after: 4, down: true }],
  },
  crouchMedium: {
    actions: [410],
    ...NORMAL,
    hit: { damage: 3, hitstun: 20, push: 4 },
    events: [{ frame: 4, vx: 4 }],
    cancels: [{ on: 'special', to: 'crouchStrong', after: 8, down: true }],
  },
  crouchStrong: {
    actions: [420],
    ...NORMAL,
    hit: { damage: 4, hitstun: 30, push: 6, heavy: true },
    events: [{ frame: 2, vx: 4 }],
  },

  // ---- No ar: 600 -> 601 (x), 610 -> 611 -> 612 (y), 620 (z) ----
  airLight: {
    actions: [600],
    air: true,
    ...NORMAL,
    hit: { damage: 2, hitstun: 18, push: 3 },
    cancels: [{ on: 'punch', to: 'airLight2', after: 5 }, { on: 'kick', to: 'airMedium', after: 5 }],
  },
  airLight2: {
    actions: [{ id: 601, times: { 8: 8 } }],
    air: true,
    ...NORMAL,
    hit: { damage: 3, hitstun: 20, push: 4 },
    cancels: [{ on: 'kick', to: 'airMedium', after: 6 }],
  },
  airMedium: {
    actions: [610],
    air: true,
    ...NORMAL,
    hit: { damage: 3, hitstun: 20, push: 4 },
    cancels: [{ on: 'kick', to: 'airMedium2', after: 8 }],
  },
  airMedium2: {
    actions: [611],
    air: true,
    ...NORMAL,
    hit: { damage: 3, hitstun: 22, push: 4 },
    cancels: [{ on: 'kick', to: 'airMedium3', after: 10 }],
  },
  airMedium3: {
    actions: [{ id: 612, times: { 15: 8 } }],
    air: true,
    ...NORMAL,
    hit: { damage: 3, hitstun: 30, push: 8, heavy: true },
    events: [{ frame: 6, vx: 5, vy: -4 }],
  },
  airStrong: {
    actions: [620],
    air: true,
    ...NORMAL,
    hit: { damage: 2, hitstun: 20, push: 4, every: 8, count: 2 },
    events: [{ frame: 2, vx: 6, vy: -2 }],
  },

  // ---- Especiais (↓→ / ↓← + botao) ----
  // Wind Burst (1000): a rajada de ar que arremessa longe (helper 1001).
  windBurst: {
    actions: [1000],
    cooldown: 90,
    events: [{ frame: 5, vx: 8 }, { frame: 7, vx: 0 }, fx(14, 'windBurst', [0, -25]), fx(14, 'windDust', [40, 0])],
  },
  // Blue Strafe (1010): o azul gira em volta dele acertando varias vezes.
  blueStrafe: {
    actions: [{ id: 1010, times: { 3: 50 } }],
    cooldown: 120,
    events: [fx(3, 'blueSpin', [0, -45])],
  },
  // Blue Max (1020): recua no ar e o azul persegue o oponente, puxando.
  blueMax: {
    actions: [{ id: 1020, times: { 3: 30, 6: 30, 10: 10 } }],
    cooldown: 240,
    events: [{ at: 0, vx: -3, vy: -6 }, { frame: 4, vx: 0, vy: 0 }, fx(45, 'blueOrb', [48, -80])],
  },
  // Red Counter (1030): postura; quem bater nele leva o vermelho de perto.
  redCounter: {
    actions: [1030],
    cooldown: 200,
    counter: { from: 0, until: 75, to: 'redCounterStrike' },
  },
  redCounterStrike: {
    actions: [1031],
    invulnerable: [0, 68],
    events: [{ at: 0, teleport: -60, turn: true }, fx(4, 'redFlare', [60, -75]), fx(66, 'redPillar', [60, 0])],
  },
  // Red Reversal (1040): o vermelho que persegue o oponente e explode.
  redReversal: {
    actions: [1040],
    cooldown: 200,
    events: [fx(66, 'redOrb', [74, -49])],
  },
  // Blue Field (1050): sobe e o campo azul em volta dele puxa e acerta.
  blueField: {
    actions: [{ id: 1050, times: { 4: 30, 10: 60 } }],
    cooldown: 300,
    events: [{ frame: 6, vy: -8 }, { frame: 7, vy: 0 }, fx(45, 'field', [0, -60])],
  },
  // Black Flash (↓↓S, 1060): a investida com o soco que nao da para defender.
  blackFlash: {
    actions: [{ id: 1060, times: { 2: 30 } }],
    cooldown: 240,
    noPush: true,
    hit: { damage: 10, hitstun: 50, push: 14, heavy: true, unblockable: true },
    events: [fx(38, 'blackSpark', [20, 0]), { frame: 4, vx: 22 }, fx(41, 'blackFlash', [68, -62])],
  },
  // Guard Break (↓↓K, 360).
  guardBreak: {
    actions: [360],
    cooldown: 300,
    hit: { damage: 5, hitstun: 40, push: 10, heavy: true, unblockable: true },
    events: [{ frame: 4, vx: 10 }, { frame: 6, vx: 0 }],
  },

  // ---- Esquivas, parry e agarrao (no pacote, com o quarto botao) ----
  // Esquiva no lugar (300): intocavel enquanto dura.
  spotDodge: {
    actions: [300],
    cooldown: 30,
    invulnerable: [0, 19],
  },
  // Esquiva para a frente (301): corre intocavel, atravessando o oponente.
  dodgeForward: {
    actions: [301],
    cooldown: 30,
    noPush: true,
    friction: false,
    invulnerable: [0, 14],
    events: [{ at: 0, vx: 10 }, { at: 14, vx: 0 }],
  },
  // Esquiva para tras (302): salto para tras intocavel.
  dodgeBack: {
    actions: [105],
    cooldown: 30,
    invulnerable: [0, 16],
    events: [{ frame: 1, vx: -5, vy: -5 }],
  },
  // Parry (310 -> 311): quem bater na hora certa e empurrado para longe.
  parry: {
    actions: [310],
    cooldown: 40,
    counter: { from: 0, until: 19, to: 'parryPush' },
  },
  parryPush: {
    actions: [311],
    invulnerable: [0, 19],
    areas: [strike(0, 0, [0, -110, 70, 0], { damage: 1, hitstun: 24, push: 14, unblockable: true })],
  },
  // Agarrao (350 -> 351): segura e bate varias vezes; 3 s de recarga.
  grab: {
    actions: [{ id: 350, lengthTicks: 40 }],
    cooldown: 180,
    areas: [strike(3, 12, [0, -100, 42, 0], { damage: 1, hitstun: 110, push: 0, unblockable: true })],
    events: [{ frame: 4, vx: 3 }],
    onHit: { to: 'grabCombo' },
  },
  grabCombo: {
    actions: [351],
    invulnerable: [0, 99],
    events: [
      { at: 0, vx: 10 }, { at: 2, vx: 1.5 },
      ...[7, 14, 21, 28, 35, 42].map((at) => fx(at, 'grabHit', [0, -40], { target: 'opponent', spread: [20, 20] })),
    ],
  },

  // ---- Origin Mode: Hollow Nuke (4000 -> 4001 -> 4002) ----
  // So no Origin Mode e com o oponente abaixo de 1/3 da vida: o azul agarra,
  // o vermelho segura e o roxo explode a tela.
  hollowNuke: {
    actions: [{ id: 4000, times: { 2: 40, 6: 20 } }],
    cooldown: 600,
    opponentLifeBelow: 1 / 3,
    invulnerable: [0, 75],
    events: [fx(9, 'nukeCharge', [-23, -87]), fx(55, 'nukeBlue', [51, -85])],
    onHit: { to: 'nukeRed' },
  },
  nukeRed: {
    actions: [{ id: 4001, times: { 0: 40, 9: 20 } }],
    invulnerable: [0, 80],
    events: [
      { at: 0, standAt: -150, pinOpponent: { dx: 0, lift: 30, ticks: 220 } },
      fx(4, 'nukeRedShot', [51, -85]),
    ],
    next: 'nukeBlast',
  },
  nukeBlast: {
    actions: [{ id: 4002, times: { 0: 150 } }],
    invulnerable: [0, 180],
    events: [fx(0, 'nukeOrb', [0, -60], { target: 'opponent' }), fx(20, 'nukeExplosion', [0, -180], { target: 'stage' })],
  },

  // ---- Supers (↓→↓→ + botao) ----
  // Red Blast (3000): o feixe vermelho a frente, varios acertos.
  redBlast: {
    actions: [{ id: 3000, times: { 3: 30, 5: 60 } }],
    cooldown: 900,
    events: [fx(46, 'redBeam', [80, -70], { scale: [1.6, 0.55] }), fx(46, 'redFlare', [80, -70])],
  },
  // Hollow Purple (3020): o azul atras, o vermelho a frente, os dois se
  // juntam no roxo, que atravessa a tela.
  hollowPurple: {
    actions: [{ id: 3020, times: { 3: 40, 5: 40, 6: 40, 8: 30, 19: 30 } }],
    cooldown: 900,
    invulnerable: [0, 130],
    events: [
      fx(53, 'purpleBlue', [-25, -62]),
      fx(93, 'purpleRed', [125, -62]),
      fx(136, 'purple', [50, -62]),
      { at: 179, vx: -10 },
    ],
  },
  // Infinite Void (3030): a expansao de dominio. O oponente fica parado no
  // meio do vazio, perdendo vida, ate o dominio acabar.
  infiniteVoid: {
    actions: [{ id: 3030, times: { 4: 40, 11: 40, 12: 30, 13: 40, 14: 200, 15: 30, 16: 30 } }],
    cooldown: 1200,
    invulnerable: [0, 380],
    events: [
      { at: 170, standAt: -110, pinOpponent: { dx: 0, lift: 0, ticks: 200 } },
      fx(170, 'voidWorld', [0, -180], { target: 'stage' }),
      fx(172, 'voidDrain', [0, -50], { target: 'opponent' }),
    ],
  },
};

const EFFECTS = {
  grabHit: {
    actions: [10350],
    size: 0.6,
    area: { rect: [-40, -40, 40, 40], until: 2, damage: 1, hitstun: 30, push: 0, unblockable: true },
  },
  // Aura do Origin Mode (explod 10103 do 2.cns): o raio escuro em volta dele.
  originAura: {
    actions: [10103],
    loop: true,
    lifetime: 2000,
    follow: 'owner',
    layer: 'back',
    tag: 'origin',
    harmless: true,
  },
  nukeCharge: { actions: [{ id: 101020, lengthTicks: 45 }], size: 0.35, scale: 0.5, harmless: true },
  nukeBlue: {
    actions: [{ id: 1021, lengthTicks: 40 }],
    size: 0.3,
    scale: 0.45,
    loop: true,
    lifetime: 40,
    velocityX: 20,
    destroyOnHit: true,
    hit: { damage: 2, hitstun: 200, push: 0, unblockable: true },
  },
  nukeRedShot: { actions: [{ id: 1041, lengthTicks: 30 }], size: 0.3, scale: 0.45, loop: true, lifetime: 30, velocityX: 14, harmless: true },
  nukeOrb: { actions: [{ id: 3021, lengthTicks: 150 }], size: 0.5, scale: 0.35, loop: true, lifetime: 150, harmless: true },
  // A explosao roxa (104001, 300 quadros de tela inteira): um a cada quatro.
  nukeExplosion: {
    actions: [{ id: 104001, pick: Array.from({ length: 75 }, (_, index) => index * 4), times: Object.fromEntries(Array.from({ length: 75 }, (_, index) => [index, 2])) }],
    scale: 0.25,
    cover: [920, 520],
    layer: 'front',
    area: { rect: [-600, -500, 600, 500], from: 20, until: 22, damage: 30, hitstun: 90, push: 14, heavy: true, unblockable: true },
  },
  // Hitbox do vento (1001: -60..60) sem desenho; a poeira marca o golpe.
  windBurst: {
    actions: [{ id: 1001, times: { 0: 30 } }],
    velocityX: 15,
    lifetime: 30,
    destroyOnHit: true,
    hit: { damage: 8, hitstun: 40, push: 22, heavy: true },
  },
  windDust: { actions: [14442], size: 0.6 },
  blueSpin: {
    actions: [{ id: 1011, times: { 0: 50 } }],
    size: 0.3,
    follow: 'owner',
    orbit: [85, 13, 20],
    hit: { damage: 1, hitstun: 16, push: 1, every: 4, count: 8 },
  },
  blueOrb: {
    actions: [{ id: 1021, lengthTicks: 100 }],
    size: 0.35,
    scale: 0.45,
    lifetime: 100,
    motion: homing(5, 100),
    hit: { damage: 1, hitstun: 20, push: 1, every: 8, count: 8 },
    onDeathSpawn: { id: 'blueBlast' },
  },
  blueBlast: {
    actions: [201020],
    size: 0.5,
    scale: 0.4,
    area: { rect: [-88, -88, 88, 88], until: 3, damage: 5, hitstun: 36, push: 10, heavy: true },
  },
  redFlare: { actions: [101031], size: 0.5, scale: 0.5 },
  redPillar: {
    actions: [101035],
    size: 0.6,
    scale: 0.4,
    area: { rect: [-60, -300, 60, 0], until: 4, damage: 10, hitstun: 40, push: 14, heavy: true, unblockable: true },
  },
  redOrb: {
    actions: [{ id: 1041, lengthTicks: 100 }],
    size: 0.35,
    scale: 0.45,
    lifetime: 100,
    motion: homing(8, 100),
    hit: { damage: 1, hitstun: 18, push: 1, every: 5, count: 8 },
    onDeathSpawn: { id: 'redBlastSmall' },
  },
  redBlastSmall: {
    actions: [101031],
    size: 0.4,
    scale: 0.5,
    area: { rect: [-88, -88, 88, 88], until: 3, damage: 4, hitstun: 36, push: 10, heavy: true },
  },
  field: {
    actions: [{ id: 101050, lengthTicks: 80 }],
    size: 0.6,
    scale: 0.4,
    loop: true,
    lifetime: 80,
    follow: 'owner',
    endOnOwnerHit: true,
    area: { rect: [-150, -150, 150, 150], damage: 1, hitstun: 18, push: -2, every: 8, count: 10 },
  },
  blackSpark: { actions: [101062], size: 0.4, scale: 0.6 },
  blackFlash: { actions: [101060], size: 0.8, scale: 0.6 },
  redBeam: {
    actions: [{ id: 103002, lengthTicks: 70 }],
    size: 1,
    scale: 0.3,
    loop: true,
    lifetime: 70,
    endWithMove: true,
    area: { rect: [-40, -60, 450, 60], damage: 1, hitstun: 20, push: 2, every: 5, count: 14 },
  },
  purpleBlue: { actions: [{ id: 1021, lengthTicks: 83 }], size: 0.35, scale: 0.45, loop: true, lifetime: 83 },
  purpleRed: { actions: [{ id: 1041, lengthTicks: 43 }], size: 0.35, scale: 0.45, loop: true, lifetime: 43 },
  purple: {
    actions: [{ id: 3021, lengthTicks: 110 }],
    size: 0.5,
    scale: 0.35,
    loop: true,
    lifetime: 110,
    motion: [{ at: 0, vx: 0 }, { at: 43, vx: 18 }],
    hitDelay: 43,
    hit: { damage: 2, hitstun: 24, push: 3, every: 5, count: 8 },
  },
  voidWorld: {
    actions: [{ id: 103033, lengthTicks: 200 }],
    scale: 0.5,
    loop: true,
    lifetime: 200,
    layer: 'back',
    cover: [920, 520],
    opaque: true,
  },
  voidDrain: {
    actions: [{ id: 1001, times: { 0: 190 } }],
    lifetime: 190,
    follow: 'target',
    area: { rect: [-40, -60, 40, 60], damage: 2, hitstun: 40, push: 0, unblockable: true, every: 20, count: 9 },
  },
};

const special = (id, input, names) => [
  { id: `${id}-p`, input: `${input}P`, animation: names[0] },
  { id: `${id}-k`, input: `${input}K`, animation: names[1] },
  { id: `${id}-s`, input: `${input}S`, animation: names[2] },
];
const COMBOS = [
  ...special('super', '↓→↓→', ['redBlast', 'hollowPurple', 'infiniteVoid']),
  ...special('forward', '↓→', ['windBurst', 'blueStrafe', 'blueMax']),
  ...special('back', '↓←', ['redCounter', 'redReversal', 'blueField']),
  { id: 'hollow-nuke', input: '↓←↓←S', animation: 'hollowNuke', mode: 'origin' },
  { id: 'guard-break', input: '↓↓K', animation: 'guardBreak' },
  { id: 'spot-dodge', input: '↓↓P', animation: 'spotDodge' },
  { id: 'dodge-forward', input: '←→P', animation: 'dodgeForward' },
  { id: 'dodge-back', input: '→←P', animation: 'dodgeBack' },
  { id: 'parry', input: '←→K', animation: 'parry' },
  { id: 'grab', input: '←→S', animation: 'grab' },
  { id: 'black-flash', input: '↓↓S', animation: 'blackFlash' },
  { id: 'crouch-p', input: 'P', hold: '↓', animation: 'crouchLight' },
  { id: 'crouch-k', input: 'K', hold: '↓', animation: 'crouchMedium' },
  { id: 'crouch-s', input: 'S', hold: '↓', animation: 'crouchStrong' },
];

const BUTTONS = {
  ground: { punch: 'punch', kick: 'kick', special: 'strong' },
  air: { punch: 'airLight', kick: 'airMedium', special: 'airStrong' },
};

const MOVE_LIST = [
  { section: 'Movimento', name: 'Corrida', input: '→→', note: 'Atravessa o oponente; emenda num golpe' },
  { section: 'Movimento', name: 'Pulo para trás', input: '←←' },
  { section: 'Movimento', name: 'Dash aéreo', input: '→→', note: 'No ar' },
  { section: 'Movimento', name: 'Pulo duplo', input: '↑↑', note: 'No ar, aperte para cima de novo' },
  { section: 'Golpes', name: 'Sequência do soco', input: 'PPPPP', note: 'Cinco golpes; os do meio são rajadas' },
  { section: 'Golpes', name: 'Sequência do chute', input: 'KK', note: 'Fecha com o lançador baixo' },
  { section: 'Golpes', name: 'Rajada e arremesso', input: 'SS' },
  { section: 'Golpes', name: 'Agachado (fraco, médio, forte)', input: 'P', hold: '↓', note: 'Também com chute e especial' },
  { section: 'Golpes', name: 'No ar', input: 'PKS' },
  { section: 'Especiais', name: 'Wind Burst', input: '↓→P', note: 'Rajada de ar que arremessa longe' },
  { section: 'Especiais', name: 'Blue Strafe', input: '↓→K', note: 'O azul gira em volta dele' },
  { section: 'Especiais', name: 'Blue Max', input: '↓→S', note: 'O azul persegue o oponente e explode' },
  { section: 'Especiais', name: 'Red Counter', input: '↓←P', note: 'Postura: quem bater leva o vermelho' },
  { section: 'Especiais', name: 'Red Reversal', input: '↓←K', note: 'O vermelho persegue o oponente e explode' },
  { section: 'Especiais', name: 'Blue Field', input: '↓←S', note: 'Campo azul em volta dele' },
  { section: 'Especiais', name: 'Guard Break', input: '↓↓K', note: 'Não dá para defender' },
  { section: 'Especiais', name: 'Black Flash', input: '↓↓S', note: 'Investida que não dá para defender' },
  { section: 'Defesa', name: 'Esquiva', input: '↓↓P', note: 'Intocável no lugar' },
  { section: 'Defesa', name: 'Esquiva para frente', input: '←→P', note: 'Atravessa o oponente intocável' },
  { section: 'Defesa', name: 'Esquiva para trás', input: '→←P' },
  { section: 'Defesa', name: 'Parry', input: '←→K', note: 'Na hora certa, empurra quem bateu' },
  { section: 'Golpes', name: 'Agarrão', input: '←→S', note: 'Segura e bate várias vezes' },
  { section: 'Origin Mode', name: 'Origin Mode', input: '', note: 'Liga sozinho quando o medidor enche (apanhando e batendo): cura, aura e mais dano' },
  { section: 'Origin Mode', name: 'Hollow Nuke', input: '↓←↓←S', note: 'Só no Origin Mode, com o oponente abaixo de 1/3 da vida' },
  { section: 'Super', name: 'Red Blast', input: '↓→↓→P', note: 'Feixe vermelho' },
  { section: 'Super', name: 'Hollow Purple', input: '↓→↓→K', note: 'Azul e vermelho viram o roxo' },
  { section: 'Super', name: 'Domain Expansion: Infinite Void', input: '↓→↓→S', note: 'Prende o oponente no vazio' },
];

importMugenCharacter({
  root: ROOT,
  sffPath: resolve(PACK, 'DATA/sprite.sff'),
  sffOptions: { actPath: resolve(PACK, 'PALETTE/1.act') },
  airPath: resolve(PACK, 'DATA/anim.air'),
  outDir: 'public/assets/characters/gojo',
  id: 'gojo',
  name: 'Gojo',
  description: 'O mais forte',
  template: 'public/assets/characters/dummy/dummy_config.json',
  animations: ANIMATIONS,
  effects: EFFECTS,
  combos: COMBOS,
  buttons: BUTTONS,
  moveList: MOVE_LIST,
  // Origin Mode (2.cns): medidor de 1000 que enche apanhando e batendo; cheio,
  // cura 1/6 da vida, ganha aura e mais dano, e esvazia em ~16 s.
  modes: { origin: { keepBase: true } },
  awakening: { mode: 'origin', gauge: 1000, onHit: 25, onAttackHit: 10, drain: 1, heal: 1 / 6, damageScale: 1.2, aura: 'originAura' },
  portrait: { sprite: [9000, 1], crop: [0, 0, 120, 132], width: 50, height: 55, background: '#141A26' },
});
