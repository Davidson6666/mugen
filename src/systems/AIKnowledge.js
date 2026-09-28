// O que a IA sabe sobre os golpes, lido do config do personagem: para que serve
// cada um (defender, curar, ligar um bonus, atacar de longe...), quanto ele
// machuca e ate onde alcanca. E o que ela ve do oponente: em que fase do golpe
// ele esta (comecando, acertando, recuperando). Nada aqui e segredo: uma
// pessoa jogando ve as mesmas coisas.

const CHAIN_DEPTH = 3;

// Efeitos que um golpe solta: o do formato antigo e os dos eventos.
export function spawnsOf(animation) {
  if (!animation) return [];
  const fromEvents = (animation.events ?? []).filter((event) => event.effect).map((event) => event.effect);
  return animation.effect ? [animation.effect, ...fromEvents] : fromEvents;
}

const hitsDamage = (hits, fallback) => (hits ?? []).reduce(
  (sum, hit) => sum + (hit.damage ?? fallback ?? 0) * (hit.every ? (hit.count ?? 1) : 1),
  0,
);

// Dano que o golpe causa se tudo acertar, com o que vem depois (onHit, next):
// um golpe que abre uma sequencia vale o que a sequencia inteira vale.
export function staticDamage(config, name, depth = 0) {
  const animation = config.animations[name];
  if (!animation || depth > CHAIN_DEPTH) return 0;
  // Sem "hits" (o boneco de teste): um acerto so, com o dano do golpe.
  let total = animation.hits?.length ? hitsDamage(animation.hits, animation.damage) : (animation.damage ?? 0);
  for (const spawn of spawnsOf(animation)) {
    const effect = config.effects?.[spawn.id];
    if (!effect) continue;
    total += spawn.damage ?? hitsDamage(effect.hits, effect.damage);
  }
  for (const next of [animation.onHit?.to, animation.next]) {
    if (next && next !== name) total += staticDamage(config, next, depth + 1) * 0.8;
  }
  return total;
}

// Ate onde o golpe alcanca, em px do mundo a partir do centro do lutador: a
// caixa de acerto mais a distancia que ele anda no proprio golpe.
export function reachOf(self, name) {
  const animation = self.config.animations[name];
  if (!animation) return 0;
  const { frameWidth } = self.config.spriteGridSize;
  let box = 0;
  for (const hit of animation.hits ?? []) {
    box = Math.max(box, (hit.box.offsetX + hit.box.width - frameWidth / 2) * self.scale);
  }
  let travel = 0;
  for (const event of animation.events ?? []) {
    if (event.dx > 0) travel += event.dx;
    if (event.vx > 0) travel += event.vx * 4;
    if (event.teleport) travel += event.teleport;
  }
  // Sem caixa propria: a caixa padrao do personagem (golpe do boneco de teste)
  // ou, se solta efeito (rajada, raio, area), um alcance de golpe medio.
  const noBox = (animation.hits ?? []).length === 0;
  if (noBox && spawnsOf(animation).length === 0) box = self.attackReach;
  const fallback = noBox && spawnsOf(animation).length > 0 ? self.attackReach * 1.6 : 0;
  return Math.max(box, fallback) + Math.min(travel, 60) * self.scale;
}

const cache = new WeakMap();

