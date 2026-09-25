import test from 'node:test';
import assert from 'node:assert/strict';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, assertConfigIntegrity, cast, command, hits, loadRecord, mash, run } from './helpers/world.js';

// Nezuko (pacote "Nezuko By Santoryu" de SantoryuMUGENJUS).
const record = loadRecord('nezuko');
const { config } = record;

test('nezuko: frames, efeitos e golpes citados no config existem', () => {
  assertConfigIntegrity(assert, config);
});

test('nezuko: martelar K faz a sequencia de chutes ate o lancador', () => {
  const world = mash(arena(record, 500, 545), 'kick', { ticks: 200, gap: 4 });
  for (const name of ['kick', 'kick2', 'kick3', 'kick4']) assert.ok(world.visited.has(name), name);
});

test('nezuko: garras emendam no chute que arremessa', () => {
  const world = mash(arena(record, 500, 545), 'special', { ticks: 100, gap: 4 });
  for (const name of ['claw', 'bigKick']) assert.ok(world.visited.has(name), name);
});

for (const [name, gap, minimum] of [
  ['dashKick', 150, 1],
  ['projectedKick', 220, 1],
  ['kickFlurry', 100, 3],
  ['aerialRush', 150, 2],
  ['explodingBlood', 100, 3],
  ['demonRush', 100, 6],
]) {
  test(`nezuko: ${name} acerta`, () => {
    const world = run(arena(record, 500, 500 + gap), cast(name), 400);
    assert.ok(hits(world).length >= minimum, `${name}: ${hits(world).length} acertos`);
  });
}

test('nezuko: regeneracao recupera vida', () => {
  const world = arena(record, 400, 700);
  world.fighters[0].health = 50;
  run(world, cast('regenerate'), 120);
  assert.ok(world.fighters[0].health > 60, `vida ${world.fighters[0].health}`);
});

test('nezuko: comandos', () => {
  const feed = (entries) => {
    const detector = new ComboDetector(config.combos);
    let match = null;
    entries.forEach((entry, index) => { match = detector.feed(command(entry), 1, index * 16) ?? match; });
    return match?.animation ?? null;
  };
  assert.equal(feed([{ down: true }, { down: true, right: true }, { right: true, special: true }]), 'explodingBlood');
  assert.equal(feed([{ down: true }, { down: true, left: true }, { left: true, special: true }]), 'regenerate');
  assert.equal(feed([{ down: true }, { right: true }, { down: true }, { right: true, punch: true }]), 'demonRush');
});

test('nezuko: todos os sons citados nos golpes existem', () => {
  for (const [name, animation] of Object.entries(config.animations)) {
    for (const event of animation.events ?? []) {
      if (event.sound) assert.ok(config.sounds[event.sound], `${name} pede ${event.sound}`);
    }
  }
});
