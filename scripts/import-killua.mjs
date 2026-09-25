// Importa o Killua do pacote MUGEN "Killua" (Petamynx; creditos em
// CREDITS.md), no estilo Jump Ultimate Stars.
//
// O pacote fica em assets-src/killua/mugen/ (fora do git). SFF v2 (PNG) com
// a paleta 1.act. Para regerar: npm run assets:killua
//
// Os efeitos do pacote sao desenhados grandes e reduzidos no proprio .air
// (escala e rotacao por quadro do MUGEN 1.1), sempre com o eixo no pe dele:
// entram com pos 0,0. O sprite e pequeno (49 px parado): spriteScale 2 poe o
// Killua na altura do elenco.
// Golpes: as tres sequencias (a/b/c do J-Stars: soco, chute, eletricidade),
// agachado e aereos, o agarrao, os seis especiais do .cmd e os supers
// (Godspeed, Narukami, Kanmuru e o Whirlwind final, com o oponente abaixo de
// 1/3 da vida, como no pacote).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importMugenCharacter } from './lib/mugen-import.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = resolve(ROOT, 'assets-src/killua/mugen');

const fx = (at, id, extra = {}) => ({ at, effect: { id, pos: [0, 0], ...extra } });
const fxFrame = (frame, id, extra = {}) => ({ frame, effect: { id, pos: [0, 0], ...extra } });
const fxIn = (action, frame, id) => ({ action, frame, effect: { id, pos: [0, 0] } });
const sound = (at, key) => ({ at, sound: key });
const soundFrame = (frame, key) => ({ frame, sound: key });

const NORMAL = { specialCancel: true };
const chain = (on, to, after = 4) => ({ on, to, after });

