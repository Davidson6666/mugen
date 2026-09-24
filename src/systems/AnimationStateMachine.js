// Controla qual animacao do character config esta tocando e em que frame ela
// esta. Duas formas de medir o tempo:
//   durations: [ticks por quadro] - cadencia de jogo de luta (preparacao curta,
//              quadro do golpe segurado, volta mais lenta), como no .air do MUGEN;
//   speed:     quadros por tick de 60fps, igual para todos (convencao do Pixi).
export class AnimationStateMachine {
  constructor(animations) {
    this.animations = animations;
    this.name = null;
    this.current = null;
    this.progress = 0;
    this.finished = false;
  }

  play(name, { restart = false } = {}) {
    const animation = this.animations[name];
    if (!animation) {
      console.warn(`Animacao inexistente: "${name}"`);
      return;
    }
    if (this.name === name && !restart) return;
    this.name = name;
    this.current = animation;
    this.progress = 0;
    this.finished = false;
  }

  // Duracao total em ticks (durations) ou em quadros (speed).
  get length() {
    const { durations, frames } = this.current;
    return durations ? durations.reduce((sum, ticks) => sum + ticks, 0) : frames.length;
  }

  update(delta) {
    if (!this.current || this.finished) return;
    const { durations, speed, loop } = this.current;
    this.progress += durations ? delta : speed * delta;
    const length = this.length;
    if (this.progress < length) return;
    if (loop) {
      this.progress %= length;
    } else {
      this.progress = length - (durations ? 0.001 : 1);
      this.finished = true;
    }
  }

  // Indice dentro da animacao (0..n-1), usado para comparar com hitboxFrame.
  get localFrame() {
    if (!this.current) return 0;
    const { durations, frames } = this.current;
    if (!durations) return Math.min(Math.floor(this.progress), frames.length - 1);
    let elapsed = 0;
    for (let index = 0; index < durations.length; index += 1) {
      elapsed += durations[index];
      if (this.progress < elapsed) return index;
    }
    return durations.length - 1;
  }

  // Indice do frame na grade do sprite sheet.
  get sheetFrame() {
    if (!this.current) return 0;
    return this.current.frames[this.localFrame];
  }
}
