// Importa o Dante do pacote MUGEN "Dante_AI" (bugya; creditos em CREDITS.md).
//
// O pacote fica em assets-src/dante/mugen/ (fora do git). SFF v1 com a paleta
// dante.act. Para regerar: npm run assets:dante
//
// Tudo o que o pacote tem ligado: as tres sequencias (Rebellion no soco,
// artes marciais no chute, Ebony & Ivory no especial) com os desvios do .cmd;
// os golpes agachados e aereos; o Royal Guard; os especiais (High Time,
// Stinger, Helm Breaker, Straight, Rising e Divine Dragon, Volcano, Rainstorm,
// rajada de pistola, arremesso) e os seis supers: Million Stab, Million
// Dollars, Real Impact, Crystal, Dance Macabre, Quicksilver (o oponente em
// camera lenta) e Doppelganger (o clone vermelho que repete os golpes).
//
// Escala: o pacote desenha em alta resolucao (xscale 0.5, 256 px parado).
// O corpo e guardado pela metade (bodyScale) e cada px guardado vale uma
// unidade do .cns; spriteScale 0.78 poe o Dante na altura do elenco. Por isso
// velocidades, PosAdd e posicoes de Explod entram como estao no .cns, e o
// scale das Explod vira o "size" do efeito.
// Botoes: soco = x (espada), chute = y (chutes), especial = a (pistolas).
// Dano: vida 1000 no pacote, 100 aqui (cerca de 1/15 por golpe, como o resto
// do elenco).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importMugenCharacter } from './lib/mugen-import.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = resolve(ROOT, 'assets-src/dante/mugen');

const fx = (at, id, pos = [0, 0], extra = {}) => ({ at, effect: { id, pos, ...extra } });
const fxFrame = (frame, id, pos = [0, 0], extra = {}) => ({ frame, effect: { id, pos, ...extra } });
const sound = (at, key, extra = {}) => ({ at, sound: key, ...extra });
const soundFrame = (frame, key) => ({ frame, sound: key });
// PosAdd do .cns em varios quadros (animelemtime(n) = 0 ou 1).
const nudges = (frames, dx) => frames.map((frame) => ({ frame, dx }));
// Brilho de super (helper 3051: explods 3554 e 3555).
const superFlash = (at) => [fx(at, 'superFlash', [-5, -50]), fx(at, 'superRing', [-5, -50])];

// Sequencia: o .cns encadeia pelo aperto guardado (var(7)), acertando ou nao.
const chain = (on, to, after, extra = {}) => ({ on, to, after, need: 'none', ...extra });
const NORMAL = { specialCancel: true };