// Papel de um golpe (calculado uma vez por personagem).
export function analyzeMove(config, name) {
  let byName = cache.get(config);
  if (!byName) { byName = new Map(); cache.set(config, byName); }
  if (byName.has(name)) return byName.get(name);

  const animation = config.animations[name];
  if (!animation) return null;
  const events = animation.events ?? [];
  const spawns = spawnsOf(animation);
  const damage = staticDamage(config, name);
  const tags = spawns.map((spawn) => config.effects?.[spawn.id]?.tag).filter(Boolean);
  const buffs = events.filter((event) => event.buff).map((event) => event.buff.kind);
  const modes = events.filter((event) => event.setMode).map((event) => event.setMode);
  const debuffs = events.filter((event) => event.sealOpponent).map((event) => event.sealOpponent.kind);
  const heals = events.some((event) => event.heal);
  const counters = Boolean(animation.counter);
  const selfBuff = tags.length > 0 || buffs.length > 0 || modes.length > 0 || Boolean(animation.illusion);
  const info = {
    name,
    damage,
    counter: counters,
    // Ticks ate a postura de contra-ataque valer (o sol do Escanor so vale
    // depois de 15): so adianta arma-la com o golpe do oponente ainda longe.
    counterFrom: animation.counter?.from ?? 0,
    heal: heals,
    // Liga um bonus proprio (aura, clone, modo): so vale se ainda nao esta ligado.
    buff: selfBuff ? { tags, buffs, modes, illusion: Boolean(animation.illusion) } : null,
    // Deixa o oponente pior (camera lenta): so vale se ele ainda nao esta.
    debuff: debuffs.length > 0 ? debuffs : null,
    requires: animation.requires ?? null,
    finisher: animation.opponentLifeBelow ?? null,
    perRound: animation.perRound ?? null,
    super: (animation.cooldown ?? 0) >= 600,
    // Golpe que nao machuca e existe para outra coisa.
    utility: damage === 0 && (counters || heals || selfBuff || debuffs.length > 0),
    ranged: spawns.some((spawn) => {
      const effect = config.effects?.[spawn.id];
      if (!effect || (!effect.hits && !effect.hitbox)) return false;
      return spawn.target === 'opponent' || (spawn.velocityX ?? effect.velocityX ?? 0) > 0;
    }),
  };
  byName.set(name, info);
  return info;
}

// O bonus que este golpe liga ja esta ligado? (aura no campo, clone, modo)
export function buffActive(self, info) {
  const { buff } = info;
  if (!buff) return false;
  if (buff.tags.some((tag) => self.effectTags?.has(tag))) return true;
  if (buff.buffs.some((kind) => self.buffs?.[kind] > 0)) return true;
  if (buff.modes.some((mode) => self.mode === mode)) return true;
  if (buff.illusion && self.illusion) return true;
  return false;
}

// Marca que o golpe exige (a aura do Kaioken para a sequencia final) esta em campo?
export function requirementMet(self, info) {
  return !info.requires || Boolean(self.effectTags?.has(info.requires));
}

// Fase do golpe do oponente, contada em ticks:
//   idle      parado ou andando
//   startup   comecando (ainda nao acerta)
//   active    acertando
//   recovery  ja acertou ou errou e ainda esta se recuperando: a hora de punir
//   stun      apanhando ou defendendo
//   air       no ar
export function phaseOf(fighter) {
  if (fighter.state === 'hitstun' || fighter.state === 'blockstun') return { kind: 'stun', remaining: fighter.stunTimer };
  // Lancado (ainda da para acertar no ar) ou deitado (ninguem acerta).
  if (fighter.state === 'launched') return { kind: 'stun', remaining: 0 };
  if (fighter.state === 'down') return { kind: 'down', remaining: fighter.downTimer };
  if (fighter.state === 'air') return { kind: 'air', remaining: 0 };
  if (fighter.state !== 'attack') return { kind: 'idle', remaining: 0 };
  const animation = fighter.animation.current;
  const durations = animation?.durations;
  if (!durations) return { kind: 'active', remaining: 0 };
  const total = durations.reduce((sum, ticks) => sum + ticks, 0);
  const at = (frame) => durations.slice(0, frame).reduce((sum, ticks) => sum + ticks, 0);
  const hits = animation.hits ?? [];
  const clock = fighter.moveClock;
  if (hits.length === 0) {
    // Golpe sem caixa (projetil, raio): o que importa e o instante do disparo.
    const last = Math.max(0, ...(animation.events ?? []).map((event) => event.at));
    return clock <= last + 4 ? { kind: 'startup', remaining: last - clock } : { kind: 'recovery', remaining: total - clock };
  }
  const starts = hits.map((hit) => at(hit.from));
  const ends = hits.map((hit) => Math.max(at(hit.until + 1), at(hit.from) + (hit.every ? hit.every * (hit.count ?? 1) : 0)));
  const first = Math.min(...starts);
  const last = Math.max(...ends);
  if (clock < first) return { kind: 'startup', remaining: first - clock };
  if (clock <= last) return { kind: 'active', remaining: last - clock };
  // Golpe que continua em outro (onHit, next) so recupera no fim da sequencia.
  const continues = Boolean(animation.next || (animation.onHit && fighter.moveHits > 0));
  return continues ? { kind: 'active', remaining: 0 } : { kind: 'recovery', remaining: total - clock };
}
