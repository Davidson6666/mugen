// CPU controlada por parametros, nao por liga/desliga: cada nivel de
// dificuldade e um conjunto de valores que deixam a IA progressivamente mais
// rapida, mais precisa e mais agressiva.
//
// A IA produz exatamente o mesmo "command" que o teclado produz, e os combos
// dela saem como sequencia de direcoes e botoes que passam pelo mesmo
// ComboDetector do jogador. Ela joga com as mesmas regras.

export const DIFFICULTY_PRESETS = {
  easy: {
    reactionFrames: 26,
    reactionJitter: 14,
    aggression: 0.3,
    comboChance: 0.08,
    blockChance: 0.25,
    jumpChance: 0.05,
    retreatHealthRatio: 0.25,
    spacingError: 24,
  },
  normal: {
    reactionFrames: 16,
    reactionJitter: 10,
    aggression: 0.55,
    comboChance: 0.3,
    blockChance: 0.55,
    jumpChance: 0.1,
    retreatHealthRatio: 0.3,
    spacingError: 12,
  },
  hard: {
    reactionFrames: 8,
    reactionJitter: 5,
    aggression: 0.8,
    comboChance: 0.6,
    blockChance: 0.85,
    jumpChance: 0.14,
    retreatHealthRatio: 0.35,
    spacingError: 4,
  },
};

const NEUTRAL = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  punch: false,
  kick: false,
  special: false,
};

const toCommand = (fragment = {}) => ({ ...NEUTRAL, ...fragment });

// Converte um token da notacao de combo no input equivalente, ja resolvido para
// o lado que o personagem encara.
function tokenToFragment(token, facing) {
  const forward = facing === 1 ? 'right' : 'left';
  const back = facing === 1 ? 'left' : 'right';
  switch (token) {
    case '→': return { [forward]: true };
    case '←': return { [back]: true };
    case '↑': return { up: true };
    case '↓': return { down: true };
    case '↗': return { up: true, [forward]: true };
    case '↖': return { up: true, [back]: true };
    case '↘': return { down: true, [forward]: true };
    case '↙': return { down: true, [back]: true };
    case 'P': return { punch: true };
    case 'K': return { kick: true };
    case 'S': return { special: true };
    default: return {};
  }
}

// Efeitos que um golpe solta: o do formato antigo e os dos eventos.
function spawnsOf(animation) {
  if (!animation) return [];
  const fromEvents = (animation.events ?? []).filter((event) => event.effect).map((event) => event.effect);
  return animation.effect ? [animation.effect, ...fromEvents] : fromEvents;
}

// Golpe que alcanca de longe: solta um projetil ou surge em cima do oponente.
function isRanged(self, combo) {
  const animation = combo.animation ? self.config.animations?.[combo.animation] : null;
  return spawnsOf(animation).some((spawn) => {
    const effect = self.config.effects?.[spawn.id];
    if (!effect || (!effect.hits && !effect.hitbox)) return false;
    return spawn.target === 'opponent' || (spawn.velocityX ?? effect.velocityX ?? 0) > 0;
  });
}

// Ticks entre apertos quando a IA encadeia a sequencia de um botao.
const CHAIN_GAP = 9;

export class AIController {
  constructor(combos = [], difficulty = 'normal', { random = Math.random } = {}) {
    this.combos = combos;
    this.random = random;
    this.setDifficulty(difficulty);
    this.intent = { type: 'wait' };
    this.decisionTimer = 0;
    this.script = [];
  }

  setDifficulty(difficulty) {
    this.difficulty = DIFFICULTY_PRESETS[difficulty] ? difficulty : 'normal';
    this.params = DIFFICULTY_PRESETS[this.difficulty];
  }

  chance(probability) {
    return this.random() < probability;
  }

  reset() {
    this.intent = { type: 'wait' };
    this.decisionTimer = 0;
    this.script.length = 0;
  }

  update(self, opponent, delta) {
    if (!self.canAct || self.isKnockedOut || opponent.isKnockedOut) {
      this.script.length = 0;
      return toCommand();
    }

    // Uma sequencia de combo em andamento nao e reavaliada no meio: interromper
    // faria a IA nunca fechar um movimento.
    if (this.script.length > 0) return toCommand(this.script.shift());

    this.decisionTimer -= delta;
    if (this.decisionTimer > 0) return this.movementCommand(self, opponent);

    this.intent = this.decide(self, opponent);
    // O tempo entre decisoes e o que faz a CPU parecer reativa em vez de
    // robotica: nivel facil demora mais para responder ao jogador.
    this.decisionTimer =
      this.params.reactionFrames + this.random() * this.params.reactionJitter;

    this.script = this.scriptFor(this.intent, self);
    if (this.script.length > 0) return toCommand(this.script.shift());
    return this.movementCommand(self, opponent);
  }

