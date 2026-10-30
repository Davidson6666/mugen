import { useEffect, useState } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { useAuth } from '../context/AuthContext.js';
import { loginSchema, registerSchema, validate } from '../utils/validation.js';
import { DiagonalBackdrop, Label } from './cvs2.jsx';
import ShowcaseFighter from './ShowcaseFighter.jsx';

// Login e cadastro: sao as duas telas com campo de texto de verdade (as outras
// sao tudo navegacao por seta/botao), entao aqui e um formulario HTML normal
// por cima do cenario cvs2, sem useMenuInput (senao digitar "s" ou "j" ia
// mexer em menu por baixo) - so o Esc e ouvido a parte, ele nao atrapalha
// digitar e e o mesmo que fecha formulario em qualquer site.
//
// Os campos sao controlados e a validacao e do Zod (src/utils/validation.js):
// cada campo mostra a propria mensagem embaixo, antes de qualquer envio.
// mode: 'login' (rota /login) ou 'register' (rota /cadastro).

// Por que o login esta sendo pedido, quando ele foi pedido no meio de outro
// fluxo (o destino guardado em afterLogin).
const CONTEXT = {
  characterSelect: 'Versus Player e local (o jogador 2 entra sem conta), mas o jogador 1 precisa estar logado.',
  matchmaking: 'Partida online vale ranking, entao so da pra entrar na fila com uma conta.',
  account: 'A página da conta só abre para quem está logado.',
};

const EMPTY = { identifier: '', email: '', displayName: '', password: '', confirmPassword: '' };

function Field({ name, label, type = 'text', value, error, onChange, autoComplete, maxLength }) {
  const errorId = `erro-${name}`;
  return (
    <label className={`auth-card__field${error ? ' auth-card__field--invalid' : ''}`}>
      {label}
      <input
        type={type}
        name={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && <span className="auth-card__fielderror" id={errorId} role="alert">{error}</span>}
    </label>
  );
}

export default function LoginScreen({ mode = 'login' }) {
  const { back, resetTo, afterLogin, setAfterLogin } = useMenu();
  const { login, register } = useAuth();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const signup = mode === 'register';

  const change = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
    // Quem corrige o campo nao fica olhando o erro antigo.
    setErrors((current) => (current[name] ? { ...current, [name]: undefined } : current));
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError(null);
    setNotice(null);
    const checked = signup
      ? validate(registerSchema, values)
      : validate(loginSchema, { identifier: values.identifier, password: values.password });
    setErrors(checked.errors ?? {});
    if (checked.errors) return;

    setBusy(true);
    const result = signup ? await register(checked.data) : await login(checked.data.identifier, checked.data.password);
    setBusy(false);
    if (result.fieldErrors) {
      setErrors(result.fieldErrors);
      return;
    }
    if (result.error) {
      setFormError(result.error);
      return;
    }
    if (result.pending) {
      setNotice(result.pending);
      return;
    }
    // Sem destino marcado (veio direto do "FAZER LOGIN"), volta pro menu
    // principal - so o VERSUS PLAYER e a conta pedem um destino especifico.
    resetTo(afterLogin ?? 'mainMenu');
    setAfterLogin(null);
  };

  // Troca de aba = troca de rota (/login e /cadastro), sem empilhar historico.
  const switchTo = (screen) => {
    setErrors({});
    setFormError(null);
    setNotice(null);
    resetTo(screen);
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
        <Label x={48} y={130} size={90} display>{signup ? 'CRIE SUA CONTA' : 'ENTRE NA SUA CONTA'}</Label>
      </svg>
      <ShowcaseFighter x={signup ? 1000 : 900} y={560} />

      {CONTEXT[afterLogin] && <p className="auth-card__context">{CONTEXT[afterLogin]}</p>}

      <form className={`auth-card${signup ? ' auth-card--wide' : ''}`} onSubmit={submit} noValidate>
        <div className="auth-card__tabs">
          <button
            type="button"
            className={`auth-card__tab${!signup ? ' auth-card__tab--active' : ''}`}
            onClick={() => switchTo('login')}
          >
            ENTRAR
          </button>
          <button
            type="button"
            className={`auth-card__tab${signup ? ' auth-card__tab--active' : ''}`}
            onClick={() => switchTo('register')}
          >
            CRIAR CONTA
          </button>
        </div>

        {signup ? (
          <div className="auth-card__grid">
            <Field name="email" label="E-MAIL" type="email" value={values.email} error={errors.email} onChange={change} autoComplete="email" />
            <Field name="displayName" label="NOME NO RANKING" value={values.displayName} error={errors.displayName} onChange={change} autoComplete="nickname" maxLength={20} />
            <Field name="password" label="SENHA" type="password" value={values.password} error={errors.password} onChange={change} autoComplete="new-password" />
            <Field name="confirmPassword" label="REPITA A SENHA" type="password" value={values.confirmPassword} error={errors.confirmPassword} onChange={change} autoComplete="new-password" />
          </div>
        ) : (
          <>
            <Field name="identifier" label="E-MAIL OU USUÁRIO" value={values.identifier} error={errors.identifier} onChange={change} autoComplete="username" />
            <Field name="password" label="SENHA" type="password" value={values.password} error={errors.password} onChange={change} autoComplete="current-password" />
          </>
        )}

        {signup && <p className="auth-card__hint">O e-mail fica só com você: o ranking mostra apenas o nome escolhido.</p>}
        {formError && <p className="auth-card__error" role="alert">{formError}</p>}
        {notice && <p className="auth-card__notice" role="status">{notice}</p>}

        <button type="submit" className="auth-card__submit" disabled={busy}>
          {busy ? 'UM MOMENTO...' : signup ? 'CRIAR CONTA' : 'ENTRAR'}
        </button>
        <button type="button" className="auth-card__back" onClick={back}>
          VOLTAR (ESC)
        </button>
      </form>
    </div>
  );
}
