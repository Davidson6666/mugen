import { useMenu } from '../context/MenuContext.js';
import { useAchievements } from '../context/AchievementsContext.js';
import { useMenuInput } from '../utils/useMenuInput.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { PALETTE } from '../utils/palette.js';
import { Capsule, DiagonalBackdrop, Label, Shape } from './cvs2.jsx';

// Dez conquistas tem que caber entre o titulo e a linha de dica, entao a
// barra e mais baixa do que a dos outros menus.
const ROW_TOP = 158;
const ROW_STEP = 50;
const ROW_HEIGHT = 44;

// Barra inclinada de cada conquista, no mesmo desenho das opcoes de menu.
const rowShape = (y) => [[70, y], [1230, y], [1212, y + ROW_HEIGHT], [52, y + ROW_HEIGHT]];

export default function AchievementsScreen() {
  const { back } = useMenu();
  const { earned, loggedIn } = useAchievements();
  useMenuInput({ onCancel: back, onConfirm: back });

  return (
    <div className="cvs2-screen">
      <svg className="cvs2-svg" viewBox="0 0 1280 720">
        <DiagonalBackdrop lattice={false} topWord="" bottomWord="" />
        <Label x={48} y={100} size={52}>MINHAS CONQUISTAS</Label>

        {loggedIn ? (
          <Capsule x={960} y={62} width={280} size={28}>
            {`${earned.length} DE ${ACHIEVEMENTS.length}`}
          </Capsule>
        ) : (
          <Capsule x={760} y={62} width={480} size={24}>
            ENTRE NA SUA CONTA PARA GANHAR CONQUISTAS
          </Capsule>
        )}

        {ACHIEVEMENTS.map((achievement, index) => {
          const y = ROW_TOP + index * ROW_STEP;
          const got = earned.includes(achievement.id);
          return (
            <g key={achievement.id}>
              <Shape points={rowShape(y)} fill={got ? PALETTE.fieldYellow : PALETTE.ink} />
              <Label
                x={92} y={y + 22} size={25} weight={900}
                fill={got ? PALETTE.ink : PALETTE.textSecondary} stroke={0}
              >
                {got ? achievement.name : '? ? ?'}
              </Label>
              <Label
                x={92} y={y + 39} size={17} weight={700}
                fill={got ? PALETTE.ink : PALETTE.textSecondary} stroke={0}
              >
                {achievement.description}
              </Label>
              {achievement.unlocks && (
                <Label
                  x={1200} y={y + 30} size={17} weight={900} anchor="end"
                  fill={got ? PALETTE.ink : PALETTE.textSecondary} stroke={0}
                >
                  {got ? 'PERSONAGEM LIBERADO' : 'LIBERA UM PERSONAGEM'}
                </Label>
              )}
            </g>
          );
        })}

        <Label x={1240} y={700} size={22} weight={600} anchor="end" stroke={5}>K OU ESC VOLTA</Label>
      </svg>
    </div>
  );
}
