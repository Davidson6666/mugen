import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VICTORY_QUOTES, pickVictoryQuote } from '../src/data/victoryQuotes.js';

const roster = JSON.parse(readFileSync(new URL('../src/data/characters.json', import.meta.url)));

test('frases de vitoria: todo lutador do elenco tem pelo menos duas', () => {
  for (const entry of roster.filter((item) => item.id !== 'dummy')) {
    assert.ok((VICTORY_QUOTES[entry.id]?.length ?? 0) >= 2, entry.id);
  }
});

test('frases de vitoria: cabem numa linha da tela de resultado', () => {
  for (const [id, quotes] of Object.entries(VICTORY_QUOTES)) {
    for (const quote of quotes) assert.ok(quote.length <= 45, `${id}: "${quote}" (${quote.length})`);
  }
});

test('frases de vitoria: sorteio devolve uma frase do lutador, ou nada se nao tiver', () => {
  assert.ok(VICTORY_QUOTES.goku.includes(pickVictoryQuote('goku', () => 0.99)));
  assert.equal(pickVictoryQuote('ninguem'), null);
});
