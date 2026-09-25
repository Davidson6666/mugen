import test from 'node:test';
import assert from 'node:assert/strict';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, assertConfigIntegrity, cast, command, hits, loadRecord, run, step } from './helpers/world.js';

// Tanjiro (pacote "Tanjiro Jus v2" de Entah99).
const record = loadRecord('tanjiro');
const { config } = record;

test('tanjiro: frames, efeitos e golpes citados no config existem', () => {
  assertConfigIntegrity(assert, config);
});

test('tanjiro: cortes encadeiam ao conectar', () => {
  const world = arena(record, 500, 550);
  const presses = { 0: { punch: true }, 10: { punch: true }, 22: { kick: true }, 34: { kick: true }, 48: { special: true } };
  for (let tick = 0; tick < 100; tick += 1) step(world, command(presses[tick] ?? {}));
  for (const name of ['punch', 'punch2', 'kick', 'kick2', 'strong']) assert.ok(world.visited.has(name), name);
});

for (const [name, gap, minimum] of [
  ['whirlpool', 45, 5],
  ['waterSurface', 150, 2],
  ['spinDash', 70, 2],
  ['waterWheel', 100, 3],
  ['waterPillar', 150, 4],
  ['nezuko', 100, 1],
  ['zenitsu', 150, 4],
  ['inosuke', 150, 1],
]) {
  test(`tanjiro: ${name} acerta`, () => {
    const world = run(arena(record, 500, 500 + gap), cast(name), 400);
    assert.ok(hits(world).length >= minimum, `${name}: ${hits(world).length} acertos`);
  });
}

test('tanjiro: Primeira Forma que pega vira a rajada de cortes', () => {
  const world = run(arena(record, 500, 700), cast('waterSlash'), 200);
  assert.ok(world.visited.has('waterFlurry'));
  assert.ok(hits(world).length >= 3);
});

test('tanjiro: corte mergulhando no ar', () => {
  const world = arena(record, 500, 560);
  step(world, command({ up: true, jump: true }));
  for (let tick = 0; tick < 6; tick += 1) step(world);
  run(world, command({ punch: true }), 60);
  assert.ok(world.visited.has('airSlash'));
  assert.ok(hits(world).length >= 1);
});

test('tanjiro: Hinokami Kagura segue ate a danca de fogo', () => {
  const world = run(arena(record, 500, 580), cast('hinokami'), 400);
  for (const name of ['hinokamiCombo', 'hinokamiDance']) assert.ok(world.visited.has(name), name);
  assert.ok(hits(world).length >= 5);
});

test('tanjiro: tempestade de cortes', () => {
  const world = run(arena(record, 500, 650), cast('waterDance'), 300);
  for (const name of ['waterDanceStrike', 'waterDanceStorm']) assert.ok(world.visited.has(name), name);
});

test('tanjiro: comandos', () => {
  const feed = (entries) => {
    const detector = new ComboDetector(config.combos);
    let match = null;
    entries.forEach((entry, index) => { match = detector.feed(command(entry), 1, index * 16) ?? match; });
    return match?.animation ?? null;
  };
  assert.equal(feed([{ down: true }, { down: true, right: true }, { right: true, punch: true }]), 'waterSlash');
  assert.equal(feed([{ down: true }, { down: true, left: true }, { left: true, special: true }]), 'waterPillar');
  assert.equal(feed([{ down: true }, { right: true }, { down: true }, { right: true, punch: true }]), 'hinokami');
});

test('tanjiro: todos os sons citados nos golpes existem', () => {
  for (const [name, animation] of Object.entries(config.animations)) {
    for (const event of animation.events ?? []) {
      if (event.sound) assert.ok(config.sounds[event.sound], `${name} pede ${event.sound}`);
    }
  }
});
