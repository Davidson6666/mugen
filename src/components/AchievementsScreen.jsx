import { useMenu } from '../context/MenuContext.js';
import { useAchievements } from '../context/AchievementsContext.js';
import { useMenuInput } from '../utils/useMenuInput.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { PALETTE } from '../utils/palette.js';
import { Capsule, DiagonalBackdrop, KeyHints, Label, Shape } from './cvs2.jsx';
import { diamond } from '../utils/hudGeometry.js';
import { toPoints } from '../utils/cvs2Layout.js';

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
          <g>
            <Capsule x={960} y={62} width={280} size={28}>
              {`${earned.length} DE ${ACHIEVEMENTS.length}`}
            </Capsule>
            <rect x={960} y={120} width={280} height={10} rx={5} fill={PALETTE.ink} stroke={PALETTE.textPrimary} strokeWidth={2} />
            <rect
              className="vs-bar" x={962} y={122} width={Math.max(0, 276 * (earned.length / ACHIEVEMENTS.length))} height={6} rx={3}
              fill={PALETTE.fieldYellow} style={{ animationDuration: '900ms' }}
            />
          </g>
        ) : (
          <Capsule x={760} y={62} width={480} size={24}>
            ENTRE NA SUA CONTA PARA GANHAR CONQUISTAS
          </Capsule>
        )}

        {ACHIEVEMENTS.map((achievement, index) => {
          const y = ROW_TOP + index * ROW_STEP;
          const got = earned.includes(achievement.id);
          return (
            <g key={achievement.id} className="menu-opt" style={{ '--order': index }}>
              <Shape points={rowShape(y)} fill={got ? PALETTE.fieldYellow : PALETTE.ink} />
              <polygon points={toPoints(diamond([92, y + ROW_HEIGHT / 2], 17))} fill={got ? PALETTE.ink : PALETTE.cellEmpty} />
              {got ? (
                <polyline points={`${84},${y + 22} ${90},${y + 28} ${101},${y + 15}`} fill="none" stroke={PALETTE.fieldYellow} strokeWidth={4} />
              ) : (
                <g>
                  <rect x={86} y={y + 21} width={12} height={9} rx={2} fill={PALETTE.textSecondary} />
                  <path d={`M 88.5 ${y + 21} v -3 a 3.5 3.5 0 0 1 7 0 v 3`} fill="none" stroke={PALETTE.textSecondary} strokeWidth={2} />
                </g>
              )}
              <Label
                x={128} y={y + 22} size={25} weight={900}
                fill={got ? PALETTE.ink : PALETTE.textSecondary} stroke={0}
              >
                {got ? achievement.name : '? ? ?'}
              </Label>
              <Label
                x={128} y={y + 39} size={17} weight={700}
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

        <KeyHints x={1240} y={702} align="end" items={[{ keys: 'K/ESC', text: 'VOLTA' }]} />
      </svg>
    </div>
  );
}
