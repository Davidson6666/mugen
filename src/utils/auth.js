import { supabase } from './supabaseClient.js';
import { NETWORK_MESSAGE, isNetworkError } from './networkError.js';

// Contas novas usam o e-mail de verdade. Contas antigas (criadas so com nome de
// usuario) tem um e-mail interno "usuario@mugenfighter.local", que nao recebe
// nada: por isso a confirmacao de e-mail fica DESLIGADA no painel do Supabase
// (Authentication > Sign In / Providers > Email > "Confirm email"), e essas
// contas continuam entrando pelo nome de usuario.
const EMAIL_DOMAIN = 'mugenfighter.local';

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

// Sempre minusculo: "David" e "david" sao a mesma conta (mesmo e-mail por
// baixo), e a tabela profiles tem uma trava (check) com o mesmo padrao.
export function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

export function isValidUsername(username) {
  return USERNAME_PATTERN.test(username);
}

const emailFor = (username) => `${username}@${EMAIL_DOMAIN}`;

// Erros do Supabase em ingles viram uma frase que da pra mostrar na tela.
function friendlyError(error) {
  if (!error) return null;
  if (isNetworkError(error)) return NETWORK_MESSAGE;
  const msg = error.message ?? '';
  if (msg.includes('already registered') || msg.includes('already exists')) return 'Esse nome de usuario ja existe.';
  if (msg.includes('Invalid login credentials')) return 'E-mail, usuário ou senha incorretos.';
  if (msg.includes('Email not confirmed')) return 'Confirme o e-mail que enviamos antes de entrar.';
  if (msg.includes('rate limit')) return 'Muitas tentativas. Espere um pouco e tente de novo.';
  if (msg.includes('Password should be at least')) return 'Senha precisa ter pelo menos 6 caracteres.';
  return msg || 'Algo deu errado. Tenta de novo.';
}

// Cria a conta (Supabase Auth, com e-mail e senha) e o perfil publico (tabela
// profiles) com o nome de exibicao. O e-mail nunca vai para o perfil: o ranking
// mostra so o nome de exibicao. Devolve { profile }, { fieldErrors } (erro de um
// campo), { pending } (falta confirmar o e-mail) ou { error }.
export async function signUp({ email, displayName, password }) {
  if (!supabase) return { error: 'Supabase nao configurado.' };
  const username = normalizeUsername(displayName);
  if (!isValidUsername(username)) {
    return { fieldErrors: { displayName: 'Use de 3 a 20 letras minúsculas, números ou "_".' } };
  }
  // O nome e unico no ranking: confere antes de criar a conta, senao sobraria
  // uma conta sem perfil.
  const { data: taken, error: lookupError } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle();
  if (lookupError) return { error: friendlyError(lookupError) };
  if (taken) return { fieldErrors: { displayName: 'Esse nome de exibição já está em uso.' } };

  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: username } } });
  if (error) {
    if (/already registered|already exists/i.test(error.message ?? '')) {
      return { fieldErrors: { email: 'Esse e-mail já tem conta. Use a aba ENTRAR.' } };
    }
    return { error: friendlyError(error) };
  }
  if (!data.user) return { error: 'Nao foi possivel criar a conta.' };
  // Com a confirmacao de e-mail ligada no Supabase ainda nao ha sessao.
  if (!data.session) return { pending: 'Conta criada. Confirme o e-mail que enviamos e depois entre.' };
  return createProfile(data.user.id, username);
}

async function createProfile(userId, username) {
  const { data: profile, error } = await supabase.from('profiles').insert({ id: userId, username }).select().single();
  if (error) return { error: friendlyError(error) };
  return { profile };
}

// Loga com e-mail (ou, em conta antiga, com o nome de usuario) e senha.
// Devolve { profile } ou { error }.
export async function signIn(identifier, password) {
  if (!supabase) return { error: 'Supabase nao configurado.' };
  const text = identifier.trim();
  const email = text.includes('@') ? text : emailFor(normalizeUsername(text));
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: friendlyError(error) };
  return fetchOwnProfile();
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

// O perfil de quem esta logado agora (depois do login, ou ao recarregar a
// pagina com uma sessao ja salva).
export async function fetchOwnProfile() {
  if (!supabase) return { error: 'Supabase nao configurado.' };
  const { data: session } = await supabase.auth.getSession();
  const user = session.session?.user;
  if (!user) return { profile: null };
  const { data: profile, error } = await supabase.from('profiles').select().eq('id', user.id).maybeSingle();
  if (error) return { error: friendlyError(error) };
  if (profile) return { profile };
  // Conta sem perfil (criada com a confirmacao de e-mail ligada): o perfil nasce
  // no primeiro acesso, com o nome de exibicao escolhido no cadastro.
  const wanted = user.user_metadata?.display_name;
  return wanted && isValidUsername(wanted) ? createProfile(user.id, wanted) : { profile: null };
}

// Ranking: os perfis por Elo, do maior pro menor.
export async function fetchLeaderboard(limit = 50) {
  if (!supabase) return { error: 'Supabase nao configurado.', rows: [] };
  const { data, error } = await supabase
    .from('profiles')
    .select('username, elo_rating, wins, losses')
    .order('elo_rating', { ascending: false })
    .limit(limit);
  if (error) return { error: friendlyError(error), rows: [] };
  return { rows: data ?? [] };
}
