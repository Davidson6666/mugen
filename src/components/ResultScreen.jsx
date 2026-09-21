import { useState } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { useGame } from '../context/GameContext.js';
import { useMenuInput } from '../utils/useMenuInput.js';
import characters from '../data/characters.json';

const OPTIONS = [
  { id: 'rematch', label: 'REVANCHE' },
  { id: 'menu', label: 'MENU PRINCIPAL' },
];

export default function ResultScreen() {
  const { resetTo } = useMenu();
  const { setup, result } = useGame();
  const [index, setIndex] = useState(0);

  const winnerName = characters.find(
    (entry) => entry.id === setup.characters[result?.winner ?? 0],
  )?.name;
  const winnerLabel = result?.winner === 1 && setup.mode === 'versusCpu'
    ? 'CPU'
    : `PLAYER ${(result?.winner ?? 0) + 1}`;

  const onMove = (_player, direction) => {
    if (direction === 'up' || direction === 'down') {
      setIndex((current) => (current + (direction === 'up' ? -1 : 1) + OPTIONS.length)
        % OPTIONS.length);
    }
  };

  const onConfirm = () => {
    resetTo(OPTIONS[index].id === 'rematch' ? 'versus' : 'mainMenu');
  };

  useMenuInput({ onMove, onConfirm });

  return (
    <div className="screen screen--result">
      <p className="result__label">{winnerLabel} VENCE</p>
      <h2 className="result__name">{winnerName}</h2>
      <p className="result__score">
        {result ? `${result.wins[0]} — ${result.wins[1]}` : ''}
      </p>

      <ul className="menu-list">
        {OPTIONS.map((option, position) => (
          <li key={option.id}>
            <button
              type="button"
              className={`menu-list__item ${position === index ? 'is-active' : ''}`}
              onMouseEnter={() => setIndex(position)}
              onClick={onConfirm}
            >
              <span className="menu-list__marker">{position === index ? '>' : ''}</span>
              {option.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
