import { Sprite } from 'pixi.js';
import { AnimationStateMachine } from './AnimationStateMachine.js';

// Escala inteira: mantem o pixel art nitido e deixa o sprite de 80x96 com
// presenca na arena de 1280x720.
export const RENDER_SCALE = 3;

const ATTACK_BY_BUTTON = { punch: 'punch', kick: 'kick', special: 'special1' };

// Tempo sem conectar golpe que zera o contador de combo.
const COMBO_INACTIVITY_FRAMES = 60;

// O combo traz seus proprios dano e hitstun; campos ausentes continuam vindo da
// animacao, entao nao se sobrescreve nada com undefined.
function overrideFrom(combo) {
  const override = {};
  for (const field of ['damage', 'hitstun', 'cooldown']) {
    if (combo[field] !== undefined) override[field] = combo[field];
  }
  return override;
}

// Personagem jogavel: fisica, estado e animacao. Recebe um "command" ja
// resolvido (teclado, gamepad ou, mais tarde, IA) em vez de ler input direto.
export class Fighter {
  constructor({ record, map, x, facing = 1 }) {
    this.config = record.config;
    this.frames = record.frames;
    this.effectFrames = record.effectFrames ?? {};
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
    this.stunTimer = 0;
    // Um golpe so conecta uma vez, mesmo com a hitbox ativa por varios ticks.
    this.attackHasLanded = false;
    this.attackOverride = null;
    this.pendingPose = null;
    this.cooldowns = new Map();
    this.comboCount = 0;
    this.comboTimer = 0;
    // O lutador so avisa que um golpe soltou um efeito; quem cria, move e
    // colide a entidade e o EffectManager.
    this.pendingEffects = [];
    this.effectSpawned = false;
    // Identifica cada execucao de golpe: um efeito preso ao corpo so vive
    // enquanto a mesma execucao que o criou continua.
    this.attackSerial = 0;

    this.sprite = new Sprite(this.frames[0]);
    this.sprite.anchor.set(0.5, 1);
    this.animation.play('idle');
    this.syncSprite();
  }

  get halfWidth() {
    return (this.config.hurtbox.width * RENDER_SCALE) / 2;
  }

  get isKnockedOut() {
    return this.state === 'ko';
  }

  // Quanto a hitbox base avanca alem do centro do corpo. A IA usa isso para
  // saber de que distancia vale a pena atacar.
  get attackReach() {
    const { frameWidth } = this.config.spriteGridSize;
    const { offsetX, width } = this.config.hitbox;
    return (offsetX + width - frameWidth / 2) * RENDER_SCALE;
  }

  get canAct() {
    return !this.isKnockedOut && this.state !== 'pose' && this.stunTimer <= 0;
  }

  // Retangulo declarado no espaco do frame (origem no canto superior esquerdo)
  // convertido para coordenadas de mundo. O flip espelha o box junto do sprite,
  // senao o alcance do golpe ficaria sempre apontado para a direita.
  rectInWorld(box) {
    const { frameWidth, frameHeight } = this.config.spriteGridSize;
    const left = this.facing === 1 ? box.offsetX : frameWidth - box.offsetX - box.width;
    return {
      x: this.x + (left - frameWidth / 2) * RENDER_SCALE,
      y: this.y + (box.offsetY - frameHeight) * RENDER_SCALE,
      width: box.width * RENDER_SCALE,
      height: box.height * RENDER_SCALE,
    };
  }

  get hurtRect() {
    return this.rectInWorld(this.config.hurtbox);
  }

  // Um ataque pode declarar a propria hitbox para ter alcance proprio (chute
  // alcanca mais que soco). Sem esse campo vale a hitbox do personagem, entao
  // config que segue so o schema base continua funcionando igual.
  get hitRect() {
    return this.rectInWorld(this.animation.current?.hitbox ?? this.config.hitbox);
  }

  // Dados do golpe em execucao, ja com dano/hitstun do combo aplicados.
  get currentAttack() {
    if (this.state !== 'attack') return null;
    const animation = this.animation.current;
    if (!animation) return null;
    return this.attackOverride ? { ...animation, ...this.attackOverride } : animation;
  }

  // A hitbox so existe no frame declarado como hitboxFrame pelo character config.
  get activeAttack() {
    const attack = this.currentAttack;
    if (attack?.hitboxFrame === undefined) return null;
    if (this.animation.localFrame !== attack.hitboxFrame) return null;
    return attack;
  }

  isOnCooldown(animationName) {
    return (this.cooldowns.get(animationName) ?? 0) > 0;
  }

  startAttack(animationName, override = null) {
    if (!this.config.animations[animationName] || this.isOnCooldown(animationName)) return false;

    this.state = 'attack';
    this.attackHasLanded = false;
    this.attackOverride = override;
    this.effectSpawned = false;
    this.attackSerial += 1;
    if (this.grounded) this.vx = 0;
    this.animation.play(animationName, { restart: true });

    const cooldown = override?.cooldown ?? this.config.animations[animationName].cooldown;
    if (cooldown) this.cooldowns.set(animationName, cooldown);
    return true;
  }