const ANIMATIONS = {
  idle: { actions: [0], loop: true },
  walkForward: { actions: [20], loop: true },
  walkBackward: { actions: [21], loop: true },
  jump: { actions: [40, 41] },
  crouch: { actions: [11], loop: true },
  blockStanding: { actions: [{ id: 130, times: { 0: 30 } }], loop: true },
  blockCrouching: { actions: [{ id: 131, times: { 0: 30 } }], loop: true },
  hitReaction: { actions: [5000] },
  ko: { actions: [5030, { id: 5050, times: { 2: 20 } }, 5100, 5110] },
  victoryPose: { actions: [{ id: 180, times: { 4: 60 } }] },
  defeatPose: { actions: [{ id: 170, times: { 5: 60 } }] },

  // Passo rapido (60/70): some e reaparece a frente/atras.
  dashForward: {
    actions: [{ id: 100, pick: [0, 1, 2, 3, 4, 5, 6] }],
    dash: { distance: 160, moveFrom: 1, moveUntil: 5, invulnerableFrom: 1, invulnerableUntil: 4, cancel: true },
  },
  dashBackward: {
    actions: [105],
    dash: { distance: 110, moveFrom: 0, moveUntil: 1, invulnerableFrom: 0, invulnerableUntil: 1 },
  },
  airDashForward: {
    actions: [{ id: 100, pick: [0, 1, 2, 3, 4, 5, 6] }],
    dash: { distance: 130, moveFrom: 1, moveUntil: 5, invulnerableFrom: 9, invulnerableUntil: 0 },
  },
  airDashBackward: {
    actions: [105],
    dash: { distance: 100, moveFrom: 0, moveUntil: 1, invulnerableFrom: 9, invulnerableUntil: 0 },
  },

  // ---- a (soco): 200 -> 210 -> 220 -> 230 ----
  punch: {
    actions: [200],
    ...NORMAL,
    hit: { damage: 2, hitstun: 16, push: 2 },
    events: [{ at: 0, vx: 2 }, soundFrame(3, 'swing1'), fxFrame(3, 'slash1')],
    cancels: [chain('punch', 'punch2'), chain('kick', 'kick'), chain('special', 'strong')],
  },
  punch2: {
    actions: [210],
    ...NORMAL,
    hit: { damage: 2, hitstun: 18, push: 3 },
    events: [{ at: 0, vx: 2 }, soundFrame(3, 'swing2'), fxFrame(3, 'slash2')],
    cancels: [chain('punch', 'punch3'), chain('kick', 'kick'), chain('special', 'strong')],
  },
  punch3: {
    actions: [220],
    ...NORMAL,
    hit: { damage: 2, hitstun: 18, push: 4 },
    events: [{ at: 0, vx: 4 }, soundFrame(2, 'swing1'), fxFrame(2, 'slash3')],
    cancels: [chain('punch', 'punch4'), chain('kick', 'kick'), chain('special', 'strong')],
  },
  punch4: {
    actions: [230],
    ...NORMAL,
    hit: { damage: 3, hitstun: 22, push: 6 },
    events: [{ at: 0, vx: 5 }, soundFrame(3, 'swing3'), fxFrame(4, 'slash4')],
    cancels: [chain('kick', 'kick'), chain('special', 'strong')],
  },

  // ---- b (chute): 300 -> 310 -> 320 -> 330 ----
  kick: {
    actions: [300],
    ...NORMAL,
    hit: { damage: 2, hitstun: 18, push: 3 },
    events: [{ at: 0, vx: 2 }, soundFrame(3, 'swing2'), fxFrame(3, 'kickArc1')],
    cancels: [chain('kick', 'kick2'), chain('special', 'strong')],
  },
  kick2: {
    actions: [310],
    ...NORMAL,
    hit: { damage: 2, hitstun: 20, push: 2 },
    events: [soundFrame(4, 'swing3'), { frame: 4, vx: 12 }, { frame: 6, vx: 0 }, fxFrame(4, 'dashLine'), fxFrame(4, 'kickArc2'), fxFrame(5, 'kickArc3')],
    cancels: [chain('kick', 'kick3'), chain('special', 'strong')],
  },
  kick3: {
    actions: [320],
    ...NORMAL,
    hit: { damage: 2, hitstun: 20, push: 2 },
    events: [soundFrame(4, 'swing3'), { frame: 4, vx: 12 }, { frame: 6, vx: 0 }, fxFrame(4, 'dashLine'), fxFrame(4, 'kickArc2'), fxFrame(5, 'kickArc4')],
    cancels: [chain('kick', 'kick4'), chain('special', 'strong')],
  },
  kick4: {
    actions: [330],
    ...NORMAL,
    hit: { damage: 3, hitstun: 28, push: 8, heavy: true },
    events: [{ at: 0, vx: 5 }, soundFrame(3, 'swing1'), fxFrame(3, 'kickArc5')],
    cancels: [chain('special', 'strong')],
  },

  // ---- c (eletricidade): 400 -> 410 -> 420 ----
  strong: {
    actions: [400],
    ...NORMAL,
    hits: [{ damage: 1, hitstun: 18, push: 1, every: 2, count: 2 }],
    events: [soundFrame(3, 'zap1'), fxFrame(3, 'zapA'), fxFrame(3, 'zapB'), fxFrame(3, 'zapC')],
    cancels: [chain('special', 'strong2')],
  },
  strong2: {
    actions: [410],
    ...NORMAL,
    hits: [{ damage: 1, hitstun: 18, push: 1, every: 3, count: 2 }],
    events: [soundFrame(5, 'zap2'), { frame: 5, vx: 3 }, { frame: 7, vx: 0 }, fxFrame(5, 'zapD'), fxFrame(5, 'zapE'), fxFrame(5, 'zapF')],
    cancels: [chain('special', 'strong3')],
  },
  strong3: {
    actions: [420],
    ...NORMAL,
    hits: [{ damage: 3, hitstun: 30, push: 8, heavy: true }],
    events: [soundFrame(4, 'zap3'), { frame: 4, vx: 2 }, fxFrame(4, 'zapG'), fxFrame(4, 'zapH'), fxFrame(4, 'zapI')],
  },

  // ---- Segurando ↓ ----
  // 340: rasteira; 430: lancador; 250: a rajada de socos (a+b).
  sweep: {
    actions: [340],
    ...NORMAL,
    hit: { damage: 2, hitstun: 20, push: 5 },
    events: [{ at: 0, vx: 3 }, soundFrame(3, 'swing2'), fxFrame(3, 'lowArc')],
  },
  launcher: {
    actions: [430],
    ...NORMAL,
    hit: { damage: 3, hitstun: 30, push: 4, heavy: true },
    events: [{ at: 0, vx: 3 }, soundFrame(2, 'swing3'), fxFrame(3, 'upArc')],
  },
  rush: {
    actions: [250],
    ...NORMAL,
    hits: [{ damage: 1, hitstun: 16, push: 1, every: 6, count: 5 }],
    events: [sound(0, 'voiceRush'), ...[11, 21, 31].map((at) => fx(at, 'rushA')), ...[16, 26].map((at) => fx(at, 'rushB')), ...[11, 16, 21, 26, 31].map((at) => sound(at, 'swing1'))],
  },
  // 350 (b+c): a investida com o golpe de mao.
  dashStrike: {
    actions: [350],
    cooldown: 40,
    friction: false,
    hit: { damage: 3, hitstun: 24, push: 10, heavy: true },
    events: [sound(0, 'voiceRush'), { at: 0, vx: 2 }, { frame: 4, vx: 12 }, { frame: 6, vx: 0 }, soundFrame(4, 'swing3'), fxFrame(4, 'dashStrikeArc')],
  },
  // 440 (a+c): agarra, bate tres vezes e chuta para longe.
  throw: {
    actions: [440],
    cooldown: 120,
    hit: { damage: 1, hitstun: 120, push: 0, unblockable: true },
    events: [sound(0, 'voiceGrab'), { at: 0, vx: 4 }, { frame: 4, vx: 0 }],
    onHit: { to: 'throwCombo' },
  },
  throwCombo: {
    actions: [441, 441, 441, 442],
    invulnerable: [0, 100],
    events: [
      { at: 0, pinOpponent: { dx: 24, lift: 0, ticks: 80, relative: 'self' } },
      ...[0, 27, 54].flatMap((at) => [
        sound(at + 4, 'hitHeavy'),
        fx(at + 4, 'throwHit', { target: 'opponent', damage: 2 }),
      ]),
      { action: 442, frame: 3, effect: { id: 'throwHit', pos: [0, 0], target: 'opponent', damage: 3, heavy: true } },
    ],
  },

  // ---- No ar ----
  airPunch: {
    actions: [600],
    air: true,
    ...NORMAL,
    hit: { damage: 2, hitstun: 18, push: 3 },
    events: [soundFrame(3, 'swing1'), fxFrame(3, 'airArc1')],
    cancels: [chain('kick', 'airKick'), chain('special', 'airStrong')],
  },
  airKick: {
    actions: [610],
    air: true,
    ...NORMAL,
    hit: { damage: 2, hitstun: 20, push: 4 },
    events: [soundFrame(3, 'swing2'), fxFrame(3, 'airArc2')],
    cancels: [chain('special', 'airStrong')],
  },
  // 620: a investida aerea com relampago.
  airStrong: {
    actions: [620],
    air: true,
    float: true,
    hit: { damage: 3, hitstun: 26, push: 6, heavy: true },
    events: [{ at: 5, vx: 7, vy: 0.1 }, { frame: 8, vx: 3 }, soundFrame(4, 'zap2'), fxFrame(4, 'dashLine'), fxFrame(4, 'kickArc2'), fxFrame(5, 'kickArc4')],
  },
  // Segurando ↓ no ar: 605 (golpe para baixo), 615 (mergulho), 625 (lanca).
  airDownPunch: {
    actions: [605],
    air: true,
    hit: { damage: 3, hitstun: 24, push: 5, heavy: true },
    events: [soundFrame(3, 'swing3'), fxFrame(3, 'airArc3')],
  },
  airDive: {
    actions: [615],
    air: true,
    hit: { damage: 3, hitstun: 26, push: 8, heavy: true },
    events: [{ at: 0, vx: 5.8, vy: -4.2 }, { at: 14, vx: 3, vy: 6 }, soundFrame(6, 'swing3'), fx(4, 'diveTrail'), fxFrame(6, 'diveArc')],
  },
  airUpper: {
    actions: [625],
    air: true,
    hit: { damage: 3, hitstun: 26, push: 4, heavy: true },
    events: [soundFrame(3, 'swing3'), fxFrame(3, 'airArc4')],
  },

  // ---- Especiais ----
  // 1000 (↓→a): tres investidas atravessando o oponente.
  whirlwind: {
    actions: [1000, 1001, 1002],
    cooldown: 90,
    friction: false,
    hits: [
      { damage: 2, hitstun: 30, push: 1 },
      { damage: 2, hitstun: 30, push: 1 },
      { damage: 3, hitstun: 36, push: 10, heavy: true },
    ],
    events: [
      sound(0, 'voiceWhirl'),
      fxFrame(4, 'whirlA'), fxFrame(4, 'whirlB'), fxFrame(4, 'whirlC'),
      { frame: 4, vx: 14 }, { frame: 6, vx: 0 }, soundFrame(4, 'zap1'),
      { action: 1001, frame: 4, vx: 10 }, { action: 1001, frame: 6, vx: 0 }, fxIn(1001, 5, 'whirlD'),
      { action: 1002, frame: 4, vx: 10 }, { action: 1002, frame: 6, vx: 0 }, fxIn(1002, 5, 'whirlE'),
    ],
  },
  // 1200 (↓←a): o io-io eletrico prende; o raio de 1201 atravessa.
  yoyo: {
    actions: [1200],
    cooldown: 120,
    hits: [{ damage: 1, hitstun: 60, push: 0 }],
    events: [sound(0, 'voiceYoyo'), soundFrame(3, 'zap1'), fxFrame(3, 'yoyoCord')],
    onHit: { to: 'yoyoDash' },
  },
  yoyoDash: {
    actions: [1201],
    friction: false,
    hit: { damage: 5, hitstun: 36, push: 12, heavy: true },
    events: [
      soundFrame(4, 'zap3'),
      fxFrame(3, 'yoyoFlash'), fxFrame(4, 'yoyoBolt'), fxFrame(4, 'yoyoTrail'), fxFrame(4, 'yoyoSpark'),
      { frame: 4, vx: 30 }, { frame: 5, vx: 10 }, { frame: 8, vx: 2 },
    ],
  },
  // 1600 (↓→b): o corpo em relampago acerta em volta dele.
  lightningPalm: {
    actions: [1600],
    cooldown: 120,
    hits: [{ damage: 1, hitstun: 20, push: 1, every: 10, count: 7 }],
    events: [
      sound(0, 'voicePalm'), fxFrame(1, 'palmSpark'), soundFrame(4, 'zap3'),
      fxFrame(4, 'palmBoltA'), fxFrame(4, 'palmBoltB'), fxFrame(4, 'palmBoltC'), fxFrame(4, 'palmBoltD'),
    ],
  },
  // 1300 (↓←b): guarda; quem bater leva o contra-ataque (1301).
  counterStance: {
    actions: [1300],
    cooldown: 90,
    counter: { from: 40, until: 130, to: 'counterStrike' },
    events: [sound(0, 'voiceCounter'), fxFrame(2, 'counterGlow'), fxFrame(3, 'counterGlow2')],
  },
  counterStrike: {
    actions: [1305],
    invulnerable: [0, 20],
    hits: [{ damage: 5, hitstun: 36, push: 12, heavy: true }],
    events: [sound(0, 'zap3'), fx(0, 'counterA'), fx(0, 'counterB'), fx(0, 'counterC'), fx(0, 'counterD'), fx(0, 'counterE')],
  },
  // 1400 (↓→c): o raio que cai na frente enquanto ele salta.
  thunderbolt: {
    actions: [1400],
    cooldown: 150,
    events: [
      sound(0, 'voiceBolt'),
      soundFrame(3, 'zap3'),
      fxFrame(3, 'bolt', { pos: [40, 0] }),
      fxFrame(3, 'boltFlash', { pos: [40, 0] }),
      { frame: 3, vx: 3, vy: -13 },
    ],
  },
  // 1500 (↓←c): arrancada; se pegar, a sequencia de golpes (1501/1502).
  rushGrab: {
    actions: [1500],
    cooldown: 150,
    friction: false,
    // A caixa do pacote so existe na 1501: aqui ela vale na arrancada.
    areas: [{ rect: [0, -45, 30, 0], from: 3, until: 4, damage: 1, hitstun: 60, push: 0 }],
    events: [sound(0, 'voiceRush'), { frame: 4, vx: 12 }, soundFrame(4, 'zap1')],
    onHit: { to: 'rushCombo' },
    next: 'rushStop',
  },
  rushStop: { actions: [1503] },
  rushCombo: {
    actions: [1501, 1501, 1501, 1502],
    invulnerable: [0, 70],
    hits: [
      { damage: 1, hitstun: 30, push: 0 },
      { damage: 1, hitstun: 30, push: 0 },
      { damage: 1, hitstun: 30, push: 0 },
      { damage: 5, hitstun: 40, push: 14, heavy: true },
    ],
    events: [{ at: 0, vx: 0 }, soundFrame(2, 'hitHeavy'), { action: 1502, at: 1, sound: 'zap3' }],
  },

  // ---- Supers (recarga no lugar da barra) ----
  // 2500 (↓→↓→P): avanca devagar; se pegar, o golpe de relampago (2502).
  godspeed: {
    actions: [{ id: 2500, lengthTicks: 100 }],
    cooldown: 900,
    friction: false,
    hits: [{ damage: 1, hitstun: 200, push: 0 }],
    events: [sound(0, 'voiceSuper1'), { frame: 2, vx: 1.3 }, fx(0, 'superAura')],
    onHit: { to: 'godspeedStrike' },
  },
  godspeedStrike: {
    actions: [2502],
    invulnerable: [0, 164],
    events: [
      { at: 0, vx: 0, pinOpponent: { dx: 30, lift: 0, ticks: 150, relative: 'self' } },
      sound(0, 'voiceSuper1b'),
      { frame: 4, sound: 'thunder' },
      fxFrame(4, 'godA'), fxFrame(4, 'godB'), fxFrame(4, 'godC'), fxFrame(4, 'godD'), fxFrame(4, 'godE'), fxFrame(4, 'godF'),
      { frame: 4, effect: { id: 'godHit', pos: [30, 0], damage: 14 } },
    ],
  },
  // 2600 (↓→↓→K): Narukami, o relampago enorme a frente.
  narukami: {
    actions: [2600],
    cooldown: 900,
    invulnerable: [0, 62],
    hits: [{ damage: 13, hitstun: 50, push: 16, heavy: true }],
    events: [
      sound(0, 'voiceSuper2'),
      fx(47, 'naruA'), fx(50, 'naruB'), fx(70, 'naruC'),
      fxFrame(6, 'naruD'), fxFrame(6, 'naruE'), fxFrame(6, 'naruF'), fxFrame(6, 'naruG'),
      soundFrame(6, 'thunder'),
    ],
  },
  // 2700 (↓→↓→S): Kanmuru, a sequencia de golpes relampago.
  kanmuru: {
    actions: [2700],
    cooldown: 900,
    invulnerable: [0, 54],
    hits: [{ damage: 2, hitstun: 30, push: 2, every: 10, count: 6 }],
    events: [sound(0, 'voiceSuper3'), soundFrame(6, 'zap3'), fxFrame(6, 'kanA'), fxFrame(8, 'kanB')],
  },
  // 3000 (↓←↓←K): o ataque final; com o oponente abaixo de 1/3 da vida.
  finale: {
    actions: [3000],
    cooldown: 1200,
    opponentLifeBelow: 1 / 3,
    invulnerable: [0, 80],
    hits: [{ damage: 1, hitstun: 300, push: 0 }],
    events: [sound(0, 'voiceUltimate'), fxFrame(2, 'finaleA'), fxFrame(2, 'finaleB'), fxFrame(3, 'finaleC'), fxFrame(3, 'finaleD')],
    onHit: { to: 'finaleRush' },
  },
  finaleRush: {
    actions: [3001, 3002, 3004, 3005, 3006, 3007],
    invulnerable: [0, 999],
    events: [
      { at: 0, standAt: -60, pinOpponent: { dx: 0, lift: 0, ticks: 200 } },
      sound(0, 'voiceUltimate2'),
      ...[10, 40, 70, 100, 130, 160].flatMap((at) => [
        fx(at, 'finaleHit', { target: 'opponent', damage: 3 }),
        sound(at, 'hitHeavy'),
      ]),
      fx(190, 'finaleBlast', { target: 'opponent', damage: 8 }),
      sound(190, 'thunder'),
    ],
  },
};

