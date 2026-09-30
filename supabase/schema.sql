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

  -- Alguem ja me pegou enquanto eu esperava?
  select * into found_match
  from public.matches
  where status = 'pending'
    and (player1_id = me or player2_id = me)
    and created_at > now() - interval '2 minutes'
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
