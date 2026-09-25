// Importa a Miku do pacote MUGEN "HATSUNE MIKU" (YU-TOHARU; creditos em
// CREDITS.md).
//
// O pacote fica em assets-src/miku/mugen/ (fora do git). SFF v1; cores do
// personagem na paleta data/act/miku1.act. Para regerar: npm run assets:miku
//
// Personagem comica (a cebolinha, as notas musicais, os bonecos Nendoroid).
// Sprite ja na altura do elenco (105 px): escala 1. Fica o que e golpe: os
// normais (em pe, agachada, no ar), a cebolinha e o chute com arranque, e os
// especiais: Miku Voice, Negi Shoryu, Negi Issen, as tres cebolinhas
// turbinadas (raio, fogo, gelo), o Nanto Gokutoken de imitacao, "Hatsune-san
// Pinch!" (contra-ataque), Nendoroid, o foguete de cebolinha, o Super Miku
// Kick e os supers com as musicas do pacote (grupo 9100 do .snd, em MP3):
// Hatsune Music (16 musicas), Nico Nico All Stars (as 10 variacoes que sao
// musica; as outras sao cenas com personagens de outros jogos), Ievan Polkka
// e Cinderella Romance. Ficam de fora o Miku Crusher (no pacote so funciona
// contra um personagem especifico), a roleta, os escudos e a provocacao.
// Botoes: soco = a (fraco), chute = b (medio), especial = c (forte).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importMugenCharacter } from './lib/mugen-import.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = resolve(ROOT, 'assets-src/miku/mugen');

const fx = (at, id, pos = [0, 0], extra = {}) => ({ at, effect: { id, pos, ...extra } });
const strike = (from, until, rect, data) => ({ from, until, rect, ...data });

const NORMAL = { specialCancel: true };

// Tela do pacote (320x240) -> area visivel da camera (~853x480): o que o
// pacote prende na tela (titulo da musica, fundos, recortes) cresce 2,67x.
const SCREEN = 853 / 320;
// Titulo da musica (explod postype=right, y=203 no pacote): no canto de
// baixo, a direita, perto do chao.
const title = (at, anim, fromRight) => fx(at, `title${anim}`, [426 - fromRight * SCREEN, -39], { target: 'stage' });

// Musicas do Hatsune Music (1800-1815) e do Nico Nico All Stars (so as
// variacoes que sao musica): [estado, pose, som 9100, compasso, fim, titulo,
// titulo a partir da direita].
const HATSUNE = [
  [1800, 2488, 7, 19, 300, 10508, 139], [1801, 2489, 6, 37, 360, 10506, 99],
  [1802, 2488, 69, 22, 390, 10504, 163], [1803, 2488, 5, 26, 450, 10502, 80],
  [1804, 2488, 8, 26, 510, 10507, 95], [1805, 2488, 9, 28, 340, 10505, 82],
  [1806, 2490, 10, 33, 440, 10501, 89], [1807, 2488, 11, 24, 430, 10503, 76],
  [1808, 2491, 12, 12, 450, 10500, 108], [1809, 2490, 13, 24, 460, 10520, 60],
  [1810, 2490, 74, 22, 400, 10518, 86], [1811, 2488, 15, 27, 510, 10521, 130],
  [1812, 2488, 16, 18, 290, 10519, 70], [1813, 2489, 25, 35, 340, 10525, 109],
  [1814, 2488, 26, 27, 340, 10524, 77], [1815, 2488, 24, 21, 360, 10523, 138],
];
const NICO = [
  [1840, 2492, 17, 21, 410, 10512, 237], [1859, 2492, 19, 27, 530, 10514, 107],
  [1897, 2492, 42, 20, 470, 10541, 106], [1904, 2492, 40, 19, 370, 10540, 95],
  [1909, 2492, 41, 28, 590, 10539, 86], [1919, 2492, 51, 29, 470, 10548, 64],
  [1978, 2492, 64, 37, 410, 10551, 48], [1986, 2492, 61, 17, 590, 10552, 273],
  [2011, 2492, 60, 20, 440, 10554, 128], [2180, 2492, 87, 19, 370, 10574, 131],
];

