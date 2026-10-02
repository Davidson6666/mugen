// Sons da luta (as musicas dos supers da Miku, por exemplo), pelo Web Audio.
// Cada lutador pede sons nos eventos dos golpes (fighter.pendingSounds); o
// som marcado com stopWithMove para quando o golpe que o tocou acaba ou e
// interrompido. O volume vale para o jogo todo e fica salvo no navegador.

const STORAGE_KEY = 'mugen.volume';
const DEFAULT_VOLUME = 0.8;

// Acima disto o som e tratado como fala, nao como zunido: so uma por lutador
// ao mesmo tempo, e ela morre junto com o golpe que a chamou - senao uma fala
// longa (o Hado 90 do Aizen tem 21s para um golpe de 2,5s) continua tocando
// pelo resto do round.
const VOICE_SECONDS = 1.2;

export function loadVolume() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) return DEFAULT_VOLUME;
    const value = Number(stored);
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

export function saveVolume(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Sem armazenamento (janela anonima): o volume vale so nesta sessao.
  }
}

// Sons de impacto, iguais para todo o elenco (public/assets/sfx, gerados por
// scripts/make-impact-sounds.mjs). Cada tipo de acerto escolhe uma amostra e
// varia a altura e o volume: o bloqueio e o nocaute reaproveitam as mesmas
// amostras (bloqueio: mais agudo e baixo; nocaute: mais grave).
const IMPACT_DIR = '/assets/sfx';
const IMPACT_NAMES = ['impact_hit_a', 'impact_hit_b', 'impact_heavy'];
const IMPACT_FILES = IMPACT_NAMES.map((name) => `${IMPACT_DIR}/${name}.mp3`);
const IMPACT = {
  hit: { files: [IMPACT_FILES[0], IMPACT_FILES[1]], rate: [0.94, 1.08], gain: 0.55 },
  heavy: { files: [IMPACT_FILES[2]], rate: [0.9, 1.02], gain: 0.7 },
  block: { files: [IMPACT_FILES[0]], rate: [1.3, 1.42], gain: 0.28 },
  ko: { files: [IMPACT_FILES[2]], rate: [0.72, 0.8], gain: 0.85 },
};
// Golpe de varios acertos seguidos (uma rajada, um raio) nao vira metralhadora:
// no maximo um impacto do mesmo tipo a cada tanto de segundo.
const IMPACT_MIN_GAP = 0.05;

export class AudioManager {
  constructor(volume = loadVolume()) {
    this.volume = volume;
    this.context = null;
    this.gain = null;
    this.buffers = new Map();
    this.playing = [];
  }

  ensureContext() {
    if (this.context) return this.context;
    const Context = window.AudioContext ?? window.webkitAudioContext;
    if (!Context) return null;
    this.context = new Context();
    this.gain = this.context.createGain();
    this.gain.gain.value = this.volume;
    this.gain.connect(this.context.destination);
    return this.context;
  }

  // sounds: { chave: arquivo relativo a dir } (config.sounds do personagem).
  async preload(dir, sounds = {}) {
    const context = this.ensureContext();
    if (!context) return;
    await Promise.all(Object.values(sounds).map(async (file) => {
      const url = `${dir}/${file}`;
      if (this.buffers.has(url)) return;
      try {
        const response = await fetch(url);
        const data = await response.arrayBuffer();
        this.buffers.set(url, await context.decodeAudioData(data));
      } catch (error) {
        console.warn(`Som nao carregou: ${url}`, error);
      }
    }));
  }

  // Carrega os sons de impacto compartilhados (uma vez por partida).
  async preloadImpacts() {
    await this.preload(IMPACT_DIR, Object.fromEntries(IMPACT_NAMES.map((name) => [name, `${name}.mp3`])));
  }

  // Impacto de um acerto: kind = 'hit' | 'heavy' | 'block' | 'ko' (o mesmo
  // tipo que o HitFeedback usa para a faisca).
  playImpact(kind) {
    const spec = IMPACT[kind];
    const context = this.ensureContext();
    if (!spec || !context) return;
    const now = context.currentTime;
    this.lastImpact ??= {};
    if (now - (this.lastImpact[kind] ?? -1) < IMPACT_MIN_GAP) return;
    const buffer = this.buffers.get(spec.files[Math.floor(Math.random() * spec.files.length)]);
    if (!buffer) return;
    this.lastImpact[kind] = now;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = spec.rate[0] + Math.random() * (spec.rate[1] - spec.rate[0]);
    const level = context.createGain();
    level.gain.value = spec.gain;
    source.connect(level);
    level.connect(this.gain);
    source.start();
  }

  play(owner, url, { run = 0, stopWithMove = false } = {}) {
    const context = this.ensureContext();
    const buffer = this.buffers.get(url);
    if (!context || !buffer) return;

    // O mesmo som do mesmo lutador nao recomeca enquanto ainda esta tocando.
    // Isso se ajusta sozinho ao clipe: um zunido de 0,1s pode sair a cada
    // soco, uma fala de 2s nao empilha em cima dela mesma.
    if (this.playing.some((item) => item.owner === owner && item.url === url)) return;

    // Fala nova corta a fala anterior do mesmo lutador: duas vozes do mesmo
    // personagem falando por cima uma da outra nao e mixagem, e barulho.
    const voice = buffer.duration >= VOICE_SECONDS;
    if (voice) {
      for (const item of [...this.playing]) {
        if (item.owner === owner && item.voice) this.stop(item);
      }
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gain);
    source.start();
    // Fala longa morre junto com o golpe, mesmo sem stopWithMove no config.
    const entry = { owner, url, source, run, voice, stopWithMove: stopWithMove || voice };
    source.onended = () => {
      this.playing = this.playing.filter((item) => item !== entry);
    };
    this.playing.push(entry);
  }

  // Toca o que o lutador pediu neste tick e corta a musica do golpe que ja
  // acabou.
  update(owner, fighter, dir) {
    for (const request of fighter.pendingSounds) {
      const file = fighter.config.sounds?.[request.key];
      if (file) this.play(owner, `${dir}/${file}`, request);
    }
    fighter.pendingSounds.length = 0;
    for (const entry of this.playing) {
      if (entry.owner !== owner || !entry.stopWithMove) continue;
      if (fighter.state !== 'attack' || fighter.moveRun !== entry.run) this.stop(entry);
    }
  }

  stop(entry) {
    try {
      entry.source.stop();
    } catch {
      // Ja tinha parado.
    }
    this.playing = this.playing.filter((item) => item !== entry);
  }

  stopAll() {
    for (const entry of [...this.playing]) this.stop(entry);
  }

  pause() {
    this.context?.suspend();
  }

  resume() {
    this.context?.resume();
  }

  setVolume(value) {
    this.volume = value;
    if (this.gain) this.gain.gain.value = value;
  }

  dispose() {
    this.stopAll();
    this.context?.close();
    this.context = null;
  }
}
