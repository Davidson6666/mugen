import { useEffect, useRef, useState } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { useGame } from '../context/GameContext.js';
import { useMenuInput } from '../utils/useMenuInput.js';
import { PALETTE } from '../utils/palette.js';
import characters from '../data/characters.json';
import FighterSprite from './FighterSprite.jsx';
import { Capsule, DiagonalBackdrop, Label, Pedestal, PortraitCell } from './cvs2.jsx';
import { cellAt } from '../utils/cvs2Layout.js';

// Selecao no padrao Capcom vs SNK 2 (docs/referencias-ui/cvs2/capcomvssnk2-s4.jpg):
// retratos em losango ao longo da faixa diagonal, P1 no campo laranja e P2 no
// azul, cada um com o personagem sob o cursor em pe no pedestal.

// Duas fileiras ao longo da faixa, centradas nela.
const COLUMNS = Math.ceil(characters.length / 2);
const CELLS = characters.map((_, index) => {
  const column = Math.floor(index / 2) - (COLUMNS - 1) / 2;
  return cellAt(column, (index % 2) - 0.5);
});

const DIRECTIONS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

// A grade e diagonal, entao "vizinho" e a casa mais proxima na direcao da seta
// (quem sai muito para o lado conta como mais longe).
function moveIndex(index, direction) {
  const [dirX, dirY] = DIRECTIONS[direction];
  const [x0, y0] = CELLS[index];
  let best = index;
  let bestScore = Infinity;
  CELLS.forEach(([x, y], candidate) => {
    const dx = x - x0, dy = y - y0;
    const along = dx * dirX + dy * dirY;
    if (candidate === index || along <= 0) return;
    const score = along + Math.abs(dx * dirY - dy * dirX) * 2;
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  });
  return best;
}

// Onde fica o personagem e o nome de cada lado.
const SIDES = [
  { tab: { x: 36, y: 96, align: 'start' }, status: [40, 186, 'start'], stand: [210, 470] },
  { tab: { x: 1244, y: 578, align: 'end' }, status: [1240, 566, 'end'], stand: [1070, 500] },
];

function SideInfo({ player, character, confirmed, isCpu }) {
  const { tab, status, stand } = SIDES[player];
  let statusText = confirmed ? 'PRONTO!' : 'ESCOLHENDO...';
  if (isCpu) statusText = 'SORTEADA';
  return (
    <g>
      <Pedestal x={stand[0]} y={stand[1]} />
      {isCpu && <Label x={stand[0]} y={stand[1] - 30} size={120} anchor="middle">?</Label>}
      <Capsule {...tab}>{isCpu ? '???' : character.name.toUpperCase()}</Capsule>
      <Label x={status[0]} y={status[1]} size={28} anchor={status[2]} fill={confirmed ? PALETTE.fieldYellow : PALETTE.textPrimary} stroke={6}>
        {isCpu ? 'CPU' : `${player + 1}P`} · {statusText}
      </Label>
    </g>
  );
}

export default function CharacterSelect() {
  const { go, back } = useMenu();
  const { setup, chooseCharacter } = useGame();
  const twoPlayers = setup.mode === 'versusPlayer';

  const [cursors, setCursors] = useState([0, characters.length - 1]);
  const [confirmed, setConfirmed] = useState([null, null]);
  const [warning, setWarning] = useState('');
  const warningTimer = useRef(0);

  useEffect(() => () => clearTimeout(warningTimer.current), []);

  const showWarning = (message) => {
    setWarning(message);
    clearTimeout(warningTimer.current);
    warningTimer.current = setTimeout(() => setWarning(''), 1800);
  };

  const onMove = (player, direction) => {
    if (player === 1 && !twoPlayers) return;
    if (confirmed[player]) return;
    setCursors((current) => {
      const next = [...current];
      next[player] = moveIndex(next[player], direction);
      return next;
    });
  };

  const onConfirm = (player) => {
    if (player === 1 && !twoPlayers) return;
    if (confirmed[player]) return;

    const picked = characters[cursors[player]];
    const other = confirmed[1 - player];
    // Sem partida espelhada: o segundo jogador precisa escolher outro.
    if (twoPlayers && other === picked.id) {
      showWarning('PERSONAGEM JA ESCOLHIDO PELO OUTRO JOGADOR');
      return;
    }

    const next = [...confirmed];
    next[player] = picked.id;
    setConfirmed(next);
    chooseCharacter(player, picked.id);

    const done = twoPlayers ? next[0] && next[1] : next[0];
    if (done) go('stageSelect');
  };

  const onCancel = (player) => {
    if (player === 1 && !twoPlayers) return;
    if (confirmed[player]) {
      setConfirmed((current) => {
        const next = [...current];
        next[player] = null;
        return next;
      });
      return;
    }
    if (player === 0) back();
  };

  useMenuInput({ onMove, onConfirm, onCancel, twoPlayers });

  const activePlayers = twoPlayers ? [0, 1] : [0];
  const shown = [characters[cursors[0]], characters[cursors[1]]];

  return (
    <div className="cvs2-screen">
      <svg className="cvs2-svg" viewBox="0 0 1280 720">
        <DiagonalBackdrop />

        {characters.map((character, index) => (
          <PortraitCell
            key={character.id}
            id={character.id}
            at={CELLS[index]}
            image={`${character.dir}/${character.portrait}`}
            cursors={activePlayers.filter((player) => cursors[player] === index)}
            onPointerEnter={() => {
              if (!confirmed[0]) setCursors((current) => [index, current[1]]);
            }}
            onClick={() => onConfirm(0)}
          />
        ))}

        <Label x={410} y={58} size={40} weight={800}>PLAYER SELECT</Label>

        <SideInfo player={0} character={shown[0]} confirmed={Boolean(confirmed[0])} />
        <SideInfo player={1} character={shown[1]} confirmed={Boolean(confirmed[1])} isCpu={!twoPlayers} />

        {warning && (
          <g>
            <rect x={340} y={640} width={600} height={46} rx={23} fill={PALETTE.lifeTrail} stroke={PALETTE.ink} strokeWidth={5} />
            <Label x={640} y={675} size={30} anchor="middle" stroke={6}>{warning}</Label>
          </g>
        )}
        <Label x={24} y={706} size={22} weight={600} stroke={5}>
          {twoPlayers ? 'P1 WASD + J · P2 SETAS + NUMPAD 1 · K VOLTA' : 'WASD ESCOLHE · J CONFIRMA · K VOLTA'}
        </Label>
      </svg>

      {activePlayers.map((player) => (
        <div key={player} className="cvs2-sprite" style={{ left: SIDES[player].stand[0], top: SIDES[player].stand[1] }}>
          <FighterSprite entry={shown[player]} flip={player === 1} />
        </div>
      ))}
    </div>
  );
}
