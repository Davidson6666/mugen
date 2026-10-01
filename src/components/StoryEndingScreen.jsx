import { useEffect } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { useGame } from '../context/GameContext.js';
import { useAchievements } from '../context/AchievementsContext.js';
import { useMenuInput } from '../utils/useMenuInput.js';
import { PALETTE } from '../utils/palette.js';
import characters from '../data/characters.json';
import FighterSprite from './FighterSprite.jsx';
import { Capsule, DiagonalBackdrop, Label, Pedestal } from './cvs2.jsx';

const STAND = [230, 560];

// Fim do Modo Historia: mesma linguagem visual do ResultScreen, sem
// diferenciar por personagem (nenhum deles tem um final proprio).
export default function StoryEndingScreen() {
  const { resetTo } = useMenu();
  const { setup } = useGame();
  const { report } = useAchievements();

  const winner = characters.find((entry) => entry.id === setup.characters[0]) ?? characters[0];

  // Chegar aqui e ter vencido a campanha inteira, inclusive o Ensina GOD: e o
  // que da a conquista que libera ele.
  const championCharacter = setup.characters[0];
  useEffect(() => {
    report({ mode: 'story', won: true, characterId: championCharacter, storyComplete: true });
    // So no fim da campanha, uma vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useMenuInput({ onConfirm: () => resetTo('mainMenu'), onCancel: () => resetTo('mainMenu') });

  return (
    <div className="cvs2-screen">
      <svg className="cvs2-svg" viewBox="0 0 1280 720">
        <DiagonalBackdrop lattice={false} topWord="" bottomWord="" />

        <Label x={48} y={130} size={90} fill={PALETTE.fieldYellow} stroke={16}>CAMPEAO!</Label>
        <Label x={48} y={220} size={44} weight={800} stroke={8}>MODO HISTORIA CONCLUIDO</Label>

        <Pedestal x={STAND[0]} y={STAND[1]} />

        <Capsule x={48} y={280} width={620} size={34}>
          {`${winner.name.toUpperCase()} VENCEU TODAS AS LUTAS`}
        </Capsule>

        <Label x={1240} y={700} size={22} weight={600} anchor="end" stroke={5}>J OU K VOLTA AO MENU</Label>
      </svg>

      <div className="cvs2-sprite" style={{ left: STAND[0], top: STAND[1] }}>
        <FighterSprite entry={winner} animation="victoryPose" />
      </div>
    </div>
  );
}
