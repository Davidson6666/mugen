import { useEffect, useRef, useState } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { useGame } from '../context/GameContext.js';
import { useMenuInput } from '../utils/useMenuInput.js';
import characters from '../data/characters.json';

const COLUMNS = 3;

function moveIndex(index, direction) {
  const rows = Math.ceil(characters.length / COLUMNS);
  const row = Math.floor(index / COLUMNS);
  const column = index % COLUMNS;

  if (direction === 'left') return row * COLUMNS + (column - 1 + COLUMNS) % COLUMNS;
  if (direction === 'right') return row * COLUMNS + (column + 1) % COLUMNS;

  const nextRow = direction === 'up' ? (row - 1 + rows) % rows : (row + 1) % rows;
  // A ultima fileira pode estar incompleta: cai no ultimo retrato existente.
  return Math.min(nextRow * COLUMNS + column, characters.length - 1);
}

function FighterPanel({ player, character, confirmed }) {
  return (
    <aside className={`fighter-preview fighter-preview--p${player + 1}`}>
      <img
        className="fighter-preview__art"
        src={`${character.dir}/${character.portrait}`}
        alt=""
      />
      <p className="fighter-preview__tag">P{player + 1}</p>
      <p className="fighter-preview__name">{character.name}</p>
      <p className="fighter-preview__status">{confirmed ? 'PRONTO' : 'escolhendo...'}</p>
    </aside>
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
      showWarning('Personagem ja selecionado pelo outro jogador');
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

  return (
    <div className="screen screen--select">
      <h2 className="screen__title">ESCOLHA SEU LUTADOR</h2>

      <div className="select-layout">
        <FighterPanel
          player={0}
          character={characters[cursors[0]]}
          confirmed={Boolean(confirmed[0])}
        />

        <div className="portrait-grid">
          {characters.map((character, index) => {
            const owners = activePlayers.filter((player) => cursors[player] === index);
            const takenBy = activePlayers.find((player) => confirmed[player] === character.id);
            return (
              <button
                type="button"
                key={character.id}
                className={[
                  'portrait',
                  owners.includes(0) ? 'is-cursor-p1' : '',
                  owners.includes(1) ? 'is-cursor-p2' : '',
                  takenBy !== undefined ? 'is-taken' : '',
                ].join(' ')}
                onMouseEnter={() => {
                  if (!confirmed[0]) setCursors((current) => [index, current[1]]);
                }}
                onClick={() => onConfirm(0)}
              >
                <img src={`${character.dir}/${character.portrait}`} alt={character.name} />
                <span className="portrait__name">{character.name}</span>
                {takenBy !== undefined && <span className="portrait__lock">P{takenBy + 1}</span>}
              </button>
            );
          })}
        </div>

        {twoPlayers ? (
          <FighterPanel
            player={1}
            character={characters[cursors[1]]}
            confirmed={Boolean(confirmed[1])}
          />
        ) : (
          <aside className="fighter-preview fighter-preview--p2">
            <div className="fighter-preview__art fighter-preview__art--unknown">?</div>
            <p className="fighter-preview__tag">CPU</p>
            <p className="fighter-preview__name">???</p>
            <p className="fighter-preview__status">sorteado</p>
          </aside>
        )}
      </div>

      <p className={`screen__warning ${warning ? 'is-visible' : ''}`}>{warning}</p>
      <p className="screen__footer">
        {twoPlayers
          ? 'P1 WASD + J · P2 setas + Numpad1 · K volta'
          : 'WASD navega · J confirma · K volta'}
      </p>
    </div>
  );
}
