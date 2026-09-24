import { useState } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { useGame } from '../context/GameContext.js';
import { useMenuInput } from '../utils/useMenuInput.js';
import { PALETTE } from '../utils/palette.js';
import characters from '../data/characters.json';
import FighterSprite from './FighterSprite.jsx';
import { DiagonalBackdrop, Label, MenuOption, Pedestal } from './cvs2.jsx';

const OPTIONS = [
  { id: 'versusCpu', label: 'VERSUS CPU', hint: 'ENFRENTE A MAQUINA EM UMA PARTIDA AVULSA' },
  { id: 'versusPlayer', label: 'VERSUS PLAYER', hint: 'DOIS JOGADORES NO MESMO TECLADO' },
  { id: 'story', label: 'MODO HISTORIA', hint: 'EM BREVE', disabled: true },
  { id: 'settings', label: 'CONFIGURACOES', hint: 'CONTROLES E AJUSTES' },
];

// As opcoes descem acompanhando a borda da faixa diagonal, no campo azul.
const optionPosition = (index) => {
  const y = 330 + index * 72;
  return [1212 - y - 16, y];
};

// Quem aparece no menu: os personagens com arte propria, em tamanho nativo.
const MENU_FIGHTERS = ['itachi']
  .map((id) => characters.find((entry) => entry.id === id))
  .filter(Boolean);

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
    <div className="cvs2-screen">
      <svg className="cvs2-svg" viewBox="0 0 1280 720">
        <DiagonalBackdrop lattice={false} topWord="" bottomWord="" />

        <Label x={48} y={150} size={150} stroke={18}>MUGEN</Label>
        <Label x={96} y={260} size={120} fill={PALETTE.fieldYellow} stroke={16}>FIGHTER</Label>

        <Pedestal x={180} y={470} halfWidth={150} />

        {OPTIONS.map((option, position) => {
          const [x, y] = optionPosition(position);
          return (
            <MenuOption
              key={option.id}
              x={x} y={y}
              label={option.label}
              active={position === index}
              disabled={option.disabled}
              onPointerEnter={() => setIndex(position)}
              onClick={confirm}
            />
          );
        })}

        <Label x={1240} y={660} size={26} weight={800} anchor="end" stroke={6}>{OPTIONS[index].hint}</Label>
        <Label x={1240} y={700} size={22} weight={600} anchor="end" stroke={5}>W/S NAVEGA · J CONFIRMA</Label>
      </svg>

      {MENU_FIGHTERS.map((fighter, position) => (
        <div key={fighter.id} className="cvs2-sprite" style={{ left: 125 + position * 110, top: 470 }}>
          <FighterSprite entry={fighter} flip={position === 1} />
        </div>
      ))}
    </div>
  );
}