// Uma variacao: canta a musica (para se ela for interrompida), o titulo
// aparece, e as notas saem no compasso a partir do tick 60 (os helpers
// 3000-3024 do pacote), perseguindo o oponente.
function songMove([state, pose, song, beat, end, titleAnim, fromRight], { blast = false } = {}) {
  const beats = [];
  for (let at = 60; at < end - 20; at += beat) beats.push(at);
  return [`song${state}`, {
    actions: [{ id: pose, lengthTicks: end }],
    invulnerable: [0, 60],
    events: [
      { at: 0, sound: `song${song}`, stopWithMove: true },
      fx(0, 'aura', [0, -60]),
      title(0, titleAnim, fromRight),
      ...(blast ? [fx(70, 'soundBlast', [-10, -50])] : []),
      ...beats.map((at, index) => fx(at, index % 2 ? 'noteF' : 'noteMusic', [10, -90])),
    ],
  }];
}
const SONG_MOVES = Object.fromEntries([...HATSUNE.map((row) => songMove(row)), ...NICO.map((row) => songMove(row, { blast: true }))]);
const SONG_SOUNDS = Object.fromEntries([...HATSUNE, ...NICO].map(([, , song]) => [`song${song}`, [9100, song]]));
const TITLES = [...new Set([...HATSUNE, ...NICO].map((row) => row[5]).concat([10510, 10615]))];

