import { supabase } from './supabaseClient.js';

// Fila de partida online (Fase 2). Todo o emparelhamento acontece dentro da
// funcao find_match no Postgres (supabase/schema.sql): ela e atomica, entao
// dois jogadores nunca pegam o mesmo adversario ao mesmo tempo. Aqui do lado
// do app so chamamos ela de tempos em tempos ate vir uma partida.

// Erro do Postgres em ingles vira uma frase que da pra mostrar na tela.
function friendlyError(error) {
  const msg = error.message ?? '';
  if (msg.includes('find_match')) return 'Fila ainda nao configurada no servidor.';
  if (msg.includes('logado')) return 'Precisa estar logado para procurar partida.';
  if (msg.includes('perfil nao encontrado')) return 'Sua conta esta sem perfil. Entre de novo.';
  return 'Nao foi possivel entrar na fila. Tenta de novo.';
}

// Devolve { match } quando achou adversario, { match: null } quando so entrou
// na fila (e pra continuar chamando), ou { error }.
export async function findMatch() {
  if (!supabase) return { error: 'Supabase nao configurado.' };
  const { data, error } = await supabase.rpc('find_match');
  if (error) return { error: friendlyError(error) };
  // A funcao devolve a linha da partida ou nada; o supabase-js entrega isso
  // como objeto ou array de um item, dependendo da versao.
  const match = Array.isArray(data) ? (data[0] ?? null) : data;
  return { match: match?.id ? match : null };
}

// Tira a partida de "pending" quando a luta comeca, pra fila nao devolver ela
// de novo pra quem voltar a procurar partida logo em seguida.
export async function markMatchStarted(matchId) {
  if (!supabase) return;
  await supabase.rpc('start_match', { match_id: matchId });
}

// Reporta quem ganhou. O Elo so mexe quando os dois lados reportam a mesma
// coisa (a funcao no servidor cuida disso), entao aqui nao da pra inventar
// vitoria. Devolve { status } com 'esperando' | 'fechada' | 'conflito' |
// 'ja fechada', ou { error }.
export async function reportMatchResult(matchId, winnerUserId) {
  if (!supabase) return { error: 'Supabase nao configurado.' };
  const { data, error } = await supabase.rpc('report_match_result', {
    match_id: matchId,
    winner: winnerUserId,
  });
  if (error) return { error: error.message };
  return { status: data };
}

export async function leaveQueue() {
  if (!supabase) return;
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user?.id;
  if (!userId) return;
  await supabase.from('queue').delete().eq('user_id', userId);
}

// Combina com o adversario qual personagem cada um escolheu, antes da luta
// comecar. Os dois ficam anunciando a propria escolha ate saber a do outro
// (o Realtime nao guarda mensagem pra quem chega depois, entao repetir e o
// jeito simples de garantir que os dois recebem). Devolve uma funcao pra
// desligar o canal.
export function exchangePicks({ matchId, userId, characterId, onOpponentPick }) {
  if (!supabase) return () => {};
  const channel = supabase.channel(`match:${matchId}:setup`, { config: { broadcast: { self: false } } });
  const announce = () => channel.send({
    type: 'broadcast',
    event: 'pick',
    payload: { userId, characterId },
  });

  let timer = 0;
  channel.on('broadcast', { event: 'pick' }, ({ payload }) => {
    if (payload.userId === userId) return;
    // Responde na hora: se ele ja mandou a dele, e porque esta esperando a
    // minha, e eu posso estar prestes a sair do canal.
    announce();
    onOpponentPick(payload.characterId);
  });
  channel.subscribe((status) => {
    if (status !== 'SUBSCRIBED') return;
    announce();
    timer = setInterval(announce, 500);
  });

  return () => {
    clearInterval(timer);
    supabase.removeChannel(channel);
  };
}

// Nome e Elo do adversario (perfis sao de leitura publica).
export async function fetchProfileById(userId) {
  if (!supabase) return { error: 'Supabase nao configurado.' };
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, elo_rating')
    .eq('id', userId)
    .single();
  if (error) return { error: error.message };
  return { profile: data };
}
