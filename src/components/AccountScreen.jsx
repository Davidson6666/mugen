import { useEffect } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { useAuth } from '../context/AuthContext.js';
import { DiagonalBackdrop, Label } from './cvs2.jsx';
import ShowcaseFighter from './ShowcaseFighter.jsx';

// Area protegida (rota /conta): so abre com sessao ativa, quem nao esta logado
// e mandado para o login (a regra esta em App.jsx). Mostra a conta logada e
// da o logout. O e-mail nao aparece em lugar nenhum: a identificacao publica e
// o nome do ranking.
export default function AccountScreen() {
  const { back, resetTo } = useMenu();
  const { profile, logout } = useAuth();

  useEffect(() => {
    const onKeyDown = (event) => { if (event.code === 'Escape') back(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [back]);

  if (!profile) return null;
  const played = profile.wins + profile.losses;
  const rate = played ? `${Math.round((profile.wins / played) * 100)}%` : '-';

  const leave = async () => {
    await logout();
    resetTo('mainMenu');
  };

  return (
    <div className="cvs2-screen">
      <svg className="cvs2-svg" viewBox="0 0 1280 720">
        <DiagonalBackdrop lattice={false} topWord="" bottomWord="" />
        <Label x={48} y={130} size={90} display>MINHA CONTA</Label>
      </svg>
      <ShowcaseFighter x={900} y={560} />

      <section className="auth-card" aria-label="Dados da conta">
        <div className="account-card__name">
          <span className="account-card__label">NOME NO RANKING</span>
          <strong>{profile.username.toUpperCase()}</strong>
        </div>
        <dl className="account-card__stats">
          <div><dt>ELO</dt><dd>{profile.elo_rating}</dd></div>
          <div><dt>VITÓRIAS</dt><dd>{profile.wins}</dd></div>
          <div><dt>DERROTAS</dt><dd>{profile.losses}</dd></div>
          <div><dt>APROVEITAMENTO</dt><dd>{rate}</dd></div>
        </dl>
        <button type="button" className="auth-card__submit" onClick={leave}>SAIR DA CONTA</button>
        <button type="button" className="auth-card__back" onClick={back}>VOLTAR (ESC)</button>
      </section>
    </div>
  );
}
