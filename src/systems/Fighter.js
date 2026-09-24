import { Sprite } from 'pixi.js';
import { AnimationStateMachine } from './AnimationStateMachine.js';
import { hitsOf, pickActiveHit, recordHit } from './hits.js';

// Personagem no tamanho exato do sprite: ampliar deixava cada pixel visivel.
// Velocidade, pulo e alcance do config sao medidos nessa escala.
export const RENDER_SCALE = 1;

// Botao -> golpe, no chao e no ar. Config sem "buttons" usa o mesmo golpe nos
// dois (o elenco provisorio nao tem golpe aereo).
const DEFAULT_BUTTONS = { ground: { punch: 'punch', kick: 'kick', special: 'special1' } };
const BUTTONS = ['punch', 'kick', 'special'];

// Pulo duplo: forca do segundo pulo em relacao ao primeiro. Quantos pulos no
// ar cada personagem tem vem de stats.airJumps (padrao 1).
const AIR_JUMP_RATIO = 0.85;

// Tempo sem conectar golpe que zera o contador de combo.
const COMBO_INACTIVITY_FRAMES = 60;

// Atrito do escorregao depois de levar um golpe (fracao mantida por tick).
const PUSH_FRICTION = 0.8;
// Atrito do chao durante um golpe: o impulso de um evento (avanco do chute,
// investida) se apaga sozinho, como a fisica "S" do MUGEN.
const MOVE_FRICTION = 0.85;
// Por quantos ticks um aperto de botao continua valendo para encadear: quem
// aperta um pouco antes do golpe conectar nao perde a sequencia.
const CHAIN_BUFFER_TICKS = 10;
// Quem encadeia vai atras do oponente empurrado (px por tick) ate a
// distancia em que o proximo golpe acerta (o meio da caixa dele): o empurrao
// fica visivel e a sequencia continua alcancando.
const CHASE_SPEED = 6;

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
// resolvido (teclado, gamepad ou IA) em vez de ler input direto.
//
// Golpe ("move") e uma animacao do config com, opcionalmente:
//   hits         janelas de acerto (ver hits.js)
//   events       o que acontece em cada tick do golpe: impulso (vx/vy),
//                deslocamento (dx), teleporte ate o oponente, efeito
//   cancels      encadear em outro golpe apertando um botao depois de conectar
//   onHit        seguir sozinho para outro golpe quando acertar
//   next         golpe seguinte ao terminar (estados em sequencia do .cns)
//   air/float    golpe aereo (acaba ao tocar o chao) / sem gravidade
//   invulnerable [de, ate] ticks em que nada acerta
//   noPush       atravessa o oponente (sem colisao de corpo)
export class Fighter {
  constructor({ record, map, x, facing = 1 }) {
    this.config = record.config;
    this.frames = record.frames;
    this.effectFrames = record.effectFrames ?? {};
    this.map = map;
    this.animation = new AnimationStateMachine(this.config.animations);
    this.baseButtons = this.config.buttons ?? DEFAULT_BUTTONS;
    // Modo do personagem (o "The One" do Escanor): outro conjunto de botoes,
    // combos e animacoes base. null = normal.
    this.mode = null;
    this.roundClock = 0;
    // Quem esta do outro lado (teleportes). O game loop preenche.
    this.opponent = null;

    this.x = x;
    this.y = map.groundLevel;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.grounded = true;
    this.airJumpsLeft = this.maxAirJumps;
    this.airDashesLeft = 1;
    this.state = 'idle';
    this.blocking = false;
    this.health = this.config.stats.maxHealth;
    this.stunTimer = 0;
    // Pelo menos um acerto do golpe atual (corpo) ja conectou.
    this.attackHasLanded = false;
    this.attackOverride = null;
    this.pendingPose = null;
    this.cooldowns = new Map();
    this.comboCount = 0;
    this.comboTimer = 0;
    // Selos do Kotoamatsukami: impedem defender/pular por alguns ticks.
    this.seals = {};
    // Estados temporarios a favor (ex.: crowEvade, do Genjutsu do dedo).
    this.buffs = {};
    // Marcas dos efeitos vivos deste lutador (o corvo do Shisui); o
    // EffectManager mantem, e golpe com "requires" so sai com a marca em campo.
    this.effectTags = new Set();
    this.pendingConsumes = [];
    // O lutador so avisa que um golpe soltou um efeito; quem cria, move e
    // colide a entidade e o EffectManager.
    this.pendingEffects = [];
    this.effectSpawned = false;
    // Identifica cada execucao de golpe: um efeito preso ao corpo so vive
    // enquanto a mesma execucao que o criou continua.
    this.attackSerial = 0;
    this.resetMoveState();

    this.sprite = new Sprite(this.frames[0]);
    // O pe fica na linha do chao da celula: na base, ou acima dela quando o
    // desenho desce abaixo do pe (quadros importados do MUGEN).
    const { frameHeight, baseline = frameHeight } = this.config.spriteGridSize;
    this.sprite.anchor.set(0.5, baseline / frameHeight);
    this.animation.play(this.base('idle'));
    this.syncSprite();
  }

