// Importa a Yoruichi do pacote MUGEN "Yoruichi TYBW" (Mounir, ADD004 Basic
// PIEs; creditos em CREDITS.md) - substitui o pacote "Bleach Mugen Project"
// usado antes.
//
// O pacote fica em assets-src/yoruichi/mugen/ (fora do git). SFF v1: as
// cores vem da paleta 1.act. Para regerar: npm run assets:yoruichi
//
// O .air do pacote define a acao 0 (parada) duas vezes: a primeira, com o
// corpo inteiro (grupo 1), e uma segunda mais adiante que so mostra o busto
// do icone de vida (grupo 9000) - um erro do "rebuild" do pacote que deixava
// a Yoruichi parada como so a cabeca flutuando. A segunda foi renumerada
// para 99000 direto no .air copiado (nao usada), para a primeira valer.
//
// Golpes: soco em tres (o terceiro com um Shunpo ate o oponente), chute em
// dois (o segundo lanca) que tambem emenda no soco forte, os tres golpes no
// ar, o Shunpo (corrida) para frente e para tras, o Choque Eletrico (Electro
// Shock) e o super Raiju Senkei. O pacote tem mais combos ligados a um
// medidor de energia que o jogo nao tem (Shunko, Raioken, Raijin Senkei,
// Shunshin Chohengen...); nao foram trazidos.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importMugenCharacter } from './lib/mugen-import.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = resolve(ROOT, 'assets-src/yoruichi/mugen');

// Cancelamentos comuns: todo golpe normal cancela no especial ao conectar.
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
  victoryPose: { actions: [180] },
  defeatPose: { actions: [170] },

  // Shunpo (corrida ↔↔): some num rastro e desliza ate parar.
  dashForward: {
    actions: [11100],
    dash: { distance: 300, moveFrom: 1, moveUntil: 3, invulnerableFrom: 1, invulnerableUntil: 3, cancel: true },
  },
  dashBackward: {
    actions: [11105],
    dash: { distance: 300, moveFrom: 1, moveUntil: 3, invulnerableFrom: 1, invulnerableUntil: 3, cancel: true },
  },

  // ---- Soco (A, estados 2020/2021/2022): martela o botao para encadear,
  // o terceiro golpe da um Shunpo ate o oponente e acerta forte ----
  punch: {
    actions: [2020],
    ...NORMAL,
    hit: { damage: 2, hitstun: 16, push: 4 },
    cancels: [{ on: 'punch', to: 'punch2', after: 6 }],
  },
  punch2: {
    actions: [2021],
    hit: { damage: 3, hitstun: 20, push: 5 },
    cancels: [{ on: 'punch', to: 'punch3', after: 6 }],
  },
  punch3: {
    launch: { vx: 5, vy: 4 },
    actions: [2022],
    events: [{ at: 1, teleport: 40 }],
    hit: { damage: 5, hitstun: 26, push: 8, heavy: true },
  },

  // ---- Chute (B, 2030) encadeia no chute-lancador (2031) ou direto no
  // forte (2040); o lancador emenda nos golpes no ar ----
  kick: {
    actions: [2030],
    ...NORMAL,
    hit: { damage: 1, hitstun: 16, push: 4 },
    cancels: [
      { on: 'kick', to: 'kick2', after: 13 },
      { on: 'special', to: 'strong', after: 13 },
    ],
  },
  kick2: {
    launch: { vx: 2, vy: 8 },
    actions: [2031],
    hit: { damage: 3, hitstun: 24, push: 6, heavy: true },
  },
  // ---- Forte (C, 2040) ----
  strong: {
    actions: [2040],
    ...NORMAL,
    hit: { damage: 2, hitstun: 22, push: 6, heavy: true },
  },

  // ---- No ar (2063 fraco, 2061 medio, 2062 forte) ----
  // O estado 2063 (golpe fraco no ar) toca a animacao 2060.
  airLight: { actions: [2060], air: true, ...NORMAL, hit: { damage: 1, hitstun: 16, push: 4 } },
  airMedium: {
    launch: { vx: 3, vy: 4 },
    actions: [2061],
    air: true,
    ...NORMAL,
    hit: { damage: 2, hitstun: 20, push: 6 },
  },
  airStrong: {
    launch: { vx: 2, vy: 10 },
    actions: [2062],
    air: true,
    hit: { damage: 2, hitstun: 22, push: 6, heavy: true },
  },

  // ---- Choque Eletrico (↓→ + especial): soco carregado que atordoa e
  // lanca ----
  electroShock: {
    launch: { vx: 6, vy: 4 },
    actions: [1400],
    cooldown: 300,
    hit: { damage: 13, hitstun: 34, push: 10, heavy: true },
  },

  // ---- Super Raiju Senkei (↓→↓→ + especial): investida com Shunpo em
  // sequencia e o golpe final. O .air ja marca onde acerta (quadros 13/14/16
  // de 18); um teleporte no comeco garante que ela chega perto do oponente
  // antes, ja que a coreografia original se move via posicao absoluta ----
  raijuSenkei: {
    launch: { vx: 4, vy: 5 },
    actions: [3200],
    cooldown: 900,
    events: [{ at: 5, teleport: 50 }],
    hit: { damage: 15, hitstun: 40, push: 10, heavy: true, unblockable: true },
  },
};

const special = (id, input, animation) => ({ id, input: `${input}S`, animation });
const COMBOS = [
  special('electro', '↓→', 'electroShock'),
  special('raiju', '↓→↓→', 'raijuSenkei'),
];

const BUTTONS = {
  ground: { punch: 'punch', kick: 'kick', special: 'strong' },
  air: { punch: 'airLight', kick: 'airMedium', special: 'airStrong' },
};

const MOVE_LIST = [
  { section: 'Movimento', name: 'Shunpo', input: '→→', note: 'Corrida com rastro; some e desliza. Também ←←' },
  { section: 'Golpes', name: 'Soco (1, 2, 3)', input: 'P', note: 'Martele para encadear; o 3º dá um Shunpo até o oponente' },
  { section: 'Golpes', name: 'Chute (1, lançador)', input: 'K', note: 'O 2º lança o oponente' },
  { section: 'Golpes', name: 'Forte', input: 'S', note: 'Também emenda do chute' },
  { section: 'Golpes', name: 'No ar (fraco, médio, forte)', input: 'PKS', note: 'No ar' },
  { section: 'Especiais', name: 'Choque Elétrico', input: '↓→S', note: 'Soco carregado que atordoa e lança' },
  { section: 'Super', name: 'Raiju Senkei', input: '↓→↓→S', note: 'Investida com Shunpo e o golpe final, não dá pra defender' },
];

importMugenCharacter({
  root: ROOT,
  sffPath: resolve(PACK, 'Yoruichi.sff'),
  sffOptions: { actPath: resolve(PACK, '1.act') },
  airPath: resolve(PACK, 'Yoruichi.air'),
  outDir: 'public/assets/characters/yoruichi',
  id: 'yoruichi',
  sndPath: resolve(PACK, 'Yoruichi.snd'),
  soundsFromDef: resolve(PACK, 'Yoruichi TYBW.def'),
  name: 'Yoruichi',
  description: 'A deusa do Shunpo',
  template: 'public/assets/characters/dummy/dummy_config.json',
  spriteScale: 1.8,
  animations: ANIMATIONS,
  combos: COMBOS,
  buttons: BUTTONS,
  moveList: MOVE_LIST,
  portrait: { sprite: [9000, 1], crop: [0, 0, 120, 140], width: 50, height: 55, background: '#1B1622' },
});
