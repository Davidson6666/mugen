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
