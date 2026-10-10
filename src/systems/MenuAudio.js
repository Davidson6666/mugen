// Som dos menus, sintetizado na hora pelo Web Audio (sem arquivos): um tique ao
// navegar, uma batida ao confirmar, um som mais baixo ao voltar e uma trilha em
// laco enquanto o jogador esta nos menus. A luta tem o AudioManager; este aqui
// so cuida do que acontece fora dela e para a trilha ao entrar na arena.
//
// O navegador so libera audio depois de um gesto do jogador, entao tudo fica
// pendente ate o primeiro toque de tecla ou clique.
import { loadVolume } from './AudioManager.js';

const SFX_LEVEL = 0.5;
const MUSIC_LEVEL = 0.2;
const BPM = 104;
const EIGHTH = 60 / BPM / 2;
const LOOKAHEAD = 0.18;

const midi = (note) => 440 * 2 ** ((note - 69) / 12);

// Am - F - C - G, um compasso cada: baixo, acorde que o arpejo percorre.
const BARS = [
  { bass: 45, chord: [57, 60, 64] },
  { bass: 41, chord: [53, 57, 60] },
  { bass: 48, chord: [60, 64, 67] },
  { bass: 43, chord: [55, 59, 62] },
];
const ARP_ORDER = [0, 1, 2, 1, 0, 1, 2, 1];

let context = null;
let master = null;
let musicGain = null;
let timer = 0;
let nextTime = 0;
let step = 0;
let musicWanted = false;
let unlockBound = false;

function ensure() {
  if (context) return context;
  const Ctor = window.AudioContext ?? window.webkitAudioContext;
  if (!Ctor) return null;
  context = new Ctor();
  master = context.createGain();
  master.connect(context.destination);
  musicGain = context.createGain();
  musicGain.gain.value = 0;
  musicGain.connect(master);
  return context;
}

function level() {
  return loadVolume();
}

function tone({ type = 'square', from, to = from, length = 0.08, gain = 0.1, at = 0, out = null }) {
  const ctx = ensure();
  if (!ctx) return;
  const start = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, start + length);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(amp).connect(out ?? master);
  osc.start(start);
  osc.stop(start + length + 0.03);
}

function noise({ length = 0.04, gain = 0.05, at = 0, out = null, highpass = 4000 }) {
  const ctx = ensure();
  if (!ctx) return;
  const start = ctx.currentTime + at;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = highpass;
  const amp = ctx.createGain();
  amp.gain.value = gain;
  source.connect(filter).connect(amp).connect(out ?? master);
  source.start(start);
}

function sfx(play) {
  const ctx = ensure();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  master.gain.value = level() * SFX_LEVEL;
  play();
}

export const menuSound = {
  tick: () => sfx(() => tone({ type: 'square', from: 1180, to: 940, length: 0.045, gain: 0.07 })),
  confirm: () => sfx(() => {
    tone({ type: 'triangle', from: 520, to: 780, length: 0.12, gain: 0.16 });
    tone({ type: 'square', from: 1040, to: 1560, length: 0.07, gain: 0.05, at: 0.02 });
    noise({ length: 0.05, gain: 0.07 });
  }),
  back: () => sfx(() => tone({ type: 'triangle', from: 440, to: 280, length: 0.11, gain: 0.13 })),
};

// ---- trilha em laco ----
function scheduleStep(index, time) {
  const ctx = context;
  const bar = BARS[Math.floor(index / 8) % BARS.length];
  const inBar = index % 8;
  // Arpejo: uma nota por colcheia, sempre uma oitava acima do acorde.
  tone({ type: 'square', from: midi(bar.chord[ARP_ORDER[inBar]] + 12), length: EIGHTH * 0.8, gain: 0.05, at: time - ctx.currentTime, out: musicGain });
  // Baixo nas batidas 1 e 3.
  if (inBar === 0 || inBar === 4) {
    tone({ type: 'sawtooth', from: midi(bar.bass), length: EIGHTH * 3.6, gain: 0.17, at: time - ctx.currentTime, out: musicGain });
    tone({ type: 'sine', from: 140, to: 48, length: 0.16, gain: 0.34, at: time - ctx.currentTime, out: musicGain });
  }
  // Chimbal fraco nos contratempos.
  if (inBar % 2 === 1) noise({ length: 0.03, gain: 0.05, at: time - ctx.currentTime, out: musicGain });
  // Pad leve no inicio do compasso.
  if (inBar === 0) {
    for (const note of bar.chord) tone({ type: 'triangle', from: midi(note), length: EIGHTH * 7.5, gain: 0.03, at: time - ctx.currentTime, out: musicGain });
  }
}

function pump() {
  if (!context || !musicWanted) return;
  while (nextTime < context.currentTime + LOOKAHEAD) {
    scheduleStep(step, nextTime);
    nextTime += EIGHTH;
    step += 1;
  }
}

function startLoop() {
  const ctx = ensure();
  if (!ctx || timer) return;
  if (ctx.state === 'suspended') ctx.resume();
  nextTime = ctx.currentTime + 0.05;
  step = 0;
  master.gain.value = level() * SFX_LEVEL;
  musicGain.gain.cancelScheduledValues(ctx.currentTime);
  musicGain.gain.setValueAtTime(musicGain.gain.value, ctx.currentTime);
  // O mestre ja multiplica por volume * SFX_LEVEL; o ganho da trilha so ajusta o nivel dela em relacao ao dos efeitos.
  musicGain.gain.linearRampToValueAtTime(MUSIC_LEVEL / SFX_LEVEL, ctx.currentTime + 1.4);
  timer = window.setInterval(pump, 25);
}

function stopLoop() {
  if (timer) {
    window.clearInterval(timer);
    timer = 0;
  }
  if (context && musicGain) {
    musicGain.gain.cancelScheduledValues(context.currentTime);
    musicGain.gain.setValueAtTime(musicGain.gain.value, context.currentTime);
    musicGain.gain.linearRampToValueAtTime(0, context.currentTime + 0.45);
  }
}

function bindUnlock() {
  if (unlockBound) return;
  unlockBound = true;
  const unlock = () => {
    window.removeEventListener('keydown', unlock);
    window.removeEventListener('pointerdown', unlock);
    unlockBound = false;
    if (musicWanted) startLoop();
  };
  window.addEventListener('keydown', unlock);
  window.addEventListener('pointerdown', unlock);
}

// Liga ou desliga a trilha. Antes do primeiro gesto ela fica pendente.
export function setMenuMusic(on) {
  musicWanted = on;
  if (!on) {
    stopLoop();
    return;
  }
  const ctx = ensure();
  if (ctx && ctx.state === 'running') startLoop();
  else bindUnlock();
}
