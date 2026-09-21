// Regras de round e condicao de vitoria: melhor de 3, 90 segundos por round, e
// o round de desempate (1 a 1) rodando sem cronometro ate o nocaute.

export const ROUND_TIME_SECONDS = 90;
export const ROUNDS_TO_WIN = 2;
const FRAMES_PER_SECOND = 60;

export class GameStateManager {
  constructor({
    roundTimeSeconds = ROUND_TIME_SECONDS,
    roundsToWin = ROUNDS_TO_WIN,
    endDelayFrames = 150,
  } = {}) {
    this.roundTimeSeconds = roundTimeSeconds;
    this.roundsToWin = roundsToWin;
    this.endDelayFrames = endDelayFrames;
    this.reset();
  }

  reset() {
    this.wins = [0, 0];
    this.roundNumber = 1;
    this.phase = 'fighting';
    this.timeRemaining = this.roundTimeSeconds;
    this.endTimer = 0;
    this.lastResult = null;
    this.matchWinner = null;
  }

  // Morte subita e definida pelo placar empatado na ultima rodada possivel, nao
  // pelo numero do round: um empate faz o round 3 acontecer com o placar 0 a 0,
  // e ali o cronometro ainda vale.
  get isSuddenDeath() {
    return this.wins.every((wins) => wins === this.roundsToWin - 1);
  }

  update(fighters, delta) {
    if (this.phase === 'fighting') return this.updateFighting(fighters, delta);
    if (this.phase === 'roundEnd') return this.updateRoundEnd(delta);
    return null;
  }

  updateFighting(fighters, delta) {
    if (!this.isSuddenDeath) {
      this.timeRemaining = Math.max(0, this.timeRemaining - delta / FRAMES_PER_SECOND);
    }

    const [first, second] = fighters;
    const firstDown = first.health <= 0;
    const secondDown = second.health <= 0;

    // Os dois zerando no mesmo frame e empate: ninguem pontua.
    if (firstDown && secondDown) return this.endRound(null, 'doubleKo');
    if (secondDown) return this.endRound(0, 'ko');
    if (firstDown) return this.endRound(1, 'ko');

    if (!this.isSuddenDeath && this.timeRemaining <= 0) {
      if (first.health === second.health) return this.endRound(null, 'timeDraw');
      return this.endRound(first.health > second.health ? 0 : 1, 'timeout');
    }

    return null;
  }

  endRound(winner, reason) {
    this.phase = 'roundEnd';
    this.endTimer = this.endDelayFrames;

    if (winner !== null) {
      this.wins[winner] += 1;
      if (this.wins[winner] >= this.roundsToWin) this.matchWinner = winner;
    }

    this.lastResult = { type: 'roundEnd', round: this.roundNumber, winner, reason };
    return this.lastResult;
  }

  updateRoundEnd(delta) {
    this.endTimer -= delta;
    if (this.endTimer > 0) return null;

    if (this.matchWinner !== null) {
      this.phase = 'matchEnd';
      return { type: 'matchEnd', winner: this.matchWinner };
    }

    this.roundNumber += 1;
    this.phase = 'fighting';
    this.timeRemaining = this.roundTimeSeconds;
    return { type: 'roundStart', round: this.roundNumber };
  }
}
