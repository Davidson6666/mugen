import test from 'node:test';
import assert from 'node:assert/strict';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, assertConfigIntegrity, cast, command, hits, loadRecord, mash, run } from './helpers/world.js';

// Chun-Li (pacote "SF3 Chun Li" de MGMURROW).
const record = loadRecord('chunli');
const { config } = record;

test('chunli: frames, efeitos e golpes citados no config existem', () => {
  assertConfigIntegrity(assert, config);
});

test('chunli: tamanho parecido com o do elenco', () => {
  const height = config.hurtbox.height * (config.spriteScale ?? 1);
  assert.ok(height > 80 && height < 120, `hurtbox com ${height} px`);
});

test('chunli: socos fraco -> medio -> forte', () => {
  const world = mash(arena(record, 500, 545), 'punch', { ticks: 120, gap: 4 });
  for (const name of ['punch', 'punch2', 'punch3']) assert.ok(world.visited.has(name), name);
});

test('chunli: chutes fraco -> medio -> forte', () => {
  const world = mash(arena(record, 500, 545), 'kick', { ticks: 120, gap: 4 });
  for (const name of ['kick', 'kick2', 'kick3']) assert.ok(world.visited.has(name), name);
});

for (const [name, gap, minimum] of [
  ['lightningLegs', 70, 10],
  ['sweep', 70, 1],
  ['kikoken', 320, 1],
  ['spinningBird', 150, 5],
  ['hazanshu', 100, 1],
  ['tenshokyaku', 70, 3],
  ['kikosho', 100, 5],
  ['houyokusen', 100, 10],
  ['tenseiRanka', 70, 2],
  ['kickStorm', 70, 10],
]) {
  test(`chunli: ${name} acerta`, () => {
    const world = run(arena(record, 500, 500 + gap), cast(name), 400);
    assert.ok(hits(world).length >= minimum, `${name}: ${hits(world).length} acertos`);
  });
}

test('chunli: comandos', () => {
  const feed = (entries) => {
    const detector = new ComboDetector(config.combos);
    let match = null;
    entries.forEach((entry, index) => { match = detector.feed(command(entry), 1, index * 16) ?? match; });
    return match?.animation ?? null;
  };
  assert.equal(feed([{ down: true }, { down: true, right: true }, { right: true, punch: true }]), 'kikoken');
  assert.equal(feed([{ down: true }, { down: true, left: true }, { left: true, kick: true }]), 'spinningBird');
  assert.equal(feed([{ down: true }, { right: true }, { down: true }, { right: true, punch: true }]), 'kikosho');
});

test('chunli: todos os sons citados nos golpes existem', () => {
  for (const [name, animation] of Object.entries(config.animations)) {
    for (const event of animation.events ?? []) {
      if (event.sound) assert.ok(config.sounds[event.sound], `${name} pede ${event.sound}`);
    }
  }
});
