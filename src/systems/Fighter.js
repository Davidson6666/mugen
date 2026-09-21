import { Sprite } from 'pixi.js';
import { AnimationStateMachine } from './AnimationStateMachine.js';

// Escala inteira: mantem o pixel art nitido e deixa o sprite de 80x96 com
// presenca na arena de 1280x720.
export const RENDER_SCALE = 3;

const ATTACK_BY_BUTTON = { punch: 'punch', kick: 'kick', special: 'special1' };

// Personagem jogavel: fisica, estado e animacao. Recebe um "command" ja
// resolvido (teclado, gamepad ou, mais tarde, IA) em vez de ler input direto.
export class Fighter {
  constructor({ record, map, x, facing = 1 }) {
    this.config = record.config;
    this.frames = record.frames;
    this.map = map;
    this.animation = new AnimationStateMachine(this.config.animations);

    this.x = x;
    this.y = map.groundLevel;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.grounded = true;
    this.state = 'idle';
    this.blocking = false;
    this.health = this.config.stats.maxHealth;

    this.sprite = new Sprite(this.frames[0]);
    this.sprite.anchor.set(0.5, 1);
    this.animation.play('idle');
    this.syncSprite();
  }

  get halfWidth() {
    return (this.config.hurtbox.width * RENDER_SCALE) / 2;
  }

  // "Frente" e "tras" sao sempre relativos ao oponente, nunca a um lado fixo da
  // tela: o flip precisa acontecer antes de interpretar o input do frame.
  faceTowards(targetX) {
    if (this.state === 'attack') return;
    this.facing = targetX >= this.x ? 1 : -1;
  }

  update(command, delta) {
    const { walkSpeed, jumpForce, jumpGravity } = this.config.stats;
    const back = this.facing === 1 ? command.left : command.right;
    const forward = this.facing === 1 ? command.right : command.left;

    if (this.state === 'attack' && this.animation.finished) this.state = 'idle';

    if (this.state !== 'attack') {
      const button = ['punch', 'kick', 'special'].find((name) => command[name]);
      if (button) {
        this.state = 'attack';
        if (this.grounded) this.vx = 0;
        this.animation.play(ATTACK_BY_BUTTON[button], { restart: true });
      }
    }

    if (this.state !== 'attack') {
      if (this.grounded) {
        const direction = (command.right ? 1 : 0) - (command.left ? 1 : 0);
        if (command.jump) {
          this.vy = -jumpForce;
          this.vx = direction * walkSpeed;
          this.grounded = false;
          this.state = 'air';
        } else if (command.down) {
          this.state = 'crouch';
          this.vx = 0;
        } else {
          this.vx = direction * walkSpeed;
          this.state = direction === 0 ? 'idle' : 'walk';
        }
      }
      // No ar nao ha controle horizontal: o impulso do pulo e o que vale.
    }

    // Bloqueio e uma condicao do input, nao um estado: andar para tras tambem
    // deixa o personagem guardado quando o golpe chegar.
    this.blocking = this.grounded && back && this.state !== 'attack';

    if (!this.grounded) {
      this.vy += jumpGravity * delta;
    }

    this.x += this.vx * delta;
    this.y += this.vy * delta;

    if (this.y >= this.map.groundLevel) {
      this.y = this.map.groundLevel;
      this.vy = 0;
      this.vx = 0;
      if (!this.grounded) {
        this.grounded = true;
        if (this.state === 'air') this.state = 'idle';
      }
    }

    this.clampToBounds();
    this.updateAnimation(forward);
    this.animation.update(delta);
    this.syncSprite();
  }

  updateAnimation(movingForward) {
    if (this.state === 'attack') return;
    if (!this.grounded) {
      this.animation.play('jump');
      return;
    }
    if (this.state === 'crouch') {
      this.animation.play(this.blocking ? 'blockCrouching' : 'crouch');
      return;
    }
    if (this.state === 'walk') {
      this.animation.play(movingForward ? 'walkForward' : 'walkBackward');
      return;
    }
    this.animation.play(this.blocking ? 'blockStanding' : 'idle');
  }

  clampToBounds() {
    const min = this.map.leftBound + this.halfWidth;
    const max = this.map.rightBound - this.halfWidth;
    this.x = Math.max(min, Math.min(max, this.x));
  }

  syncSprite() {
    this.sprite.texture = this.frames[this.animation.sheetFrame];
    this.sprite.x = Math.round(this.x);
    this.sprite.y = Math.round(this.y);
    this.sprite.scale.set(RENDER_SCALE * this.facing, RENDER_SCALE);
  }
}
