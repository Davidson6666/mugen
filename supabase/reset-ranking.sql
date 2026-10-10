-- Zera o ranking e apaga as contas de teste do desenvolvimento.
--
-- CUIDADO: isto apaga o historico de partidas e zera o Elo de TODO MUNDO.
-- Nao e parte do schema: e um script avulso, pra rodar de proposito no SQL
-- Editor do Supabase quando quiser comecar do zero.

-- 1. As contas de teste criadas durante o desenvolvimento. Apagar o usuario
--    leva junto o perfil, as partidas e a linha da fila dele (as tabelas
--    apontam para auth.users com "on delete cascade").
delete from auth.users
where email in (
  'testeclaude1@mugenfighter.local',
  'testeclaude2@mugenfighter.local'
);

-- 2. Historico de partidas e quem estiver esperando na fila.
delete from public.matches;
delete from public.queue;

-- 3. Quem sobrou volta pro Elo inicial, sem vitorias nem derrotas.
update public.profiles set elo_rating = 1000, wins = 0, losses = 0;

-- Confere como ficou.
select username, elo_rating, wins, losses from public.profiles order by username;
