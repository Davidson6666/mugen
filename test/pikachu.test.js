import test from 'node:test';
import assert from 'node:assert/strict';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, assertConfigIntegrity, cast, command, hits, loadRecord, run, step } from './helpers/world.js';

// Pikachu (pacote "SC_Pikachu"): normais, especiais com as versoes EX e os
// tres supers.
const record = loadRecord('pikachu');
const { config } = record;

test('pikachu: frames, efeitos e golpes citados no config existem', () => {
  assertConfigIntegrity(assert, config);
});

test('pikachu: soco -> cauda -> cabecada encadeia ao conectar', () => {
  const world = arena(record, 500, 545);
  const presses = { 0: { punch: true }, 8: { kick: true }, 22: { special: true } };
  for (let tick = 0; tick < 80; tick += 1) step(world, command(presses[tick] ?? {}));
  for (const name of ['punch', 'kick', 'headbutt']) assert.ok(world.visited.has(name), name);
});

for (const [name, gap, minimum] of [
  ['crouchPunch', 45, 1],
  ['crouchSlide', 100, 1],
  ['upper', 70, 1],
  ['thunderJolt', 300, 1],
  ['thunderJoltFast', 300, 1],
  ['electroBall', 300, 1],
  ['thunderNear', 70, 1],
  ['thunderFar', 150, 1],
  ['thunderSelf', 45, 2],
  ['ironTail', 100, 2],
  ['thunderPunch', 70, 1],
  ['thunderPunchEx', 100, 2],
  ['thundershock', 45, 5],
  ['voltTackle', 220, 10],
  ['thunderbolt', 300, 15],
]) {
  test(`pikachu: ${name} acerta`, () => {
    const world = run(arena(record, 500, 500 + gap), cast(name), 400);
    assert.ok(hits(world).length >= minimum, `${name}: ${hits(world).length} acertos`);
  });
}

test('pikachu: chute no ar', () => {
  const world = arena(record, 500, 560);
  step(world, command({ up: true, jump: true }));
  for (let tick = 0; tick < 6; tick += 1) step(world);
  run(world, command({ combo: { animation: 'airKick', airAnimation: 'airKick' } }), 60);
  assert.ok(hits(world).length >= 1);
});

test('pikachu: Iron Tail EX aterrissa na explosao', () => {
  const world = run(arena(record, 500, 650), cast('ironTailEx'), 200);
  assert.ok(world.visited.has('ironTailBlast'));
});

test('pikachu: Volt Tackle carrega, atropela e explode', () => {
  const world = run(arena(record, 500, 600), cast('voltTackle'), 400);
  for (const name of ['voltDash', 'voltFinish']) assert.ok(world.visited.has(name), name);
});

test('pikachu: comandos', () => {
  const feed = (entries) => {
    const detector = new ComboDetector(config.combos);
    let match = null;
    entries.forEach((entry, index) => { match = detector.feed(command(entry), 1, index * 16) ?? match; });
    return match?.animation ?? null;
  };
  assert.equal(feed([{ down: true }, { down: true, right: true }, { right: true, punch: true }]), 'thunderJolt');
  assert.equal(feed([{ down: true }, { down: true, left: true }, { left: true, kick: true }]), 'thunderFar');
  assert.equal(feed([{ right: true }, { down: true }, { right: true, punch: true }]), 'thunderPunch');
  assert.equal(feed([{ down: true }, { right: true }, { down: true }, { right: true, special: true }]), 'thunderbolt');
});

test('pikachu: todos os sons citados nos golpes existem', () => {
  for (const [name, animation] of Object.entries(config.animations)) {
    for (const event of animation.events ?? []) {
      if (event.sound) assert.ok(config.sounds[event.sound], `${name} pede ${event.sound}`);
    }
  }
});
