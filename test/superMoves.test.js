import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isSuperMove } from '../src/utils/superMoves.js';

// Golpes que ganham o corte de super na tela: recarga longa ou uso por round.
const roster = JSON.parse(readFileSync(new URL('../src/data/characters.json', import.meta.url)));
const config = (id) => {
  const entry = roster.find((item) => item.id === id);
  return JSON.parse(readFileSync(new URL(`../public${entry.dir}/${entry.config}`, import.meta.url)));
};

test('super: os supers conhecidos ganham o corte', () => {
  for (const [id, move] of [['goku', 'superKamehameha'], ['gojo', 'hollowPurple'], ['ensina_god', 'iAmAtomic'], ['chunli', 'kikosho'], ['humberto', 'sixSeven']]) {
    assert.ok(isSuperMove(config(id).animations[move]), `${id} ${move}`);
  }
});

test('super: golpes basicos nao ganham', () => {
  for (const id of ['goku', 'chunli', 'humberto', 'ensina_god']) {
    for (const move of ['punch', 'kick']) assert.ok(!isSuperMove(config(id).animations[move]), `${id} ${move}`);
  }
  assert.ok(!isSuperMove(undefined));
});

test('super: todo lutador tem pelo menos um', () => {
  for (const entry of roster.filter((item) => item.id !== 'dummy')) {
    const moves = Object.values(config(entry.id).animations);
    assert.ok(moves.some(isSuperMove), entry.id);
  }
});
