-- Ruptura Arena: ranking online (Fase 1 - contas e perfis).
-- Cole isto inteiro no painel do Supabase, em "SQL Editor" > "New query",
-- e aperte "Run". Pode rodar de novo sem problema (usa "if not exists").

-- Um perfil publico por conta, ligado ao usuario do Supabase Auth. O nome de
-- usuario fica sempre em minusculas (o app.js normaliza antes de mandar), pra
-- "David" e "david" nao virarem duas contas diferentes.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  elo_rating integer not null default 1200,
  wins integer not null default 0,
  losses integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Perfis sao publicos para leitura" on public.profiles;
create policy "Perfis sao publicos para leitura"
  on public.profiles for select
  using (true);

-- So o dono da conta cria o proprio perfil (uma vez, no cadastro).
drop policy if exists "Cada um cria so o proprio perfil" on public.profiles;
create policy "Cada um cria so o proprio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

-- De proposito, sem policy de UPDATE: nem o dono consegue mudar elo_rating/
-- wins/losses direto pelo app. Isso so muda por uma funcao de servidor
-- (Fase 5, apos uma partida terminar de verdade), pra ninguem fraudar o
-- proprio placar chamando a API do Supabase na mao.


-- ===================================================================
-- Fase 2: fila de partida (matchmaking)
-- ===================================================================

-- Quem esta esperando adversario agora. Uma linha por pessoa: entrar de novo
-- na fila so atualiza o horario, nao duplica.
create table if not exists public.queue (
  user_id uuid primary key references auth.users(id) on delete cascade,
  elo_rating integer not null default 1200,
  joined_at timestamptz not null default now()
);

-- Uma partida entre duas contas. "seed" e o numero que vai alimentar o
-- sorteio do jogo nos dois lados (Fase 3), pra partida rodar igualzinho nos
-- dois computadores.
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  player1_id uuid not null references auth.users(id) on delete cascade,
  player2_id uuid not null references auth.users(id) on delete cascade,
  seed bigint not null,
  status text not null default 'pending'
    check (status in ('pending', 'playing', 'finished', 'abandoned')),
  winner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists matches_player1_idx on public.matches (player1_id, created_at desc);
create index if not exists matches_player2_idx on public.matches (player2_id, created_at desc);

alter table public.queue enable row level security;
alter table public.matches enable row level security;

-- Na fila, cada um so enxerga e mexe na propria linha (o emparelhamento em si
-- acontece dentro da funcao abaixo, que roda com permissao de servidor).
drop policy if exists "Cada um ve so a propria linha da fila" on public.queue;
create policy "Cada um ve so a propria linha da fila"
  on public.queue for select
  using (auth.uid() = user_id);

drop policy if exists "Cada um sai so da propria fila" on public.queue;
create policy "Cada um sai so da propria fila"
  on public.queue for delete
  using (auth.uid() = user_id);

-- Partida e visivel para os dois jogadores dela, e ninguem cria/edita partida
-- direto pelo app (so a funcao de emparelhamento cria).
drop policy if exists "Jogadores veem as proprias partidas" on public.matches;
create policy "Jogadores veem as proprias partidas"
  on public.matches for select
  using (auth.uid() = player1_id or auth.uid() = player2_id);

-- Emparelhamento. Roda como funcao de servidor (security definer) porque
-- precisa mexer na linha da fila do adversario, que o jogador nao enxerga.
--
-- Devolve a partida quando acha adversario (ou quando alguem ja me pegou
-- enquanto eu esperava), e null quando so entrei na fila. O "for update skip
-- locked" e o que impede dois jogadores de pegarem o mesmo adversario ao
-- mesmo tempo: quem chegar depois pula a linha travada em vez de brigar por
-- ela.
create or replace function public.find_match()
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  my_elo integer;
  opponent uuid;
  found_match public.matches;
