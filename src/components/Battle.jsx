import { useCallback, useEffect, useState } from 'react';
import GameCanvas from './GameCanvas.jsx';
import { useMenu } from '../context/MenuContext.js';
import { useGame } from '../context/GameContext.js';
import { useMenuInput } from '../utils/useMenuInput.js';

const PAUSE_KEYS = ['Escape', 'ShiftLeft', 'ShiftRight'];
const PAUSE_OPTIONS = [
  { id: 'resume', label: 'CONTINUAR' },
  { id: 'quit', label: 'SAIR PARA O MENU' },
];

export default function Battle() {
  const { resetTo } = useMenu();
  const { setup, finishMatch } = useGame();
  const [paused, setPaused] = useState(false);
  const [pauseIndex, setPauseIndex] = useState(0);

  // ESC e Shift sao compartilhados: no Versus Player qualquer um dos dois
  // jogadores pausa com a mesma tecla.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (!PAUSE_KEYS.includes(event.code)) return;
      event.preventDefault();
      setPaused((current) => !current);
      setPauseIndex(0);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const onMove = (_player, direction) => {
    if (direction === 'up' || direction === 'down') {
      setPauseIndex((current) => (current + (direction === 'up' ? -1 : 1) + PAUSE_OPTIONS.length)
        % PAUSE_OPTIONS.length);
    }
  };

  const onConfirm = () => {
    if (PAUSE_OPTIONS[pauseIndex].id === 'resume') setPaused(false);
    else resetTo('mainMenu');
  };

  // Sem onCancel de proposito: ESC ja e tratado pelo listener de pausa acima, e
  // os dois juntos alternariam a pausa duas vezes no mesmo toque.
  useMenuInput({ onMove, onConfirm }, paused);

  const handleMatchEnd = useCallback((result) => {
    finishMatch(result);
    resetTo('result');
  }, [finishMatch, resetTo]);

  return (
    <div className="screen screen--battle">
      <GameCanvas setup={setup} paused={paused} onMatchEnd={handleMatchEnd} />

      {paused && (
        <div className="pause">
          <div className="pause__panel">
            <h2 className="pause__title">PAUSA</h2>
            <ul className="menu-list">
              {PAUSE_OPTIONS.map((option, index) => (
                <li key={option.id}>
                  <button
                    type="button"
                    className={`menu-list__item ${index === pauseIndex ? 'is-active' : ''}`}
                    onMouseEnter={() => setPauseIndex(index)}
                    onClick={onConfirm}
                  >
                    <span className="menu-list__marker">{index === pauseIndex ? '>' : ''}</span>
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
            <p className="screen__footer">ESC ou Shift retoma</p>
          </div>
        </div>
      )}
    </div>
  );
}
