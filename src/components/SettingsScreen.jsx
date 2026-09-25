import { useState } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { loadVolume, saveVolume } from '../systems/AudioManager.js';
import { useMenuInput } from '../utils/useMenuInput.js';
import { PALETTE } from '../utils/palette.js';
import { Capsule, DiagonalBackdrop, Label, Shape } from './cvs2.jsx';

const CONTROLS = [
  { action: 'MOVER / PULAR / AGACHAR', p1: 'W A S D', p2: 'SETAS', pad: 'D-PAD OU ANALOGICO' },
  { action: 'SOCO', p1: 'J', p2: 'NUMPAD 1', pad: 'A' },
  { action: 'CHUTE', p1: 'K', p2: 'NUMPAD 2', pad: 'B' },
  { action: 'ESPECIAL', p1: 'L', p2: 'NUMPAD 3', pad: 'X' },
  { action: 'PAUSA', p1: 'ESC OU SHIFT', p2: 'ESC OU SHIFT', pad: 'START' },
];

const COLUMNS = [
  { key: 'action', title: 'ACAO', x: 90 },
  { key: 'p1', title: 'PLAYER 1', x: 520 },
  { key: 'p2', title: 'PLAYER 2', x: 760 },
  { key: 'pad', title: 'GAMEPAD', x: 990 },
];

const ROW_TOP = 196;
const ROW_STEP = 76;

// Linha da tabela: barra preta inclinada como as opcoes de menu.
const rowShape = (y) => [[70, y], [1230, y], [1212, y + 58], [52, y + 58]];

export default function SettingsScreen() {
  const { back } = useMenu();
  // Volume em passos de 10%, ajustado com A / D (ou as setas do P2).
  const [volume, setVolume] = useState(() => Math.round(loadVolume() * 10));
  const changeVolume = (step) => {
    setVolume((current) => {
      const next = Math.min(10, Math.max(0, current + step));
      saveVolume(next / 10);
      return next;
    });
  };
  useMenuInput({
    onCancel: back,
    onConfirm: back,
    onMove: (player, direction) => {
      if (direction === 'left') changeVolume(-1);
      if (direction === 'right') changeVolume(1);
    },
  });

  return (
    <div className="cvs2-screen">
      <svg className="cvs2-svg" viewBox="0 0 1280 720">
        <DiagonalBackdrop lattice={false} topWord="" bottomWord="" />
        <Label x={48} y={100} size={72}>CONFIGURACOES</Label>

        {COLUMNS.map((column) => (
          <Capsule key={column.key} x={column.x - 20} y={128} width={column.key === 'action' ? 300 : 200} size={30}>
            {column.title}
          </Capsule>
        ))}

        {CONTROLS.map((row, index) => {
          const y = ROW_TOP + index * ROW_STEP;
          return (
            <g key={row.action}>
              <Shape points={rowShape(y)} fill={PALETTE.ink} />
              {COLUMNS.map((column) => (
                <Label
                  key={column.key} x={column.x} y={y + 42} size={30} weight={800}
                  fill={column.key === 'action' ? PALETTE.fieldYellow : PALETTE.textPrimary} stroke={0}
                >
                  {row[column.key]}
                </Label>
              ))}
            </g>
          );
        })}

        <g>
          <Shape points={rowShape(ROW_TOP + CONTROLS.length * ROW_STEP)} fill={PALETTE.ink} />
          <Label x={90} y={ROW_TOP + CONTROLS.length * ROW_STEP + 42} size={30} weight={800} fill={PALETTE.fieldYellow} stroke={0}>
            VOLUME
          </Label>
          <Label x={520} y={ROW_TOP + CONTROLS.length * ROW_STEP + 42} size={30} weight={800} stroke={0}>
            {`◀  ${'■'.repeat(volume)}${'□'.repeat(10 - volume)}  ${volume * 10}%  ▶`}
          </Label>
        </g>
        <Label x={1240} y={700} size={22} weight={600} anchor="end" stroke={5}>A / D AJUSTA O VOLUME · J OU K VOLTA</Label>
      </svg>
    </div>
  );
}
