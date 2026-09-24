// Lista de golpes do personagem para a tela de pausa: de onde vem os golpes e
// como a notacao (→↓↘ + P/K/S) vira as teclas de cada jogador.

// Teclas de ataque de cada jogador (mesmo mapeamento do InputHandler).
const BUTTON_KEYS = [
  { P: 'J', K: 'K', S: 'L' },
  { P: 'NUM 1', K: 'NUM 2', S: 'NUM 3' },
];
export const DIRECTION_KEYS = ['W A S D', 'SETAS'];

const BUTTON_NAMES = { P: 'Soco', K: 'Chute', S: 'Especial' };

// Personagem sem lista propria (elenco provisorio): basicos + combos do config.
function fallbackList(config) {
  const basics = ['P', 'K', 'S'].map((button) => ({ section: 'Básicos', name: BUTTON_NAMES[button], input: button }));
  const combos = (config.combos ?? [])
    .filter((combo) => combo.input.length > 1 || combo.hold)
    .map((combo, index) => ({ section: 'Especiais', name: `Especial ${index + 1}`, input: combo.input, hold: combo.hold }));
  return [...basics, ...combos];
}

export function moveListFor(config) {
  return config.moveList ?? fallbackList(config);
}

// Golpes agrupados na ordem em que as secoes aparecem.
export function groupBySection(moves) {
  const sections = new Map();
  for (const move of moves) {
    if (!sections.has(move.section)) sections.set(move.section, []);
    sections.get(move.section).push(move);
  }
  return [...sections].map(([title, entries]) => ({ title, entries }));
}

// Notacao -> teclas do jogador (0 = 1P, 1 = 2P). Direcoes ficam como setas
// (valem olhando para a direita); botoes viram a tecla. Direcao segurada
// ("hold") vira a primeira tecla, marcada.
export function keysFor(move, player) {
  const buttons = BUTTON_KEYS[player];
  const keys = [];
  if (move.hold) keys.push({ label: move.hold, held: true });
  for (const token of move.input) {
    if (!token.trim()) continue;
    keys.push(buttons[token] ? { label: buttons[token], button: true } : { label: token });
  }
  return keys;
}
