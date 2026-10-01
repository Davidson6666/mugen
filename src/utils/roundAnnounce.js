// O que o HUD anuncia quando um round acaba.
//
// O "PERFECT" rouba o lugar do "K.O." quando o vencedor terminou o round com a
// barra de vida intacta - nem o arranhao que defender custa. E a mesma medida
// que decide a conquista PERFECT, que pede isso nos dois rounds.
export const ROUND_END_MESSAGE = {
  ko: 'K.O.',
  timeout: 'TEMPO ESGOTADO',
  doubleKo: 'EMPATE',
  timeDraw: 'EMPATE',
};

export function roundEndAnnounce(reason, winner, roundLowHealth) {
  if (winner !== null && roundLowHealth[winner] === 1) return 'PERFECT!';
  return ROUND_END_MESSAGE[reason];
}