begin
  if me is null then
    raise exception 'precisa estar logado para procurar partida';
  end if;

  -- Alguem ja me pegou enquanto eu esperava? So vale partida que acabou de
  -- ser formada: uma partida velha parada em "pending" (o adversario fechou o
  -- jogo antes de comecar) nao pode ser devolvida pra quem entrou na fila de
  -- novo, senao ele fica preso esperando um adversario que ja foi embora.
  select * into found_match
  from public.matches
  where status = 'pending'
    and (player1_id = me or player2_id = me)
    and created_at > now() - interval '20 seconds'
  order by created_at desc
  limit 1;

  if found then
    delete from public.queue where user_id = me;
    return found_match;
  end if;

  select elo_rating into my_elo from public.profiles where id = me;
  if my_elo is null then
    raise exception 'perfil nao encontrado';
  end if;

  -- Adversario com o Elo mais perto do meu, entre quem esta esperando. Linhas
  -- paradas ha mais de 2 minutos sao ignoradas (quem fechou o jogo sem sair
  -- da fila direito).
  select user_id into opponent
  from public.queue
  where user_id <> me
    and joined_at > now() - interval '2 minutes'
  order by abs(elo_rating - my_elo), joined_at
  limit 1
  for update skip locked;

  if opponent is null then
    insert into public.queue (user_id, elo_rating)
    values (me, my_elo)
    on conflict (user_id) do update
      set joined_at = now(), elo_rating = excluded.elo_rating;
    return null;
  end if;

  delete from public.queue where user_id in (me, opponent);

  -- Quem estava esperando primeiro fica como jogador 1.
  insert into public.matches (player1_id, player2_id, seed)
  values (opponent, me, floor(random() * 2147483647)::bigint)
  returning * into found_match;

  return found_match;
end;
$$;

revoke execute on function public.find_match() from public;
grant execute on function public.find_match() to authenticated;

