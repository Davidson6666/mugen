// Reconhecimento dos padroes de input declarados no character config
// (ex: "→↘↓P"). O buffer guarda os ultimos tokens com timestamp e a leitura e
// sempre relativa ao lado que o personagem encara: "→" significa "para frente",
// nao "para a direita".

export const COMBO_BUFFER_MS = 500;

const BUTTON_TOKENS = { punch: 'P', kick: 'K', special: 'S' };
// Combo sem campo "animation" cai no ataque basico do botao que fecha o padrao.
const FALLBACK_ANIMATION = { P: 'punch', K: 'kick', S: 'special1' };

function directionToken(command, facing) {
  const forward = facing === 1 ? command.right : command.left;
  const back = facing === 1 ? command.left : command.right;
  if (command.up && forward) return '↗';
  if (command.up && back) return '↖';
  if (command.down && forward) return '↘';
  if (command.down && back) return '↙';
  if (command.up) return '↑';
  if (command.down) return '↓';
  if (forward) return '→';
  if (back) return '←';
  return null;
}

function parseNotation(input) {
  return [...input].filter((token) => token.trim().length > 0);
}

export class ComboDetector {
  constructor(combos = [], { window = COMBO_BUFFER_MS } = {}) {
    this.window = window;
    // Padroes mais longos primeiro: "→↘↓P" precisa ganhar de "P", senao o soco
    // simples engoliria todo especial que termina no mesmo botao.
    this.combos = combos
      .map((combo) => {
        const tokens = parseNotation(combo.input);
        return {
          ...combo,
          tokens,
          animation: combo.animation ?? FALLBACK_ANIMATION[tokens.at(-1)],
        };
      })
      .sort((a, b) => b.tokens.length - a.tokens.length);
    this.buffer = [];
    this.lastDirection = null;
  }

  reset() {
    this.buffer.length = 0;
    this.lastDirection = null;
  }

  push(token, now) {
    this.buffer.push({ token, time: now });
    const cutoff = now - this.window;
    while (this.buffer.length > 0 && this.buffer[0].time < cutoff) this.buffer.shift();
  }

  // Le o input do frame e devolve o combo reconhecido, se o botao apertado
  // fechar algum padrao. So direcoes que mudaram entram no buffer, senao
  // segurar uma tecla encheria tudo com o mesmo token.
  feed(command, facing, now) {
    const direction = directionToken(command, facing);
    if (direction !== this.lastDirection) {
      if (direction) this.push(direction, now);
      this.lastDirection = direction;
    }

    for (const [action, token] of Object.entries(BUTTON_TOKENS)) {
      if (!command[action]) continue;
      this.push(token, now);
      const match = this.match(now);
      if (match) this.buffer.length = 0;
      return match;
    }
    return null;
  }

  match(now) {
    return this.combos.find((combo) => this.matchesTokens(combo.tokens, now)) ?? null;
  }

  matchesTokens(tokens, now) {
    const last = this.buffer.at(-1);
    // O botao recem apertado tem que ser o ultimo token do padrao, senao um "P"
    // antigo no buffer faria um chute disparar um combo de soco.
    if (!last || last.token !== tokens.at(-1)) return false;

    let expected = tokens.length - 2;
    for (let i = this.buffer.length - 2; i >= 0 && expected >= 0; i -= 1) {
      const entry = this.buffer[i];
      if (now - entry.time > this.window) break;
      // Tokens intermediarios sao ignorados: passar por uma diagonal a mais no
      // meio do movimento nao pode invalidar o comando.
      if (entry.token === tokens[expected]) expected -= 1;
    }
    return expected < 0;
  }
}
