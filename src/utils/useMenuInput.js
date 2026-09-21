import { useEffect, useRef } from 'react';

// Navegacao de menu por teclado e gamepad, com os mesmos controles da luta.
// A leitura aqui e por evento (e nao por frame como na arena) porque menu
// reage a toque de tecla, nao a tecla segurada.

const KEY_BINDINGS = {
  KeyW: [0, 'move', 'up'],
  KeyS: [0, 'move', 'down'],
  KeyA: [0, 'move', 'left'],
  KeyD: [0, 'move', 'right'],
  KeyJ: [0, 'confirm'],
  KeyK: [0, 'cancel'],
  Enter: [0, 'confirm'],
  Space: [0, 'confirm'],
  Escape: [0, 'cancel'],
  ArrowUp: [1, 'move', 'up'],
  ArrowDown: [1, 'move', 'down'],
  ArrowLeft: [1, 'move', 'left'],
  ArrowRight: [1, 'move', 'right'],
  Numpad1: [1, 'confirm'],
  Numpad2: [1, 'cancel'],
};

const GAMEPAD_DIRECTIONS = [
  [12, 'up'],
  [13, 'down'],
  [14, 'left'],
  [15, 'right'],
];
const STICK_DEADZONE = 0.5;
// Ritmo de repeticao quando a direcao fica segurada no controle.
const FIRST_REPEAT_MS = 380;
const NEXT_REPEAT_MS = 130;

export function useMenuInput(handlers, enabled = true) {
  const handlersRef = useRef(handlers);

  // Atualizar a ref em efeito, e nao durante o render, mantem os listeners
  // sempre com os handlers da ultima renderizacao sem ler ref no render.
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return undefined;

    const emit = (type, player, direction) => {
      const handler = handlersRef.current[type === 'move' ? 'onMove' : `on${type[0].toUpperCase()}${type.slice(1)}`];
      handler?.(player, direction);
    };

    const onKeyDown = (event) => {
      const binding = KEY_BINDINGS[event.code];
      if (!binding) return;
      // Player 2 so navega quando a tela pede dois cursores.
      if (binding[0] === 1 && !handlersRef.current.twoPlayers) return;
      event.preventDefault();
      emit(binding[1], binding[0], binding[2]);
    };

    window.addEventListener('keydown', onKeyDown);

    const held = new Map();
    let frame = 0;

    const pollGamepads = () => {
      frame = requestAnimationFrame(pollGamepads);
      if (!navigator.getGamepads) return;

      const pads = navigator.getGamepads();
      const players = handlersRef.current.twoPlayers ? 2 : 1;
      const now = performance.now();

      for (let player = 0; player < players; player += 1) {
        const pad = pads[player];
        if (!pad) continue;

        const [axisX = 0, axisY = 0] = pad.axes;
        const directions = new Set();
        for (const [button, direction] of GAMEPAD_DIRECTIONS) {
          if (pad.buttons[button]?.pressed) directions.add(direction);
        }
        if (axisX < -STICK_DEADZONE) directions.add('left');
        if (axisX > STICK_DEADZONE) directions.add('right');
        if (axisY < -STICK_DEADZONE) directions.add('up');
        if (axisY > STICK_DEADZONE) directions.add('down');

        for (const direction of ['up', 'down', 'left', 'right']) {
          const key = `${player}:${direction}`;
          if (!directions.has(direction)) {
            held.delete(key);
            continue;
          }
          const state = held.get(key);
          if (!state) {
            held.set(key, { next: now + FIRST_REPEAT_MS });
            emit('move', player, direction);
          } else if (now >= state.next) {
            state.next = now + NEXT_REPEAT_MS;
            emit('move', player, direction);
          }
        }

        for (const [button, type] of [[0, 'confirm'], [1, 'cancel']]) {
          const key = `${player}:btn${button}`;
          if (!pad.buttons[button]?.pressed) {
            held.delete(key);
            continue;
          }
          if (held.has(key)) continue;
          held.set(key, {});
          emit(type, player);
        }
      }
    };

    frame = requestAnimationFrame(pollGamepads);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      cancelAnimationFrame(frame);
    };
  }, [enabled]);
}
