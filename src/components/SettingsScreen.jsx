import { useEffect, useState } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { loadVolume, saveVolume } from '../systems/AudioManager.js';
import { loadMusicVolume, saveMusicVolume, refreshSoundtrackVolume } from '../systems/Soundtrack.js';
import { useMenuInput } from '../utils/useMenuInput.js';
import { PALETTE } from '../utils/palette.js';
import { Capsule, DiagonalBackdrop, KeyHints, Label, Shape } from './cvs2.jsx';
import { useGamepads } from '../utils/useGamepads.js';
import { padLabel } from '../utils/gamepad.js';
import {
  BINDABLE,
  RESERVED_KEYS,
  assignKey,
  currentControls,
  keyLabel,
  resetControls,
  setControls,
} from '../utils/controls.js';

// A tabela tem as acoes remapeaveis, depois o volume e o botao de voltar ao
// padrao. O gamepad continua com os botoes fixos: o que se troca aqui e
// teclado.
const ROWS = [
  ...BINDABLE.map((entry) => ({ type: 'bind', ...entry })),
  { type: 'volume', label: 'VOLUME' },
  { type: 'music', label: 'MUSICA' },
  { type: 'reset', label: 'RESTAURAR PADRAO' },
];

const COLUMNS = [
  { key: 'action', title: 'ACAO', x: 90 },
  { key: 'p1', title: 'PLAYER 1', x: 520 },
  { key: 'p2', title: 'PLAYER 2', x: 760 },
  { key: 'pad', title: 'GAMEPAD', x: 990 },
];

// O direcional nao e um botao numerado do controle, entao nao tem rotulo
// proprio na lista de botoes.
const DIRECTIONS = ['up', 'down', 'left', 'right'];

const ROW_TOP = 162;
const ROW_STEP = 38;

// Linha da tabela: barra preta inclinada como as opcoes de menu.
const rowShape = (y) => [[70, y], [1230, y], [1212, y + 34], [52, y + 34]];

