import { useState } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { useGame } from '../context/GameContext.js';
import { useMenuInput } from '../utils/useMenuInput.js';

const OPTIONS = [
  { id: 'versusCpu', label: 'VERSUS CPU', hint: 'Enfrente a maquina em uma partida avulsa' },
  { id: 'versusPlayer', label: 'VERSUS PLAYER', hint: 'Dois jogadores no mesmo teclado' },
  { id: 'story', label: 'MODO HISTORIA', hint: 'Em breve', disabled: true },
  { id: 'settings', label: 'CONFIGURACOES', hint: 'Controles e ajustes' },
];

export default function MainMenu() {
  const { go } = useMenu();
  const { startSetup } = useGame();
  const [index, setIndex] = useState(0);

  const move = (_player, direction) => {
    if (direction === 'up') setIndex((current) => (current - 1 + OPTIONS.length) % OPTIONS.length);
    if (direction === 'down') setIndex((current) => (current + 1) % OPTIONS.length);
  };

  const confirm = () => {
    const option = OPTIONS[index];
    if (option.disabled) return;
    if (option.id === 'settings') {
      go('settings');
      return;
    }
    startSetup(option.id);
    go('characterSelect');
  };

  useMenuInput({ onMove: move, onConfirm: confirm });

  return (
    <div className="screen screen--menu">
      <header className="title-block">
        <h1 className="title-block__title">
          <span>MUGEN</span>
          <span className="title-block__title--small">FIGHTER</span>
        </h1>
        <p className="title-block__subtitle blink">PRESS START</p>
      </header>

      <ul className="menu-list">
        {OPTIONS.map((option, position) => (
          <li key={option.id}>
            <button
              type="button"
              className={[
                'menu-list__item',
                position === index ? 'is-active' : '',
                option.disabled ? 'is-disabled' : '',
              ].join(' ')}
              onMouseEnter={() => setIndex(position)}
              onClick={confirm}
              disabled={option.disabled}
            >
              <span className="menu-list__marker">{position === index ? '>' : ''}</span>
              {option.label}
            </button>
          </li>
        ))}
      </ul>

      <p className="screen__hint">{OPTIONS[index].hint}</p>

      <footer className="cabinet">
        <span>W/S NAVEGA · J CONFIRMA</span>
        <span className="cabinet__credit">CREDIT 99</span>
      </footer>
    </div>
  );
}
