// Controla qual animacao do character config esta tocando e em que frame ela
// esta. "speed" segue a convencao do Pixi: frames avancados por tick de 60fps.
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

  update(delta) {
    if (!this.current || this.finished) return;
    const count = this.current.frames.length;
    this.progress += this.current.speed * delta;
    if (this.progress < count) return;
    if (this.current.loop) {
      this.progress %= count;
    } else {
      this.progress = count - 1;
      this.finished = true;
    }
  }

  // Indice dentro da animacao (0..n-1), usado para comparar com hitboxFrame.
  get localFrame() {
    if (!this.current) return 0;
    return Math.min(Math.floor(this.progress), this.current.frames.length - 1);
  }

  // Indice do frame na grade do sprite sheet.
  get sheetFrame() {
    if (!this.current) return 0;
    return this.current.frames[this.localFrame];
  }
}
