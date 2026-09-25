import test from 'node:test';
import assert from 'node:assert/strict';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, assertConfigIntegrity, cast, command, hits, loadRecord, mash, run, step } from './helpers/world.js';

// Killua (pacote "Killua" de Petamynx, estilo J-Stars).
const record = loadRecord('killua');
const { config } = record;

test('killua: frames, efeitos e golpes citados no config existem', () => {
  assertConfigIntegrity(assert, config);
});

for (const [button, expected] of [
  ['punch', ['punch', 'punch2', 'punch3', 'punch4']],
  ['kick', ['kick', 'kick2', 'kick3', 'kick4']],
  ['special', ['strong', 'strong2', 'strong3']],
]) {
  test(`killua: martelar ${button} faz a sequencia`, () => {
    const world = mash(arena(record, 500, 550), button, { ticks: 200, gap: 4 });
    for (const name of expected) assert.ok(world.visited.has(name), name);
  });
}

for (const [name, gap, minimum] of [
  ['sweep', 70, 1],
  ['launcher', 70, 1],
  ['rush', 70, 4],
  ['dashStrike', 100, 1],
  ['throw', 70, 4],
  ['whirlwind', 150, 3],
  ['yoyo', 70, 2],
  ['lightningPalm', 70, 5],
  ['thunderbolt', 100, 1],
  ['rushGrab', 150, 4],
  ['godspeed', 100, 2],
  ['narukami', 220, 1],
  ['kanmuru', 45, 3],
]) {
  test(`killua: ${name} acerta`, () => {
    const world = run(arena(record, 500, 500 + gap), cast(name), 400);
    assert.ok(hits(world).length >= minimum, `${name}: ${hits(world).length} acertos`);
  });
}

test('killua: o ataque final so sai com o oponente abaixo de 1/3 da vida', () => {
  const full = run(arena(record, 500, 560), cast('finale'), 60);
  assert.ok(!full.visited.has('finale'));
  const world = arena(record, 500, 560);
  world.fighters[1].health = 30;
  run(world, cast('finale'), 400);
  assert.ok(world.visited.has('finaleRush'));
  assert.ok(world.fighters[1].health < 30);
});

test('killua: contra-ataque pega quem bate na guarda', () => {
  const world = arena(record, 600, 650, loadRecord('itachi'));
  step(world, cast('counterStance'), command());
  for (let tick = 0; tick < 45; tick += 1) step(world);
  step(world, command(), command({ punch: true }));
  for (let tick = 0; tick < 60; tick += 1) step(world);
  assert.ok(world.visited.has('counterStrike'));
});

test('killua: golpes aereos com ↓', () => {
  const world = arena(record, 500, 560);
  step(world, command({ up: true, jump: true }));
  for (let tick = 0; tick < 6; tick += 1) step(world);
  run(world, command({ combo: { animation: 'airUpper', airAnimation: 'airUpper' } }), 60);
  assert.ok(hits(world).length >= 1);
});

test('killua: comandos', () => {
  const feed = (entries) => {
    const detector = new ComboDetector(config.combos);
    let match = null;
    entries.forEach((entry, index) => { match = detector.feed(command(entry), 1, index * 16) ?? match; });
    return match?.animation ?? null;
  };
  assert.equal(feed([{ down: true }, { down: true, right: true }, { right: true, punch: true }]), 'whirlwind');
  assert.equal(feed([{ down: true }, { down: true, left: true }, { left: true, special: true }]), 'rushGrab');
  assert.equal(feed([{ down: true }, { right: true }, { down: true }, { right: true, kick: true }]), 'narukami');
});

test('killua: todos os sons citados nos golpes existem', () => {
  for (const [name, animation] of Object.entries(config.animations)) {
    for (const event of animation.events ?? []) {
      if (event.sound) assert.ok(config.sounds[event.sound], `${name} pede ${event.sound}`);
    }
  }
});
