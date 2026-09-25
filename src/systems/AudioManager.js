// Sons da luta (as musicas dos supers da Miku, por exemplo), pelo Web Audio.
// Cada lutador pede sons nos eventos dos golpes (fighter.pendingSounds); o
// som marcado com stopWithMove para quando o golpe que o tocou acaba ou e
// interrompido. O volume vale para o jogo todo e fica salvo no navegador.

const STORAGE_KEY = 'mugen.volume';
const DEFAULT_VOLUME = 0.8;

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

  play(owner, url, { run = 0, stopWithMove = false } = {}) {
    const context = this.ensureContext();
    const buffer = this.buffers.get(url);
    if (!context || !buffer) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gain);
    source.start();
    const entry = { owner, source, run, stopWithMove };
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
