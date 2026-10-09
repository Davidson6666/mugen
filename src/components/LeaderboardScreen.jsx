import { useEffect, useState } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useMenuInput } from '../utils/useMenuInput.js';
import { fetchLeaderboard } from '../utils/auth.js';
import { DiagonalBackdrop, Label } from './cvs2.jsx';
import ShowcaseFighter from './ShowcaseFighter.jsx';

// Classificacao publica por Elo. Sem partida online ainda (Fase 2+), entao
// por enquanto todo mundo comeca e fica em 1200 - a tela ja existe pra
// confirmar que conta/perfil estao funcionando de ponta a ponta.
export default function LeaderboardScreen() {
  const { back, resetTo, go, setAfterLogin } = useMenu();
  const { profile, logout } = useAuth();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard().then((result) => {
      if (cancelled) return;
      if (result.error) setError(result.error);
      setRows(result.rows);
    });
    return () => { cancelled = true; };
  }, []);

  const handleLogout = async () => {
    await logout();
    resetTo('mainMenu');
  };

  // K/Esc volta, como em toda tela do jogo (sem input de texto aqui, entao
  // pode usar o mesmo navegador de menu das outras).
  useMenuInput({ onCancel: back });

  return (
    <div className="cvs2-screen">
      <svg className="cvs2-svg" viewBox="0 0 1280 720">
        <DiagonalBackdrop lattice={false} topWord="" bottomWord="" />
        <Label x={48} y={130} size={90}>RANKING ONLINE</Label>
        <Label x={1240} y={700} size={22} weight={600} anchor="end" stroke={5}>K OU ESC VOLTA</Label>
      </svg>
      <ShowcaseFighter x={980} y={540} />

      <div className="leaderboard-card">
        <div className="leaderboard-card__header">
          <span>#</span>
          <span>JOGADOR</span>
          <span>ELO</span>
          <span>V</span>
          <span>D</span>
          <span>%</span>
        </div>
        <div className="leaderboard-card__rows">
          {rows === null && !error && <p className="leaderboard-card__status">Carregando...</p>}
          {error && <p className="leaderboard-card__status leaderboard-card__status--error">{error}</p>}
          {rows?.length === 0 && <p className="leaderboard-card__status">Ninguem no ranking ainda.</p>}
          {rows?.map((row, index) => {
            const played = row.wins + row.losses;
            return (
              <div
                key={row.username} style={{ '--order': index }}
                className={`leaderboard-card__row${row.username === profile?.username ? ' leaderboard-card__row--self' : ''}`}
              >
                <span className={`lb-rank${index < 3 ? ` lb-rank--${index + 1}` : ''}`}>{index + 1}</span>
                <span>{row.username}</span>
                <span>{row.elo_rating}</span>
                <span>{row.wins}</span>
                <span>{row.losses}</span>
                <span className="lb-rate">{played ? `${Math.round((row.wins / played) * 100)}%` : '-'}</span>
              </div>
            );
          })}
        </div>

        <div className="leaderboard-card__footer">
          {profile ? (
            <>
              <span className="leaderboard-card__me">LOGADO COMO {profile.username.toUpperCase()}</span>
              <button type="button" className="auth-card__back" onClick={handleLogout}>SAIR</button>
            </>
          ) : (
            <button type="button" className="auth-card__submit" onClick={() => { setAfterLogin(null); go('login'); }}>FAZER LOGIN</button>
          )}
          <button type="button" className="auth-card__back" onClick={back}>VOLTAR</button>
        </div>
      </div>
    </div>
  );
}