const ANIMATIONS = {
  idle: { actions: [{ id: 0, pick: [23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35] }], loop: true },
  walkForward: { actions: [20], loop: true },
  walkBackward: { actions: [21], loop: true },
  jump: { actions: [40, 41] },
  crouch: { actions: [11], loop: true },
  blockStanding: { actions: [130], loop: true },
  blockCrouching: { actions: [131], loop: true },
  hitReaction: { actions: [5000] },
  ko: { actions: [5030, 5040, { id: 5050, times: { 0: 20 } }, 5100, 5110] },
  victoryPose: { actions: [{ id: 181, times: { 22: 60 } }] },
  defeatPose: { actions: [{ id: 170, times: { 8: 60 } }] },

  // Corrida (100): o passo rapido do DMC, 15 unidades por tick.
  dashForward: {
    actions: [100],
    events: [sound(0, 'dash')],
    dash: { distance: 170, moveFrom: 3, moveUntil: 7, invulnerableFrom: 3, invulnerableUntil: 6, cancel: true },
  },
  dashBackward: {
    actions: [{ id: 105, times: { 0: 14 } }],
    dash: { distance: 90, moveFrom: 0, moveUntil: 0, invulnerableFrom: 0, invulnerableUntil: 0 },
  },
  airDashForward: {
    actions: [{ id: 102, times: { 7: 6 } }],
    dash: { distance: 150, moveFrom: 1, moveUntil: 4, invulnerableFrom: 9, invulnerableUntil: 0 },
  },
  airDashBackward: {
    actions: [{ id: 108, times: { 5: 6 } }],
    dash: { distance: 110, moveFrom: 1, moveUntil: 3, invulnerableFrom: 9, invulnerableUntil: 0 },
  },

  // ---- Espada (x): 210 -x-> 211 -x-> 212; aperto atrasado vai para 213 ----
  punch: {
    actions: [200],
    ...NORMAL,
    hit: { damage: 3, hitstun: 18, push: 4 },
    events: [sound(1, 'sword1'), ...nudges([3, 4, 5, 6], 10)],
    cancels: [chain('punch', 'sword2', 12), chain('kick', 'swordFlurry', 12)],
  },
  sword2: {
    actions: [201],
    ...NORMAL,
    hit: { damage: 3, hitstun: 20, push: 5 },
    events: [sound(1, 'sword2'), ...nudges([4, 5, 6], 15)],
    cancels: [chain('punch', 'sword3', 14)],
  },
  sword3: {
    actions: [202],
    ...NORMAL,
    hit: { damage: 4, hitstun: 26, push: 9, heavy: true },
    events: [sound(1, 'sword3'), ...nudges([5, 6], 20)],
  },
  // 213: tres cortes; fecha no 214 (x), no Million Stab (a) ou no lancador (y).
  swordFlurry: {
    actions: [203],
    ...NORMAL,
    hits: [
      { damage: 2, hitstun: 20, push: 2 },
      { damage: 2, hitstun: 20, push: 2 },
      { damage: 2, hitstun: 22, push: 3 },
    ],
    events: [sound(4, 'sword4'), ...nudges([1, 2], 5), ...nudges([4, 5], 10), ...nudges([16], 10)],
    cancels: [chain('punch', 'sword4', 36), chain('special', 'millionStab', 36), chain('kick', 'risingUpper', 36)],
  },
  sword4: {
    actions: [204],
    ...NORMAL,
    hit: { damage: 4, hitstun: 26, push: 9, heavy: true },
    events: [sound(6, 'sword5'), ...nudges([5, 6], 20)],
  },

  // ---- Chutes (y): 200 -y-> 201 -y-> 202; atrasado -> 203 (rajada) ----
  kick: {
    actions: [2000],
    ...NORMAL,
    hit: { damage: 3, hitstun: 18, push: 4 },
    events: [sound(2, 'kick1'), { frame: 4, dx: 20 }],
    cancels: [chain('kick', 'kick2', 12)],
  },
  kick2: {
    actions: [2010],
    ...NORMAL,
    hit: { damage: 2, hitstun: 20, push: 4 },
    events: [sound(1, 'kick2'), { frame: 4, dx: 30 }, { frame: 5, dx: 15 }],
    cancels: [chain('kick', 'kick3', 14), chain('special', 'kickRush', 14)],
  },
  kick3: {
    actions: [2020],
    ...NORMAL,
    hit: { damage: 5, hitstun: 28, push: 8, heavy: true },
    events: [sound(1, 'kick3'), { frame: 5, dx: 24 }, { frame: 8, dx: 12 }],
  },
  // 203: seis chutes rapidos; fecha no 204 (y), na rasteira 205 (x) ou no
  // Kick 13 (3050, a).
  kickRush: {
    actions: [2030],
    ...NORMAL,
    hits: [1, 1, 1, 1, 1, 2].map((damage, index) => ({ damage, hitstun: 16, push: index === 5 ? 6 : 1 })),
    events: [sound(9, 'kick4')],
    cancels: [chain('kick', 'kick4', 50), chain('punch', 'kickSlide', 50), chain('special', 'kick13', 50)],
  },
  kick4: {
    actions: [2040],
    ...NORMAL,
    hit: { damage: 5, hitstun: 28, push: 6, heavy: true },
    events: [sound(16, 'kick5'), ...nudges([2, 3, 4, 5], 6), ...nudges([11, 12, 13], 9)],
  },
  kickSlide: {
    actions: [2050],
    ...NORMAL,
    friction: false,
    hit: { damage: 5, hitstun: 26, push: 8, heavy: true },
    events: [sound(16, 'kick5'), { frame: 3, vx: 1 }, { frame: 12, vx: 20 }, { frame: 13, vx: 9 }, { frame: 15, vx: 0 }],
  },
  // Kick 13 (3050): a rajada de chutes que termina no chute giratorio (2110).
  kick13: {
    actions: [2100, 2110],
    cooldown: 300,
    hits: [
      { damage: 1, hitstun: 14, push: 0, every: 8, count: 7 },
      { damage: 6, hitstun: 36, push: 12, heavy: true },
    ],
    events: [
      ...superFlash(2),
      sound(4, 'kick13'),
      fxFrame(4, 'kickTrail', [0, 0]),
      fxFrame(23, 'kickDust', [-10, -15]),
      { action: 2110, frame: 6, dx: 10 },
      { action: 2110, frame: 7, dx: 10 },
      { action: 2110, frame: 12, dx: 20 },
      { action: 2110, frame: 13, dx: 10 },
      { action: 2110, frame: 6, effect: { id: 'kickBurst', pos: [120, -60] } },
    ],
  },

  // ---- Pistolas (a): 300 -a-> 301 -a-> 302 -a-> 3200 ----
  guns: {
    actions: [300, 303],
    ...NORMAL,
    hits: [{ damage: 2, hitstun: 16, push: 2 }, { damage: 2, hitstun: 18, push: 3 }],
    events: [sound(1, 'guns1'), ...nudges([4, 5], 10)],
    cancels: [chain('special', 'guns2', 22)],
  },
  guns2: {
    actions: [301, 303],
    ...NORMAL,
    hits: [{ damage: 2, hitstun: 16, push: 0 }, { damage: 2, hitstun: 18, push: 3 }],
    events: [sound(1, 'guns2'), ...nudges([5, 6], 15)],
    cancels: [chain('special', 'guns3', 20)],
  },
  guns3: {
    actions: [302, 303],
    ...NORMAL,
    hits: [
      { damage: 1, hitstun: 16, push: 1 },
      { damage: 1, hitstun: 16, push: 1 },
      { damage: 1, hitstun: 14, push: 0, every: 3, count: 6 },
    ],
    events: [sound(1, 'guns3'), ...nudges([4, 8, 13, 14, 15, 24], 15)],
    cancels: [chain('special', 'gunsFinale', 66)],
  },
  // 3200: a pirueta que fecha a sequencia de tiros.
  gunsFinale: {
    actions: [304, 303],
    cooldown: 300,
    hits: [3, 3, 3, 3].map((damage) => ({ damage, hitstun: 20, push: 1 })).concat([{ damage: 5, hitstun: 30, push: 10, heavy: true }]),
    events: [...superFlash(3), sound(10, 'gunsFinale')],
  },

  // ---- Agachado (segurando ↓) ----
  // 400: o corte para cima (lancador).
  risingUpper: {
    actions: [400],
    ...NORMAL,
    hit: { damage: 2, hitstun: 30, push: 4, heavy: true },
    events: [sound(1, 'upper'), ...nudges([1, 2], 10)],
  },
  crouchKick: {
    actions: [410],
    ...NORMAL,
    hit: { damage: 2, hitstun: 20, push: 8 },
    events: [sound(0, 'crouchKick'), ...nudges([3, 4], 10)],
  },
  crouchSweep: {
    actions: [430],
    ...NORMAL,
    hit: { damage: 2, hitstun: 20, push: 5 },
  },

  // ---- No ar: 600 -x-> 601 -x-> 602 -x-> 603; y (610) -y-> 640; a (630) ----
  airSword: {
    actions: [600],
    air: true,
    ...NORMAL,
    hit: { damage: 2, hitstun: 18, push: 4 },
    events: [sound(0, 'air1'), { at: 0, vy: -1.5 }],
    cancels: [chain('punch', 'airSword2', 12)],
  },
  airSword2: {
    actions: [602],
    air: true,
    ...NORMAL,
    hit: { damage: 2, hitstun: 18, push: 4 },
    events: [sound(0, 'air2'), { at: 0, vy: -1.5 }],
    cancels: [chain('punch', 'airSword3', 12)],
  },
  airSword3: {
    actions: [604],
    air: true,
    ...NORMAL,
    hit: { damage: 2, hitstun: 18, push: 4 },
    events: [sound(0, 'air2'), { at: 0, vy: -1.5 }],
    cancels: [chain('punch', 'airSword4', 12)],
  },
  airSword4: {
    actions: [606],
    air: true,
    ...NORMAL,
    hit: { damage: 4, hitstun: 24, push: 8, heavy: true },
    events: [sound(3, 'sword5'), { at: 0, vy: -1.5 }],
  },
  airKick: {
    actions: [2900],
    air: true,
    ...NORMAL,
    hit: { damage: 5, hitstun: 24, push: 6, heavy: true },
    events: [sound(0, 'airKick'), { at: 0, vy: -3 }],
    cancels: [chain('kick', 'airStrongKick', 12)],
  },
  airStrongKick: {
    actions: [640],
    air: true,
    ...NORMAL,
    hit: { damage: 5, hitstun: 26, push: 9, heavy: true },
  },
  airGuns: {
    actions: [630],
    air: true,
    ...NORMAL,
    hit: { damage: 3, hitstun: 20, push: 6 },
    events: [soundFrame(2, 'airGuns')],
  },

  // ---- Royal Guard (900): defesa perfeita ----
  // Quem bater nos primeiros ticks e aparado (905: as faiscas 906-908) e o
  // Dante devolve na hora com o Release (915, o chute com a onda 911).
  royalGuard: {
    actions: [900],
    cooldown: 40,
    counter: { from: 0, until: 12, to: 'royalBlock' },
    events: [soundFrame(3, 'guardUp')],
  },
  royalBlock: {
    actions: [905],
    invulnerable: [0, 19],
    events: [
      sound(0, 'guardBlock'),
      fxFrame(1, 'royalSpark', [25, -65]),
      fxFrame(2, 'royalFlash', [25, -65]),
      fxFrame(3, 'royalBurst', [25, -65]),
    ],
    next: 'royalRelease',
  },
  royalRelease: {
    actions: [915],
    invulnerable: [0, 12],
    friction: false,
    events: [
      soundFrame(2, 'release'), soundFrame(2, 'guardBlock'),
      { frame: 1, dx: 15 }, { frame: 2, vx: 28 }, { frame: 5, vx: 14 }, { frame: 6, vx: 0 },
      fxFrame(2, 'releaseWave', [-20, -55]),
    ],
  },
  // 910: o Release sem aparar (o chute com a onda 916).
  royalKick: {
    actions: [910],
    cooldown: 90,
    events: [soundFrame(5, 'releaseKick'), { frame: 5, dx: 30 }, fxFrame(5, 'releaseKickWave', [-50, -85])],
  },

  // ---- Especiais ----
  // High Time (1000): o corte que joga o oponente para cima; o Dante sobe
  // junto e aterrissa no 1047.
  highTime: {
    actions: [1000],
    cooldown: 60,
    hits: [{ damage: 5, hitstun: 34, push: 4, heavy: true }],
    events: [sound(5, 'highTime'), { frame: 9, vx: 4, vy: -10 }],
    onLand: 'landing',
  },
  landing: { actions: [1047], events: [sound(0, 'land')] },
  // Stinger (1100): a estocada que atravessa a tela. Acertando, segura (1120)
  // e o x emenda no Million Stab.
  stinger: {
    actions: [{ id: 1100, lengthTicks: 24 }],
    cooldown: 60,
    friction: false,
    hit: { damage: 5, hitstun: 30, push: 10, heavy: true },
    events: [
      soundFrame(2, 'stinger'),
      { frame: 2, vx: 10 }, { frame: 4, vx: 15 },
      fxFrame(4, 'stingerTrail', [0, 0]),
    ],
    onHit: { to: 'stingerHit' },
    next: 'stingerEnd',
  },
  stingerHit: {
    actions: [1110],
    events: [sound(0, 'stingerEnd')],
    cancels: [chain('punch', 'millionStab', 0)],
  },
  stingerEnd: { actions: [1110], events: [sound(0, 'stingerEnd')] },
  // Helm Breaker (1200, no ar, ↓x): mergulha de espada; o impacto (1210)
  // acerta de novo no chao.
  helmBreaker: {
    actions: [1200],
    air: true,
    hit: { damage: 3, hitstun: 30, push: 5, heavy: true },
    events: [sound(8, 'sword5'), { at: 0, vx: 0, vy: 0.5 }, { frame: 4, vy: 9 }, { frame: 7, vy: 16 }],
    onLand: 'helmImpact',
  },
  helmImpact: {
    actions: [1210],
    hit: { damage: 2, hitstun: 26, push: 8, heavy: true },
    events: [sound(0, 'helmImpact'), fx(0, 'helmBlast', [60, 0])],
  },
  // Straight (2500 -> 2501): carrega e dispara num soco que atravessa.
  straight: {
    actions: [{ id: 2500, lengthTicks: 20 }, 2501],
    cooldown: 90,
    friction: false,
    hit: { damage: 6, hitstun: 36, push: 12, heavy: true },
    events: [
      { action: 2501, at: 0, vx: 40 },
      { action: 2501, frame: 2, vx: 0 },
      { action: 2501, at: 0, sound: 'straight' },
      { action: 2501, at: 0, effect: { id: 'straightTrail', pos: [0, 0] } },
      { action: 2501, at: 0, effect: { id: 'straightFlash', pos: [0, 0] } },
    ],
  },
  // Rising Dragon (2600) e Divine Dragon (2610): o gancho que sobe em
  // espiral; caem na 3502 e aterrissam na 2620.
  risingDragon: {
    actions: [2600, 3502],
    cooldown: 60,
    hit: { damage: 6, hitstun: 34, push: 4, heavy: true },
    events: [
      sound(1, 'dragon'),
      ...nudges([3, 4], 5),
      fxFrame(4, 'dragonFlash', [30, -100]),
      { frame: 6, vx: 4, vy: -10 },
      ...[7, 8, 9].map((frame, index) => fxFrame(frame, `dragonTrail${index + 1}`, [0, 0])),
      ...[10, 11, 12].map((frame, index) => fxFrame(frame, `dragonTrail${index + 4}`, [10, 10])),
    ],
    onLand: 'dragonLand',
  },
  divineDragon: {
    actions: [2610, 3502],
    cooldown: 90,
    hits: [{ damage: 1, hitstun: 20, push: 1, every: 4, count: 9 }],
    events: [
      sound(1, 'dragon'),
      fxFrame(4, 'dragonFlash', [30, -100]),
      { frame: 6, vx: 4, vy: -12 },
      fxFrame(7, 'divineSwirl', [10, 20]),
      ...[7, 9, 11, 13].map((frame) => fxFrame(frame, 'dragonTrail3', [-20, 5])),
      ...[8, 10, 12, 14].map((frame) => fxFrame(frame, 'dragonTrail3', [20, 5])),
    ],
    onLand: 'dragonLand',
  },
  dragonLand: { actions: [2620], events: [sound(0, 'land')] },
  // Volcano (2700 -> 2710): salta e crava o punho no chao; a erupcao (2720)
  // acerta varias vezes. No ar (2720), mergulha e acerta mais forte.
  volcano: {
    actions: [{ id: 2700, pick: [0, 1, 2, 3, 4, 5, 6] }, 2710],
    cooldown: 90,
    events: volcanoEvents(2710, 2),
  },
  airVolcano: {
    actions: [2705],
    air: true,
    events: [sound(2, 'volcanoDive'), { at: 0, vx: 2, vy: 1 }, { frame: 6, vy: 20 }],
    onLand: 'volcanoImpact',
  },
  volcanoImpact: { actions: [2710], events: volcanoEvents(2710, 3) },
  // Rajada de pistola (1500, →a): tres tiros na diagonal para cima (antiaerea).
  gunBurst: {
    actions: [1500],
    cooldown: 30,
    events: [4, 9, 13].flatMap((frame) => [
      soundFrame(frame, 'shot'),
      fxFrame(frame, 'bullet', [25, -120]),
      fxFrame(frame, 'muzzle', [25, -120]),
    ]),
  },
  // Rainstorm (1600, no ar, ↓a): gira de cabeca para baixo atirando no chao.
  rainstorm: {
    actions: [1600, 1602, 1602, 1602, 1602],
    air: true,
    cooldown: 60,
    events: [
      { at: 0, vx: 1, vy: -3 },
      ...[10, 14, 20, 24, 30, 34, 40, 44].flatMap((at) => [sound(at, 'shot'), fx(at, 'rainBullet', [0, 0])]),
    ],
    onLand: 'landing',
  },
  // Arremesso (800 -> 810): agarra, soca a cabeca varias vezes e joga.
  throw: {
    actions: [{ id: 800, lengthTicks: 8 }],
    cooldown: 120,
    areas: [{ rect: [0, -186, 110, 0], from: 1, until: 7, damage: 1, hitstun: 110, push: 0, unblockable: true }],
    onHit: { to: 'throwCombo' },
  },
  throwCombo: {
    actions: [810],
    invulnerable: [0, 98],
    events: [
      { at: 0, pinOpponent: { dx: 30, lift: 0, ticks: 90, relative: 'self' } },
      soundFrame(5, 'punch'),
      fxFrame(5, 'throwHit', [30, -55], { damage: 3 }),
      ...[10, 13, 16, 19, 22].flatMap((frame) => [soundFrame(frame, 'shot'), fxFrame(frame, 'throwHit', [42, -20], { damage: 1 })]),
      soundFrame(27, 'throwVoice'),
      fxFrame(29, 'throwHit', [40, -20], { damage: 2, heavy: true }),
    ],
  },
  taunt: { actions: [195], events: [sound(0, 'taunt')] },

  // ---- Supers (↓→↓→ e ↓←↓← + botao; recarga no lugar da barra) ----
  // Million Stab (3000 -> 3001 -> 3002): a chuva de estocadas e a estocada
  // final. Tambem fecha a sequencia 213 e o Stinger.
  millionStab: {
    actions: [205, 206, 206, 207],
    cooldown: 600,
    hits: [
      { damage: 1, hitstun: 14, push: 0, every: 5, count: 16 },
      { damage: 4, hitstun: 36, push: 12, heavy: true },
    ],
    events: [
      ...superFlash(2),
      soundFrame(3, 'stab1'),
      fxFrame(6, 'stabFlurry', [75, -65]),
      ...[6, 8, 10].map((frame) => fxFrame(frame, 'stabLine', [20, -65])),
      { action: 206, at: 0, effect: { id: 'stabFlurry', pos: [75, -65] } },
      { action: 206, at: 0, sound: 'stab2' },
      { action: 207, frame: 6, dx: 25 },
      { action: 207, frame: 6, sound: 'stab3' },
      { action: 207, frame: 6, effect: { id: 'stabFinish', pos: [-45, -65], velocityX: 25 } },
    ],
  },
  // Million Dollars (3400): a saraivada de Ebony & Ivory e o tiro final.
  millionDollars: {
    actions: [3700],
    cooldown: 900,
    invulnerable: [0, 20],
    events: [
      sound(0, 'dollarsVoice'),
      ...superFlash(2),
      ...[
        [[18, 21, 24, 27], [15, -95]],
        [[35, 38, 41, 44], [15, -70]],
        [[52, 58], [15, -59]],
        [[55, 61], [15, -84]],
        [[69, 75], [15, -62]],
        [[72, 78], [45, -48]],
      ].flatMap(([frames, pos]) => frames.flatMap((frame) => [
        fxFrame(frame, 'dollarBullet', pos),
        fxFrame(frame, 'dollarFlash', [pos[0] + 30, pos[1]]),
        soundFrame(frame, 'shot'),
      ])),
      soundFrame(25, 'dollars1'),
      soundFrame(83, 'dollars2'),
      soundFrame(85, 'dollars3'),
      fxFrame(85, 'dollarsSmoke', [0, -72]),
      soundFrame(96, 'dollars4'),
      fxFrame(97, 'dollarsFlashBig', [30, -80]),
      fxFrame(97, 'dollarsFinal', [30, -80]),
    ],
  },
  // Real Impact (3500 -> 3501): a pose longa (a camera para), o soco que, se
  // pegar, vira o gancho duplo que manda o oponente para o alto. O y no ar
  // emenda no mergulho (3550).
  realImpact: {
    actions: [3500],
    cooldown: 900,
    invulnerable: [0, 70],
    hit: { damage: 2, hitstun: 60, push: 1, heavy: true },
    events: [sound(0, 'impactVoice'), ...superFlash(2), soundFrame(9, 'impact1'), { frame: 14, dx: 20 }, fxFrame(15, 'impactFlash', [0, 0])],
    onHit: { to: 'realImpactRise' },
  },
  realImpactRise: {
    actions: [3501],
    invulnerable: [0, 40],
    hits: [{ damage: 13, hitstun: 70, push: 4, heavy: true }],
    events: [
      { frame: 5, vx: 2, vy: -7 }, soundFrame(5, 'impact2'),
      { frame: 6, vx: 3, vy: -15 },
      fxFrame(6, 'impactBurst', [0, -100]),
    ],
    cancels: [{ on: 'kick', to: 'realImpactDive', after: 30 }],
    onLand: 'realImpactLand',
  },
  realImpactDive: {
    actions: [3550, 3551, 3551, 3551],
    air: true,
    hits: [{ damage: 2, hitstun: 30, push: 2 }, { damage: 3, hitstun: 40, push: 6, heavy: true }],
    events: [
      sound(3, 'impactDive'),
      { at: 0, vx: 0, vy: 2 },
      ...superFlash(1),
      fx(1, 'diveRingA', [0, -50]),
      fx(1, 'diveRingB', [0, -50]),
      fx(1, 'diveSmash', [0, 0]),
      { at: 10, vy: 6 },
    ],
    onLand: 'realImpactLand',
  },
  realImpactLand: { actions: [3503], events: [sound(0, 'land')] },
  // Crystal (3300 -> 3350): Cerberus crava as estacas de gelo; o a de novo
  // levanta a torre de gelo (322).
  crystal: {
    actions: [305],
    cooldown: 600,
    events: [
      sound(0, 'impactVoice'),
      ...superFlash(2),
      soundFrame(5, 'crystalVoice'),
      ...['ice1', 'ice2', 'ice3', 'ice4'].map((id) => fxFrame(14, id, [45, 0])),
    ],
    cancels: [chain('special', 'crystalTower', 58)],
  },
  crystalTower: {
    actions: [306],
    events: [...superFlash(2), sound(6, 'crystalTower'), fxFrame(14, 'iceTower', [0, 0])],
  },
  // Dance Macabre (3100): a investida (3000) que, se pegar, vira a danca de
  // cortes (3001), o Million Stab e a estocada final (ou o chute 3110-3112).
  danceMacabre: {
    actions: [195, 3000],
    cooldown: 900,
    friction: false,
    // A caixa do .air dura 8 ticks, mas a investida segue deslizando: a
    // janela cobre o deslize inteiro (quadros 3 a 10 da 3000, depois dos 16
    // da pose 195).
    areas: [{ rect: [-83, -124, 72, 4], from: 19, until: 26, damage: 1, hitstun: 40, push: 0 }],
    events: [
      sound(0, 'dollarsVoice'),
      ...superFlash(2),
      { action: 3000, frame: 1, sound: 'danceStart' },
      { action: 3000, frame: 4, vx: 15 },
      { action: 3000, frame: 6, vx: 10 },
      { action: 3000, frame: 8, vx: 0 },
    ],
    onHit: { to: 'danceSlashes' },
  },
  danceSlashes: {
    actions: [3001],
    invulnerable: [0, 130],
    hits: [3, 3, 3, 1, 1, 1, 1, 1].map((damage) => ({ damage, hitstun: 40, push: 1 })),
    events: [
      soundFrame(1, 'dance1'), soundFrame(8, 'dance2'), soundFrame(19, 'dance1'), soundFrame(22, 'dance4'), soundFrame(40, 'dance5'),
      ...nudges([3, 4, 5, 6], 10), ...nudges([12, 13, 14], 15), ...nudges([18, 19, 20], 10),
      ...nudges([22, 23], 5), ...nudges([25, 26], 10), ...nudges([37], 10), ...nudges([42, 43, 53, 54], 20),
      fxFrame(5, 'danceArc1', [-10, -25]),
      fxFrame(10, 'danceArc2', [-30, -45]),
      fxFrame(19, 'danceArc1', [-10, -25]),
      fxFrame(25, 'danceArc4', [20, -25]),
      fxFrame(28, 'danceArc5', [20, -25]),
      fxFrame(35, 'danceArc6', [20, -25]),
      fxFrame(43, 'danceArc7', [-5, -35]),
      fxFrame(54, 'danceArc3', [-20, -35]),
    ],
    next: 'danceStab',
  },
  danceStab: {
    actions: [205, 206, 206],
    invulnerable: [0, 90],
    hits: [{ damage: 1, hitstun: 30, push: 0, every: 5, count: 14 }],
    events: [
      soundFrame(3, 'stab1'),
      fxFrame(6, 'stabFlurry', [75, -65]),
      { action: 206, at: 0, effect: { id: 'stabFlurry', pos: [75, -65] } },
      { action: 206, at: 0, sound: 'stab2' },
    ],
    next: 'danceFinish',
    cancels: [{ on: 'kick', to: 'danceKick', after: 20, need: 'none' }],
  },
  danceFinish: {
    actions: [207],
    hit: { damage: 5, hitstun: 40, push: 14, heavy: true },
    events: [
      { frame: 6, dx: 25 }, soundFrame(6, 'stab3'),
      fxFrame(6, 'stabFinish', [-45, -65], { velocityX: 25 }),
    ],
  },
  // 3110-3112: o chute giratorio que fecha a Dance Macabre (y no meio).
  danceKick: {
    actions: [3010, 3011, 3011, 3011, 3012],
    invulnerable: [0, 100],
    hits: [...Array(6)].map(() => ({ damage: 1, hitstun: 30, push: 0 })).concat([{ damage: 5, hitstun: 40, push: 14, heavy: true }]),
    events: [
      sound(0, 'danceKick1'),
      { action: 3011, at: 1, sound: 'danceKick2' },
      { action: 3012, frame: 4, sound: 'danceKick3' },
      { action: 3012, frame: 4, effect: { id: 'danceKickArc', pos: [-60, -45] } },
    ],
  },
  // Quicksilver (3600): o relogio para; por 10 s o oponente anda em camera
  // lenta (selo "slow": metade da velocidade em tudo).
  quicksilver: {
    actions: [3600],
    cooldown: 1200,
    events: [
      sound(2, 'quicksilver'),
      { at: 4, sealOpponent: { kind: 'slow', ticks: 300 } },
      fx(4, 'clock', [0, -60], { follow: 'owner' }),
      fx(4, 'slowMark', [0, 0], { target: 'opponent', follow: 'target' }),
      sound(4, 'clockTick'),
    ],
  },
  // Doppelganger (3700): o clone vermelho que repete cada golpe um instante
  // depois, por 10 s (config.echo + efeito mirrorOwner).
  doppelganger: {
    actions: [195],
    cooldown: 1200,
    events: [
      sound(0, 'doppelVoice'),
      ...superFlash(2),
      fx(2, 'doppelFlash', [0, -72]),
      { at: 4, buff: { kind: 'doppelganger', ticks: 600 } },
      fx(4, 'doppelShadow', [0, 0]),
    ],
  },
};

