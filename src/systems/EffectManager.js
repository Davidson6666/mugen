import { Sprite } from 'pixi.js';
import { AnimationStateMachine } from './AnimationStateMachine.js';
import { RENDER_SCALE } from './Fighter.js';
import { applyHit, overlaps } from './CollisionDetector.js';
import { hitsOf, pickActiveHit, recordHit } from './hits.js';

// Quanto alem da borda da tela um projetil ainda existe antes de ser descartado.
const OFFSCREEN_MARGIN = 200;
// Dano/hitstun de efeito que nao declara os seus nem veio de golpe com dano.
const FALLBACK_DAMAGE = 5;
const FALLBACK_HITSTUN = 15;

// Efeito solto por um golpe: projetil que anda, area que queima parada, algo
// preso ao corpo de quem atacou ou puro enfeite (rastro, brilho). Tudo o que
// ele faz vem do character config:
//   config.effects[id] -> animacao, acertos (hits), movimento, regras
//   pedido (spawn)     -> qual efeito, onde nasce e a quem segue:
//     { id, offsetX, offsetY, target: 'opponent' | 'stage', flip, follow,
//       damage, hitstun, spread, velocityX, velocityY, velocitySpread }
//
// follow: 'owner' anda junto de quem lancou, 'target' junto do oponente
// (chama grudada, selo), 'parent' junto do efeito que o criou. target 'stage'
// nasce no centro da arena (o mundo do Tsukuyomi).
// No config do efeito, "motion" troca a velocidade em ticks marcados (o clone
// que salta e para no ar) e "hitDelay" segura o primeiro acerto.
export class Effect {
  constructor({ owner, spawn, attack, serial, opponent, parent = null }) {
    this.owner = owner;
    this.spawn = spawn;
    this.parent = parent;
    this.opponent = opponent;
    this.definition = owner.config.effects[spawn.id];
    if (!this.definition) throw new Error(`[${owner.config.id}] efeito inexistente: "${spawn.id}"`);
    this.frames = owner.effectFrames[spawn.id];
    // Dano e hitstun congelados no momento em que o efeito nasce, ja com o
    // override do combo aplicado.
    this.attack = attack;
    this.serial = serial;
    this.facing = (parent?.facing ?? owner.facing) * (spawn.flip ? -1 : 1);
    // Escala do pedido (a "scale" das Explod do MUGEN), numero ou [x, y].
    const [scaleX, scaleY] = Array.isArray(spawn.scale) ? spawn.scale : [spawn.scale ?? 1, spawn.scale ?? 1];
    this.renderScale = this.definition.renderScale ?? 1;
    // Escala do dono (spriteScale): efeito, caixa, posicao e velocidade.
    this.unit = owner.scale ?? RENDER_SCALE;
    this.scaleX = this.renderScale * scaleX * this.unit;
    this.scaleY = this.renderScale * scaleY * this.unit;
    this.follow = spawn.follow ?? this.definition.follow ?? (this.definition.attached ? 'owner' : null);
    this.age = 0;
    this.dead = false;
    this.hitLog = new Map();
    this.hasHit = false;
    this.spawnIndex = 0;
    // Filhos pedidos neste tick (spawns do efeito, onHitSpawn): o manager cria.
    this.pendingSpawns = [];

    this.animation = new AnimationStateMachine({ main: this.definition.animation });
    this.animation.play('main');

    // Espalhamento aleatorio (penas de corvo, faiscas): o mesmo efeito nao
    // nasce sempre no mesmo pixel.
    const [spreadX = 0, spreadY = 0] = spawn.spread ?? [];
    this.offset = {
      x: (spawn.offsetX ?? 0) + (Math.random() * 2 - 1) * spreadX,
      y: (spawn.offsetY ?? 0) + (Math.random() * 2 - 1) * spreadY,
    };
    this.anchorFacing = parent?.facing ?? owner.facing;
    this.place();

    // "lifetime" do pedido (cada kunai dura ate o proprio disparo + voo).
    this.lifetime = spawn.lifetime ?? this.definition.lifetime;
    const [jitterX = 0, jitterY = 0] = spawn.velocitySpread ?? [];
    this.vx = ((spawn.velocityX ?? this.definition.velocityX ?? 0) + (Math.random() * 2 - 1) * jitterX) * this.facing * this.unit;
    this.vy = ((spawn.velocityY ?? this.definition.velocityY ?? 0) + (Math.random() * 2 - 1) * jitterY) * this.unit;
    this.motionIndex = 0;

    this.sprite = new Sprite(this.frames[this.animation.sheetFrame]);
    const { frameHeight, baseline = frameHeight } = this.definition.spriteGridSize;
    this.sprite.anchor.set(0.5, baseline / frameHeight);
    // Efeito de luz desenhado sobre fundo preto: em modo aditivo o preto some
    // e o brilho soma com o cenario.
    if (this.definition.blend) this.sprite.blendMode = this.definition.blend;
    if (this.definition.alpha !== undefined) this.sprite.alpha = this.definition.alpha;
    if (this.definition.tint !== undefined) this.sprite.tint = this.definition.tint;
    // AngleDraw: o MUGEN gira no sentido anti-horario.
    if (this.definition.angle) this.sprite.rotation = -(this.definition.angle * Math.PI) / 180;
    // Fundo que cobre a tela: ancorado pelo meio, nao pelo pe.
    if (this.definition.cover) this.sprite.anchor.set(0.5, 0.5);
    this.sync();
  }

