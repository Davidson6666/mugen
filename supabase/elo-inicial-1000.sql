-- Muda o Elo inicial de 1200 para 1000.
-- Cole no painel do Supabase, em "SQL Editor" > "New query", e aperte "Run".
-- Pode rodar de novo sem problema.
--
-- O schema.sql ja nasce com 1000, mas ele usa "create table if not exists", entao
-- num banco que ja existe ele nao muda o padrao das colunas: e isto aqui que muda.

-- 1. Contas novas passam a comecar em 1000 (perfil e fila).
alter table public.profiles alter column elo_rating set default 1000;
alter table public.queue alter column elo_rating set default 1000;

-- 2. Quem ainda nao jogou nenhuma partida estava parado nos 1200 antigos: vai
--    para 1000. Quem ja jogou mantem o Elo que ganhou ou perdeu, para nao
--    apagar o historico de ninguem.
update public.profiles
set elo_rating = 1000
where wins = 0 and losses = 0 and elo_rating = 1200;

-- Confere como ficou.
select username, elo_rating, wins, losses from public.profiles order by elo_rating desc;