// Volcano: as duas labaredas (2720) e os cinco acertos (projetil 2750).
function volcanoEvents(action, damage) {
  return [
    { action, frame: 4, effect: { id: 'volcanoBlast', pos: [30, 15] } },
    { action, frame: 4, effect: { id: 'volcanoBlast', pos: [30, 15], flip: true } },
    { action, at: 3, sound: 'volcano' },
    ...[5, 8, 11, 13, 17].map((frame) => ({ action, frame, effect: { id: 'volcanoHit', pos: [30, 15], damage } })),
  ];
}

const HELD = { lifetime: 12 };
const EFFECTS = {
  superFlash: { actions: [3554], size: 0.7 },
  superRing: { actions: [3555], size: 0.1, scale: 1 },
  kickTrail: { actions: [2102], size: 0.5 },
  kickDust: { actions: [2104], size: 0.5 },
  kickBurst: { actions: [2103], size: 0.9 },
  royalSpark: { actions: [{ id: 906, times: { 0: 19 } }], size: 0.5 },
  royalFlash: { actions: [907], size: 0.5 },
  royalBurst: { actions: [908], size: 0.5 },
  releaseWave: {
    actions: [911],
    size: 0.4,
    follow: 'owner',
    hit: { damage: 6, hitstun: 36, push: 14, heavy: true },
  },
  releaseKickWave: {
    actions: [916],
    size: 0.4,
    hit: { damage: 3, hitstun: 26, push: 9, heavy: true },
  },
  stingerTrail: { actions: [2510], size: 0.5, follow: 'owner' },
  helmBlast: { actions: [1220], size: 0.5, scale: 1 },
  straightTrail: { actions: [2510], size: 0.5 },
  straightFlash: { actions: [2512], size: 0.5 },
  dragonFlash: { actions: [411], size: 0.6 },
  ...Object.fromEntries([2601, 2602, 2603, 2604, 2605, 2606].map((id, index) => [
    `dragonTrail${index + 1}`, { actions: [id], size: 0.5, ...HELD },
  ])),
  divineSwirl: { actions: [2621], size: 0.6 },
  volcanoBlast: { actions: [2720], size: 0.6 },
  volcanoHit: {
    actions: [{ id: 2750, lengthTicks: 6 }],
    size: 0.6,
    maxHits: 1,
    hit: { hitstun: 22, push: 4, heavy: true },
  },
  bullet: { actions: [1502], hit: { damage: 1, hitstun: 16, push: 2 } },
  muzzle: { actions: [{ id: 1501, times: { 0: 4 } }], size: 0.5 },
  rainBullet: { actions: [1603], follow: 'owner', hit: { damage: 1, hitstun: 16, push: 1 } },
  throwHit: {
    actions: [{ id: 1501, times: { 0: 4 } }],
    size: 0.5,
    area: { rect: [-40, -60, 40, 60], hitstun: 40, push: 0, unblockable: true },
  },
  stabFlurry: { actions: [208], size: 0.65 },
  stabLine: { actions: [209], size: 0.5 },
  stabFinish: { actions: [210], size: 0.7 },
  dollarBullet: {
    actions: [{ id: 3703, lengthTicks: 60 }],
    size: 0.5,
    velocityX: 20,
    destroyOnHit: true,
    endAtWall: true,
    hit: { damage: 1, hitstun: 20, push: 1 },
  },
  dollarFlash: { actions: [3702], size: 0.5 },
  dollarsFlashBig: { actions: [3702], size: 1 },
  dollarsSmoke: { actions: [{ id: 3701, times: { 0: 1 } }], size: 0.5 },
  dollarsFinal: {
    actions: [{ id: 3703, lengthTicks: 80 }],
    size: 1,
    motion: [{ at: 0, vx: 15 }, { at: 20, vx: 19 }, { at: 40, vx: 23 }],
    destroyOnHit: true,
    endAtWall: true,
    hit: { damage: 5, hitstun: 40, push: 14, heavy: true },
  },
  impactFlash: { actions: [{ id: 3510, times: { 2: 50 } }], size: 0.5, lifetime: 60 },
  impactBurst: { actions: [{ id: 3511, times: { 0: 40 } }], size: 0.2, lifetime: 40 },
  diveRingA: { actions: [3556], size: 0.4 },
  diveRingB: { actions: [3557], size: 0.4 },
  diveSmash: { actions: [3552], size: 0.5 },
  ice1: { actions: [318], size: 0.6, hit: { damage: 3, hitstun: 24, push: 3 } },
  ice2: { actions: [319], size: 0.6, hit: { damage: 3, hitstun: 24, push: 3 } },
  ice3: { actions: [320], size: 0.6, hit: { damage: 3, hitstun: 24, push: 3 } },
  ice4: { actions: [321], size: 0.6, hit: { damage: 3, hitstun: 40, push: 10, heavy: true } },
  iceTower: { actions: [322], size: 1.5, scale: 0.5, hit: { damage: 9, hitstun: 50, push: 14, heavy: true } },
  danceArc1: { actions: [211], size: 0.4 },
  danceArc2: { actions: [212], size: 0.4 },
  danceArc3: { actions: [213], size: 0.45 },
  danceArc4: { actions: [214], size: 0.5 },
  danceArc5: { actions: [215], size: 0.5 },
  danceArc6: { actions: [216], size: 0.5 },
  danceArc7: { actions: [217], size: 0.45 },
  danceKickArc: { actions: [3020], size: 0.5 },
  // O relogio do Quicksilver (3601) e a marca sobre o oponente.
  clock: { actions: [3601], size: 0.2, scale: 1, lifetime: 600, alpha: 0.6 },
  slowMark: { actions: [3601], size: 0.12, scale: 1, lifetime: 600, alpha: 0.5 },
  doppelFlash: { actions: [3701], size: 0.5 },
  // O clone: o proprio Dante, 14 ticks atrasado, vermelho e translucido.
  doppelShadow: {
    actions: [{ id: 3704, times: { 0: 600 } }],
    lifetime: 600,
    harmless: true,
    layer: 'back',
    alpha: 0.6,
    tint: 0xff6060,
    mirrorOwner: { delay: 14, offset: 30 },
  },
  // Cada acerto do Dante com o clone ligado se repete aqui, com metade do dano.
  doppelStrike: {
    actions: [211],
    size: 0.35,
    noEcho: true,
    maxHits: 1,
    area: { rect: [-120, -200, 120, 60], hitstun: 20, push: 2 },
  },
};