// Ievan Polkka (2123): 15 batidas a cada ~30,5 ticks a partir do 115 e a
// batida final no 573.
const POLKA_BEATS = Array.from({ length: 15 }, (_, index) => 115 + Math.round(index * 30.5));

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
  victoryPose: { actions: [{ id: 2488, times: { 0: 60 } }] },
  defeatPose: { actions: [3561] },

  dashForward: {
    actions: [{ id: 100, times: { 0: 8, 1: 8 } }],
    dash: { distance: 180, moveFrom: 0, moveUntil: 1, invulnerableFrom: 0, invulnerableUntil: 1, cancel: true },
  },
  dashBackward: {
    actions: [{ id: 105, times: { 8: 4 } }],
    dash: { distance: 140, moveFrom: 0, moveUntil: 7, invulnerableFrom: 0, invulnerableUntil: 4, cancel: true },
  },
  airDashForward: {
    actions: [{ id: 100, times: { 0: 8, 1: 8 } }],
    dash: { distance: 140, moveFrom: 0, moveUntil: 1, invulnerableFrom: 9, invulnerableUntil: 0 },
  },
  airDashBackward: {
    actions: [{ id: 100, times: { 0: 6, 1: 6 } }],
    dash: { distance: 110, moveFrom: 0, moveUntil: 1, invulnerableFrom: 9, invulnerableUntil: 0 },
  },

  // ---- Em pe: fraco (2480), medio (2481), forte (1967) ----
  punch: {
    actions: [2480],
    ...NORMAL,
    hit: { damage: 2, hitstun: 18, push: 4 },
    cancels: [
      { on: 'punch', to: 'punch', after: 8, down: false },
      { on: 'kick', to: 'kick', after: 6, down: false },
      { on: 'special', to: 'strong', after: 6, down: false },
    ],
  },
  kick: {
    actions: [2481],
    ...NORMAL,
    hit: { damage: 4, hitstun: 22, push: 5 },
    cancels: [{ on: 'special', to: 'strong', after: 8 }],
  },
  strong: {
    actions: [1967],
    ...NORMAL,
    hit: { damage: 5, hitstun: 28, push: 8, heavy: true },
  },
  // ---- Agachada (2482, 2483, rasteira 1976) ----
  crouchLight: {
    actions: [2482],
    ...NORMAL,
    hit: { damage: 2, hitstun: 18, push: 3 },
    cancels: [{ on: 'kick', to: 'crouchMedium', after: 6, down: true }, { on: 'special', to: 'crouchStrong', after: 6, down: true }],
  },
  crouchMedium: {
    actions: [2483],
    ...NORMAL,
    hit: { damage: 4, hitstun: 22, push: 5 },
    cancels: [{ on: 'special', to: 'crouchStrong', after: 8, down: true }],
  },
  crouchStrong: {
    actions: [1976],
    ...NORMAL,
    hit: { damage: 5, hitstun: 30, push: 6, heavy: true },
  },
  // Lancador (415): joga para cima.
  launcher: {
    actions: [415],
    ...NORMAL,
    hit: { damage: 4, hitstun: 32, push: 6, heavy: true },
  },
  // → + chute: cebolinha pulando (2869); → + especial: chute voador (3060).
  leekDive: {
    actions: [3301],
    ...NORMAL,
    hit: { damage: 4, hitstun: 24, push: 5 },
    events: [{ at: 0, vx: 4, vy: -4 }],
  },
  flyingKick: {
    actions: [3741],
    ...NORMAL,
    hit: { damage: 6, hitstun: 30, push: 9, heavy: true },
    events: [{ at: 0, vx: 4, vy: -4 }, fx(6, 'kickFlame', [40, -50])],
  },

  // ---- No ar (2478, 2479, 230) ----
  airLight: { actions: [2478], air: true, ...NORMAL, hit: { damage: 2, hitstun: 18, push: 4 } },
  airMedium: { actions: [2479], air: true, ...NORMAL, hit: { damage: 4, hitstun: 22, push: 5 } },
  airStrong: { actions: [230], air: true, ...NORMAL, hit: { damage: 5, hitstun: 28, push: 8, heavy: true } },

  // ---- Especiais ----
  // Miku Voice (1500/1520/1510): a nota musical que voa.
  voiceLight: { actions: [1500], cooldown: 50, events: [fx(1, 'voiceNote', [0, -80], { velocityX: 5 })] },
  voiceMedium: { actions: [1500], cooldown: 60, events: [fx(1, 'voiceNoteBig', [0, -80], { velocityX: 6 })] },
  voiceStrong: {
    actions: [1530],
    cooldown: 80,
    events: [fx(1, 'voiceNote', [0, -80], { velocityX: 7 }), fx(20, 'voiceNoteBig', [0, -80], { velocityX: 7 })],
  },
  // Negi Shoryu (1549 -> 1550 -> 1551): sobe girando a cebolinha.
  negiShoryu: {
    actions: [2484, 2495, { id: 2485, times: { 14: 6, 15: 6 } }],
    cooldown: 60,
    hit: { damage: 5, hitstun: 30, push: 6, heavy: true },
    events: [{ action: 2495, at: 0, vy: -9, vx: 2 }, fx(0, 'dust', [20, 10])],
  },
  // Negi Issen (← segura → + botao): investida cortando.
  negiIssen: {
    actions: [3343, { id: 3346, times: { 0: 3, 1: 3, 2: 3, 3: 3 } }, 3351, 3347],
    cooldown: 70,
    noPush: true,
    friction: false,
    hit: { damage: 8, hitstun: 30, push: 12, heavy: true },
    events: [{ action: 3346, at: 0, vx: 13 }, { action: 3351, at: 0, vx: 0 }, fx(4, 'dust', [10, 5])],
  },
  // Cebolinhas turbinadas (2870/2873/2875): salto com a cebolinha de raio,
  // fogo ou gelo.
  thunderLeek: {
    actions: [3306],
    cooldown: 90,
    hit: { damage: 7, hitstun: 32, push: 9, heavy: true },
    events: [{ at: 20, vx: 4, vy: -5 }, fx(5, 'thunder', [10, -117]), fx(20, 'leekArc', [40, -90])],
  },
  fireLeek: {
    actions: [3340],
    cooldown: 90,
    hit: { damage: 7, hitstun: 32, push: 9, heavy: true },
    events: [{ at: 20, vx: 4, vy: -5 }, fx(20, 'fire', [35, -80])],
  },
  iceLeek: {
    actions: [3341],
    cooldown: 90,
    hit: { damage: 7, hitstun: 32, push: 9, heavy: true },
    events: [{ at: 20, vx: 4, vy: -5 }, fx(5, 'ice', [10, -105]), fx(20, 'iceShard', [35, -85])],
  },
  // Nanto Gokutoken de imitacao (3037 -> 3038): voa em diagonal cortando.
  gokutoken: {
    actions: [3716, { id: 3715, lengthTicks: 25 }],
    cooldown: 90,
    areas: [strike(1, 99, [0, -90, 45, -10], { damage: 2, hitstun: 22, push: 3, every: 6, count: 4 })],
    events: [{ action: 3715, at: 0, vx: 6, vy: -4 }, fx(4, 'sparkles', [-15, -75])],
  },
  // "Hatsune-san Pinch!" (2965 -> 2966): se apanhar na postura, as mini-Mikus
  // caem do ceu em cima do oponente.
  pinch: {
    actions: [{ id: 3554, times: { 3: 30 } }],
    cooldown: 180,
    counter: { from: 3, until: 36, to: 'pinchRain' },
  },
  pinchRain: {
    actions: [{ id: 3555, times: { 1: 30 } }],
    invulnerable: [0, 33],
    events: [0, 9, 18].map((at, index) => fx(at + 4, 'chibi', [[-20, 0, 20][index], -220], { target: 'opponent' })),
  },
  // Nendoroid (2779 -> 2780): o boneco gigante cai na frente dela.
  nendoroid: {
    actions: [2716],
    cooldown: 120,
    events: [fx(16, 'nendoroid', [85, -260])],
  },
  // Foguete de cebolinha (2943 -> 2944).
  negiRocket: {
    actions: [{ id: 3442, lengthTicks: 30 }],
    cooldown: 150,
    events: [fx(10, 'rocket', [-10, -40])],
  },
  // Super Miku Kick (no ar, 634/640/650): mergulho em diagonal.
  superKick: {
    actions: [1969, { id: 1970, lengthTicks: 30 }, 1971],
    air: true,
    cooldown: 60,
    hit: { damage: 6, hitstun: 30, push: 8, heavy: true },
    events: [{ at: 0, vx: -1, vy: -4 }, { action: 1970, at: 0, vx: 6, vy: 7 }],
  },

  // ---- Supers ----
  // Hatsune Music (1799 -> 1800-1815): sorteia uma das 16 musicas.
  music: {
    cooldown: 600,
    actions: [{ id: 2488, lengthTicks: 2 }],
    randomNext: HATSUNE.map(([state]) => `song${state}`),
  },
  // Nico Nico All Stars (1839/2121): sorteia uma das 10 variacoes que sao
  // musica; a onda de som (helper 2130) empurra quem estiver perto.
  nicoNico: {
    cooldown: 900,
    actions: [{ id: 2492, lengthTicks: 2 }],
    randomNext: NICO.map(([state]) => `song${state}`),
  },
  ...SONG_MOVES,
  // Ievan Polkka (2123): vira a Hachune Miku e danca girando a cebolinha.
  ievanPolkka: {
    cooldown: 900,
    actions: [{ id: 2166, lengthTicks: 60 }, { id: 8900, lengthTicks: 55 }, { id: 2167, lengthTicks: 475 }, { id: 2168, lengthTicks: 10 }],
    invulnerable: [0, 600],
    events: [
      { at: 0, sound: 'ievan', stopWithMove: true },
      fx(0, 'bigAura', [0, -60]),
      fx(0, 'cutIn', [-230, -180], { target: 'stage' }),
      { at: 50, standAt: -70, pinOpponent: { dx: 0, lift: 0, ticks: 540 } },
      title(115, 10510, 100),
      ...POLKA_BEATS.map((at) => fx(at, 'polkaBeat', [0, -50], { target: 'opponent' })),
      fx(573, 'polkaFinal', [0, -50], { target: 'opponent' }),
      fx(590, 'endRing', [0, -60]),
    ],
  },
  // Cinderella Romance (2741 -> 2749): a boneca cai no oponente; se pegar,
  // o baile (fundo 2627, a musica) e a cebolinha gigante que explode.
  cinderella: {
    cooldown: 1200,
    actions: [{ id: 2624, times: { 6: 100 } }],
    invulnerable: [0, 70],
    events: [fx(0, 'bigAura', [0, -60]), fx(0, 'cutInDress', [-230, -180], { target: 'stage' }), fx(70, 'doll', [0, -260], { target: 'opponent' })],
    onHit: { to: 'cinderellaBall' },
  },
  cinderellaBall: {
    actions: [{ id: 2614, lengthTicks: 350 }],
    invulnerable: [0, 350],
    events: [
      { at: 0, sound: 'cinderella', stopWithMove: true },
      { at: 0, standAt: -110, pinOpponent: { dx: 0, lift: 0, ticks: 360 } },
      fx(10, 'ballroom', [0, -180], { target: 'stage' }),
      title(30, 10615, 133),
      fx(40, 'stars', [-10, -110]),
      fx(256, 'giantLeek', [60, -60]),
      fx(340, 'leekBoom', [0, -40], { target: 'opponent' }),
    ],
    next: 'cinderellaEnd',
  },
  cinderellaEnd: {
    actions: [{ id: 2635, times: { 2: 20 } }],
    events: [{ at: 0, vx: -3, vy: -3 }],
  },
};

