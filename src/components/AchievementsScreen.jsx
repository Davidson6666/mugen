import { useMenu } from '../context/MenuContext.js';
import { useAchievements } from '../context/AchievementsContext.js';
import { useMenuInput } from '../utils/useMenuInput.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { PALETTE } from '../utils/palette.js';
import { Capsule, DiagonalBackdrop, Label, Shape } from './cvs2.jsx';

const ROW_TOP = 190;
const ROW_STEP = 72;

// Barra inclinada de cada conquista, no mesmo desenho das opcoes de menu.
const rowShape = (y) => [[70, y], [1230, y], [1212, y + 62], [52, y + 62]];

export default function AchievementsScreen() {
  const { back } = useMenu();
  const { earned, loggedIn } = useAchievements();
  useMenuInput({ onCancel: back, onConfirm: back });

  return (
    <div className="cvs2-screen">
      <svg className="cvs2-svg" viewBox="0 0 1280 720">
        <DiagonalBackdrop lattice={false} topWord="" bottomWord="" />
        <Label x={48} y={104} size={64}>MINHAS CONQUISTAS</Label>

        {loggedIn ? (
          <Capsule x={940} y={62} width={300} size={32}>
            {`${earned.length} DE ${ACHIEVEMENTS.length}`}
          </Capsule>
        ) : (
          <Label x={48} y={152} size={28} weight={800} fill={PALETTE.lifeTrail} stroke={6}>
            ENTRE NA SUA CONTA PARA GANHAR E GUARDAR CONQUISTAS
          </Label>
        )}

        {ACHIEVEMENTS.map((achievement, index) => {
          const y = ROW_TOP + index * ROW_STEP;
          const got = earned.includes(achievement.id);
          return (
            <g key={achievement.id}>
              <Shape points={rowShape(y)} fill={got ? PALETTE.fieldYellow : PALETTE.ink} />
              <Label
                x={92} y={y + 30} size={30} weight={900}
                fill={got ? PALETTE.ink : PALETTE.textSecondary} stroke={0}
              >
                {got ? achievement.name : '? ? ?'}
              </Label>
              <Label
                x={92} y={y + 54} size={20} weight={700}
                fill={got ? PALETTE.ink : PALETTE.textSecondary} stroke={0}
              >
                {achievement.description}
              </Label>
              {achievement.unlocks && (
                <Label
                  x={1200} y={y + 40} size={20} weight={900} anchor="end"
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
