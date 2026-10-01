import { useEffect, useRef } from 'react';
import { connectedGamepads } from './gamepad.js';
import { MenuInputGate } from './MenuInputGate.js';
import { currentControls } from './controls.js';

// Navegacao de menu por teclado e gamepad, com os mesmos controles da luta.
// A leitura aqui e por evento (e nao por frame como na arena) porque menu
// reage a toque de tecla, nao a tecla segurada.

// Teclas que valem em menu sempre, mesmo que o jogador remapeie tudo: sao a
// saida de emergencia de quem se perder no proprio mapa.
const FIXED_BINDINGS = {
  Enter: [0, 'confirm'],
  Space: [0, 'confirm'],
  Escape: [0, 'cancel'],
};

// Menu usa o mesmo controle da luta: as direcoes navegam, o soco confirma e o
// chute volta. Montado na hora porque o jogador pode ter acabado de trocar uma
// tecla na tela de configuracoes.
function keyBindings() {
  const bindings = { ...FIXED_BINDINGS };
  currentControls().forEach((map, player) => {
    for (const direction of ['up', 'down', 'left', 'right']) {
      if (map[direction]) bindings[map[direction]] = [player, 'move', direction];
    }
    if (map.punch) bindings[map.punch] = [player, 'confirm'];
    if (map.kick) bindings[map.kick] = [player, 'cancel'];
  });
  return bindings;
}

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
      if (event.repeat) return;
      const binding = keyBindings()[event.code];
      if (!binding) return;
      // Player 2 so navega quando a tela pede dois cursores.
      if (binding[0] === 1 && !handlersRef.current.twoPlayers) return;
      event.preventDefault();
      emit(binding[1], binding[0], binding[2]);
    };

    window.addEventListener('keydown', onKeyDown);

    const held = new Map();
    const devices = new Map();
    const gate = new MenuInputGate();
    let frame = 0;

    const pollGamepads = () => {
      frame = requestAnimationFrame(pollGamepads);
      if (!navigator.getGamepads) return;

      const pads = connectedGamepads();
      const players = handlersRef.current.twoPlayers ? 2 : 1;
      const now = performance.now();

      for (let player = 0; player < players; player += 1) {
        const pad = pads[player];
        const identity=pad?`${pad.index}:${pad.id}`:null;
        if(devices.get(player)!==identity) {
          for(const key of held.keys())if(key.startsWith(`${player}:`))held.delete(key);
          devices.set(player,identity);
        }
        if (!gate.ready(player, pad)) continue;

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