// Efeitos do corpo: sempre com o eixo no pe dele (pos 0,0).
const body = (id, extra = {}) => ({ actions: [id], harmless: true, ...extra });
const EFFECTS = {
  slash1: body(201), slash2: body(211), slash3: body(221), slash4: body(231),
  kickArc1: body(301), kickArc2: body(311), kickArc3: body(312), kickArc4: body(321), kickArc5: body(331),
  dashLine: body(313),
  zapA: body(401), zapB: body(402), zapC: body(403),
  zapD: body(411), zapE: body(412), zapF: body(413),
  zapG: body(421), zapH: body(423), zapI: body(425),
  lowArc: body(341), upArc: body(431),
  rushA: body(252), rushB: body(253), dashStrikeArc: body(351),
  airArc1: body(601), airArc2: body(611), airArc3: body(606), airArc4: body(627),
  diveTrail: body(616), diveArc: body(617),
  whirlA: body(1003), whirlB: body(1012), whirlC: body(1007), whirlD: body(1008), whirlE: body(1009),
  yoyoCord: body(1200), yoyoFlash: body(1213), yoyoBolt: body(1206), yoyoTrail: body(1207), yoyoSpark: body(1212),
  palmSpark: body(1606), palmBoltA: body(1603), palmBoltB: body(1607), palmBoltC: body(1604), palmBoltD: body(1602),
  counterGlow: body(1303), counterGlow2: body(1304),
  counterA: body(1306), counterB: body(1307), counterC: body(1308), counterD: body(1309), counterE: body(1310),
  bolt: {
    actions: [1403],
    area: { rect: [-30, -120, 30, 0], damage: 6, hitstun: 40, push: 10, heavy: true },
  },
  boltFlash: body(1405),
  superAura: body(7457, { size: 0.19 }),
  godA: body(2508), godB: body(2509), godC: body(2510), godD: body(2513), godE: body(2514), godF: body(2512, { size: 0.56 }),
  godHit: {
    actions: [{ id: 1515, lengthTicks: 4 }],
    area: { rect: [-40, -80, 40, 10], hitstun: 50, push: 16, heavy: true, unblockable: true },
  },
  naruA: body(2601), naruB: body(2607), naruC: body(2605), naruD: body(2602), naruE: body(2603), naruF: body(2604), naruG: body(2606),
  kanA: body(2700), kanB: body(2726),
  finaleA: body(3036), finaleB: body(3034), finaleC: body(3033, { size: 0.6 }), finaleD: body(3027, { size: 0.3 }),
  throwHit: {
    actions: [{ id: 7621, lengthTicks: 6 }],
    size: 0.2,
    area: { rect: [-100, -140, 100, 60], hitstun: 40, push: 0, unblockable: true },
  },
  finaleHit: {
    actions: [7629],
    size: 0.3,
    area: { rect: [-100, -160, 100, 60], hitstun: 60, push: 0, unblockable: true },
  },
  finaleBlast: {
    actions: [7621],
    size: 0.6,
    area: { rect: [-100, -160, 100, 60], hitstun: 50, push: 16, heavy: true, unblockable: true },
  },
};