const EFFECTS = {
  dust: { actions: [2534], size: 0.5, harmless: true },
  kickFlame: { actions: [3742], harmless: true },
  voiceNote: {
    actions: [1510],
    lifetime: 60,
    destroyOnHit: true,
    endAtWall: true,
    hit: { damage: 3, hitstun: 22, push: 4 },
  },
  voiceNoteBig: {
    actions: [1520],
    lifetime: 60,
    destroyOnHit: true,
    endAtWall: true,
    hit: { damage: 4, hitstun: 24, push: 5 },
  },
  thunder: { actions: [3308], harmless: true },
  leekArc: { actions: [3311], harmless: true },
  fire: { actions: [3314], harmless: true },
  ice: { actions: [3317], harmless: true },
  iceShard: { actions: [3316], harmless: true },
  sparkles: { actions: [3712], harmless: true },
  chibi: {
    actions: [3556],
    velocityY: 10,
    lifetime: 40,
    endOnGround: true,
    destroyOnHit: true,
    hit: { damage: 3, hitstun: 30, push: 2 },
  },
  nendoroid: {
    actions: [{ id: 2713, times: { 0: 60 } }],
    lifetime: 60,
    velocityY: 3,
    gravity: 0.44,
    endOnGround: true,
    area: { rect: [-28, -95, 28, 0], damage: 8, hitstun: 36, push: 6, heavy: true },
    onDeathSpawn: { id: 'dust' },
  },
  rocket: {
    actions: [{ id: 3444, times: { 0: 90 } }],
    lifetime: 90,
    velocityX: 9,
    destroyOnHit: true,
    endAtWall: true,
    hit: { damage: 8, hitstun: 36, push: 12, heavy: true },
  },
  aura: { actions: [2182], harmless: true, layer: 'back' },
  bigAura: { actions: [2180], size: 0.5, harmless: true, layer: 'back' },
  endRing: { actions: [2177], size: 0.5, harmless: true },
  // Recortes das ilustracoes (explod postype=left do pacote): a esquerda da tela.
  cutIn: { actions: [1890], size: 0.7, scale: 0.5, center: true, layer: 'front', harmless: true },
  cutInDress: { actions: [2626], size: 0.7, scale: 0.5, center: true, layer: 'front', harmless: true },
  ...Object.fromEntries(TITLES.map((anim) => [`title${anim}`, { actions: [{ id: anim, times: { 0: 180 } }], size: 0.5 * SCREEN, harmless: true }])),
  soundBlast: {
    actions: [2184],
    size: 0.5,
    area: { rect: [-85, -45, 85, 45], damage: 1, hitstun: 20, push: 12, every: 10, count: 4 },
  },
  polkaBeat: {
    actions: [{ id: 2637, times: {} }],
    size: 0.4,
    area: { rect: [-60, -60, 60, 60], until: 1, damage: 1, hitstun: 45, push: 0 },
  },
  polkaFinal: {
    actions: [2640],
    size: 0.5,
    area: { rect: [-100, -120, 100, 120], until: 1, damage: 4, hitstun: 50, push: 12, heavy: true },
  },
  doll: {
    actions: [{ id: 2625, times: { 0: 60 } }],
    lifetime: 60,
    velocityY: 1,
    gravity: 0.44,
    endOnGround: true,
    area: { rect: [-40, -95, 40, 0], damage: 2, hitstun: 400, push: 0, unblockable: true },
  },
  ballroom: { actions: [{ id: 2627, times: { 0: 330 } }], scale: 0.5, lifetime: 330, cover: [920, 520], layer: 'back', opaque: true, harmless: true },
  stars: { actions: [2637], size: 0.5, harmless: true },
  giantLeek: { actions: [{ id: 2632, times: { 1: 40 } }, { id: 2633, times: { 1: 40 } }], lifetime: 90, harmless: true },
  leekBoom: {
    actions: [2640],
    size: 0.6,
    area: { rect: [-110, -120, 110, 120], until: 1, damage: 20, hitstun: 60, push: 14, heavy: true, unblockable: true },
  },
  noteMusic: {
    actions: [2165],
    size: 0.6,
    lifetime: 70,
    motion: [{ at: 0, aim: 6 }, { at: 20, aim: 6 }],
    destroyOnHit: true,
    area: { rect: [-40, -40, 40, 40], damage: 3, hitstun: 36, push: 2 },
  },
  noteF: {
    actions: [2172],
    size: 0.6,
    lifetime: 70,
    motion: [{ at: 0, aim: 6 }, { at: 20, aim: 6 }],
    destroyOnHit: true,
    area: { rect: [-40, -40, 40, 40], damage: 3, hitstun: 36, push: 2 },
  },
};