  // O contador so sobe em acertos consecutivos: errar, ser bloqueado ou ficar
  // sem atacar zera a sequencia.
  onAttackResolved(outcome) {
    if (outcome === 'block') {
      this.breakCombo();
      return;
    }
    this.comboCount += 1;
    this.comboTimer = COMBO_INACTIVITY_FRAMES;
  }

  breakCombo() {
    this.comboCount = 0;
    this.comboTimer = 0;
  }

  // "Frente" e "tras" sao sempre relativos ao oponente, nunca a um lado fixo da
  // tela: o flip precisa acontecer antes de interpretar o input do frame.
  faceTowards(targetX) {
    if (this.state === 'attack' || !this.canAct) return;
    this.facing = targetX >= this.x ? 1 : -1;
  }

  update(command, delta) {
    const { walkSpeed, jumpForce, jumpGravity } = this.config.stats;
    const back = this.facing === 1 ? command.left : command.right;
    const forward = this.facing === 1 ? command.right : command.left;

    if (this.stunTimer > 0) {
      this.stunTimer -= delta;
      if (this.stunTimer <= 0) {
        this.stunTimer = 0;
        this.state = this.grounded ? 'idle' : 'air';
      }
    }

    // A pose de derrota so entra depois da animacao de nocaute terminar.
    if (this.state === 'pose' && this.pendingPose && this.animation.finished) {
      this.animation.play(this.pendingPose, { restart: true });
      this.pendingPose = null;
    }

    this.tickCooldowns(delta);

    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) this.breakCombo();
    }

    if (this.canAct) {
      if (this.state === 'attack' && this.animation.finished) {
        if (!this.attackHasLanded) this.breakCombo();
        this.state = 'idle';
        this.attackOverride = null;
      }

      if (this.state !== 'attack') {
        if (command.combo) {
          this.startAttack(command.combo.animation, overrideFrom(command.combo));
        } else {
          const button = ['punch', 'kick', 'special'].find((name) => command[name]);
          if (button) this.startAttack(ATTACK_BY_BUTTON[button]);
        }
      }

      if (this.state !== 'attack' && this.grounded) {
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
    // deixa o personagem guardado quando o golpe chegar. Durante o blockstun a
    // guarda continua de pe, senao o segundo golpe da sequencia passaria direto.
    this.blocking =
      this.state === 'blockstun' ||
      (this.canAct && this.grounded && back && this.state !== 'attack');

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
    this.queueEffect();
    this.syncSprite();
  }

  // O efeito sai uma vez por golpe, quando a animacao chega no spawnFrame.
  queueEffect() {
    const attack = this.currentAttack;
    const effect = attack?.effect;
    if (!effect || this.effectSpawned) return;
    if (this.animation.localFrame < (effect.spawnFrame ?? 0)) return;
    this.effectSpawned = true;
    this.pendingEffects.push({ owner: this, spawn: effect, attack, serial: this.attackSerial });
  }

  tickCooldowns(delta) {
    for (const [name, remaining] of this.cooldowns) {
      const next = remaining - delta;
      if (next <= 0) this.cooldowns.delete(name);
      else this.cooldowns.set(name, next);
    }
  }

  takeHit(damage, hitstun) {
    this.breakCombo();
    this.health = Math.max(0, this.health - damage);
    if (this.health === 0) {
      this.knockOut();
      return 'ko';
    }
    this.state = 'hitstun';
    this.stunTimer = hitstun;
    this.blocking = false;
    if (this.grounded) this.vx = 0;
    this.animation.play('hitReaction', { restart: true });
    return 'hit';
  }

  takeBlockedHit(damage, blockstun) {
    const crouching = this.state === 'crouch';
    this.health = Math.max(0, this.health - damage);
    if (this.health === 0) {
      this.knockOut();
      return 'ko';
    }
    this.state = 'blockstun';
    this.stunTimer = blockstun;
    if (this.grounded) this.vx = 0;
    this.animation.play(crouching ? 'blockCrouching' : 'blockStanding', { restart: true });
    return 'block';
  }

  // Entre rounds nada carrega alem do placar: vida cheia, posicao inicial e
  // todos os temporizadores zerados.
  resetForRound(x, facing) {
    this.x = x;
    this.y = this.map.groundLevel;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.grounded = true;
    this.state = 'idle';
    this.blocking = false;
    this.health = this.config.stats.maxHealth;
    this.stunTimer = 0;
    this.attackHasLanded = false;
    this.attackOverride = null;
    this.pendingPose = null;
    this.pendingEffects.length = 0;
    this.effectSpawned = false;
    this.cooldowns.clear();
    this.breakCombo();
    this.animation.play('idle', { restart: true });
    this.syncSprite();
  }

  playRoundEndPose(won) {
    const wasKnockedOut = this.isKnockedOut;
    this.state = 'pose';
    this.vx = 0;
    this.blocking = false;

    if (won) {
      this.animation.play('victoryPose', { restart: true });
      this.pendingPose = null;
    } else if (wasKnockedOut) {
      this.pendingPose = 'defeatPose';
    } else {
      this.animation.play('defeatPose', { restart: true });
      this.pendingPose = null;
    }
  }

  knockOut() {
    this.state = 'ko';
    this.stunTimer = 0;
    this.vx = 0;
    this.blocking = false;
    this.animation.play('ko', { restart: true });
  }

  updateAnimation(movingForward) {
    if (this.state === 'attack' || !this.canAct) return;
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
