import { loadVolume } from './AudioManager.js';

export const MUSIC_KEY = 'mugen.musicVolume';
export const DEFAULT_MUSIC_VOLUME = 0.2;
export const TRACKS = [
  { id: 'tekken3', title: 'Opening — Tekken 3', src: '/assets/music/tekken3-opening.mp3', scene: 'menu' },
  { id: 'dmc3', title: 'Devils Never Cry — Devil May Cry 3', src: '/assets/music/devils-never-cry.mp3', scene: 'battle' },
  { id: 'bayonetta', title: 'Fly Me To The Moon (Climax) — Bayonetta', src: '/assets/music/bayonetta-fly-me-to-the-moon.mp3', scene: 'battle' },
];
const clamp = (n) => Math.min(1, Math.max(0, n));
export function loadMusicVolume() {
  try {
    const stored = window.localStorage.getItem(MUSIC_KEY);
    if (stored === null) return DEFAULT_MUSIC_VOLUME;
    const value = Number(stored);
    return Number.isFinite(value) ? clamp(value) : DEFAULT_MUSIC_VOLUME;
  } catch { return DEFAULT_MUSIC_VOLUME; }
}
export function saveMusicVolume(value) {
  try { window.localStorage.setItem(MUSIC_KEY, String(clamp(value))); } catch { /* Private browsing. */ }
  refreshSoundtrackVolume();
}

// Streaming keeps full songs out of the decoded SFX buffers. One media element
// prevents overlapping music; scene changes fade out before loading the next.
export class SoundtrackPlayer {
  constructor({ audio, tracks = TRACKS, master = loadVolume, music = loadMusicVolume }) {
    this.audio = audio;
    this.tracks = tracks;
    this.master = master;
    this.music = music;
    this.scene = null;
    this.current = null;
    this.pending = null;
    this.index = { menu: 0, battle: 0 };
    this.unlocked = false;
    this.paused = false;
    this.hidden = false;
    this.ducked = false;
    this.starting = false;
    this.failed = new Set();
    audio.preload = 'metadata';
    audio.volume = 0;
    audio.onended = () => this.next();
    audio.onerror = () => { if (this.current) this.failed.add(this.current.id); this.next(); };
  }
  list() { return this.tracks.filter(t => t.scene === this.scene && !this.failed.has(t.id)); }
  setScene(scene) {
    if (scene === this.scene) return;
    if (this.scene === 'battle') this.index.battle += 1;
    this.scene = scene;
    this.paused = false;
    this.ducked = false;
    const list = this.list();
    this.pending = list[this.index[scene] % list.length] ?? null;
    if (!this.pending) { this.audio.pause(); this.current = null; }
    this.tick();
  }
  next() {
    const list = this.list();
    this.index[this.scene] += 1;
    this.pending = list[this.index[this.scene] % list.length] ?? null;
    this.audio.volume = 0;
    if (!this.pending) { this.audio.pause(); this.current = null; }
    this.tick();
  }
  unlock() { this.unlocked = true; this.tick(); }
  setPaused(value) { this.paused = value; this.tick(); }
  setHidden(value) { this.hidden = value; this.tick(); }
  setDucked(value) { this.ducked = value; }
  tick() {
    if (this.pending && this.audio.volume < 0.002) {
      this.audio.pause();
      this.audio.volume = 0;
      this.current = this.pending;
      this.pending = null;
      this.audio.src = this.current.src;
      this.audio.load();
    }
    const muted = this.master() * this.music() === 0;
    const stopped = !this.unlocked || this.paused || this.hidden || muted || !this.current;
    if (stopped) { this.audio.pause(); this.audio.volume = 0; return; }
    if (this.audio.paused && !this.starting) {
      this.starting = true;
      Promise.resolve(this.audio.play()).catch(error => {
        if (error?.name === 'NotAllowedError') this.unlocked = false;
      }).finally(() => { this.starting = false; });
    }
    // Default: 0.8 master × 0.2 music × 0.8 battle = 12.8% amplitude.
    // Long character voices/music lower this further to 4.5% amplitude.
    const target = this.pending ? 0 : clamp(this.master() * this.music()
      * (this.scene === 'battle' ? 0.8 : 1) * (this.ducked ? 0.35 : 1));
    this.audio.volume = clamp(this.audio.volume + (target - this.audio.volume) * 0.2);
  }
  dispose() {
    this.audio.pause();this.audio.onended = null;this.audio.onerror = null;
    this.audio.removeAttribute('src');this.audio.load();
  }
}

let player = null;
function ensure() {
  if (player || typeof window === 'undefined' || !window.Audio) return player;
  player = new SoundtrackPlayer({ audio: new window.Audio() });
  window.addEventListener('pointerdown', () => player.unlock());
  window.addEventListener('keydown', () => player.unlock());
  document.addEventListener('visibilitychange', () => player.setHidden(document.hidden));
  player.setHidden(document.hidden);
  window.setInterval(() => player.tick(), 50);
  return player;
}
export const setSoundtrackScene = scene => ensure()?.setScene(scene);
export const pauseSoundtrack = value => player?.setPaused(value);
export const duckSoundtrack = value => player?.setDucked(value);
export const unlockSoundtrack = () => ensure()?.unlock();
export const refreshSoundtrackVolume = () => player?.tick();
