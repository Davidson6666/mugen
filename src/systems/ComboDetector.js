// Reconhecimento dos padroes de input declarados no character config
// (ex: "→↘↓P"). O buffer guarda os ultimos tokens com timestamp e a leitura e
// sempre relativa ao lado que o personagem encara: "→" significa "para frente",
// nao "para a direita".

export const COMBO_BUFFER_MS = 500;
// Toque duplo (→→ ou ←←): as duas batidas precisam caber nessa janela.
export const DASH_WINDOW_MS = 250;
const DASH_BY_TOKEN = { '→': 'dashForward', '←': 'dashBackward' };

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

const weight = (combo) => combo.tokens.length + (combo.hold ? 0.5 : 0);

// "hold": direcao que precisa estar segurada no instante do botao (golpe de
// "↓ + botao", como os supers do MUGEN). Relativa ao lado que o personagem
// encara, como o resto da notacao.
function holdSatisfied(hold, command, facing) {
  if (!hold) return true;
  const token = directionToken(command, facing);
  if (hold === '↓') return Boolean(command.down);
  return token === hold;
}

function parseNotation(input) {
  return [...input].filter((token) => token.trim().length > 0);
}

export class ComboDetector {
  constructor(combos = [], { window = COMBO_BUFFER_MS } = {}) {
    this.window = window;
    // Padroes mais longos primeiro: "→↘↓P" precisa ganhar de "P", senao o soco
    // simples engoliria todo especial que termina no mesmo botao. Um padrao com
    // direcao segurada ("hold": "↓" + P) ganha do botao sozinho.
    this.combos = combos
      .map((combo) => {
        const tokens = parseNotation(combo.input);
        return {
          ...combo,
          tokens,
          animation: combo.animation ?? FALLBACK_ANIMATION[tokens.at(-1)],
        };
      })
      .sort((a, b) => weight(b) - weight(a));
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
  // mode: modo atual do personagem; combo com "mode" so vale nele (e combo
  // sem "mode" so fora de qualquer modo). Uma lista vale para todos os modos
  // dela (null = os combos de base): o Origin Mode do Gojo mantem os golpes
  // normais e soma o Hollow Nuke.
  feed(command, facing, now, mode = null) {
    this.mode = mode;
    const direction = directionToken(command, facing);
    if (direction !== this.lastDirection) {
      this.lastDirection = direction;
      if (direction) {
        const previous = this.buffer.at(-1);
        this.push(direction, now);
        // Como so mudancas entram no buffer, dois "→" seguidos significam que
        // a tecla foi solta e apertada de novo: toque duplo.
        const dash = DASH_BY_TOKEN[direction];
        if (dash && previous?.token === direction && now - previous.time <= DASH_WINDOW_MS) {
          return { id: dash, animation: dash, movement: true };
        }
      }
    }

    for (const [action, token] of Object.entries(BUTTON_TOKENS)) {
      if (!command[action]) continue;
      this.push(token, now);
      const match = this.match(now, command, facing);
      if (match) this.buffer.length = 0;
      return match;
    }
    return null;
  }

  match(now, command = {}, facing = 1) {
    return this.combos.find(
      (combo) => (Array.isArray(this.mode) ? this.mode : [this.mode ?? null]).includes(combo.mode ?? null)
        && holdSatisfied(combo.hold, command, facing) && this.matchesTokens(combo.tokens, now),
    ) ?? null;
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