// Notacao relativa ao lado que ele encara.
const COMBOS = [
  { id: 'millionDollars', input: '↓→↓→P', animation: 'millionDollars' },
  { id: 'realImpact', input: '↓→↓→K', animation: 'realImpact' },
  { id: 'crystal', input: '↓→↓→S', animation: 'crystal' },
  { id: 'danceMacabre', input: '↓←↓←P', animation: 'danceMacabre' },
  { id: 'quicksilver', input: '↓←↓←K', animation: 'quicksilver' },
  { id: 'doppelganger', input: '↓←↓←S', animation: 'doppelganger' },
  { id: 'highTime', input: '→↓→P', animation: 'highTime' },
  { id: 'risingDragon', input: '→↓→K', animation: 'risingDragon' },
  { id: 'divineDragon', input: '→↓→S', animation: 'divineDragon' },
  { id: 'throw', input: '←→K', animation: 'throw' },
  { id: 'millionStab', input: '↓→P', animation: 'millionStab' },
  { id: 'slide', input: '↓→K', animation: 'kickSlide' },
  { id: 'gunBurst', input: '↓→S', animation: 'gunBurst' },
  { id: 'stinger', input: '↓←P', animation: 'stinger' },
  { id: 'straight', input: '↓←K', animation: 'straight' },
  { id: 'royalKick', input: '↓←S', animation: 'royalKick' },
  { id: 'royalGuard', input: '↓↓P', animation: 'royalGuard' },
  { id: 'volcano', input: '↓↓K', animation: 'volcano' },
  { id: 'taunt', input: '↓↓S', animation: 'taunt' },
  { id: 'upper', input: 'P', hold: '↓', animation: 'risingUpper', airAnimation: 'helmBreaker' },
  { id: 'crouchKick', input: 'K', hold: '↓', animation: 'crouchKick', airAnimation: 'airVolcano' },
  { id: 'sweep', input: 'S', hold: '↓', animation: 'crouchSweep', airAnimation: 'rainstorm' },
];

