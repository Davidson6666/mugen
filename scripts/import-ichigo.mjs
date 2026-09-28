// Importa o Ichigo do pacote MUGEN "Ichigo FinalBankai" (A.C.Z; creditos em
// CREDITS.md).
//
// O pacote fica em assets-src/ichigo/mugen/ (fora do git). SFF v1: as cores
// vem da paleta "Ichigo FinalBankai.act". Para regerar: npm run assets:ichigo
//
// O pacote e maior por fora do que por dentro: o .cmd cita Getsuga Tenshou,
// Getsuga Negro, Getsuga Final, "1000 Slice", o combo aereo do Bankai e ate
// um chute medio/forte em pe, mas os estados que esses comandos apontam
// (210, 220, 230, 400 e a maioria dos 800/900/1000+) nao existem em nenhum
// dos arquivos do pacote - apertar o botao nao faz nada. Dois golpes
// "nomeados" tambem sao, na pratica, passos (o chute forte em pe e o chute
// forte no ar so teleportam, sem acerto), e a familia "Head Smash"/"Air
// Shunpo" (que emenda de qualquer golpe que conectar) tem o dano zerado no
// HitDef (so causa dano na guarda) - um golpe que existe mas nao machuca.
// O que sobra e o que entrou aqui: o soco fraco, o chute agachado, os tres
// socos no ar, o mergulho de espada (Falling Sword), o Hard Cut (emenda de
// qualquer golpe que conectar) e o Bankai.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importMugenCharacter } from './lib/mugen-import.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = resolve(ROOT, 'assets-src/ichigo/mugen');

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

  // Corrida (toque duplo ↔↔).
  dashForward: {
    actions: [{ id: 100, times: { 0: 5, 1: 5 } }],
    dash: { distance: 140, moveFrom: 0, moveUntil: 1, invulnerableFrom: 0, invulnerableUntil: 0, cancel: true },
  },
  dashBackward: {
    actions: [105],
    dash: { distance: 110, moveFrom: 0, moveUntil: 2, invulnerableFrom: 0, invulnerableUntil: 0, cancel: true },
  },

  // ---- Soco fraco em pe (200): o unico soco em pe que funciona no pacote ----
  punch: {
    actions: [200],
    specialCancel: true,
    hit: { damage: 3, hitstun: 16, push: 5 },
  },
  // ---- Chute agachado (430): mais forte que o soco ----
  crouchLight: {
    actions: [430],
    specialCancel: true,
    hit: { damage: 5, hitstun: 20, push: 8 },
  },

  // ---- Socos no ar (600 fraco, 610 medio, 620 forte); os chutes no ar do
  // pacote (630/640) nao acertam e o "forte" (650) so teleporta ----
  airLight: { actions: [600], air: true, specialCancel: true, hit: { damage: 3, hitstun: 16, push: 5 } },
  airMedium: { actions: [610], air: true, specialCancel: true, hit: { damage: 3, hitstun: 18, push: 6 } },
  airStrong: { actions: [620], air: true, hit: { damage: 4, hitstun: 20, push: 6, heavy: true } },

  // ---- Hard Cut (↓→ + especial): emenda de qualquer soco/chute que
  // conectar (specialCancel), um corte forte que nao lanca ----
  hardCut: {
    actions: [970009],
    cooldown: 200,
    hit: { damage: 5, hitstun: 22, push: 8, heavy: true },
  },

  // ---- Falling Sword (↓← + especial, no ar): mergulha espada em riste ----
  fallingSword: {
    launch: { vx: 4, vy: 3 },
    actions: [833],
    air: true,
    cooldown: 240,
    events: [{ frame: 3, vy: 10 }],
    hit: { damage: 6, hitstun: 26, push: 8, heavy: true },
  },

  // ---- Super Bankai (↓→↓→ + especial): dois cortes na velocidade do
  // Shunpo ----
  bankai: {
    actions: [6750],
    cooldown: 900,
    hits: [
      { from: 12, until: 13, box: { offsetX: 20, offsetY: 15, width: 190, height: 170 }, damage: 6, hitstun: 20, push: 4 },
      { from: 15, until: 16, box: { offsetX: 20, offsetY: 15, width: 190, height: 170 }, damage: 9, hitstun: 30, push: 10, heavy: true },
    ],
  },
};

const special = (id, input, animation) => ({ id, input: `${input}S`, animation });
const COMBOS = [
  special('hardcut', '↓→', 'hardCut'),
  special('fallingsword', '↓←', 'fallingSword'),
  special('bankai', '↓→↓→', 'bankai'),
];

const BUTTONS = {
  ground: { punch: 'punch', kick: 'crouchLight', special: 'punch' },
  air: { punch: 'airLight', kick: 'airMedium', special: 'airStrong' },
};

const MOVE_LIST = [
  { section: 'Movimento', name: 'Corrida', input: '→→', note: 'Também ←←' },
  { section: 'Golpes', name: 'Soco', input: 'P' },
  { section: 'Golpes', name: 'Chute (agachado)', input: 'K', note: 'Mais forte que o soco' },
  { section: 'Golpes', name: 'No ar (fraco, médio, forte)', input: 'PKS', note: 'No ar' },
  { section: 'Especiais', name: 'Hard Cut', input: '↓→S', note: 'Emenda de qualquer soco/chute que conectar' },
  { section: 'Especiais', name: 'Falling Sword', input: '↓←S', note: 'No ar; mergulha com a espada' },
  { section: 'Super', name: 'Bankai', input: '↓→↓→S', note: 'Dois cortes na velocidade do Shunpo' },
];

importMugenCharacter({
  root: ROOT,
  sffPath: resolve(PACK, 'Ichigo FinalBankai.sff'),
  sffOptions: { actPath: resolve(PACK, 'Ichigo FinalBankai.act') },
  airPath: resolve(PACK, 'Ichigo FinalBankai.air'),
  outDir: 'public/assets/characters/ichigo',
  id: 'ichigo',
  sndPath: resolve(PACK, 'Ichigo FinalBankai.snd'),
  soundsFromDef: resolve(PACK, 'Ichigo FinalBankai.def'),
  name: 'Ichigo',
  description: 'Bankai Final',
  template: 'public/assets/characters/dummy/dummy_config.json',
  animations: ANIMATIONS,
  combos: COMBOS,
  buttons: BUTTONS,
  moveList: MOVE_LIST,
  portrait: { sprite: [9000, 1], crop: [0, 0, 120, 140], width: 50, height: 55, background: '#14171f' },
});