const COMBOS = [
  { id: 'godspeed', input: '↓→↓→P', animation: 'godspeed' },
  { id: 'narukami', input: '↓→↓→K', animation: 'narukami' },
  { id: 'kanmuru', input: '↓→↓→S', animation: 'kanmuru' },
  { id: 'finale', input: '↓←↓←K', animation: 'finale' },
  { id: 'whirlwind', input: '↓→P', animation: 'whirlwind' },
  { id: 'yoyo', input: '↓←P', animation: 'yoyo' },
  { id: 'lightningPalm', input: '↓→K', animation: 'lightningPalm' },
  { id: 'counter', input: '↓←K', animation: 'counterStance' },
  { id: 'thunderbolt', input: '↓→S', animation: 'thunderbolt' },
  { id: 'rushGrab', input: '↓←S', animation: 'rushGrab' },
  { id: 'dashStrike', input: '→↓→K', animation: 'dashStrike' },
  { id: 'throw', input: '←→P', animation: 'throw' },
  { id: 'rush', input: 'P', hold: '↓', animation: 'rush', airAnimation: 'airDownPunch' },
  { id: 'sweep', input: 'K', hold: '↓', animation: 'sweep', airAnimation: 'airDive' },
  { id: 'launcher', input: 'S', hold: '↓', animation: 'launcher', airAnimation: 'airUpper' },
];

