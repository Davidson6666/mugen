import test from 'node:test';
import assert from 'node:assert/strict';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, assertConfigIntegrity, cast, command, hits, loadRecord, run, step } from './helpers/world.js';

// Zenitsu (pacote "Zenitsu Agatsuma" de SaulPRO).
const record = loadRecord('zenitsu');
const { config } = record;

test('zenitsu: frames, efeitos e golpes citados no config existem', () => {
  assertConfigIntegrity(assert, config);
});

test('zenitsu: golpe e cortes encadeiam ao conectar', () => {
  const world = arena(record, 500, 550);
  const presses = { 0: { punch: true }, 12: { kick: true }, 26: { kick: true }, 42: { special: true } };
  for (let tick = 0; tick < 100; tick += 1) step(world, command(presses[tick] ?? {}));
  for (const name of ['punch', 'kick', 'kick2', 'strong']) assert.ok(world.visited.has(name), name);
});

for (const [name, gap, minimum] of [
  ['thunderclap', 220, 1],
  ['thunderDive', 220, 1],
  ['flashSlash', 150, 3],
  ['sixfold', 70, 2],
  ['zigzag', 100, 3],
  ['plunge', 100, 1],
  ['flamingThunderGod', 150, 2],
]) {
  test(`zenitsu: ${name} acerta`, () => {
    const world = run(arena(record, 500, 500 + gap), cast(name), 400);
    assert.ok(hits(world).length >= minimum, `${name}: ${hits(world).length} acertos`);
  });
}

test('zenitsu: contra-ataque pega quem bate', () => {
  const world = arena(record, 600, 650, loadRecord('itachi'));
  step(world, cast('counter'), command());
  for (let tick = 0; tick < 32; tick += 1) step(world);
  step(world, command(), command({ punch: true }));
  for (let tick = 0; tick < 60; tick += 1) step(world);
  assert.ok(world.visited.has('counterSlash'));
});

test('zenitsu: o super segue ate o dragao de fogo', () => {
  const world = run(arena(record, 500, 600), cast('flamingThunderGod'), 400);
  for (const name of ['thunderGodRise', 'thunderGodStrike']) assert.ok(world.visited.has(name), name);
  assert.ok(world.fighters[1].health <= config.stats.maxHealth - 15);
});

test('zenitsu: comandos', () => {
  const feed = (entries) => {
    const detector = new ComboDetector(config.combos);
    let match = null;
    entries.forEach((entry, index) => { match = detector.feed(command(entry), 1, index * 16) ?? match; });
    return match?.animation ?? null;
  };
  assert.equal(feed([{ down: true }, { down: true, right: true }, { right: true, kick: true }]), 'flashSlash');
  assert.equal(feed([{ down: true }, { down: true, left: true }, { left: true, special: true }]), 'plunge');
  assert.equal(feed([{ down: true }, { right: true }, { down: true }, { right: true, punch: true }]), 'flamingThunderGod');
});

test('zenitsu: todos os sons citados nos golpes existem', () => {
  for (const [name, animation] of Object.entries(config.animations)) {
    for (const event of animation.events ?? []) {
      if (event.sound) assert.ok(config.sounds[event.sound], `${name} pede ${event.sound}`);
    }
  }
});
