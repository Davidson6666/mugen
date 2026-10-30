import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useMenu } from '../context/MenuContext.js';
import { DiagonalBackdrop, Label } from './cvs2.jsx';

// Pagina para qualquer endereco que nao existe (rota "*" em App.jsx). Enter,
// Esc ou o botao levam de volta ao menu.
export default function NotFoundScreen() {
  const { resetTo } = useMenu();
  const { pathname } = useLocation();

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === 'Enter' || event.code === 'Escape') resetTo('mainMenu');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [resetTo]);

  return (
    <div className="cvs2-screen" role="main">
      <svg className="cvs2-svg" viewBox="0 0 1280 720">
        <DiagonalBackdrop lattice={false} topWord="" bottomWord="" />
        <Label x={48} y={210} size={190} display>404</Label>
        <Label x={48} y={310} size={64} display>PÁGINA NÃO ENCONTRADA</Label>
      </svg>
      <div className="auth-card" style={{ top: 360 }}>
        <p className="auth-card__hint" style={{ margin: 0, fontSize: 20 }}>
          O endereço <strong>{pathname}</strong> não existe neste jogo.
        </p>
        <button type="button" className="auth-card__submit" onClick={() => resetTo('mainMenu')}>VOLTAR AO MENU</button>
      </div>
    </div>
  );
}
