import { useState } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { loadVolume, saveVolume } from '../systems/AudioManager.js';
import { useMenuInput } from '../utils/useMenuInput.js';
import { PALETTE } from '../utils/palette.js';
import { Capsule, DiagonalBackdrop, Label, Shape } from './cvs2.jsx';
import { useGamepads } from '../utils/useGamepads.js';
import { padLabel } from '../utils/gamepad.js';

const CONTROLS = [
  { action: 'MOVER / AGACHAR', p1: 'W A S D', p2: 'SETAS', pad: 'D-PAD / ANALÓGICO' },
  { action: 'SOCO', p1: 'J', p2: 'NUMPAD 1', button: 'punch' },
  { action: 'CHUTE', p1: 'K', p2: 'NUMPAD 2', button: 'kick' },
  { action: 'ESPECIAL', p1: 'L', p2: 'NUMPAD 3', button: 'special' },
  { action: 'PULO / PULO DUPLO', p1: 'W / W NO AR', p2: '↑ / ↑ NO AR', button:'jump' },
  { action: 'DASH / RECUO', p1: '→→ / ←←', p2:'→→ / ←←', pad:'→→ / ←←' },
  { action: 'DEFESA (SEGURAR)', p1:'TRÁS',p2:'TRÁS',button:'guard' },
  { action: 'LISTA DE GOLPES',p1:'PELA PAUSA',p2:'PELA PAUSA',button:'moves' },
  { action: 'PAUSA', p1: 'ESC OU SHIFT', p2: 'ESC OU SHIFT', button: 'pause' },
];

const COLUMNS = [
  { key: 'action', title: 'ACAO', x: 90 },
  { key: 'p1', title: 'PLAYER 1', x: 520 },
  { key: 'p2', title: 'PLAYER 2', x: 760 },
  { key: 'pad', title: 'GAMEPAD', x: 990 },
];

const ROW_TOP = 175;
const ROW_STEP = 46;

// Linha da tabela: barra preta inclinada como as opcoes de menu.
const rowShape = (y) => [[70, y], [1230, y], [1212, y + 37], [52, y + 37]];

export default function SettingsScreen() {
  const { back } = useMenu();
  const pads=useGamepads();
  const family=(pads[0]??pads[1])?.family??'xbox';
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
                  key={column.key} x={column.x} y={y + 28} size={24} weight={800}
                  fill={column.key === 'action' ? PALETTE.fieldYellow : PALETTE.textPrimary} stroke={0}
                >
                  {column.key==='pad' ? row.button ? padLabel(row.button,family) : row.buttons ? row.buttons.map(b=>padLabel(b,family)).join(' / ') : row.pad : row[column.key]}
                </Label>
              ))}
            </g>
          );
        })}

        <g>
          <Shape points={rowShape(ROW_TOP + CONTROLS.length * ROW_STEP)} fill={PALETTE.ink} />
          <Label x={90} y={ROW_TOP + CONTROLS.length * ROW_STEP + 28} size={24} weight={800} fill={PALETTE.fieldYellow} stroke={0}>
            VOLUME
          </Label>
          <Label x={520} y={ROW_TOP + CONTROLS.length * ROW_STEP + 28} size={24} weight={800} stroke={0}>
            {`◀  ${'■'.repeat(volume)}${'□'.repeat(10 - volume)}  ${volume * 10}%  ▶`}
          </Label>
        </g>
        <Label x={640} y={657} size={22} weight={600} anchor="middle" stroke={5}>
          {pads.some(Boolean)?`${family==='playstation'?'PLAYSTATION':'XBOX / PADRÃO'} CONECTADO · GOLPES PELOS COMBOS DA LISTA`:'CONECTE O CONTROLE E APERTE UM BOTÃO PARA ATIVÁ-LO'}
        </Label>
        <Label x={1240} y={700} size={22} weight={600} anchor="end" stroke={5}>
          {pads.some(Boolean)?`← / → AJUSTA O VOLUME · ${padLabel('jump',family)} OU ${padLabel('kick',family)} VOLTA`:'A / D AJUSTA O VOLUME · J OU K VOLTA'}
        </Label>
      </svg>
    </div>
  );
}