const BUTTONS = {
  ground: { punch: 'punch', kick: 'kick', special: 'strong' },
  air: { punch: 'airPunch', kick: 'airKick', special: 'airStrong' },
};

const MOVE_LIST = [
  { section: 'Movimento', name: 'Passo rápido', input: '→→', note: 'Também para trás e no ar' },
  { section: 'Movimento', name: 'Pulo duplo', input: '↑↑', note: 'No ar, aperte para cima de novo' },
  { section: 'Golpes', name: 'Socos', input: 'PPPP', note: 'Emendam em K ou S' },
  { section: 'Golpes', name: 'Chutes', input: 'KKKK', note: 'Emendam em S' },
  { section: 'Golpes', name: 'Eletricidade', input: 'SSS', note: 'O terceiro lança' },
  { section: 'Golpes', name: 'Agachado', input: 'P K S', hold: '↓', note: 'Rajada, rasteira e lançador' },
  { section: 'Golpes', name: 'No ar', input: 'PKS', note: 'Com ↓: golpe para baixo, mergulho e lança' },
  { section: 'Especiais', name: 'Investida tripla', input: '↓→P', note: 'Atravessa o oponente três vezes' },
  { section: 'Especiais', name: 'Io-iô elétrico', input: '↓←P', note: 'Prende e o raio atravessa' },
  { section: 'Especiais', name: 'Palma relâmpago', input: '↓→K', note: 'Vários acertos em volta' },
  { section: 'Especiais', name: 'Contra-ataque', input: '↓←K', note: 'Quem bater leva o golpe' },
  { section: 'Especiais', name: 'Raio', input: '↓→S', note: 'Cai à frente enquanto ele salta' },
  { section: 'Especiais', name: 'Arrancada', input: '↓←S', note: 'Se pegar, a sequência de golpes' },
  { section: 'Especiais', name: 'Golpe de mão', input: '→↓→K', note: 'Investida' },
  { section: 'Especiais', name: 'Agarrão', input: '←→P', note: 'De perto' },
  { section: 'Super', name: 'Godspeed', input: '↓→↓→P', note: 'Avança; se pegar, o golpe relâmpago' },
  { section: 'Super', name: 'Narukami', input: '↓→↓→K', note: 'O relâmpago enorme à frente' },
  { section: 'Super', name: 'Kanmuru', input: '↓→↓→S', note: 'Sequência de golpes relâmpago' },
  { section: 'Super', name: 'Ataque final', input: '↓←↓←K', note: 'Com o oponente abaixo de 1/3 da vida' },
];