-- Assim que a luta comeca de verdade, a partida sai de "pending". Sem isso,
-- quem sai da luta e volta pra fila na sequencia cairia na mesma partida de
-- novo, agora sem ninguem do outro lado.
create or replace function public.start_match(match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.matches
  set status = 'playing'
  where id = match_id
    and status = 'pending'
    and (player1_id = auth.uid() or player2_id = auth.uid());
end;
$$;

revoke execute on function public.start_match(uuid) from public;
grant execute on function public.start_match(uuid) to authenticated;


-- ===================================================================
-- Fase 5: resultado da partida mexe no Elo
-- ===================================================================

-- Quem cada lado disse que ganhou. O Elo so mexe quando os dois dizem a mesma
-- coisa: sozinho, ninguem consegue inventar que venceu.
alter table public.matches add column if not exists report_player1 uuid references auth.users(id);
alter table public.matches add column if not exists report_player2 uuid references auth.users(id);

-- Fecha a partida e atualiza o ranking dos dois. Roda como funcao de servidor
-- porque a tabela profiles nao tem policy de UPDATE nenhuma: nem o dono da
-- conta consegue mexer no proprio Elo pela API: so por aqui.
--
-- Formula de Elo padrao, K = 32: quem ganha de alguem muito melhor sobe
-- bastante, quem ganha de alguem muito pior sobe quase nada.
--
-- Devolve: 'esperando' (falta o outro reportar), 'fechada' (Elo atualizado),
-- 'conflito' (cada um disse que ganhou) ou 'ja fechada'.
create or replace function public.report_match_result(match_id uuid, winner uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  found_match public.matches;
  loser uuid;
  winner_elo integer;
  loser_elo integer;
  expected numeric;
  k constant integer := 32;
begin
  if me is null then
    raise exception 'precisa estar logado';
  end if;

  select * into found_match from public.matches where id = match_id for update;
  if not found then
    raise exception 'partida nao encontrada';
  end if;
  if me <> found_match.player1_id and me <> found_match.player2_id then
    raise exception 'voce nao joga essa partida';
  end if;
  if winner <> found_match.player1_id and winner <> found_match.player2_id then
    raise exception 'vencedor nao e dessa partida';
  end if;
  if found_match.status = 'finished' then
    return 'ja fechada';
  end if;

  if me = found_match.player1_id then
    found_match.report_player1 := winner;
    update public.matches set report_player1 = winner where id = match_id;
  else
    found_match.report_player2 := winner;
    update public.matches set report_player2 = winner where id = match_id;
  end if;

  if found_match.report_player1 is null or found_match.report_player2 is null then
    return 'esperando';
  end if;

  -- Cada um diz que ganhou: ninguem leva Elo, e a partida fica marcada como
  -- estragada em vez de premiar um chute.
  if found_match.report_player1 <> found_match.report_player2 then
    update public.matches set status = 'abandoned' where id = match_id;
    return 'conflito';
  end if;

  loser := case when winner = found_match.player1_id
    then found_match.player2_id else found_match.player1_id end;

  select elo_rating into winner_elo from public.profiles where id = winner for update;
  select elo_rating into loser_elo from public.profiles where id = loser for update;

  -- Chance que o vencedor tinha de ganhar, pelo Elo dos dois antes da partida.
  expected := 1.0 / (1.0 + power(10.0, (loser_elo - winner_elo)::numeric / 400.0));

  update public.profiles
    set elo_rating = elo_rating + round(k * (1 - expected))::integer,
        wins = wins + 1
    where id = winner;

  update public.profiles
    set elo_rating = greatest(100, elo_rating - round(k * (1 - expected))::integer),
        losses = losses + 1
    where id = loser;

  update public.matches
    set status = 'finished', winner_id = winner
    where id = match_id;

  return 'fechada';
end;
$$;

revoke execute on function public.report_match_result(uuid, uuid) from public;
grant execute on function public.report_match_result(uuid, uuid) to authenticated;


-- ===================================================================
-- Conquistas
-- ===================================================================

-- Uma linha por conquista ganha. A chave composta impede ganhar a mesma duas
-- vezes, e nao existe policy de UPDATE nem DELETE: conquista nao se perde nem
-- muda de data depois de ganha.
create table if not exists public.achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- Com quais personagens a conta ja venceu. Serve pra conquista de vencer com
-- varios personagens diferentes - precisa lembrar quais, nao so quantos.
create table if not exists public.character_wins (
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id text not null,
  primary key (user_id, character_id)
);

alter table public.achievements enable row level security;
alter table public.character_wins enable row level security;

-- Cada um ve so as proprias conquistas ("minhas conquistas").
drop policy if exists "Cada um ve as proprias conquistas" on public.achievements;
create policy "Cada um ve as proprias conquistas"
  on public.achievements for select
  using (auth.uid() = user_id);

drop policy if exists "Cada um ve os proprios personagens vencedores" on public.character_wins;
create policy "Cada um ve os proprios personagens vencedores"
  on public.character_wins for select
  using (auth.uid() = user_id);

-- De proposito sem policy de INSERT: quem grava e a funcao abaixo, que decide
-- o que foi conquistado. Assim o app nao escreve conquista na mao.

-- Conta o que aconteceu numa partida e devolve SO as conquistas novas (as que
-- ainda nao tinham sido ganhas), pra tela mostrar o aviso no canto.
--
-- Importante ser honesto sobre o limite disto: conquista de um jogador so nao
-- tem como ser verificada pelo servidor - ele nao assistiu a partida. O que a
-- funcao garante e que ninguem ganha duas vezes, ninguem escreve conquista de
-- outra pessoa e ninguem inventa uma conquista que nao existe na lista.
create or replace function public.record_match_result(
  p_mode text,
  p_won boolean,
  p_character text,
  p_shutout boolean,
  p_story_complete boolean
)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  candidatas text[] := '{}';
  novas text[];
begin
  -- Sem conta nao ha conquista: elas sao da conta, nao do computador.
  if me is null then
    return '{}';
  end if;

  if p_won and p_character is not null then
    insert into public.character_wins (user_id, character_id)
    values (me, p_character)
    on conflict do nothing;
  end if;

  if p_won then
    candidatas := candidatas || 'first_win';
  end if;
  if p_won and p_shutout then
    candidatas := candidatas || 'flawless';
  end if;
  if p_mode = 'online' then
    candidatas := candidatas || 'online_debut';
    if p_won then
      candidatas := candidatas || 'online_win';
    end if;
  end if;
  if p_story_complete then
    candidatas := candidatas || 'story_champion';
  end if;
  if (select count(*) from public.character_wins where user_id = me) >= 5 then
    candidatas := candidatas || 'five_characters';
  end if;

  -- Insere todas de uma vez: o "on conflict do nothing" faz o returning
  -- devolver exatamente as que ainda nao existiam, que sao as novas.
  with inseridas as (
    insert into public.achievements (user_id, achievement_id)
    select me, id from unnest(candidatas) as id
    on conflict do nothing
    returning achievement_id
  )
  select coalesce(array_agg(achievement_id), '{}') into novas from inseridas;

  return novas;
end;
$$;

revoke execute on function public.record_match_result(text, boolean, text, boolean, boolean) from public;
grant execute on function public.record_match_result(text, boolean, text, boolean, boolean) to authenticated;
