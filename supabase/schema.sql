-- Mugen Fighter: ranking online (Fase 1 - contas e perfis).
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