const BUTTONS = {
  ground: { punch: 'punch', kick: 'kick', special: 'guns' },
  air: { punch: 'airSword', kick: 'airKick', special: 'airGuns' },
};

const MOVE_LIST = [
  { section: 'Movimento', name: 'Corrida', input: '→→' },
  { section: 'Movimento', name: 'Passo para trás', input: '←←' },
  { section: 'Movimento', name: 'Dash aéreo', input: '→→', note: 'No ar' },
  { section: 'Movimento', name: 'Pulo duplo', input: '↑↑', note: 'No ar, aperte para cima de novo' },
  { section: 'Golpes', name: 'Rebellion', input: 'PPP', note: 'P, K: três cortes → P, S (Million Stab) ou K (lançador)' },
  { section: 'Golpes', name: 'Artes marciais', input: 'KKK', note: 'K, S: seis chutes → K, P (rasteira) ou S (Kick 13)' },
  { section: 'Golpes', name: 'Ebony & Ivory', input: 'SSSS', note: 'A quarta fecha na pirueta de tiros' },
  { section: 'Golpes', name: 'No ar', input: 'PPPP', note: 'K: chute (K de novo: chute forte); S: tiros' },
  { section: 'Golpes', name: 'Agachado', input: 'P K S', hold: '↓', note: 'Lançador, chute baixo e rasteira' },
  { section: 'Especiais', name: 'Helm Breaker', input: 'P', hold: '↓', note: 'No ar: mergulho de espada' },
  { section: 'Especiais', name: 'Volcano aéreo', input: 'K', hold: '↓', note: 'No ar' },
  { section: 'Especiais', name: 'Rainstorm', input: 'S', hold: '↓', note: 'No ar: gira atirando no chão' },
  { section: 'Especiais', name: 'High Time', input: '→↓→P', note: 'Joga o oponente para cima' },
  { section: 'Especiais', name: 'Rising Dragon', input: '→↓→K' },
  { section: 'Especiais', name: 'Divine Dragon', input: '→↓→S', note: 'Vários acertos subindo' },
  { section: 'Especiais', name: 'Stinger', input: '↓←P', note: 'Acertando, P emenda no Million Stab' },
  { section: 'Especiais', name: 'Straight', input: '↓←K', note: 'Carrega e atravessa' },
  { section: 'Especiais', name: 'Release', input: '↓←S', note: 'Chute com onda de choque' },
  { section: 'Especiais', name: 'Rasteira', input: '↓→K' },
  { section: 'Especiais', name: 'Rajada de pistola', input: '↓→S', note: 'Antiaérea: os tiros sobem na diagonal' },
  { section: 'Especiais', name: 'Royal Guard', input: '↓↓P', note: 'Apara o golpe e devolve com o Release' },
  { section: 'Especiais', name: 'Volcano', input: '↓↓K', note: 'O punho no chão levanta labaredas' },
  { section: 'Especiais', name: 'Arremesso', input: '←→K', note: 'De perto' },
  { section: 'Especiais', name: 'Provocação', input: '↓↓S' },
  { section: 'Super', name: 'Million Stab', input: '↓→P', note: 'Chuva de estocadas' },
  { section: 'Super', name: 'Million Dollars', input: '↓→↓→P', note: 'Saraivada de Ebony & Ivory' },
  { section: 'Super', name: 'Real Impact', input: '↓→↓→K', note: 'Se pegar, gancho duplo; K no ar: mergulho' },
  { section: 'Super', name: 'Crystal', input: '↓→↓→S', note: 'Estacas de gelo; S de novo: a torre' },
  { section: 'Super', name: 'Dance Macabre', input: '↓←↓←P', note: 'Se a investida pegar, a dança de cortes' },
  { section: 'Super', name: 'Quicksilver', input: '↓←↓←K', note: 'O oponente em câmera lenta por 10 s' },
  { section: 'Super', name: 'Doppelganger', input: '↓←↓←S', note: 'Clone que repete os golpes por 10 s' },
];

