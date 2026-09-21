import GameCanvas from './components/GameCanvas.jsx';
import './App.css';

const CONTROLS = [
  { player: 'P1', movement: 'W A S D', attacks: 'J soco · K chute · L especial' },
  { player: 'P2', movement: 'Setas', attacks: 'Num1 soco · Num2 chute · Num3 especial' },
];

export default function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">MUGEN FIGHTER</h1>
        <p className="app__subtitle">Fase 1 · prova de conceito do motor</p>
      </header>

      <GameCanvas />

      <footer className="app__controls">
        {CONTROLS.map(({ player, movement, attacks }) => (
          <p key={player}>
            <span className={`app__tag app__tag--${player.toLowerCase()}`}>{player}</span>
            {movement} · {attacks}
          </p>
        ))}
      </footer>
    </div>
  );
}
