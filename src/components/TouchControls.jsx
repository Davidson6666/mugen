import { useEffect, useRef } from 'react';
import { pressAction } from '../utils/touchKeys.js';

// Botoes na tela para jogar no celular. Cada botao segura a tecla enquanto o
// dedo esta nele (varios dedos ao mesmo tempo funcionam: um botao por vez de
// cada dedo) e solta ao levantar, sair ou o toque ser cancelado.
const PAD = [
  { action: 'up', label: '▲', area: 'up' },
  { action: 'left', label: '◀', area: 'left' },
  { action: 'right', label: '▶', area: 'right' },
  { action: 'down', label: '▼', area: 'down' },
];
const BUTTONS = [
  { action: 'punch', label: 'SOCO' },
  { action: 'kick', label: 'CHUTE' },
  { action: 'special', label: 'ESP' },
];

function HoldButton({ action, label, className, onHold }) {
  const down = useRef(false);
  const release = () => {
    if (!down.current) return;
    down.current = false;
    onHold(action, false);
  };
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        if (down.current) return;
        down.current = true;
        onHold(action, true);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(event) => event.preventDefault()}
    >
      {label}
    </button>
  );
}

export default function TouchControls({ hidden = false }) {
  // Se a tela sair no meio de um aperto, solta tudo: tecla presa travaria a luta.
  useEffect(() => () => {
    for (const action of ['left', 'right', 'up', 'down', 'punch', 'kick', 'special']) pressAction(action, false);
  }, []);
  if (hidden) return null;
  return (
    <div className="touch-controls">
      <button
        type="button"
        className="touch-controls__pause"
        aria-label="Pausa"
        onPointerDown={(event) => { event.preventDefault(); pressAction('pause', true); }}
        onPointerUp={() => pressAction('pause', false)}
      >
        ❚❚
      </button>
      <div className="touch-controls__pad">
        {PAD.map((button) => (
          <HoldButton key={button.action} {...button} className={`touch-btn touch-btn--${button.area}`} onHold={pressAction} />
        ))}
      </div>
      <div className="touch-controls__actions">
        {BUTTONS.map((button) => (
          <HoldButton key={button.action} {...button} className="touch-btn touch-btn--action" onHold={pressAction} />
        ))}
      </div>
    </div>
  );
}