// Sons do pacote (dante2.snd), convertidos para MP3.
const SOUNDS = {
  sword1: [200, 0], sword2: [200, 1], sword3: [200, 2], swordSheath: [200, 3], sword4: [200, 4], sword5: [200, 5],
  stab1: [200, 6], stab2: [200, 7], stab3: [200, 8],
  kick1: [2000, 0], kick2: [2000, 1], kick3: [2000, 2], kick4: [2000, 3], kick5: [2000, 4], kick13: [2000, 5],
  guns1: [300, 0], guns2: [300, 1], guns3: [300, 2], gunsFinale: [300, 3], crystalVoice: [300, 4], crystalTower: [300, 5],
  shot: [1500, 0], highTime: [1000, 0], stinger: [1100, 0], stingerEnd: [1100, 1],
  helmImpact: [1200, 1], straight: [2500, 0], upper: [410, 0], crouchKick: [400, 0], dragon: [400, 0],
  air1: [600, 0], air2: [600, 1], airKick: [2900, 0], airGuns: [630, 0],
  volcano: [2700, 0], volcanoDive: [3000, 0],
  dollarsVoice: [3000, 0], danceStart: [3010, 0], dance1: [3010, 1], dance2: [3010, 2], dance4: [3010, 4], dance5: [3010, 5],
  danceKick1: [3010, 8], danceKick2: [3010, 9], danceKick3: [3010, 10],
  dollars1: [3400, 1], dollars2: [3400, 2], dollars3: [3400, 3], dollars4: [3400, 4],
  impactVoice: [3000, 0], impact1: [3500, 0], impact2: [3500, 1], impactDive: [3501, 0],
  quicksilver: [3600, 0], clockTick: [3600, 1], doppelVoice: [3400, 0],
  guardUp: [20, 1], guardBlock: [900, 1], release: [900, 2], releaseKick: [900, 0],
  throwVoice: [800, 0], punch: [2000, 0], dash: [100, 0], land: [20, 1], taunt: [3400, 0],
};

importMugenCharacter({
  root: ROOT,
  sffPath: resolve(PACK, 'dante_m-ism.sff'),
  sffOptions: { actPath: resolve(PACK, 'dante.act') },
  airPath: resolve(PACK, 'dante.air'),
  outDir: 'public/assets/characters/dante',
  id: 'dante',
  name: 'Dante',
  description: 'Caçador de demônios',
  template: 'public/assets/characters/dummy/dummy_config.json',
  animations: ANIMATIONS,
  effects: EFFECTS,
  combos: COMBOS,
  buttons: BUTTONS,
  moveList: MOVE_LIST,
  echo: { buff: 'doppelganger', effect: 'doppelStrike', delay: 14, ratio: 0.5, height: 50 },
  sndPath: resolve(PACK, 'dante2.snd'),
  sounds: SOUNDS,
  bodyScale: 0.5,
  spriteScale: 0.78,
  portrait: { sprite: [9000, 1], crop: [0, 0, 117, 128], width: 50, height: 55, background: '#241416' },
});
