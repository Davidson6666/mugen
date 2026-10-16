// Golpe que ganha o corte de super na tela (src/systems/SuperCutIn.js): os de
// recarga longa (10 s ou mais) e os de uso limitado por round. Sao os supers,
// finalizadores e transformacoes de cada lutador.
export const SUPER_COOLDOWN_TICKS = 600;

export function isSuperMove(move) {
  if (!move) return false;
  return (move.cooldown ?? 0) >= SUPER_COOLDOWN_TICKS || Boolean(move.perRound) || Boolean(move.instantKill);
}
