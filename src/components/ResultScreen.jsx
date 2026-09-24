import { useState } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { useGame } from '../context/GameContext.js';
import { useMenuInput } from '../utils/useMenuInput.js';
import { PALETTE } from '../utils/palette.js';
import characters from '../data/characters.json';
import FighterSprite from './FighterSprite.jsx';
import { Capsule, DiagonalBackdrop, Label, MenuOption, Pedestal } from './cvs2.jsx';

const OPTIONS = [
  { id: 'rematch', label: 'REVANCHE' },
  { id: 'menu', label: 'MENU PRINCIPAL' },
];

const optionPosition = (index) => {
  const y = 470 + index * 72;
  return [1212 - y - 16, y];
};

const STAND = [230, 560];

export default function ResultScreen() {
  const { resetTo } = useMenu();
  const { setup, result } = useGame();
  const [index, setIndex] = useState(0);

  const winnerIndex = result?.winner ?? 0;
  const winner = characters.find((entry) => entry.id === setup.characters[winnerIndex]) ?? characters[0];
  const winnerLabel = winnerIndex === 1 && setup.mode === 'versusCpu' ? 'CPU' : `${winnerIndex + 1}P`;

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
    <div className="cvs2-screen">
      <svg className="cvs2-svg" viewBox="0 0 1280 720">
        <DiagonalBackdrop lattice={false} topWord="" bottomWord="" />

        <Label x={48} y={96} size={52} fill={winnerIndex === 0 ? PALETTE.cursorP1 : PALETTE.cursorP2}>
          {winnerLabel} VENCE
        </Label>
        <Label x={40} y={224} size={140} stroke={16}>{winner.name.toUpperCase()}</Label>
        <Label x={48} y={300} size={56} fill={PALETTE.fieldYellow} stroke={10}>WINS!</Label>

        <Pedestal x={STAND[0]} y={STAND[1]} />

        {result && (
          <Capsule x={1240} y={96} width={300} size={52} align="end">
            {`${result.wins[0]} — ${result.wins[1]}`}
          </Capsule>
        )}

        {OPTIONS.map((option, position) => {
          const [x, y] = optionPosition(position);
          return (
            <MenuOption
              key={option.id}
              x={x} y={y}
              label={option.label}
              active={position === index}
              onPointerEnter={() => setIndex(position)}
              onClick={onConfirm}
            />
          );
        })}
      </svg>

      <div className="cvs2-sprite" style={{ left: STAND[0], top: STAND[1] }}>
        <FighterSprite entry={winner} animation="victoryPose" />
      </div>
    </div>
  );
}