const special = (id, input, names) => [
  { id: `${id}-p`, input: `${input}P`, animation: names[0] },
  { id: `${id}-k`, input: `${input}K`, animation: names[1] },
  { id: `${id}-s`, input: `${input}S`, animation: names[2] },
];
const COMBOS = [
  { id: 'music', input: '↓→↓→P', animation: 'music' },
  { id: 'nico', input: '↓→↓→K', animation: 'nicoNico' },
  { id: 'ievan', input: '↓←↓←K', animation: 'ievanPolkka' },
  { id: 'cinderella', input: '↓←↓←S', animation: 'cinderella' },
  ...special('leek', '←↓→', ['thunderLeek', 'fireLeek', 'iceLeek']),
  { id: 'rocket', input: '→↓←S', animation: 'negiRocket' },
  { id: 'gokutoken', input: '↓←→P', animation: 'gokutoken' },
  ...special('shoryu', '→↓→', ['negiShoryu', 'negiShoryu', 'negiShoryu']),
  ...special('voice', '↓→', ['voiceLight', 'voiceMedium', 'voiceStrong']),
  { id: 'pinch', input: '←↓P', animation: 'pinch' },
  ...special('nendoroid', '↓←', ['nendoroid', 'nendoroid', 'nendoroid']).map((combo) => ({ ...combo, airAnimation: 'superKick' })),
  ...special('issen', '←→', ['negiIssen', 'negiIssen', 'negiIssen']),
  { id: 'launcher', input: '↓↑K', animation: 'launcher' },
  { id: 'leek-dive', input: '→K', animation: 'leekDive' },
  { id: 'flying-kick', input: '→S', animation: 'flyingKick' },
  { id: 'crouch-p', input: 'P', hold: '↓', animation: 'crouchLight' },
  { id: 'crouch-k', input: 'K', hold: '↓', animation: 'crouchMedium' },
  { id: 'crouch-s', input: 'S', hold: '↓', animation: 'crouchStrong' },
];

