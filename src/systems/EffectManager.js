import { Sprite } from 'pixi.js';
import { AnimationStateMachine } from './AnimationStateMachine.js';
import { RENDER_SCALE } from './Fighter.js';
import { applyHit, overlaps } from './CollisionDetector.js';

// Quanto alem da borda da tela um projetil ainda existe antes de ser descartado.
const OFFSCREEN_MARGIN = 200;

// Efeito solto por um golpe: projetil que anda, area que queima parada ou algo
// preso ao corpo de quem atacou. Tudo o que ele faz vem do character config:
//   config.effects[id]  -> sprite sheet, animacao, hitbox, velocidade, regras
//   animacao.effect     -> qual efeito, em que frame do golpe e onde nasce
export class Effect {
  constructor({ owner, spawn, attack, serial, opponent }) {
    this.owner = owner;
    this.spawn = spawn;
    this.definition = owner.config.effects[spawn.id];
    this.frames = owner.effectFrames[spawn.id];
    // Dano e hitstun congelados no momento em que o efeito nasce, ja com o
    // override do combo aplicado.
    this.attack = attack;
    this.serial = serial;
    this.facing = owner.facing;
    this.age = 0;
    this.hasHit = false;
    this.dead = false;

    this.animation = new AnimationStateMachine({ main: this.definition.animation });
    this.animation.play('main');

    if (spawn.target === 'opponent' && opponent) {
      // Surge onde o oponente esta, no chao: pular ainda desvia.
      this.x = opponent.x;
      this.y = opponent.map.groundLevel;
    } else {
      this.placeOnOwner();
    }
    this.vx = (this.definition.velocityX ?? 0) * this.facing;

    this.sprite = new Sprite(this.frames[this.animation.sheetFrame]);
    this.sprite.anchor.set(0.5, 1);
    this.sync();
  }

  get attached() {
    return Boolean(this.definition.attached);
  }

  placeOnOwner() {
    this.x = this.owner.x + (this.spawn.offsetX ?? 0) * RENDER_SCALE * this.facing;
    this.y = this.owner.y - (this.spawn.offsetY ?? 0) * RENDER_SCALE;
  }

  // Mesma convencao das caixas do lutador: retangulo no espaco do frame do
  // efeito, espelhado junto com o sprite.
  get hitRect() {
    const box = this.definition.hitbox;
    if (!box || this.hasHit) return null;
    const frame = this.animation.localFrame;
    const lastFrame = this.definition.animation.frames.length - 1;
    if (frame < (this.definition.activeFrom ?? 0) || frame > (this.definition.activeUntil ?? lastFrame)) {
      return null;
    }
    const { frameWidth, frameHeight } = this.definition.spriteGridSize;
    const left = this.facing === 1 ? box.offsetX : frameWidth - box.offsetX - box.width;
    return {
      x: this.x + (left - frameWidth / 2) * RENDER_SCALE,
      y: this.y + (box.offsetY - frameHeight) * RENDER_SCALE,
      width: box.width * RENDER_SCALE,
      height: box.height * RENDER_SCALE,
    };
  }

  update(delta, opponent, bounds) {
    this.age += delta;

    if (this.attached) {
      // Preso ao corpo: se o golpe que o criou foi interrompido, some junto.
      if (this.owner.state !== 'attack' || this.owner.attackSerial !== this.serial) {
        this.dead = true;
        return null;
      }
      this.facing = this.owner.facing;
      this.placeOnOwner();
    }

    this.x += this.vx * delta;
    this.animation.update(delta);

    const { lifetime } = this.definition;
    if (this.animation.finished || (lifetime && this.age >= lifetime)) this.dead = true;
    if (this.x < bounds.left - OFFSCREEN_MARGIN || this.x > bounds.right + OFFSCREEN_MARGIN) {
      this.dead = true;
    }

    const result = this.collide(opponent);
    this.sync();
    return result;
  }

  collide(opponent) {
    if (this.dead || !opponent || opponent.isKnockedOut) return null;
    const rect = this.hitRect;
    if (!rect || !overlaps(rect, opponent.hurtRect)) return null;

    // Cada efeito acerta uma vez so, mesmo que continue na tela depois.
    this.hasHit = true;
    if (this.definition.destroyOnHit) this.dead = true;
    return applyHit(this.owner, opponent, this.attack);
  }

  sync() {
    this.sprite.texture = this.frames[this.animation.sheetFrame];
    this.sprite.x = Math.round(this.x);
    this.sprite.y = Math.round(this.y);
    this.sprite.scale.set(RENDER_SCALE * this.facing, RENDER_SCALE);
  }

  destroy() {
    this.sprite.destroy();
  }
}

export class EffectManager {
  // "back" fica atras dos lutadores (aura, Susanoo), "front" na frente
  // (projeteis, chamas).
  constructor({ back, front, bounds }) {
    this.layers = { back, front };
    this.bounds = bounds;
    this.effects = [];
  }

  // Recolhe os efeitos que os lutadores pediram neste tick.
  collect(fighters) {
    for (const fighter of fighters) {
      const opponent = fighters.find((other) => other !== fighter);
      for (const request of fighter.pendingEffects) {
        const effect = new Effect({ ...request, opponent });
        this.layers[effect.definition.layer === 'back' ? 'back' : 'front'].addChild(effect.sprite);
        this.effects.push(effect);
      }
      fighter.pendingEffects.length = 0;
    }
  }

  // Devolve os acertos do tick, no mesmo formato de resolveAttack.
  update(delta, fighters) {
    const results = [];
    for (const effect of this.effects) {
      const opponent = fighters.find((fighter) => fighter !== effect.owner);
      const result = effect.update(delta, opponent, this.bounds);
      if (result) results.push(result);
    }
    this.removeDead();
    return results;
  }

  removeDead() {
    this.effects = this.effects.filter((effect) => {
      if (!effect.dead) return true;
      effect.destroy();
      return false;
    });
  }

  clear() {
    for (const effect of this.effects) effect.destroy();
    this.effects = [];
  }
}
