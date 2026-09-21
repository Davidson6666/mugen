import { useState } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { useGame } from '../context/GameContext.js';
import { useMenuInput } from '../utils/useMenuInput.js';
import characters from '../data/characters.json';
import maps from '../data/maps.json';

const COLUMNS = 3;
const DIFFICULTIES = [
  { id: 'easy', label: 'FACIL' },
  { id: 'normal', label: 'NORMAL' },
  { id: 'hard', label: 'DIFICIL' },
];

function moveIndex(index, direction) {
  const rows = Math.ceil(maps.length / COLUMNS);
  const row = Math.floor(index / COLUMNS);
  const column = index % COLUMNS;

  if (direction === 'left') return row * COLUMNS + (column - 1 + COLUMNS) % COLUMNS;
  if (direction === 'right') return row * COLUMNS + (column + 1) % COLUMNS;

  const nextRow = direction === 'up' ? (row - 1 + rows) % rows : (row + 1) % rows;
  return Math.min(nextRow * COLUMNS + column, maps.length - 1);
}

export default function StageSelect() {
  const { go, back } = useMenu();
  const { setup, chooseMap, chooseCharacter, chooseDifficulty } = useGame();
  const twoPlayers = setup.mode === 'versusPlayer';

  const [cursors, setCursors] = useState([0, maps.length - 1]);
  const [votes, setVotes] = useState([null, null]);
  const [section, setSection] = useState('maps');
  const [difficultyIndex, setDifficultyIndex] = useState(
    Math.max(0, DIFFICULTIES.findIndex((entry) => entry.id === setup.difficulty)),
  );

  function startMatch(mapId) {
    chooseMap(mapId);
    if (!twoPlayers) {
      chooseDifficulty(DIFFICULTIES[difficultyIndex].id);
      // O oponente da CPU sai no sorteio: contra a maquina espelho e permitido.
      const opponent = characters[Math.floor(Math.random() * characters.length)];
      chooseCharacter(1, opponent.id);
    }
    go('versus');
  }

  const onMove = (player, direction) => {
    if (player === 1 && !twoPlayers) return;

    if (!twoPlayers && section === 'difficulty') {
      if (direction === 'up') {
        setSection('maps');
        return;
      }
      if (direction === 'left') {
        setDifficultyIndex((current) => (current - 1 + DIFFICULTIES.length) % DIFFICULTIES.length);
      }
      if (direction === 'right') {
        setDifficultyIndex((current) => (current + 1) % DIFFICULTIES.length);
      }
      return;
    }

    if (votes[player]) return;

    const lastRow = Math.floor((maps.length - 1) / COLUMNS);
    const onLastRow = Math.floor(cursors[player] / COLUMNS) === lastRow;
    if (!twoPlayers && direction === 'down' && onLastRow) {
      setSection('difficulty');
      return;
    }

    setCursors((current) => {
      const next = [...current];
      next[player] = moveIndex(next[player], direction);
      return next;
    });
  };

  const onConfirm = (player) => {
    if (player === 1 && !twoPlayers) return;

    if (!twoPlayers) {
      startMatch(maps[cursors[0]].id);
      return;
    }

    if (votes[player]) return;
    const next = [...votes];
    next[player] = maps[cursors[player]].id;
    setVotes(next);
    if (!next[0] || !next[1]) return;

    // Votos iguais valem direto; votos diferentes sorteiam entre os dois
    // escolhidos, nunca entre todos os mapas.
    const chosen = next[0] === next[1] ? next[0] : next[Math.floor(Math.random() * 2)];
    startMatch(chosen);
  };

  const onCancel = (player) => {
    if (player === 1 && !twoPlayers) return;
    if (twoPlayers && votes[player]) {
      setVotes((current) => {
        const next = [...current];
        next[player] = null;
        return next;
      });
      return;
    }
    if (!twoPlayers && section === 'difficulty') {
      setSection('maps');
      return;
    }
    if (player === 0) back();
  };

  useMenuInput({ onMove, onConfirm, onCancel, twoPlayers });

  const activePlayers = twoPlayers ? [0, 1] : [0];

  return (
    <div className="screen screen--select">
      <h2 className="screen__title">{twoPlayers ? 'VOTEM O CENARIO' : 'ESCOLHA O CENARIO'}</h2>

      <div className="stage-grid">
        {maps.map((stage, index) => {
          const owners = activePlayers.filter((player) => cursors[player] === index);
          const votedBy = activePlayers.filter((player) => votes[player] === stage.id);
          return (
            <button
              type="button"
              key={stage.id}
              className={[
                'stage',
                section === 'maps' && owners.includes(0) ? 'is-cursor-p1' : '',
                owners.includes(1) ? 'is-cursor-p2' : '',
              ].join(' ')}
              onMouseEnter={() => {
                setSection('maps');
                setCursors((current) => [index, current[1]]);
              }}
              onClick={() => onConfirm(0)}
            >
              <img src={`${stage.dir}/${stage.background}`} alt={stage.name} />
              <span className="stage__name">{stage.name}</span>
              {votedBy.length > 0 && (
                <span className="stage__votes">
                  {votedBy.map((player) => `P${player + 1}`).join(' + ')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!twoPlayers && (
        <div className={`difficulty ${section === 'difficulty' ? 'is-active' : ''}`}>
          <span className="difficulty__label">DIFICULDADE DA CPU</span>
          <div className="difficulty__options">
            {DIFFICULTIES.map((entry, index) => (
              <button
                type="button"
                key={entry.id}
                className={`difficulty__option ${index === difficultyIndex ? 'is-selected' : ''}`}
                onMouseEnter={() => {
                  setSection('difficulty');
                  setDifficultyIndex(index);
                }}
                onClick={() => startMatch(maps[cursors[0]].id)}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="screen__footer">
        {twoPlayers
          ? 'Cada jogador vota um cenario · votos diferentes sorteiam entre os dois'
          : 'WASD navega · J confirma · K volta'}
      </p>
    </div>
  );
}
