import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { groupBySection, keysFor, moveListFor } from '../src/utils/moveList.js';

const load = (id) => JSON.parse(
  readFileSync(new URL(`../public/assets/characters/${id}/${id}_config.json`, import.meta.url)),
);

test('notacao vira as teclas de cada jogador', () => {
  const shuriken = { input: '↓↘→P' };
  assert.deepEqual(keysFor(shuriken, 0).map((key) => key.label), ['↓', '↘', '→', 'J']);
  assert.deepEqual(keysFor(shuriken, 1).map((key) => key.label), ['↓', '↘', '→', 'NUM 1']);
});

test('direcao segurada aparece antes do botao, marcada', () => {
  const [held, button] = keysFor({ input: 'S', hold: '↓' }, 0);
  assert.deepEqual(held, { label: '↓', held: true });
  assert.deepEqual(button, { label: 'L', button: true });
});

test('a lista do Itachi cobre todos os combos do config', () => {
  const config = load('itachi');
  const listed = new Set(moveListFor(config).map((move) => `${move.hold ?? ''}${move.input}`));
  for (const combo of config.combos) assert.ok(listed.has(`${combo.hold ?? ''}${combo.input}`), combo.id);
  const sections = groupBySection(moveListFor(config)).map((section) => section.title);
  assert.deepEqual(sections, ['Movimento', 'Sequências', 'Jutsus', 'Supers']);
});

test('personagem sem lista propria mostra os basicos e os combos', () => {
  const moves = moveListFor(load('dummy'));
  assert.deepEqual(moves.slice(0, 3).map((move) => move.name), ['Soco', 'Chute', 'Especial']);
  assert.ok(moves.length > 3);
});