const SOUNDS = {
  swing1: [3, 6], swing2: [4, 15], swing3: [3, 12],
  zap1: [5, 57], zap2: [5, 55], zap3: [5, 54],
  hitHeavy: [5, 77],
  voiceRush: [1, 9], voiceGrab: [0, 66], voiceWhirl: [0, 51], voiceYoyo: [0, 68], voicePalm: [0, 79],
  voiceCounter: [0, 70], voiceBolt: [0, 75],
  voiceSuper1: [0, 81], voiceSuper1b: [0, 82], voiceSuper2: [0, 85], voiceSuper3: [0, 93],
  voiceUltimate: [0, 95], voiceUltimate2: [0, 96], thunder: [5, 64],
};

importMugenCharacter({
  root: ROOT,
  sffPath: resolve(PACK, 'Killua.sff'),
  sffOptions: { actPath: resolve(PACK, '1.act') },
  airPath: resolve(PACK, 'Killua.air'),
  outDir: 'public/assets/characters/killua',
  id: 'killua',
  name: 'Killua',
  description: 'O assassino relâmpago',
  template: 'public/assets/characters/dummy/dummy_config.json',
  animations: ANIMATIONS,
  effects: EFFECTS,
  combos: COMBOS,
  buttons: BUTTONS,
  moveList: MOVE_LIST,
  sndPath: resolve(PACK, 'Killua.snd'),
  sounds: SOUNDS,
  spriteScale: 2,
  portrait: { sprite: [9000, 1], crop: [0, 0, 120, 132], width: 50, height: 55, background: '#141A2A' },
});
