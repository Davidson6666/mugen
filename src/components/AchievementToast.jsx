import { useAchievements } from '../context/AchievementsContext.js';
import { achievementById } from '../data/achievements.js';

// Aviso de conquista nova, no canto da tela. Fica por cima de qualquer tela,
// inclusive da luta, porque a conquista costuma cair logo depois do fim dela.
export default function AchievementToast() {
  const { toasts, dismiss } = useAchievements();
  if (toasts.length === 0) return null;

  return (
    <div className="achievement-toasts">
      {toasts.map((id) => {
        const achievement = achievementById(id);
        if (!achievement) return null;
        return (
          <button
            key={id}
            type="button"
            className="achievement-toast"
            // Fora da navegacao por teclado: as teclas aqui sao do jogo.
            tabIndex={-1}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => dismiss(id)}
          >
            <span className="achievement-toast__tag">CONQUISTA DESBLOQUEADA</span>
            <span className="achievement-toast__name">{achievement.name}</span>
            <span className="achievement-toast__desc">{achievement.description}</span>
            {achievement.unlocks && (
              <span className="achievement-toast__unlock">PERSONAGEM LIBERADO</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
