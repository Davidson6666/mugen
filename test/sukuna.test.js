import test from 'node:test';
import assert from 'node:assert/strict';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, assertConfigIntegrity, cast, command, hits, loadRecord, mash, run } from './helpers/world.js';

// Sukuna (pacote "Unfair Sukuna"): caixas de acerto declaradas no lugar dos
// projeteis do tamanho da tela do pacote.
const record = loadRecord('sukuna');
const { config } = record;

test('sukuna: frames, efeitos e golpes citados no config existem', () => {
  assertConfigIntegrity(assert, config);
});

test('sukuna: parado nao machuca (o pacote marca o corpo como ataque)', () => {
  const world = run(arena(record, 600, 630), command(), 120);
  assert.equal(hits(world).length, 0);
  assert.equal(config.animations.idle.hits, undefined);
});

test('sukuna: de longe, o soco nao acerta (sem golpe do tamanho da tela)', () => {
  const world = run(arena(record, 300, 900), command({ punch: true }), 40);
  assert.equal(hits(world).length, 0);
});

for (const [button, names] of [
  ['punch', ['punch', 'punch2', 'punch3']],
  ['kick', ['kick', 'kick2', 'kick3']],
  ['special', ['strong', 'strong2', 'strong3']],
]) {
  test(`sukuna: sequencia do ${button}`, () => {
    const world = mash(arena(record, 600, 640), button, { ticks: 200, gap: 4 });
    for (const name of names) assert.ok(world.visited.has(name), name);
  });
}

for (const [name, [leftX, rightX], ticks, minimum] of [
  ['stomp', [580, 640], 60, 1],
  ['dismantle', [400, 700], 100, 1],
  ['cleave', [560, 660], 60, 2],
  ['fuga', [400, 700], 200, 2],
  ['fireComets', [450, 650], 150, 1],
  ['fireballs', [400, 700], 150, 2],
]) {
  test(`sukuna: ${name} acerta`, () => {
    const world = run(arena(record, leftX, rightX), cast(name), ticks);
    assert.ok(hits(world).length >= minimum, `${name}: ${hits(world).length} acertos`);
  });
}

test('sukuna: arranque do coracao segura e fecha', () => {
  const world = run(arena(record, 450, 640), cast('heartRip'), 150);
  for (const name of ['heartHold', 'heartFinish']) assert.ok(world.visited.has(name), name);
  assert.ok(world.fighters[1].health <= config.stats.maxHealth - 15);
});

test('sukuna: Malevolent Shrine prende o oponente sob os cortes', () => {
  const world = run(arena(record, 400, 700), cast('shrine'), 260);
  assert.ok(hits(world).length >= 10, `${hits(world).length} acertos`);
  assert.ok(world.fighters[1].health <= config.stats.maxHealth - 20, `vida ${world.fighters[1].health}`);
});

test('sukuna: comandos', () => {
  const feed = (entries) => {
    const detector = new ComboDetector(config.combos);
    let match = null;
    entries.forEach((entry, index) => { match = detector.feed(command(entry), 1, index * 16) ?? match; });
    return match?.animation ?? null;
  };
  assert.equal(feed([{ down: true }, { down: true, right: true }, { right: true, punch: true }]), 'dismantle');
  assert.equal(feed([{ down: true }, { right: true }, { down: true }, { right: true, punch: true }]), 'shrine');
});

// ---- Forma Yuji (↓↓K troca) ----
const asYuji = (world) => {
  world.fighters[0].mode = 'yuji';
  return world;
};

test('sukuna: ↓↓K troca para o Yuji e de volta', () => {
  const world = run(arena(record, 400, 800), cast('toYuji'), 40);
  assert.equal(world.fighters[0].mode, 'yuji');
  assert.equal(world.fighters[0].animation.name, 'yujiIdle');
  run(world, cast('toSukuna'), 70);
  assert.equal(world.fighters[0].mode, null);
  assert.equal(world.fighters[0].animation.name, 'idle');
});

test('sukuna: os combos de cada forma so valem nela', () => {
  const feed = (mode) => {
    const detector = new ComboDetector(config.combos);
    let match = null;
    [{ down: true }, { down: true, right: true }, { right: true, special: true }]
      .forEach((entry, index) => { match = detector.feed(command(entry), 1, index * 16, mode) ?? match; });
    return match?.animation ?? null;
  };
  assert.equal(feed(null), 'fireComets');
  assert.equal(feed('yuji'), 'yujiBlackFlash');
});

for (const [button, names] of [
  ['punch', ['yujiPunch', 'yujiPunch2', 'yujiPunch3']],
  ['kick', ['yujiKick', 'yujiKick2', 'yujiKick3']],
]) {
  test(`sukuna (Yuji): sequencia do ${button}`, () => {
    const world = mash(asYuji(arena(record, 600, 640)), button, { ticks: 200, gap: 4 });
    for (const name of names) assert.ok(world.visited.has(name), name);
  });
}

for (const [name, [leftX, rightX], ticks, minimum] of [
  ['yujiStrong', [580, 640], 40, 1],
  ['yujiThrow', [400, 700], 80, 1],
  ['yujiRush', [450, 700], 90, 1],
  ['yujiGroundWave', [450, 650], 150, 2],
  ['yujiGrab', [500, 640], 120, 2],
  ['yujiBlackFlash', [450, 650], 100, 1],
]) {
  test(`sukuna (Yuji): ${name} acerta`, () => {
    const world = run(asYuji(arena(record, leftX, rightX)), cast(name), ticks);
    assert.ok(hits(world).length >= minimum, `${name}: ${hits(world).length} acertos`);
  });
}
