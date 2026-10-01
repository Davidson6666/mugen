// Teclas de cada jogador, com remapeamento. Fonte unica: tanto a luta
// (InputHandler) quanto os menus (useMenuInput) leem daqui, pra quem trocar o
// soco de J para F nao precisar continuar confirmando menu no J.
//
// Os padroes abaixo sao exatamente os controles que o jogo sempre teve. Pulo e
// defesa nascem sem tecla propria de proposito: o pulo ja sai no "cima" e a
// defesa em segurar para tras, como sempre foi - sao vagas extras pra quem
// quiser.

const STORAGE_KEY = 'ruptura-arena:controls';

// Ordem em que aparecem na tela de configuracoes.
export const BINDABLE = [
  { action: 'up', label: 'CIMA' },
  { action: 'down', label: 'BAIXO / AGACHAR' },
  { action: 'left', label: 'ESQUERDA' },
  { action: 'right', label: 'DIREITA' },
  { action: 'punch', label: 'SOCO' },
  { action: 'kick', label: 'CHUTE' },
  { action: 'special', label: 'ESPECIAL' },
  { action: 'jump', label: 'PULO (OPCIONAL)' },
  { action: 'guard', label: 'DEFESA (OPCIONAL)' },
];

export const DEFAULT_CONTROLS = [
  {
    up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
    punch: 'KeyJ', kick: 'KeyK', special: 'KeyL',
    jump: null, guard: null,
  },
  {
    up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
    punch: 'Numpad1', kick: 'Numpad2', special: 'Numpad3',
    jump: null, guard: null,
  },
];

// Teclas que nunca podem ser tomadas por um comando de luta: sao a saida de
// emergencia de quem se perder no proprio remapeamento.
export const RESERVED_KEYS = ['Escape', 'Enter', 'Tab', 'F5', 'F11', 'F12'];

const clone = (controls) => controls.map((player) => ({ ...player }));

function isValid(controls) {
  if (!Array.isArray(controls) || controls.length !== 2) return false;
  return controls.every((player) => player && typeof player === 'object'
    && BINDABLE.every(({ action }) => {
      const key = player[action];
      return key === null || key === undefined || typeof key === 'string';
    }));
}

export function loadControls() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return clone(DEFAULT_CONTROLS);
    const parsed = JSON.parse(stored);
    if (!isValid(parsed)) return clone(DEFAULT_CONTROLS);
    // Preenche o que faltar com o padrao: assim um mapa salvo por uma versao
    // antiga do jogo continua valendo quando aparecem acoes novas.
    return DEFAULT_CONTROLS.map((fallback, player) => {
      const saved = parsed[player] ?? {};
      const map = {};
      for (const { action } of BINDABLE) {
        map[action] = action in saved ? saved[action] : fallback[action];
      }
      return map;
    });
  } catch {
    return clone(DEFAULT_CONTROLS);
  }
}

export function saveControls(controls) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(controls));
  } catch {
    // Sem armazenamento (janela anonima): o mapa vale so nesta sessao.
  }
}

// Troca a tecla de uma acao. Se a tecla ja pertencia a outra acao (de qualquer
// um dos dois jogadores), as duas trocam de lugar - assim nunca sobra tecla
// repetida controlando duas coisas ao mesmo tempo, e nada fica sem querer sem
// tecla nenhuma.
//
// Devolve { controls, swappedWith }, onde swappedWith descreve de quem a tecla
// foi tirada (ou null, se estava livre).
export function assignKey(controls, player, action, key) {
  const next = clone(controls);
  const previous = next[player][action] ?? null;

  let swappedWith = null;
  for (const side of [0, 1]) {
    for (const { action: other } of BINDABLE) {
      if (side === player && other === action) continue;
      if (next[side][other] !== key) continue;
      next[side][other] = previous;
      swappedWith = { player: side, action: other };
    }
  }

  next[player][action] = key;
  return { controls: next, swappedWith };
}

export function resetControls() {
  return clone(DEFAULT_CONTROLS);
}

// Nome curto da tecla pra mostrar na tela. O code do teclado e em ingles e
// cheio de prefixo ("KeyA", "Numpad1"), que nao serve pra ler.
const KEY_LABELS = {
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  Space: 'ESPACO', ShiftLeft: 'SHIFT ESQ', ShiftRight: 'SHIFT DIR',
  ControlLeft: 'CTRL ESQ', ControlRight: 'CTRL DIR',
  AltLeft: 'ALT ESQ', AltRight: 'ALT DIR',
  Backspace: 'BACKSPACE', CapsLock: 'CAPS', ContextMenu: 'MENU',
  Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']',
  Backslash: '\\', Semicolon: ';', Quote: "'", Backquote: '`',
  Comma: ',', Period: '.', Slash: '/',
  NumpadAdd: 'NUM +', NumpadSubtract: 'NUM -', NumpadMultiply: 'NUM *',
  NumpadDivide: 'NUM /', NumpadDecimal: 'NUM .', NumpadEnter: 'NUM ENTER',
};

export function keyLabel(key) {
  if (!key) return '—';
  if (KEY_LABELS[key]) return KEY_LABELS[key];
  if (key.startsWith('Key')) return key.slice(3);
  if (key.startsWith('Digit')) return key.slice(5);
  if (key.startsWith('Numpad')) return `NUM ${key.slice(6)}`;
  return key.toUpperCase();
}

// O mapa que esta valendo agora. Fica em memoria pra luta e menu lerem sem
// bater no armazenamento a cada tecla; a tela de configuracoes troca por aqui.
let current = null;

export function currentControls() {
  if (!current) current = loadControls();
  return current;
}

export function setControls(controls) {
  current = clone(controls);
  saveControls(current);
  return current;
}