  get modeDef() {
    return this.mode ? this.config.modes?.[this.mode] : null;
  }

  get buttons() {
    return this.modeDef?.buttons ?? this.baseButtons;
  }

  // Nome da animacao base no modo atual.
  base(name) {
    return this.modeDef?.animations?.[name] ?? name;
  }

  // Troca de modo automatica (o sol do Escanor): passado o tempo do round, o
  // personagem parado faz a transformacao; o golpe dela liga o modo (setMode).
  checkModeTrigger() {
    if (this.mode || !this.config.modes || !this.grounded) return;
    if (!['idle', 'walk', 'crouch'].includes(this.state)) return;
    for (const mode of Object.values(this.config.modes)) {
      if (mode.after !== undefined && this.roundClock >= mode.after && mode.transform) {
        this.startAttack(mode.transform, null, { chained: true });
        return;
      }
    }
  }

  resetMoveState() {
    this.moveClock = 0;
    this.eventIndex = 0;
    this.hitLog = new Map();
    // Contato inclui golpe defendido; acerto, so o que passou da guarda.
    this.moveContact = false;
    this.moveHits = 0;
    this.buffered = null;
    this.chaseDistance = null;
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

  // O dash (e golpe que atravessa, como o dash de corvos) passa pelo
  // oponente: os corpos nao se empurram enquanto ele dura. Andar, pular e
  // golpe comum continuam barrando.
  get pushless() {
    if (this.state === 'dash') return true;
    return this.state === 'attack' && Boolean(this.animation.current?.noPush);
  }

  // Distancia da frente do corpo ate a parede da arena a frente (o
  // "frontedgebodydist" do MUGEN).
  get frontEdgeDistance() {
    return this.facing === 1
      ? this.map.rightBound - (this.x + this.halfWidth)
      : this.x - this.halfWidth - this.map.leftBound;
  }

  get maxAirJumps() {
    return this.config.stats.airJumps ?? 1;
  }

  get canAct() {
    return !this.isKnockedOut && this.state !== 'pose' && this.stunTimer <= 0;
  }

  // Retangulo declarado no espaco do frame (origem no canto superior esquerdo)
  // convertido para coordenadas de mundo. O flip espelha o box junto do sprite,
  // senao o alcance do golpe ficaria sempre apontado para a direita.
  rectInWorld(box) {
    const { frameWidth, frameHeight, baseline = frameHeight } = this.config.spriteGridSize;
    const left = this.facing === 1 ? box.offsetX : frameWidth - box.offsetX - box.width;
    return {
      x: this.x + (left - frameWidth / 2) * RENDER_SCALE,
      y: this.y + (box.offsetY - baseline) * RENDER_SCALE,
      width: box.width * RENDER_SCALE,
      height: box.height * RENDER_SCALE,
    };
  }

  get hurtRect() {
    return this.rectInWorld(this.config.hurtbox);
  }

  // Caixa do acerto ativo agora; fora dele, a do golpe (ou a do personagem),
  // para a IA e os testes medirem alcance.
  get hitRect() {
    const box = this.activeAttack?.box ?? this.animation.current?.hitbox ?? this.config.hitbox;
    return this.rectInWorld(box);
  }

  // Dados do golpe em execucao, ja com dano/hitstun do combo aplicados.
  get currentAttack() {
    if (this.state !== 'attack') return null;
    const animation = this.animation.current;
    if (!animation) return null;
    return this.attackOverride ? { ...animation, ...this.attackOverride } : animation;
  }

  // A janela de acerto aberta no quadro atual (ready = ainda pode conectar
  // agora). Dano e hitstun: os da janela, senao os do combo, senao os da
  // animacao.
  get activeAttack() {
    const attack = this.currentAttack;
    if (!attack) return null;
    const hits = hitsOf(this.animation.current);
    if (hits.length === 0) return null;
    const active = pickActiveHit(hits, this.animation.localFrame, this.moveClock, this.hitLog);
    if (!active) return null;
    const { hit, index, ready } = active;
    return {
      ...attack,
      ...hit,
      index,
      ready,
      damage: hit.damage ?? attack.damage,
      hitstun: hit.hitstun ?? attack.hitstun,
    };
  }

  // Chamado por resolveAttack quando o acerto ativo conecta.
  registerHit(attack) {
    recordHit(this.hitLog, attack.index, this.moveClock);
    this.attackHasLanded = true;
    this.chaseDistance = null;
  }

  // Distancia (centro a centro) em que o primeiro acerto do golpe pega em
  // cheio: o meio da caixa dele.
  idealDistance(animationName) {
    const hit = hitsOf(this.config.animations[animationName])[0];
    const box = hit?.box;
    if (!box) return null;
    return (box.offsetX + box.width / 2 - this.config.spriteGridSize.frameWidth / 2) * RENDER_SCALE;
  }

  isOnCooldown(animationName) {
    return (this.cooldowns.get(animationName) ?? 0) > 0;
  }

  startAttack(animationName, override = null, { chained = false } = {}) {
    const move = this.config.animations[animationName];
    if (!move) return false;
    if (!chained && this.isOnCooldown(animationName)) return false;
    if (!chained && move.requires && !this.effectTags.has(move.requires)) return false;

    this.state = 'attack';
    this.attackHasLanded = false;
    this.attackOverride = override;
    this.effectSpawned = false;
    this.attackSerial += 1;
    this.resetMoveState();
    if (this.grounded && !move.keepMomentum) this.vx = 0;
    this.animation.play(animationName, { restart: true });

    const cooldown = override?.cooldown ?? move.cooldown;
    if (cooldown && !chained) this.cooldowns.set(animationName, cooldown);
    this.fireEvents();
    return true;
  }

  // Passa para o proximo golpe da sequencia (cancel, onHit, next) sem perder o
  // contador de combo.
  continueMove(animationName) {
    const override = this.attackOverride;
    return this.startAttack(animationName, override, { chained: true });
  }

  endMove() {
    if (!this.moveContact && !this.attackHasLanded) this.breakCombo();
    this.state = this.grounded ? 'idle' : 'air';
    this.attackOverride = null;
    if (this.grounded) this.vx = 0;
  }

  // O contador so sobe em acertos consecutivos: errar, ser bloqueado ou ficar
  // sem atacar zera a sequencia. serial diz de qual execucao veio o acerto
  // (um projetil pode conectar depois que o golpe que o soltou acabou).
  onAttackResolved(outcome, serial = this.attackSerial) {
    if (serial === this.attackSerial) {
      this.moveContact = true;
      if (outcome !== 'block') {
        this.moveHits += 1;
        const buff = this.animation.current?.onHitBuff;
        if (buff && this.moveHits === 1) this.buffs[buff.kind] = buff.ticks;
      }
    }
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
    if (this.state === 'attack' || this.state === 'dash' || !this.canAct) return;
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
      this.animation.play(this.base(this.pendingPose), { restart: true });
      this.pendingPose = null;
    }

    this.tickCooldowns(delta);
    this.tickSeals(delta);
    this.roundClock += delta;

    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) this.breakCombo();
    }

    // O mesmo aperto que tira do chao nao pode gastar o pulo duplo.
    const wasAirborne = !this.grounded;
    if (this.canAct) {
      if (this.state === 'attack') this.updateMove(command, forward);
      if (this.state === 'dash') this.updateDash();
      if (this.state === 'dash' && this.animation.current?.dash?.cancel && BUTTONS.some((name) => command[name])) {
        this.state = this.grounded ? 'idle' : 'air';
        this.chooseAction(command);
      }

      if (this.state !== 'attack' && this.state !== 'dash') this.chooseAction(command);
      if (this.state !== 'attack' && this.state !== 'dash') this.checkModeTrigger();

      if (this.state !== 'attack' && this.state !== 'dash' && this.grounded) {
        const direction = (command.right ? 1 : 0) - (command.left ? 1 : 0);
        if (command.jump && !this.seals.noJump) {
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
      // No ar nao ha controle horizontal, salvo no pulo duplo: apertar para
      // cima de novo da um segundo impulso, na direcao segurada.
      if (wasAirborne && this.state === 'air' && command.jump) this.airJump(command);
    }

    // Bloqueio e uma condicao do input, nao um estado: andar para tras tambem
    // deixa o personagem guardado quando o golpe chegar. Durante o blockstun a
    // guarda continua de pe, senao o segundo golpe da sequencia passaria direto.
    this.blocking = !this.seals.noGuard && (
      this.state === 'blockstun' ||
      (this.canAct && this.grounded && back && this.state !== 'attack' && this.state !== 'dash')
    );

    // Golpe sem gravidade e dash (no ar, o dash aereo segura a altura).
    const floating = (this.state === 'attack' && this.animation.current?.float) || this.state === 'dash';
    if (!this.grounded && !floating) {
      this.vy += jumpGravity * delta;
    }

    this.x += this.vx * delta;
    this.y += this.vy * delta;

    if (this.y >= this.map.groundLevel) {
      this.y = this.map.groundLevel;
      this.vy = 0;
      if (!this.grounded) {
        this.vx = 0;
        this.grounded = true;
        this.airJumpsLeft = this.maxAirJumps;
        this.airDashesLeft = 1;
        if (this.state === 'dash') this.state = 'idle';
        if (this.state === 'air') this.state = 'idle';
        // Golpe aereo acaba ao tocar o chao.
        if (this.state === 'attack' && this.animation.current?.air) this.endMove();
      }
    }

    // Escorregao do empurrao de golpe, freado pelo atrito do chao.
    if (this.grounded && (this.state === 'hitstun' || this.state === 'blockstun')) {
      this.vx *= PUSH_FRICTION ** delta;
    }
    if (this.grounded && this.state === 'attack' && this.animation.current?.friction !== false) {
      this.vx *= MOVE_FRICTION ** delta;
    }

    this.chase(delta);
    this.holdPin(delta);
    this.clampToBounds();
    this.updateAnimation(forward);
    this.animation.update(delta);
    if (this.state === 'attack') {
      this.moveClock += delta;
      this.fireEvents();
    }
    this.queueEffect();
    this.syncSprite();
  }

  airJump(command) {
    if (this.airJumpsLeft <= 0 || this.seals.noJump) return;
    const { walkSpeed, jumpForce } = this.config.stats;
    const direction = (command.right ? 1 : 0) - (command.left ? 1 : 0);
    this.airJumpsLeft -= 1;
    this.vy = -jumpForce * AIR_JUMP_RATIO;
    this.vx = direction * walkSpeed;
    this.animation.play(this.base('jump'), { restart: true });
    // Enfeite do personagem no impulso (os corvos do Itachi), se houver.
    if (this.config.airJumpEffect) {
      this.pendingEffects.push({ owner: this, spawn: this.config.airJumpEffect, attack: null, serial: this.attackSerial });
    }
  }

  // Golpe novo a partir do input: dash, combo reconhecido ou botao. No ar vale
  // o golpe aereo (do combo ou do botao).
  chooseAction(command) {
    const { combo } = command;
    if (combo?.movement) {
      this.startDash(combo.animation);
      return;
    }
    if (combo) {
      const name = this.grounded ? combo.animation : (combo.airAnimation ?? (this.buttons.air ? null : combo.animation));
      if (name && this.startAttack(name, overrideFrom(combo))) return;
      if (this.grounded) return;
    }
    const button = BUTTONS.find((name) => command[name]);
    if (!button) return;
    const map = this.grounded ? this.buttons.ground : (this.buttons.air ?? this.buttons.ground);
    if (map[button]) this.startAttack(map[button]);
  }

  // Durante o golpe: guarda o botao apertado, segue sozinho quando acertou
  // (onHit), encadeia no botao depois de conectar (cancels) e, ao terminar,
  // passa para o proximo estado (next) ou volta ao neutro.
  updateMove(command, forward) {
    const move = this.animation.current;
    const pressed = BUTTONS.find((name) => command[name]);
    if (pressed) this.buffered = { button: pressed, forward, down: Boolean(command.down), clock: this.moveClock };

    // Segurar para carregar (os especiais do Escanor): solta ao largar o botao
    // (depois do minimo) ou quando a carga acaba.
    const { charge } = move;
    if (charge) {
      const held = command.holding?.[charge.button];
      if ((this.moveClock >= (charge.min ?? 0) && !held) || this.moveClock >= charge.max) {
        this.continueMove(charge.to);
        return;
      }
    }

    // Cancelar num especial depois de conectar (Yoruichi, estilo Bleach DS).
    if (move.specialCancel && command.combo && !command.combo.movement && this.moveContact) {
      const name = this.grounded ? command.combo.animation : command.combo.airAnimation;
      if (name && name !== this.animation.name && this.startAttack(name, overrideFrom(command.combo))) return;
    }

    const { onHit } = move;
    if (onHit && this.moveHits >= (onHit.minHits ?? 1) && this.moveClock >= (onHit.after ?? 0)) {
      this.continueMove(onHit.to);
      return;
    }

    if (this.buffered && move.cancels) {
      const fresh = this.moveClock - this.buffered.clock <= CHAIN_BUFFER_TICKS;
      const cancel = fresh && move.cancels.find((entry) => {
        if (entry.on !== this.buffered.button) return false;
        if (entry.forward && !this.buffered.forward) return false;
        if (entry.down !== undefined && entry.down !== this.buffered.down) return false;
        if (this.moveClock < (entry.after ?? 0)) return false;
        // Algumas sequencias mudam perto da parede (o .cns troca o golpe
        // pela distancia ate a borda).
        if (entry.frontEdge) {
          const distance = this.frontEdgeDistance;
          if (distance < (entry.frontEdge.min ?? -Infinity) || distance > (entry.frontEdge.max ?? Infinity)) return false;
        }
        const need = entry.need ?? 'contact';
        if (need === 'contact' && !this.moveContact) return false;
        if (need === 'hit' && this.moveHits === 0) return false;
        return true;
      });
      if (cancel) {
        this.continueMove(cancel.to);
        this.chaseDistance = this.idealDistance(cancel.to);
        return;
      }
    }

    if (this.animation.finished) {
      if (move.next) this.continueMove(move.next);
      else this.endMove();
    }
  }

  // Preso por um golpe (o crucificado do Tsukuyomi): fica parado no ponto
  // marcado, sem gravidade, ate o tempo acabar; depois cai normalmente.
  pin({ x, y, ticks }) {
    this.pinned = { x, y, remaining: ticks };
  }

  holdPin(delta) {
    if (!this.pinned) return;
    this.pinned.remaining -= delta;
    if (this.pinned.remaining <= 0 || this.isKnockedOut) {
      this.pinned = null;
      return;
    }
    this.x = this.pinned.x;
    this.y = this.pinned.y;
    this.vx = 0;
    this.vy = 0;
    this.grounded = this.y >= this.map.groundLevel;
  }

  get stageCenter() {
    return (this.map.leftBound + this.map.rightBound) / 2;
  }

  // Depois de encadear, acompanha o oponente que escorrega para tras (ou recua
  // um passo, se ficou perto demais) ate o primeiro acerto do golpe sair.
  chase(delta) {
    if (this.state !== 'attack' || this.chaseDistance === null || !this.opponent || !this.grounded) return;
    const first = hitsOf(this.animation.current)[0];
    if (!first || this.animation.localFrame > first.until) {
      this.chaseDistance = null;
      return;
    }
    const target = this.opponent.x - this.facing * this.chaseDistance;
    const gap = target - this.x;
    this.x += Math.sign(gap) * Math.min(Math.abs(gap), CHASE_SPEED * delta);
  }

  // Eventos do golpe ate o tick atual, na ordem.
  fireEvents() {
    const events = this.animation.current?.events;
    if (!events) return;
    while (this.eventIndex < events.length && events[this.eventIndex].at <= this.moveClock) {
      this.applyEvent(events[this.eventIndex]);
      this.eventIndex += 1;
    }
  }

  applyEvent(event) {
    if (event.vx !== undefined) this.vx = event.vx * this.facing;
    if (event.vy !== undefined) {
      this.vy = event.vy;
      if (event.vy < 0) this.grounded = false;
    }
    if (event.dx) {
      this.x += event.dx * this.facing;
      // Ajuste de posicao do pacote (alinhar o desenho entre um estado e
      // outro) nunca passa para o outro lado do oponente.
      if (this.opponent && !this.pushless) {
        const limit = this.opponent.x - this.facing * (this.halfWidth + this.opponent.halfWidth);
        if ((this.x - limit) * this.facing > 0) this.x = limit;
      }
    }
    // Reaparece num ponto qualquer ate "randomX" px de onde estava.
    if (event.randomX) this.x += (Math.random() * 2 - 1) * event.randomX;
    if (event.consume) this.pendingConsumes.push(event.consume);
    if (event.setMode !== undefined) this.mode = event.setMode || null;
    // Teleporte: reaparece a "teleport" px do oponente, do lado de ca.
    if (event.teleport !== undefined && this.opponent) {
      this.x = this.opponent.x - this.facing * event.teleport;
    }
    // Posicoes no cenario (o mundo do Tsukuyomi e centrado na arena): quem
    // ataca fica a "standAt" px do centro; o oponente, preso no centro.
    if (event.standAt !== undefined) this.x = this.stageCenter + event.standAt * this.facing;
    if (event.pinOpponent && this.opponent) {
      const { dx = 0, lift = 0, ticks, relative = 'stage' } = event.pinOpponent;
      const originX = relative === 'self' ? this.x : this.stageCenter;
      this.opponent.pin({ x: originX + dx * this.facing, y: this.map.groundLevel - lift, ticks });
    }
    if (event.land) {
      this.y = this.map.groundLevel;
      this.vy = 0;
      this.grounded = true;
    }
    if (event.effect) {
      this.pendingEffects.push({
        owner: this,
        spawn: event.effect,
        attack: this.currentAttack,
        serial: this.attackSerial,
      });
    }
    this.clampToBounds();
  }

  // Efeito do formato antigo (animation.effect): sai uma vez por golpe (ou
  // dash), quando a animacao chega no spawnFrame. No dash e so visual.
  queueEffect() {
    const attack = this.state === 'dash' ? this.animation.current : this.currentAttack;
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

  tickSeals(delta) {
    for (const timers of [this.seals, this.buffs]) {
      for (const kind of Object.keys(timers)) {
        timers[kind] -= delta;
        if (timers[kind] <= 0) delete timers[kind];
      }
    }
  }

  // Selo aplicado por um golpe (ex.: { kind: 'noGuard', ticks: 600 }).
  applySeal({ kind, ticks }) {
    this.seals[kind] = Math.max(this.seals[kind] ?? 0, ticks);
  }

  // Com o Genjutsu do dedo ativo, metade dos golpes nao pega: o personagem
  // vira corvos e reaparece em outro ponto (golpe "crowEvade" do config),
  // deixando um clone explosivo junto de quem atacou.
  tryEvade() {
    // Postura de contra-ataque: o golpe recebido dispara o contra.
    const counter = this.state === 'attack' ? this.animation.current?.counter : null;
    if (counter && this.moveClock >= (counter.from ?? 0) && this.moveClock <= (counter.until ?? Infinity)) {
      this.startAttack(counter.to, null, { chained: true });
      return true;
    }
    if (!this.buffs.crowEvade || !this.grounded || this.isKnockedOut) return false;
    if (!this.config.animations.crowEvade || Math.random() >= 0.5) return false;
    this.stunTimer = 0;
    this.startAttack('crowEvade', null, { chained: true });
    return true;
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
    this.attackOverride = null;
    if (this.grounded) this.vx = 0;
    this.animation.play(this.base('hitReaction'), { restart: true });
    return 'hit';
  }

  // Dash por toque duplo: so do chao, parado ou andando. O movimento e a
  // invulnerabilidade valem so nos quadros declarados em animation.dash (os do
  // teleporte, em que o personagem some).
  startDash(name) {
    const airName = `air${name[0].toUpperCase()}${name.slice(1)}`;
    const chosen = this.base(this.grounded ? name : airName);
    const animation = this.config.animations[chosen];
    if (!animation?.dash) return false;
    if (!this.grounded && this.airDashesLeft <= 0) return false;
    if (!this.grounded) this.airDashesLeft -= 1;
    name = chosen;
    this.state = 'dash';
    this.dashDirection = /backward/i.test(name) ? -1 : 1;
    this.effectSpawned = false;
    this.attackSerial += 1;
    this.vx = 0;
    this.animation.play(name, { restart: true });
    return true;
  }

  updateDash() {
    const { dash } = this.animation.current;
    if (this.animation.finished) {
      this.state = this.grounded ? 'idle' : 'air';
      this.vx = this.grounded ? 0 : this.vx * 0.5;
      return;
    }
    const frame = this.animation.localFrame;
    const moving = frame >= dash.moveFrom && frame <= dash.moveUntil;
    this.vx = moving ? this.dashDirection * this.facing * dash.speed : 0;
  }

  // Nos quadros em que some no dash (ou no trecho invulneravel de um golpe),
  // nenhum golpe pega.
  get invulnerable() {
    if (this.state === 'dash') {
      const { dash } = this.animation.current;
      const frame = this.animation.localFrame;
      return frame >= dash.invulnerableFrom && frame <= dash.invulnerableUntil;
    }
    if (this.state === 'attack') {
      const window = this.animation.current?.invulnerable;
      return Boolean(window) && this.moveClock >= window[0] && this.moveClock <= window[1];
    }
    return false;
  }

  // Empurra para longe de quem bateu (o lado para onde este lutador olha).
  pushBack(speed) {
    if (!this.grounded || this.isKnockedOut) return;
    this.vx = -this.facing * speed;
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
    this.animation.play(this.base(crouching ? 'blockCrouching' : 'blockStanding'), { restart: true });
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
    this.airJumpsLeft = this.maxAirJumps;
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
    this.seals = {};
    this.buffs = {};
    this.pinned = null;
    this.mode = null;
    this.roundClock = 0;
    this.airDashesLeft = 1;
    this.effectTags.clear();
    this.pendingConsumes.length = 0;
    this.resetMoveState();
    this.breakCombo();
    this.animation.play(this.base('idle'), { restart: true });
    this.syncSprite();
  }

  playRoundEndPose(won) {
    const wasKnockedOut = this.isKnockedOut;
    this.state = 'pose';
    this.vx = 0;
    this.blocking = false;

    if (won) {
      this.animation.play(this.base('victoryPose'), { restart: true });
      this.pendingPose = null;
    } else if (wasKnockedOut) {
      this.pendingPose = 'defeatPose';
    } else {
      this.animation.play(this.base('defeatPose'), { restart: true });
      this.pendingPose = null;
    }
  }

  knockOut() {
    this.state = 'ko';
    this.stunTimer = 0;
    this.vx = 0;
    this.blocking = false;
    this.animation.play(this.base('ko'), { restart: true });
  }

  updateAnimation(movingForward) {
    if (this.state === 'attack' || this.state === 'dash' || !this.canAct) return;
    if (!this.grounded) {
      this.animation.play(this.base('jump'));
      return;
    }
    if (this.state === 'crouch') {
      this.animation.play(this.base(this.blocking ? 'blockCrouching' : 'crouch'));
      return;
    }
    if (this.state === 'walk') {
      this.animation.play(this.base(movingForward ? 'walkForward' : 'walkBackward'));
      return;
    }
    this.animation.play(this.base(this.blocking ? 'blockStanding' : 'idle'));
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
