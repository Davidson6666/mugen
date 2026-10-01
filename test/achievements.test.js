import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACHIEVEMENTS, UNLOCKED_BY, achievementById } from '../src/data/achievements.js';

const characters = JSON.parse(
  readFileSync(new URL('../src/data/characters.json', import.meta.url)),
);

test('cada conquista tem id unico', () => {
  const ids = ACHIEVEMENTS.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('toda conquista tem nome e descricao pra mostrar na tela', () => {
  for (const entry of ACHIEVEMENTS) {
    assert.ok(entry.name?.length > 0, `${entry.id} sem nome`);
    assert.ok(entry.description?.length > 0, `${entry.id} sem descricao`);
  }
});

test('conquista que libera personagem aponta pra um que existe', () => {
  for (const entry of ACHIEVEMENTS) {
    if (!entry.unlocks) continue;
    assert.ok(
      characters.some((character) => character.id === entry.unlocks),
      `${entry.id} libera "${entry.unlocks}", que nao esta no elenco`,
    );
  }
});

test('todo personagem travado tem uma conquista que o libera', () => {
  for (const character of characters) {
    if (!character.unlockedBy) continue;
    assert.ok(
      achievementById(character.unlockedBy),
      `${character.id} depende de "${character.unlockedBy}", que nao e uma conquista`,
    );
    assert.equal(UNLOCKED_BY[character.id], character.unlockedBy, 'os dois lados tem que concordar');
  }
});

// O pedido do David: o Ensina GOD nao pode entrar nos modos competitivos, e so
// existe pra quem venceu o Modo Historia.
test('o Ensina GOD esta travado e fora dos modos competitivos', () => {
  const ensina = characters.find((entry) => entry.id === 'ensina_god');
  assert.equal(ensina.unlockedBy, 'story_champion');
  for (const mode of ['versusPlayer', 'online', 'story']) {
    assert.ok(ensina.bannedIn.includes(mode), `faltou proibir em ${mode}`);
  }
  assert.ok(!ensina.bannedIn.includes('versusCpu'), 'contra a CPU ele pode');
  assert.ok(!ensina.bannedIn.includes('training'), 'no treino ele pode');
});

test('nenhum outro personagem nasce travado', () => {
  const travados = characters.filter((entry) => entry.unlockedBy).map((entry) => entry.id);
  assert.deepEqual(travados, ['ensina_god']);
});

// A conquista de vencer com o elenco inteiro compara contra um numero fixo
// dentro do SQL (record_match_result). Este teste existe pra quebrar quando o
// elenco mudar, lembrando de atualizar o banco junto.
test('o numero de personagens bate com o que o SQL espera', () => {
  const noSql = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
  const esperado = Number(noSql.match(/if vencidos >= (\d+) then\s*\n\s*candidatas := candidatas \|\| 'all_characters'/)?.[1]);
  assert.ok(Number.isFinite(esperado), 'nao achei o numero no schema.sql');
  assert.equal(
    characters.length,
    esperado,
    `o elenco tem ${characters.length} personagens mas o SQL cobra ${esperado}: ajuste "vencidos >= ${characters.length}" em supabase/schema.sql`,
  );
});

test('as conquistas novas estao na lista', () => {
  for (const id of ['untouched', 'comeback', 'combo_15', 'all_characters']) {
    assert.ok(achievementById(id), `faltou ${id}`);
  }
  assert.equal(ACHIEVEMENTS.length, 10);
});
