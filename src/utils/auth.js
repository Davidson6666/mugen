import { supabase } from './supabaseClient.js';

// O Supabase Auth pede e-mail, nao usuario. Como nao existe uma caixa de
// entrada de verdade pra "usuario@mugenfighter.local", a confirmacao de
// e-mail fica DESLIGADA no painel do Supabase (Authentication > Sign In /
// Providers > User Signups > "Confirm email"). Sem isso, ninguem confirmaria
// a conta (o e-mail nunca chega a lugar nenhum) e o login nunca liberaria.
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
  const msg = error.message ?? '';
  if (msg.includes('already registered') || msg.includes('already exists')) return 'Esse nome de usuario ja existe.';
  if (msg.includes('Invalid login credentials')) return 'Usuario ou senha errados.';
  if (msg.includes('Password should be at least')) return 'Senha precisa ter pelo menos 6 caracteres.';
  return msg || 'Algo deu errado. Tenta de novo.';
}

// Cria a conta (Supabase Auth) e o perfil publico (tabela profiles) em
// seguida. Devolve { profile } ou { error }.
export async function signUp(rawUsername, password) {
  if (!supabase) return { error: 'Supabase nao configurado.' };
  const username = normalizeUsername(rawUsername);
  if (!isValidUsername(username)) {
    return { error: 'Usuario precisa ter 3-20 letras minusculas, numeros ou "_".' };
  }
  const { data, error } = await supabase.auth.signUp({ email: emailFor(username), password });
  if (error) return { error: friendlyError(error) };
  if (!data.user) return { error: 'Nao foi possivel criar a conta.' };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({ id: data.user.id, username })
    .select()
    .single();
  if (profileError) return { error: friendlyError(profileError) };
  return { profile };
}

// Loga com usuario + senha. Devolve { profile } ou { error }.
export async function signIn(rawUsername, password) {
  if (!supabase) return { error: 'Supabase nao configurado.' };
  const username = normalizeUsername(rawUsername);
  const { error } = await supabase.auth.signInWithPassword({ email: emailFor(username), password });
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
  const userId = session.session?.user?.id;
  if (!userId) return { profile: null };
  const { data: profile, error } = await supabase.from('profiles').select().eq('id', userId).single();
  if (error) return { error: friendlyError(error) };
  return { profile };
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