  get attached() {
    return Boolean(this.definition.attached);
  }

  // Ponto de referencia: quem lancou, o oponente, o centro da arena ou o
  // efeito pai.
  get anchor() {
    if (this.spawn.target === 'stage') {
      const { map } = this.owner;
      return { x: (map.leftBound + map.rightBound) / 2, y: map.groundLevel };
    }
    if (this.spawn.target === 'opponent' || this.follow === 'target') return this.opponent ?? this.owner;
    if (this.parent) return this.parent;
    return this.owner;
  }

  place() {
    const anchor = this.anchor;
    this.x = anchor.x + this.offset.x * this.unit * this.anchorFacing;
    this.y = anchor.y - this.offset.y * this.unit;
    // Orbita em volta da ancora (o azul do Gojo que gira em volta dele):
    // [raio x, raio y, periodo em ticks].
    const orbit = this.definition.orbit;
    if (orbit) {
      const angle = ((this.age ?? 0) / orbit[2]) * Math.PI * 2;
      this.x += Math.sin(angle) * orbit[0] * this.unit * this.anchorFacing;
      this.y += Math.sin(angle + Math.PI / 2) * orbit[1] * this.unit;
    }
  }

  // Mesma convencao das caixas do lutador: retangulo no espaco do frame do
  // efeito, espelhado junto com o sprite (e ampliado, se o efeito foi guardado
  // em resolucao menor).
  rectFor(box) {
    const sx = this.scaleX;
    const sy = this.scaleY;
    const { frameWidth, frameHeight, baseline = frameHeight } = this.definition.spriteGridSize;
    const left = this.facing === 1 ? box.offsetX : frameWidth - box.offsetX - box.width;
    // Caixa relativa a ancora do sprite; girada junto com ele (AngleDraw do
    // MUGEN, so em multiplos de 90 graus).
    let x1 = (left - frameWidth / 2) * sx;
    let y1 = (box.offsetY - baseline) * sy;
    let x2 = x1 + box.width * sx;
    let y2 = y1 + box.height * sy;
    const turns = ((Math.round((this.definition.angle ?? 0) / 90) % 4) + 4) % 4;
    for (let k = 0; k < turns; k += 1) {
      // 90 graus anti-horario na tela (y para baixo): (x, y) -> (y, -x).
      [x1, y1, x2, y2] = [y1, -x2, y2, -x1];
    }
    return { x: this.x + Math.min(x1, x2), y: this.y + Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) };
  }

  get activeHit() {
    if (this.dead) return null;
    const hits = hitsOf(this.definition, { lastFrame: this.definition.animation.frames.length - 1 });
    if (hits.length === 0) return null;
    // Formato antigo: o efeito acerta uma vez so, mesmo que a janela continue.
    if (!this.definition.hits && this.hasHit) return null;
    if (this.definition.maxHits && this.hasHitCount >= this.definition.maxHits) return null;
    if (this.age < (this.spawn.hitDelay ?? this.definition.hitDelay ?? 0)) return null;
    return pickActiveHit(hits, this.animation.localFrame, this.age, this.hitLog);
  }

  get shieldRect() {
    const [x1, y1, x2, y2] = this.definition.shield;
    const k = this.unit * (this.spawn.scale ?? 1);
    const left = this.facing === 1 ? x1 : -x2;
    return { x: this.x + left * k, y: this.y + y1 * k, width: (x2 - x1) * k, height: (y2 - y1) * k };
  }

  get hitRect() {
    const active = this.activeHit;
    return active ? this.rectFor(active.hit.box) : null;
  }

  update(delta, opponent, bounds) {
    this.age += delta;
    if (opponent) this.opponent = opponent;

    // Preso ao golpe: se o golpe que o criou acabou ou foi interrompido, some
    // junto (aura do Susanoo, corvos que acompanham a investida).
    if (this.attached || this.definition.endWithMove) {
      if (this.owner.state !== 'attack' || this.owner.attackSerial !== this.serial) {
        this.dead = true;
        return null;
      }
    }
    // Some quando quem lancou apanha (kunais paradas no ar).
    if (this.definition.endOnOwnerHit && this.owner.state === 'hitstun') {
      this.dead = true;
      return null;
    }
    if (this.follow === 'parent' && this.parent?.dead) {
      this.dead = true;
      return null;
    }

    if (this.definition.mirrorOwner) {
      this.recordOwner();
    } else if (this.follow) {
      if (this.follow === 'owner') this.anchorFacing = this.owner.facing;
      if (this.attached) this.facing = this.owner.facing;
      this.place();
    } else {
      this.applyMotion();
      this.vy += (this.definition.gravity ?? 0) * this.unit * delta;
      this.x += this.vx * delta;
      this.y += this.vy * delta;
    }

    this.animation.update(delta);
    this.queueChildren();

    const { lifetime } = this;
    if ((this.animation.finished && !lifetime) || (lifetime && this.age >= lifetime)) this.dead = true;
    if (this.x < bounds.left - OFFSCREEN_MARGIN || this.x > bounds.right + OFFSCREEN_MARGIN) {
      this.dead = true;
    }
    // Projetil que cai (corvo, bola de fogo aerea) acaba ao bater no chao; o
    // que anda reto pode acabar na parede da arena.
    const { map } = this.owner;
    if (this.definition.endOnGround && this.vy >= 0 && this.y >= map.groundLevel) {
      this.y = map.groundLevel;
      this.dead = true;
    }
    if (this.definition.endAtWall && (this.x <= map.leftBound || this.x >= map.rightBound)) {
      this.x = Math.max(map.leftBound, Math.min(map.rightBound, this.x));
      this.dead = true;
    }

    const result = this.collide(this.opponent);
    // Ao sumir, pode deixar outro efeito no lugar (explosao da bola de fogo).
    if (this.dead && this.definition.onDeathSpawn && !this.deathSpawned) {
      this.deathSpawned = true;
      this.pendingSpawns.push({ ...this.definition.onDeathSpawn, follow: null });
    }
    this.sync();
    return result;
  }

  // mirrorOwner (Doppelganger do Dante): o efeito e o proprio dono, repetido
  // "delay" ticks depois, "offset" px atras dele. Guarda o que o dono mostrou
  // em cada tick.
  recordOwner() {
    const { delay = 12, offset = 0 } = this.definition.mirrorOwner;
    const { sprite } = this.owner;
    this.history ??= [];
    this.history.push({
      texture: sprite.texture,
      x: this.owner.x - offset * this.owner.facing * this.unit,
      y: this.owner.y,
      scaleX: sprite.scale.x,
      scaleY: sprite.scale.y,
      anchorX: sprite.anchor.x,
      anchorY: sprite.anchor.y,
    });
    while (this.history.length > delay + 1) this.history.shift();
    const shown = this.history[0];
    this.x = shown.x;
    this.y = shown.y;
  }

  applyMotion() {
    const motion = this.spawn.motion ?? this.definition.motion;
    if (!motion) return;
    while (this.motionIndex < motion.length && motion[this.motionIndex].at <= this.age) {
      const { vx, vy, aim } = motion[this.motionIndex];
      if (vx !== undefined) this.vx = vx * this.facing * this.unit;
      if (vy !== undefined) this.vy = vy * this.unit;
      // Mira: sai em linha reta na direcao do oponente (as kunais da Yoruichi).
      if (aim && this.opponent) {
        const dx = this.opponent.x - this.x;
        const dy = this.opponent.y - 40 - this.y;
        const length = Math.hypot(dx, dy) || 1;
        this.vx = (dx / length) * aim * this.unit;
        this.vy = (dy / length) * aim * this.unit;
      }
      this.motionIndex += 1;
    }
  }

  // Efeitos que este efeito solta sozinho (as explosoes e fagulhas de um
  // helper do MUGEN), no tick declarado.
  queueChildren() {
    const spawns = this.definition.spawns;
    if (!spawns) return;
    while (this.spawnIndex < spawns.length && spawns[this.spawnIndex].at <= this.age) {
      this.pendingSpawns.push(spawns[this.spawnIndex]);
      this.spawnIndex += 1;
    }
  }

  collide(opponent) {
    if (this.dead || !opponent || opponent.isKnockedOut || opponent.invulnerable) return null;
    const active = this.activeHit;
    if (!active?.ready) return null;
    const rect = this.rectFor(active.hit.box);
    if (!overlaps(rect, opponent.hurtRect)) return null;

    recordHit(this.hitLog, active.index, this.age);
    this.hasHit = true;
    this.hasHitCount = (this.hasHitCount ?? 0) + 1;
    if (this.definition.destroyOnHit) this.dead = true;
    if (this.definition.onHitSpawn && this.hasHitCount === 1) {
      this.pendingSpawns.push({ ...this.definition.onHitSpawn });
    }

    const { hit } = active;
    const { spawn, definition, attack } = this;
    const data = {
      damage: spawn.damage ?? hit.damage ?? definition.damage ?? attack?.damage ?? FALLBACK_DAMAGE,
      hitstun: spawn.hitstun ?? hit.hitstun ?? definition.hitstun ?? attack?.hitstun ?? FALLBACK_HITSTUN,
      push: hit.push ?? definition.push,
      heavy: hit.heavy ?? definition.heavy,
      unblockable: hit.unblockable ?? definition.unblockable,
      noEcho: definition.noEcho,
    };
    // Selo sorteado entre os tipos declarados; a marca (simbolo em cima do
    // oponente) nasce junto e dura o mesmo tempo.
    if (definition.seal) {
      const { kinds, ticks } = definition.seal;
      const chosen = kinds[Math.floor(Math.random() * kinds.length)];
      data.seal = { kind: chosen.kind, ticks };
      if (chosen.mark) this.pendingSpawns.push({ id: chosen.mark, target: 'opponent', follow: 'target', offsetY: 95 });
    }
    return applyHit(this.owner, opponent, data, rect, this.serial);
  }

  sync() {
    if (this.definition.mirrorOwner) {
      const shown = this.history?.[0];
      if (!shown) return;
      this.sprite.texture = shown.texture;
      this.sprite.anchor.set(shown.anchorX, shown.anchorY);
      this.sprite.scale.set(shown.scaleX, shown.scaleY);
      this.sprite.x = Math.round(shown.x);
      this.sprite.y = Math.round(shown.y);
      return;
    }
    this.sprite.texture = this.frames[this.animation.sheetFrame];
    this.sprite.x = Math.round(this.x);
    this.sprite.y = Math.round(this.y);
    const { cover, spriteGridSize } = this.definition;
    if (cover) {
      // Fundo esticado para cobrir a area visivel inteira (mundo do genjutsu).
      this.sprite.scale.set(cover[0] / spriteGridSize.frameWidth, cover[1] / spriteGridSize.frameHeight);
      return;
    }
    this.sprite.scale.set(this.scaleX * this.facing, this.scaleY);
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

  add(effect) {
    this.layers[effect.definition.layer === 'back' ? 'back' : 'front'].addChild(effect.sprite);
    this.effects.push(effect);
  }

  // Recolhe os efeitos que os lutadores pediram neste tick, e retira os que
  // um golpe consumiu (o corvo do Shisui, ao usar o Kotoamatsukami).
  collect(fighters) {
    for (const fighter of fighters) {
      const opponent = fighters.find((other) => other !== fighter);
      for (const request of fighter.pendingEffects) {
        this.add(new Effect({ ...request, opponent }));
      }
      fighter.pendingEffects.length = 0;
      for (const tag of fighter.pendingConsumes ?? []) {
        for (const effect of this.effects) {
          if (effect.owner === fighter && effect.definition.tag === tag) effect.dead = true;
        }
      }
      if (fighter.pendingConsumes) fighter.pendingConsumes.length = 0;
    }
    this.syncTags(fighters);
  }

  // Marcas dos efeitos vivos de cada lutador (fighter.effectTags).
  syncTags(fighters) {
    for (const fighter of fighters) {
      if (!fighter.effectTags) continue;
      fighter.effectTags.clear();
      for (const effect of this.effects) {
        if (effect.owner === fighter && !effect.dead && effect.definition.tag) {
          fighter.effectTags.add(effect.definition.tag);
        }
      }
    }
  }

  // Devolve os acertos do tick, no mesmo formato de resolveAttack.
  update(delta, fighters) {
    const results = [];
    for (const effect of [...this.effects]) {
      const opponent = fighters.find((fighter) => fighter !== effect.owner);
      const result = effect.update(delta, opponent, this.bounds);
      if (result) results.push(result);
      for (const spawn of effect.pendingSpawns) {
        this.add(new Effect({
          owner: effect.owner,
          spawn,
          attack: effect.attack,
          serial: effect.serial,
          opponent: effect.opponent,
          parent: effect,
        }));
      }
      effect.pendingSpawns.length = 0;
    }
    this.blockWithShields();
    this.removeDead();
    return results;
  }

  // Barreira (o Danku da Unohana): projetil do outro lutador que encosta na
  // caixa "shield" (x1, y1, x2, y2 relativos a ancora do efeito) some.
  blockWithShields() {
    for (const shield of this.effects) {
      const box = shield.definition.shield;
      if (!box || shield.dead) continue;
      const rect = shield.shieldRect;
      for (const effect of this.effects) {
        if (effect.owner === shield.owner || effect.dead) continue;
        const hit = effect.hitRect;
        if (hit && overlaps(hit, rect)) effect.dead = true;
      }
    }
  }

  removeDead() {
    this.effects = this.effects.filter((effect) => {
      if (!effect.dead) return true;
      effect.destroy();
      return false;
    });
  }

  clear() {
    for (const effect of this.effects) {
      effect.owner.effectTags?.clear();
      effect.destroy();
    }
    this.effects = [];
  }
}