export default function SettingsScreen() {
  const { back } = useMenu();
  const pads = useGamepads();
  const family = (pads[0] ?? pads[1])?.family ?? 'xbox';

  const [controls, setLocalControls] = useState(() => currentControls());
  const [row, setRow] = useState(0);
  const [player, setPlayer] = useState(0);
  // Enquanto espera a tecla nova, o menu inteiro fica desligado: senao a
  // propria tecla apertada navegaria a tela antes de ser gravada.
  const [capturing, setCapturing] = useState(false);
  const [notice, setNotice] = useState('');

  const [volume, setVolume] = useState(() => Math.round(loadVolume() * 10));
  const [musicVolume, setMusicVolume] = useState(() => Math.round(loadMusicVolume() * 10));
  const changeVolume = (step) => {
    setVolume((current) => {
      const next = Math.min(10, Math.max(0, current + step));
      saveVolume(next / 10);
      refreshSoundtrackVolume();
      return next;
    });
  };

  const apply = (next) => {
    setLocalControls(setControls(next));
  };

  // Captura da tecla nova, fora do menu: qualquer tecla serve, menos as que
  // sao a saida de emergencia (Esc cancela a captura).
  useEffect(() => {
    if (!capturing) return undefined;
    const onKeyDown = (event) => {
      event.preventDefault();
      setCapturing(false);
      if (event.code === 'Escape') return;
      if (RESERVED_KEYS.includes(event.code)) {
        setNotice(`${keyLabel(event.code)} E RESERVADA E NAO PODE SER USADA`);
        return;
      }
      const { action } = ROWS[row];
      const { controls: next, swappedWith } = assignKey(controls, player, action, event.code);
      apply(next);
      setNotice(swappedWith
        ? `${keyLabel(event.code)} ERA DO ${swappedWith.player + 1}P: AS DUAS TROCARAM DE LUGAR`
        : '');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [capturing, controls, player, row]);

  const onMove = (_player, direction) => {
    setNotice('');
    if (direction === 'up' || direction === 'down') {
      setRow((current) => (current + (direction === 'up' ? -1 : 1) + ROWS.length) % ROWS.length);
      return;
    }
    if (ROWS[row].type === 'music') {
      const next = Math.min(10, Math.max(0, musicVolume + (direction === 'left' ? -1 : 1)));
      setMusicVolume(next);
      saveMusicVolume(next / 10);
      return;
    }
    if (ROWS[row].type === 'volume') {
      changeVolume(direction === 'left' ? -1 : 1);
      return;
    }
    if (ROWS[row].type === 'bind') setPlayer(direction === 'left' ? 0 : 1);
  };

  const onConfirm = () => {
    setNotice('');
    if (ROWS[row].type === 'bind') {
      setCapturing(true);
      return;
    }
    if (ROWS[row].type === 'reset') {
      apply(resetControls());
      setNotice('CONTROLES DE VOLTA AO PADRAO');
    }
  };

  useMenuInput({ onMove, onConfirm, onCancel: back }, !capturing);

  const cellText = (entry, side) => {
    if (entry.type === 'bind') return keyLabel(controls[side][entry.action]);
    if (entry.type === 'volume' && side === 0) {
      return `◀  ${'■'.repeat(volume)}${'□'.repeat(10 - volume)}  ${volume * 10}%  ▶`;
    }
    if (entry.type === 'music' && side === 0) {
      return `◀  ${'■'.repeat(musicVolume)}${'□'.repeat(10 - musicVolume)}  ${musicVolume * 10}%  ▶`;
    }
    return '';
  };

  return (
    <div className="cvs2-screen">
      <svg className="cvs2-svg" viewBox="0 0 1280 720">
        <DiagonalBackdrop lattice={false} topWord="" bottomWord="" />
        <Label display x={48} y={100} size={64}>CONFIGURACOES</Label>

        {COLUMNS.map((column) => (
          <Capsule key={column.key} x={column.x - 20} y={120} width={column.key === 'action' ? 300 : 200} size={26}>
            {column.title}
          </Capsule>
        ))}

        {ROWS.map((entry, index) => {
          const y = ROW_TOP + index * ROW_STEP;
          const active = index === row;
          return (
            <g key={entry.action ?? entry.type}>
              <Shape points={rowShape(y)} fill={active ? PALETTE.fieldYellow : PALETTE.ink} />
              <Label
                x={90} y={y + 26} size={22} weight={800}
                fill={active ? PALETTE.ink : PALETTE.fieldYellow} stroke={0}
              >
                {entry.label}
              </Label>

              {entry.type !== 'reset' && [0, 1].map((side) => {
                const selected = active && entry.type === 'bind' && side === player;
                const text = cellText(entry, side);
                if (!text) return null;
                return (
                  <Label
                    key={side}
                    x={COLUMNS[side + 1].x} y={y + 26} size={22} weight={800}
                    fill={active ? PALETTE.ink : PALETTE.textPrimary} stroke={0}
                  >
                    {selected && capturing ? 'APERTE A TECLA...' : selected ? `▸ ${text}` : text}
                  </Label>
                );
              })}

              {entry.type === 'bind' && (
                <Label
                  x={COLUMNS[3].x} y={y + 26} size={22} weight={800}
                  fill={active ? PALETTE.ink : PALETTE.textPrimary} stroke={0}
                >
                  {DIRECTIONS.includes(entry.action) ? 'D-PAD / ANALOGICO' : padLabel(entry.action, family)}
                </Label>
              )}
            </g>
          );
        })}

        <Label x={640} y={650} size={24} weight={800} anchor="middle" fill={PALETTE.fieldYellow} stroke={6}>
          {notice}
        </Label>
        <Label x={640} y={678} size={20} weight={600} anchor="middle" stroke={5}>
          DASH: TOQUE DUPLO NA DIRECAO · DEFESA: SEGURAR PARA TRAS · PAUSA: ESC
        </Label>
        <KeyHints
          x={1240} y={708} align="end"
          items={capturing
            ? [{ keys: 'TECLA', text: 'NOVA' }, { keys: 'ESC', text: 'CANCELA' }]
            : [{ keys: 'W/S', text: 'ESCOLHE' }, { keys: 'A/D', text: 'JOGADOR' }, { keys: 'J', text: 'REMAPEIA' }, { keys: 'K', text: 'VOLTA' }]}
        />
      </svg>
    </div>
  );
}
