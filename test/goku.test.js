import test from 'node:test';
import assert from 'node:assert/strict';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, assertConfigIntegrity, cast, command, hits, loadRecord, mash, run, step } from './helpers/world.js';

// Goku SSGSS (pacote "GokuSSGSS" de Kronos).
const record = loadRecord('goku');
const { config } = record;

test('goku: frames, efeitos e golpes citados no config existem', () => {
  assertConfigIntegrity(assert, config);
});

test('goku: martelar P faz a sequencia de socos', () => {
  const world = mash(arena(record, 500, 550), 'punch', { ticks: 200, gap: 4 });
  for (const name of ['punch', 'punch2', 'punchRush', 'punch4']) assert.ok(world.visited.has(name), name);
});

test('goku: martelar K faz a sequencia de chutes', () => {
  const world = mash(arena(record, 500, 550), 'kick', { ticks: 200, gap: 4 });
  for (const name of ['kick', 'kick2', 'kick3', 'kick4']) assert.ok(world.visited.has(name), name);
});

for (const [name, gap, minimum] of [
  ['kiBlast', 300, 1],
  ['spinKick', 45, 1],
  ['spiritExplosion', 100, 1],
  ['energyBlast', 300, 3],
  ['kamehameha', 320, 10],
  ['superKamehameha', 320, 20],
]) {
  test(`goku: ${name} acerta`, () => {
    const world = run(arena(record, 500, 500 + gap), cast(name), 400);
    assert.ok(hits(world).length >= minimum, `${name}: ${hits(world).length} acertos`);
  });
}

test('goku: Kamehameha para cima e antiaereo', () => {
  const ground = run(arena(record, 500, 650), cast('upKamehameha'), 150);
  assert.equal(hits(ground).length, 0, 'passa por cima de quem esta de pe');
  const world = arena(record, 500, 650);
  step(world, cast('upKamehameha'));
  for (let tick = 0; tick < 30; tick += 1) step(world);
  step(world, command(), command({ up: true, jump: true }));
  run(world, command(), 80);
  assert.ok(hits(world).length >= 2);
});

test('goku: God Shock pega quem bate', () => {
  const world = arena(record, 600, 650, loadRecord('itachi'));
  step(world, cast('godShock'), command());
  for (let tick = 0; tick < 8; tick += 1) step(world);
  step(world, command(), command({ punch: true }));
  for (let tick = 0; tick < 60; tick += 1) step(world);
  assert.ok(world.visited.has('godShockStrike'));
});

test('goku: Teletransporte reaparece do outro lado', () => {
  const world = run(arena(record, 500, 650), cast('teleport'), 40);
  assert.ok(world.fighters[0].x > world.fighters[1].x);
});

test('goku: a sequencia final so sai com o Kaioken', () => {
  const plain = run(arena(record, 500, 560), cast('finalRush'), 60);
  assert.ok(!plain.visited.has('finalRush'));
  const world = arena(record, 500, 560);
  run(world, cast('kaioken'), 200);
  run(world, cast('finalRush'), 400);
  for (const name of ['finalCombo', 'finalKamehameha']) assert.ok(world.visited.has(name), name);
});

test('goku: comandos', () => {
  const feed = (entries) => {
    const detector = new ComboDetector(config.combos);
    let match = null;
    entries.forEach((entry, index) => { match = detector.feed(command(entry), 1, index * 16) ?? match; });
    return match?.animation ?? null;
  };
  assert.equal(feed([{ down: true }, { down: true, right: true }, { right: true, special: true }]), 'kamehameha');
  assert.equal(feed([{ down: true }, { down: true, left: true }, { left: true, kick: true }]), 'teleport');
  assert.equal(feed([{ down: true }, { right: true }, { down: true }, { right: true, special: true }]), 'superKamehameha');
});

test('goku: todos os sons citados nos golpes existem', () => {
  for (const [name, animation] of Object.entries(config.animations)) {
    for (const event of animation.events ?? []) {
      if (event.sound) assert.ok(config.sounds[event.sound], `${name} pede ${event.sound}`);
    }
  }
});
