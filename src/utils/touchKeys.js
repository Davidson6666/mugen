// Botoes na tela (celular/tablet): cada um dispara a mesma tecla que o jogador
// 1 usaria no teclado, lida do mapa de controles atual. Assim a simulacao, o
// online e as teclas remapeadas nao precisam saber que existe toque.
import { currentControls } from './controls.js';

export const TOUCH_ACTIONS = ['left', 'right', 'up', 'down', 'punch', 'kick', 'special'];

// Teclas que nao sao do mapa de controles.
const PAUSE_CODE = 'Escape';

// create(type, code) devolve o evento; target recebe dispatchEvent. Parametros
// para dar para testar sem navegador.
export function pressAction(action, down, {
  target = globalThis.window,
  controls = currentControls(),
  create = (type, code) => new KeyboardEvent(type, { code, bubbles: true, cancelable: true }),
} = {}) {
  const code = action === 'pause' ? PAUSE_CODE : controls[0]?.[action];
  if (!code) return false;
  target.dispatchEvent(create(down ? 'keydown' : 'keyup', code));
  return true;
}

// Mostra os botoes so em tela de toque (ou com ?touch na URL, para testar).
export function wantsTouchControls(win = globalThis.window) {
  if (!win) return false;
  if (new URLSearchParams(win.location?.search ?? '').has('touch')) return true;
  return Boolean(win.matchMedia?.('(pointer: coarse)').matches);
}
