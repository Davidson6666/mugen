// Fonte unica da identidade visual do jogo. A UI em React consome as CSS custom
// properties publicadas por applyPaletteToCss; o Pixi consome os numeros de
// PALETTE_HEX. Nenhuma cor deve ser escrita direto no codigo fora daqui.
export const PALETTE = {
  bgPrimary: '#0D0B1A',
  accent: '#FFB800',
  player1: '#FF3D3D',
  player2: '#00D9FF',
  textPrimary: '#FFFFFF',
  textSecondary: '#8B8698',
  // Linguagem Capcom vs SNK 2 (docs/PLANO_LAYOUT_VISUAL.md). Cores tiradas dos
  // pixels de docs/referencias-ui/cvs2/capcomvssnk2-s16.jpg e -s4.jpg.
  ink: '#0A0A0C',
  lifeFill: '#FDFF17',
  lifeTrail: '#E8201C',
  emblem: '#F0C928',
  portraitBg: '#EFC31E',
  fieldOrange: '#F53C17',
  fieldRed: '#B81E10',
  fieldYellow: '#FBD409',
  fieldBlue: '#1F4FD1',
  // Letreiro gigante e apagado no fundo da selecao ("MILLENNIUM 2001").
  fieldOrangeLight: '#FF5A33',
  fieldBlueLight: '#2B5FE0',
  cellEmpty: '#2A2A30',
  cursorP1: '#E8342A',
  cursorP2: '#2F7BEA',
};

export const PALETTE_HEX = Object.fromEntries(
  Object.entries(PALETTE).map(([key, value]) => [key, Number.parseInt(value.slice(1), 16)]),
);

function toKebab(key) {
  return key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

export function applyPaletteToCss(target = document.documentElement) {
  for (const [key, value] of Object.entries(PALETTE)) {
    target.style.setProperty(`--color-${toKebab(key)}`, value);
  }
}
