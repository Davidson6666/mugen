import { useEffect, useState } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { useAuth } from '../context/AuthContext.js';
import { DiagonalBackdrop, Label } from './cvs2.jsx';
import ShowcaseFighter from './ShowcaseFighter.jsx';

// Login/cadastro: e a unica tela com campo de texto de verdade (as outras
// sao tudo navegacao por seta/botao), entao aqui e um formulario HTML normal
// por cima do cenario cvs2, sem useMenuInput (senao digitar "s" ou "j" ia
// mexer em menu por baixo) - so o Esc e ouvido a parte, ele nao atrapalha
// digitar e e o mesmo que fecha formulario em qualquer site.
// Por que o login esta sendo pedido, quando ele foi pedido no meio de outro
// fluxo (o destino guardado em afterLogin).
const CONTEXT = {
  characterSelect: 'Versus Player e local (o jogador 2 entra sem conta), mas o jogador 1 precisa estar logado.',
  matchmaking: 'Partida online vale ranking, entao so da pra entrar na fila com uma conta.',
};

export default function LoginScreen() {
  const { back, resetTo, afterLogin, setAfterLogin } = useMenu();
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const action = mode === 'login' ? login : register;
    const result = await action(username, password);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    // Sem destino marcado (veio direto do "FAZER LOGIN"), volta pro menu
    // principal - so o VERSUS PLAYER pede um destino especifico (afterLogin).
    resetTo(afterLogin ?? 'mainMenu');
    setAfterLogin(null);
  };

  useEffect(() => {
    const onKeyDown = (event) => { if (event.code === 'Escape') back(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [back]);

  return (
    <div className="cvs2-screen">
      <svg className="cvs2-svg" viewBox="0 0 1280 720">
        <DiagonalBackdrop lattice={false} topWord="" bottomWord="" />
        <Label x={48} y={130} size={90}>ENTRE NA SUA CONTA</Label>
      </svg>
      <ShowcaseFighter x={900} y={560} />

      {CONTEXT[afterLogin] && <p className="auth-card__context">{CONTEXT[afterLogin]}</p>}

      <form className="auth-card" onSubmit={submit}>
        <div className="auth-card__tabs">
          <button
            type="button"
            className={`auth-card__tab${mode === 'login' ? ' auth-card__tab--active' : ''}`}
            onClick={() => { setMode('login'); setError(null); }}
          >
            ENTRAR
          </button>
          <button
            type="button"
            className={`auth-card__tab${mode === 'signup' ? ' auth-card__tab--active' : ''}`}
            onClick={() => { setMode('signup'); setError(null); }}
          >
            CRIAR CONTA
          </button>
        </div>

        <label className="auth-card__field">
          USUARIO
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            maxLength={20}
            required
          />
        </label>
        <label className="auth-card__field">
          SENHA
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={6}
            required
          />
        </label>

        {mode === 'signup' && (
          <p className="auth-card__hint">3-20 letras minusculas, numeros ou "_". Senha com 6+ caracteres.</p>
        )}
        {error && <p className="auth-card__error">{error}</p>}

        <button type="submit" className="auth-card__submit" disabled={busy}>
          {busy ? 'UM MOMENTO...' : mode === 'login' ? 'ENTRAR' : 'CRIAR CONTA'}
        </button>
        <button type="button" className="auth-card__back" onClick={back}>
          VOLTAR (ESC)
        </button>
      </form>
    </div>
  );
}
