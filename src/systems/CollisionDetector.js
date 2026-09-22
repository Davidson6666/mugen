// Fracao do dano que atravessa a guarda: bloquear reduz muito, mas nunca zera,
// entao ficar parado defendendo tambem custa vida.
const CHIP_DAMAGE_RATIO = 0.15;
// O blockstun e mais curto que o hitstun: quem defende recupera antes de quem
// apanha, e por isso a sequencia de golpes nao emenda sozinha na guarda.
const BLOCKSTUN_RATIO = 0.5;

// Colisao fisica entre os corpos dos lutadores. Sem isso os sprites se
// sobrepoem e o combate perde a sensacao de peso.
// A separacao so vale com os dois no chao: no ar, passar por cima do oponente
// (cross-up) precisa continuar funcionando.
export function resolveBodyCollision(a, b) {
  if (!a.grounded || !b.grounded) return;

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

// Confronta a hitbox ativa do atacante contra a hurtbox do defensor. Devolve o
// que aconteceu ('hit', 'block' ou 'ko') para quem precisar reagir — contador de
// combo, audio, HUD — ou null quando o golpe nao conecta.
export function resolveAttack(attacker, defender) {
  const attack = attacker.activeAttack;
  if (!attack || attacker.attackHasLanded || defender.isKnockedOut) return null;
  if (!overlaps(attacker.hitRect, defender.hurtRect)) return null;

  attacker.attackHasLanded = true;
  return applyHit(attacker, defender, attack);
}

// Regra de dano comum a golpe corpo a corpo e a efeito (projetil, area):
// guarda reduz o dano e troca hitstun por blockstun.
export function applyHit(attacker, defender, attack) {
  if (defender.blocking) {
    const damage = Math.max(1, Math.round(attack.damage * CHIP_DAMAGE_RATIO));
    const blockstun = Math.round(attack.hitstun * BLOCKSTUN_RATIO);
    const outcome = defender.takeBlockedHit(damage, blockstun);
    attacker.onAttackResolved(outcome);
    return { outcome, damage };
  }

  const outcome = defender.takeHit(attack.damage, attack.hitstun);
  attacker.onAttackResolved(outcome);
  return { outcome, damage: attack.damage };
}
