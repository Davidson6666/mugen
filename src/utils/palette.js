// Fonte unica da identidade visual do jogo. A UI em React consome as CSS custom
// properties publicadas por applyPaletteToCss; o Pixi consome os numeros de
// PALETTE_HEX. Nenhuma cor deve ser escrita direto no codigo fora daqui.
export const PALETTE = {
  bgPrimary: '#0D0B1A',
  bgSecondary: '#1A1625',
  accent: '#FFB800',
  player1: '#FF3D3D',
  player2: '#00D9FF',
  healthHigh: '#39FF14',
  healthMid: '#FFD700',
  healthLow: '#FF4500',
  textPrimary: '#FFFFFF',
  textSecondary: '#8B8698',
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

// Verde cheio -> amarelo -> laranja conforme a vida cai, sem texto auxiliar.
export function healthBarColor(ratio) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const from = clamped > 0.5 ? PALETTE_HEX.healthMid : PALETTE_HEX.healthLow;
  const to = clamped > 0.5 ? PALETTE_HEX.healthHigh : PALETTE_HEX.healthMid;
  const t = clamped > 0.5 ? (clamped - 0.5) * 2 : clamped * 2;
  const mix = (shift) => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * t);
  };
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}