  decide(self, opponent) {
    const distance = Math.abs(opponent.x - self.x);
    // A margem de erro de espacamento e o que faz a CPU facil socar o ar.
    const error = (this.random() - 0.5) * 2 * this.params.spacingError;
    const range = self.attackReach + opponent.halfWidth + error;
    const healthRatio = self.health / self.config.stats.maxHealth;

    const threatened = opponent.state === 'attack' && distance <= range * 1.3;
    if (threatened && this.chance(this.params.blockChance)) return { type: 'block' };

    if (healthRatio < this.params.retreatHealthRatio && this.chance(0.5)) {
      return { type: 'retreat' };
    }

    if (distance > range) {
      // Longe demais para o corpo a corpo, mas ao alcance de um projetil.
      const ranged = this.pickCombo(self, { rangedOnly: true });
      if (ranged && this.chance(this.params.aggression * this.params.comboChance)) {
        return { type: 'combo', combo: ranged };
      }
      if (this.chance(this.params.jumpChance)) return { type: 'jump' };
      return { type: 'approach' };
    }

    if (this.chance(this.params.aggression)) {
      const combo = this.pickCombo(self);
      if (combo && this.chance(this.params.comboChance)) return { type: 'combo', combo };
      // Com golpe proprio no botao especial (sequencia C), os tres entram.
      const buttons = self.config.buttons?.ground?.special ? ['punch', 'kick', 'special'] : ['punch', 'kick'];
      return { type: 'attack', button: buttons[Math.floor(this.random() * buttons.length)] };
    }

    return { type: 'wait' };
  }

  // So considera combos de verdade (mais de um token) e que nao estejam em
  // cooldown, senao a IA "gastaria" a decisao num golpe que nao vai sair.
  pickCombo(self, { rangedOnly = false } = {}) {
    const available = this.combos.filter((combo) => {
      const length = combo.tokens ? combo.tokens.length : combo.input.length;
      if (length < 2 && !combo.hold) return false;
      if ((combo.mode ?? null) !== (self.mode ?? null)) return false;
      if (rangedOnly && !isRanged(self, combo)) return false;
      const animation = combo.animation ?? null;
      return !animation || !self.isOnCooldown(animation);
    });
    if (available.length === 0) return null;
    return available[Math.floor(this.random() * available.length)];
  }

  scriptFor(intent, self) {
    if (intent.type === 'attack') {
      // Personagem com sequencias (cancels): a IA aperta de novo no ritmo do
      // golpe, e a sequencia so continua se o primeiro conectar.
      const script = [{ [intent.button]: true }];
      const chains = self.config.buttons ? Math.floor(this.random() * 4 * this.params.aggression) : 0;
      for (let press = 0; press < chains; press += 1) {
        script.push(...Array.from({ length: CHAIN_GAP }, () => ({})), { [intent.button]: true });
      }
      return script;
    }
    if (intent.type === 'jump') {
      // As vezes emenda o pulo duplo no alto do primeiro.
      if (this.random() < 0.3) return [{ up: true, jump: true }, ...Array.from({ length: 12 }, () => ({})), { up: true, jump: true }];
      return [{ up: true, jump: true }];
    }
    if (intent.type !== 'combo') return [];

    const { combo } = intent;
    const tokens = combo.tokens ?? [...combo.input];
    const script = [];
    tokens.forEach((token, index) => {
      // Direcao repetida (↓↓) so conta se soltar entre as duas.
      if (index > 0 && token === tokens[index - 1]) script.push({});
      script.push(tokenToFragment(token, self.facing));
    });
    // "↓ + botao": a direcao continua segurada no aperto.
    if (combo.hold) Object.assign(script[script.length - 1], tokenToFragment(combo.hold, self.facing));
    return script;
  }

  movementCommand(self, opponent) {
    const toward = opponent.x >= self.x ? 'right' : 'left';
    const away = toward === 'right' ? 'left' : 'right';

    switch (this.intent.type) {
      case 'approach':
        return toCommand({ [toward]: true });
      // Recuar e defender sao o mesmo input: segurar para tras ja deixa a
      // guarda de pe quando o golpe chega.
      case 'retreat':
      case 'block':
        return toCommand({ [away]: true });
      default:
        return toCommand();
    }
  }
}
