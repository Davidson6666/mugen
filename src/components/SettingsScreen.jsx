import { useMenu } from '../context/MenuContext.js';
import { useMenuInput } from '../utils/useMenuInput.js';

const CONTROLS = [
  { action: 'Mover / pular / agachar', p1: 'W A S D', p2: 'Setas', pad: 'D-pad ou analogico' },
  { action: 'Soco', p1: 'J', p2: 'Numpad 1', pad: 'A' },
  { action: 'Chute', p1: 'K', p2: 'Numpad 2', pad: 'B' },
  { action: 'Especial', p1: 'L', p2: 'Numpad 3', pad: 'X' },
  { action: 'Pausa', p1: 'ESC ou Shift', p2: 'ESC ou Shift', pad: 'Start' },
];

export default function SettingsScreen() {
  const { back } = useMenu();
  useMenuInput({ onCancel: back, onConfirm: back });

  return (
    <div className="screen screen--settings">
      <h2 className="screen__title">CONFIGURACOES</h2>

      <table className="controls">
        <thead>
          <tr>
            <th>Acao</th>
            <th>Player 1</th>
            <th>Player 2</th>
            <th>Gamepad</th>
          </tr>
        </thead>
        <tbody>
          {CONTROLS.map((row) => (
            <tr key={row.action}>
              <td>{row.action}</td>
              <td>{row.p1}</td>
              <td>{row.p2}</td>
              <td>{row.pad}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="screen__hint">
        Volume e remapeamento de teclas entram junto com o sistema de audio.
      </p>
      <p className="screen__footer">J ou K volta</p>
    </div>
  );
}
