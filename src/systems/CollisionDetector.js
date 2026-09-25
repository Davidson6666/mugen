// Fracao do dano que atravessa a guarda: bloquear reduz muito, mas nunca zera,
// entao ficar parado defendendo tambem custa vida.
const CHIP_DAMAGE_RATIO = 0.15;
// O blockstun e mais curto que o hitstun: quem defende recupera antes de quem
// apanha, e por isso a sequencia de golpes nao emenda sozinha na guarda.
const BLOCKSTUN_RATIO = 0.5;
// Escorregao para tras de quem leva o golpe (px por tick, freado pelo atrito
// no Fighter). Na guarda empurra menos.
const HIT_PUSH = 3;
const BLOCK_PUSH = 2;

// Colisao fisica entre os corpos dos lutadores. Sem isso os sprites se
// sobrepoem e o combate perde a sensacao de peso.
// A separacao so vale com os dois no chao: no ar, passar por cima do oponente
// (cross-up) precisa continuar funcionando.
export function resolveBodyCollision(a, b) {
  if (!a.grounded || !b.grounded) return;
  if (a.pushless || b.pushless) return;

  const minDistance = a.halfWidth + b.halfWidth;
  const delta = b.x - a.x;
  const distance = Math.abs(delta);
  if (distance >= minDistance) return;

  const direction = delta === 0 ? 1 : Math.sign(delta);
  const push = (minDistance - distance) / 2;
  a.x -= direction * push;
  b.x += direction * push;
  a.clampToBounds();
  b.clampToBounds();
}

export function overlaps(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// Confronta o acerto ativo do atacante contra a hurtbox do defensor. Devolve o
// que aconteceu ('hit', 'block' ou 'ko') para quem precisar reagir — contador de
// combo, audio, HUD — ou null quando o golpe nao conecta. Cada janela de
// acerto do golpe conecta por conta propria (golpe de varios acertos).
export function resolveAttack(attacker, defender) {
  const attack = attacker.activeAttack;
  if (!attack?.ready || defender.isKnockedOut || defender.invulnerable) return null;
  const hitRect = attacker.rectInWorld(attack.box ?? attacker.config.hitbox);
  if (!overlaps(hitRect, defender.hurtRect)) return null;

  attacker.registerHit(attack);
  return applyHit(attacker, defender, attack, hitRect);
}

// Centro da area onde o golpe e o corpo se cruzam: onde a faisca aparece.
function impactPoint(hitRect, hurtRect) {
  const left = Math.max(hitRect.x, hurtRect.x);
  const right = Math.min(hitRect.x + hitRect.width, hurtRect.x + hurtRect.width);
  const top = Math.max(hitRect.y, hurtRect.y);
  const bottom = Math.min(hitRect.y + hitRect.height, hurtRect.y + hurtRect.height);
  return { x: (left + right) / 2, y: (top + bottom) / 2 };
}

// Regra de dano comum a golpe corpo a corpo e a efeito (projetil, area):
// guarda reduz o dano e troca hitstun por blockstun. Devolve tambem onde foi o
// impacto, para a faisca. serial: de qual execucao de golpe veio o acerto
// (efeitos conectam depois; o atacante so encadeia pelo golpe atual).
export function applyHit(attacker, defender, attack, hitRect, serial = attacker.attackSerial) {
  const point = impactPoint(hitRect, defender.hurtRect);
  // Ataque mais forte no modo despertado (Origin Mode do Gojo).
  const scale = attacker.damageScale ?? 1;
  if (scale !== 1) attack = { ...attack, damage: Math.max(1, Math.round(attack.damage * scale)) };
  const heavy = Boolean(attack.heavy);
  // Esquiva (Genjutsu do dedo): o golpe atravessa sem dano nem hitstun.
  if (!defender.blocking && defender.tryEvade?.()) return { outcome: 'evade', damage: 0, point };
  // Genjutsu nao se defende: o golpe "unblockable" passa pela guarda.
  if (defender.blocking && !attack.unblockable) {
    const damage = Math.max(1, Math.round(attack.damage * CHIP_DAMAGE_RATIO));
    const blockstun = Math.round(attack.hitstun * BLOCKSTUN_RATIO);
    const outcome = defender.takeBlockedHit(damage, blockstun);
    defender.pushBack(Math.min(attack.push ?? BLOCK_PUSH, BLOCK_PUSH * 2));
    attacker.onAttackResolved(outcome, serial, attack);
    return { outcome, damage, point, heavy };
  }

  const outcome = defender.takeHit(attack.damage, attack.hitstun);
  defender.pushBack(attack.push ?? HIT_PUSH);
  if (attack.seal && outcome === 'hit') defender.applySeal?.(attack.seal);
  attacker.onAttackResolved(outcome, serial, attack);
  return { outcome, damage: attack.damage, point, heavy };
}