const BUTTONS = {
  ground: { punch: 'punch', kick: 'kick', special: 'strong' },
  air: { punch: 'airLight', kick: 'airMedium', special: 'airStrong' },
};

const MOVE_LIST = [
  { section: 'Movimento', name: 'Dash', input: '→→', note: 'Atravessa o oponente; emenda num golpe' },
  { section: 'Movimento', name: 'Dash para trás', input: '←←' },
  { section: 'Movimento', name: 'Dash aéreo', input: '→→', note: 'No ar' },
  { section: 'Movimento', name: 'Pulo duplo', input: '↑↑', note: 'No ar, aperte para cima de novo' },
  { section: 'Golpes', name: 'Fraco / médio / forte', input: 'PKS', note: 'Encadeia do mais fraco para o mais forte' },
  { section: 'Golpes', name: 'Agachada', input: 'P', hold: '↓', note: 'Também com chute e especial (rasteira)' },
  { section: 'Golpes', name: 'No ar', input: 'PKS' },
  { section: 'Golpes', name: 'Lançador', input: '↓↑K' },
  { section: 'Golpes', name: 'Cebolinha pulando', input: '→K' },
  { section: 'Golpes', name: 'Chute voador', input: '→S' },
  { section: 'Especiais', name: 'Miku Voice', input: '↓→P', note: 'Nota musical (uma ou duas, com K/S)' },
  { section: 'Especiais', name: 'Negi Shoryu', input: '→↓→P', note: 'Sobe girando a cebolinha' },
  { section: 'Especiais', name: 'Negi Issen', input: '←→P', note: 'Investida cortando' },
  { section: 'Especiais', name: 'Cebolinha turbinada', input: '←↓→P', note: 'Raio (P), fogo (K) ou gelo (S)' },
  { section: 'Especiais', name: 'Nanto Gokutoken de imitação', input: '↓←→P', note: 'Voa em diagonal cortando' },
  { section: 'Especiais', name: 'Hatsune-san Pinch!', input: '←↓P', note: 'Postura: quem bater leva as mini-Mikus' },
  { section: 'Especiais', name: 'Nendoroid', input: '↓←P', note: 'O boneco gigante cai à frente' },
  { section: 'Especiais', name: 'Foguete de cebolinha', input: '→↓←S' },
  { section: 'Especiais', name: 'Super Miku Kick', input: '↓←K', note: 'No ar: mergulho em diagonal' },
  { section: 'Super', name: 'Hatsune Music', input: '↓→↓→P', note: 'Canta uma de 16 músicas; as notas perseguem o oponente' },
  { section: 'Super', name: 'Nico Nico All Stars', input: '↓→↓→K', note: 'Uma de 10 músicas, com a onda de som' },
  { section: 'Super', name: 'Ievan Polkka', input: '↓←↓←K', note: 'Vira a Hachune Miku e dança girando a cebolinha' },
  { section: 'Super', name: 'Cinderella Romance', input: '↓←↓←S', note: 'A boneca cai; se pegar, o baile e a cebolinha gigante' },
];

importMugenCharacter({
  root: ROOT,
  sffPath: resolve(PACK, 'data/miku.sff'),
  sffOptions: { actPath: resolve(PACK, 'data/act/miku1.act') },
  airPath: resolve(PACK, 'data/miku.air'),
  outDir: 'public/assets/characters/miku',
  id: 'miku',
  name: 'Miku',
  description: 'A diva da cebolinha',
  template: 'public/assets/characters/dummy/dummy_config.json',
  animations: ANIMATIONS,
  effects: EFFECTS,
  combos: COMBOS,
  buttons: BUTTONS,
  moveList: MOVE_LIST,
  // Musicas dos supers (grupo 9100 do .snd), convertidas para MP3.
  sndPath: resolve(PACK, 'data/miku.snd'),
  sounds: { ...SONG_SOUNDS, ievan: [9100, 68], cinderella: [9100, 148] },
  portrait: { sprite: [9000, 1], crop: [0, 0, 120, 132], width: 50, height: 55, background: '#12242A' },
});
