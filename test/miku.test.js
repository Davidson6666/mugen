import test from 'node:test';
import assert from 'node:assert/strict';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, assertConfigIntegrity, cast, command, hits, loadRecord, run, step } from './helpers/world.js';

// Miku (pacote "HATSUNE MIKU" de YU-TOHARU): normais, especiais e o super
// Hatsune Music.
const record = loadRecord('miku');
const { config } = record;

test('miku: frames, efeitos e golpes citados no config existem', () => {
  assertConfigIntegrity(assert, config);
});

test('miku: fraco -> medio -> forte encadeia ao conectar', () => {
  const world = arena(record, 600, 650);
  const presses = { 0: { punch: true }, 10: { kick: true }, 24: { special: true } };
  for (let tick = 0; tick < 100; tick += 1) step(world, command(presses[tick] ?? {}));
  for (const name of ['punch', 'kick', 'strong']) assert.ok(world.visited.has(name), name);
});

for (const [name, [leftX, rightX], ticks, minimum] of [
  ['voiceLight', [400, 650], 90, 1],
  ['voiceStrong', [400, 650], 120, 2],
  ['negiShoryu', [600, 650], 60, 1],
  ['negiIssen', [450, 650], 60, 1],
  ['thunderLeek', [560, 650], 70, 1],
  ['fireLeek', [560, 650], 70, 1],
  ['iceLeek', [560, 650], 70, 1],
  ['gokutoken', [580, 650], 60, 2],
  ['nendoroid', [560, 660], 120, 1],
  ['negiRocket', [400, 700], 120, 1],
  ['music', [400, 700], 220, 4],
  ['leekDive', [580, 650], 40, 1],
  ['flyingKick', [580, 660], 40, 1],
]) {
  test(`miku: ${name} acerta`, () => {
    const world = run(arena(record, leftX, rightX), cast(name), ticks);
    assert.ok(hits(world).length >= minimum, `${name}: ${hits(world).length} acertos`);
  });
}

test('miku: Hatsune-san Pinch - apanhar na postura derruba as mini-Mikus', () => {
  const world = arena(record, 600, 640, loadRecord('itachi'));
  step(world, cast('pinch'), command());
  for (let tick = 0; tick < 10; tick += 1) step(world);
  step(world, command(), command({ punch: true }));
  for (let tick = 0; tick < 80; tick += 1) step(world);
  assert.ok(world.visited.has('pinchRain'));
  assert.ok(hits(world).length >= 2, `${hits(world).length} acertos`);
});

test('miku: Super Miku Kick no ar', () => {
  const world = arena(record, 500, 640);
  step(world, command({ up: true, jump: true }));
  for (let tick = 0; tick < 8; tick += 1) step(world);
  step(world, command({ combo: { animation: 'nendoroid', airAnimation: 'superKick' } }));
  for (let tick = 0; tick < 50; tick += 1) step(world);
  assert.ok(world.visited.has('superKick'));
});

test('miku: comandos', () => {
  const feed = (entries) => {
    const detector = new ComboDetector(config.combos);
    let match = null;
    entries.forEach((entry, index) => { match = detector.feed(command(entry), 1, index * 16) ?? match; });
    return match?.animation ?? null;
  };
  assert.equal(feed([{ down: true }, { down: true, right: true }, { right: true, punch: true }]), 'voiceLight');
  assert.equal(feed([{ left: true }, { down: true }, { right: true, kick: true }]), 'fireLeek');
  assert.equal(feed([{ right: true }, { down: true }, { right: true, special: true }]), 'negiShoryu');
});

test('miku: Hatsune Music sorteia uma musica e pede o som dela', () => {
  const seen = new Set();
  for (let tries = 0; tries < 30; tries += 1) {
    const world = arena(record, 400, 700);
    step(world, cast('music'));
    const [miku] = world.fighters;
    assert.match(miku.animation.name, /^song18\d\d$/);
    seen.add(miku.animation.name);
    const [request] = miku.pendingSounds;
    assert.ok(request?.stopWithMove, 'a musica para se o golpe for interrompido');
    assert.ok(config.sounds[request.key], `arquivo do som ${request.key}`);
  }
  assert.ok(seen.size > 3, `so ${seen.size} musicas diferentes em 30 tentativas`);
});

test('miku: as notas das musicas acertam no compasso', () => {
  const world = run(arena(record, 400, 700), cast('music'), 520);
  assert.ok(hits(world).length >= 6, `${hits(world).length} acertos`);
});

test('miku: Nico Nico All Stars toca uma musica e entra em recarga', () => {
  const world = arena(record, 400, 700);
  step(world, cast('nicoNico'));
  assert.match(world.fighters[0].animation.name, /^song(18|19|20|21)\d\d$/);
  assert.ok(world.fighters[0].isOnCooldown('nicoNico'));
});

test('miku: Ievan Polkka prende o oponente e acerta no ritmo', () => {
  const world = run(arena(record, 400, 700), cast('ievanPolkka'), 620);
  assert.ok(hits(world).length >= 14, `${hits(world).length} acertos`);
  assert.equal(world.fighters[0].pendingSounds[0]?.key, 'ievan', 'pediu a musica');
});

test('miku: Cinderella Romance - a boneca pega, o baile e a cebolinha gigante', () => {
  const world = run(arena(record, 400, 650), cast('cinderella'), 560);
  for (const name of ['cinderellaBall', 'cinderellaEnd']) assert.ok(world.visited.has(name), name);
  assert.ok(world.fighters[1].health <= config.stats.maxHealth - 20, `vida ${world.fighters[1].health}`);
});

test('miku: todos os sons citados nos golpes existem', () => {
  for (const [name, animation] of Object.entries(config.animations)) {
    for (const event of animation.events ?? []) {
      if (event.sound) assert.ok(config.sounds[event.sound], `${name} pede ${event.sound}`);
    }
  }
});
