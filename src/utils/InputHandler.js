// Leitura de teclado + gamepad para os dois jogadores. O mapeamento e fixo,
// conforme a especificacao, e o estado e amostrado uma vez por frame (poll) para
// que a logica de jogo enxergue o mesmo input do inicio ao fim do tick.

export const ACTIONS = ['up', 'down', 'left', 'right', 'punch', 'kick', 'special'];

const KEYBOARD_MAPS = [
  {
    up: 'KeyW',
    left: 'KeyA',
    down: 'KeyS',
    right: 'KeyD',
    punch: 'KeyJ',
    kick: 'KeyK',
    special: 'KeyL',
  },
  {
    up: 'ArrowUp',
    left: 'ArrowLeft',
    down: 'ArrowDown',
    right: 'ArrowRight',
    punch: 'Numpad1',
    kick: 'Numpad2',
    special: 'Numpad3',
  },
];

const PAUSE_KEYS = ['Escape', 'ShiftLeft', 'ShiftRight'];

// Mapeamento padrao (XInput): 0=A, 1=B, 2=X, 9=Start, 12..15=d-pad.
const GAMEPAD_BUTTONS = { punch: 0, kick: 1, special: 2, up: 12, down: 13, left: 14, right: 15 };
const GAMEPAD_PAUSE_BUTTON = 9;
const STICK_DEADZONE = 0.35;

function blankState() {
  const state = {};
  for (const action of ACTIONS) state[action] = false;
  return state;
}

export class InputHandler {
  constructor() {
    this.keys = new Set();
    this.current = [blankState(), blankState()];
    this.previous = [blankState(), blankState()];
    this.pause = false;
    this.previousPause = false;
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
  }

  attach(target = window) {
    this.target = target;
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
  }

  detach() {
    if (!this.target) return;
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target = null;
    this.keys.clear();
  }

  onKeyDown(event) {
    // As setas e o espaco rolariam a pagina no meio da luta.
    if (event.code.startsWith('Arrow') || event.code === 'Space') event.preventDefault();
    this.keys.add(event.code);
  }

  onKeyUp(event) {
    this.keys.delete(event.code);
  }

  readPlayer(player) {
    const state = blankState();
    const map = KEYBOARD_MAPS[player];
    for (const action of ACTIONS) {
      if (this.keys.has(map[action])) state[action] = true;
    }

    const pad = typeof navigator !== 'undefined' && navigator.getGamepads
      ? navigator.getGamepads()[player]
      : null;
    if (pad) {
      for (const action of ACTIONS) {
        if (pad.buttons[GAMEPAD_BUTTONS[action]]?.pressed) state[action] = true;
      }
      const [axisX = 0, axisY = 0] = pad.axes;
      if (axisX < -STICK_DEADZONE) state.left = true;
      if (axisX > STICK_DEADZONE) state.right = true;
      if (axisY < -STICK_DEADZONE) state.up = true;
      if (axisY > STICK_DEADZONE) state.down = true;
    }
    return state;
  }

  readPause() {
    if (PAUSE_KEYS.some((code) => this.keys.has(code))) return true;
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return false;
    for (const pad of navigator.getGamepads()) {
      if (pad?.buttons[GAMEPAD_PAUSE_BUTTON]?.pressed) return true;
    }
    return false;
  }

  poll() {
    this.previous = this.current;
    this.current = [this.readPlayer(0), this.readPlayer(1)];
    this.previousPause = this.pause;
    this.pause = this.readPause();
  }

  state(player) {
    return this.current[player];
  }

  pressed(player, action) {
    return this.current[player][action] && !this.previous[player][action];
  }

  pausePressed() {
    return this.pause && !this.previousPause;
  }
}
