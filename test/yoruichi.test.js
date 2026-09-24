import test from 'node:test';
import assert from 'node:assert/strict';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, assertConfigIntegrity, cast, command, hits, loadRecord, run, step } from './helpers/world.js';

// Yoruichi (pacote MUGEN do Bleach Mugen Project): golpes fraco/medio/forte,
// especiais nas tres forcas, super, flash step, dash aereo.
const record = loadRecord('yoruichi');
const { config } = record;

test('yoruichi: frames, efeitos e golpes citados no config existem', () => {
  assertConfigIntegrity(assert, config);
});

test('yoruichi: fraco -> medio -> forte encadeia ao conectar', () => {
  const world = arena(record, 600, 640);
  const presses = { 0: { punch: true }, 8: { kick: true }, 16: { kick: true }, 26: { special: true }, 34: { special: true } };
  for (let tick = 0; tick < 120; tick += 1) step(world, command(presses[tick] ?? {}));
  for (const name of ['punch', 'kick', 'strong']) assert.ok(world.visited.has(name), name);
  assert.ok(hits(world).length >= 3);
});

test('yoruichi: agachada encadeia fraco -> medio -> rasteira', () => {
  const world = arena(record, 600, 640);
  const presses = { 0: { punch: true, down: true }, 9: { kick: true, down: true }, 20: { special: true, down: true }, 30: { special: true, down: true } };
  const detector = new ComboDetector(config.combos);
  for (let tick = 0; tick < 120; tick += 1) {
    const cmd = command({ down: true, ...(presses[tick] ?? {}) });
    cmd.combo = detector.feed(cmd, 1, tick * 16);
    step(world, cmd);
  }
  for (const name of ['crouchLight', 'crouchMedium', 'crouchStrong']) assert.ok(world.visited.has(name), name);
});

test('yoruichi: golpe normal cancela no especial ao conectar', () => {
  const world = arena(record, 600, 640);
  step(world, command({ punch: true }));
  for (let tick = 0; tick < 8; tick += 1) step(world);
  step(world, command({ combo: { animation: 'orukaLight' } }));
  assert.equal(world.fighters[0].animation.name, 'orukaLight');
});

test('yoruichi: as kunais do Anken abrem em leque e disparam no oponente de longe', () => {
  for (const [name, count] of [['ankenLight', 3], ['ankenMedium', 5], ['ankenStrong', 7]]) {
    const world = run(arena(record, 350, 800), cast(name), 15);
    assert.equal(world.effects.effects.filter((effect) => effect.spawn.id === 'kunai').length, count, name);
    run(world, command(), 250);
    assert.ok(hits(world).length >= 2, `${name}: ${hits(world).length} kunais acertaram`);
  }
});

test('yoruichi: Kokubyouenbu avanca e, se pegar, vira a rajada com o clone', () => {
  const world = run(arena(record, 400, 700), cast('kokuStrong'), 200);
  assert.ok(world.visited.has('kokuFlurry'));
  assert.ok(hits(world).length >= 4, `${hits(world).length} acertos`);
});

test('yoruichi: Kokubyouenbu que erra termina deslizando', () => {
  const world = run(arena(record, 300, 980), cast('kokuLight'), 80);
  assert.ok(!world.visited.has('kokuFlurry'));
  assert.ok(world.visited.has('kokuSlideLight'));
});

test('yoruichi: Oruka Mono sobe chutando (forte = varios acertos)', () => {
  const world = run(arena(record, 600, 640), cast('orukaStrong'), 150);
  assert.ok(hits(world).length >= 4, `${hits(world).length} acertos`);
  assert.equal(world.fighters[0].grounded, true, 'volta ao chao');
});

test('yoruichi: Owarija agarra (passa pela defesa) e arremessa', () => {
  // O rival defende agachado (parado no lugar): o agarrao passa mesmo assim.
  const world = arena(record, 600, 630);
  for (let tick = 0; tick < 80; tick += 1) step(world, tick === 0 ? cast('owarija') : command(), command({ right: true, down: true }));
  assert.ok(world.visited.has('owarijaThrow'));
  assert.ok(world.fighters[1].health <= config.stats.maxHealth - 5);
});

test('yoruichi: Bakamonoga e a rajada de 12 golpes', () => {
  const world = run(arena(record, 400, 640), cast('bakamonoga'), 300);
  assert.ok(world.visited.has('bakaFlurry'));
  assert.ok(hits(world).length >= 12, `${hits(world).length} acertos`);
});

test('yoruichi: flash step atravessa e emenda num golpe', () => {
  const world = arena(record, 560, 620);
  step(world, command({ combo: { animation: 'dashForward', movement: true } }));
  for (let tick = 0; tick < 6; tick += 1) step(world);
  assert.equal(world.fighters[0].state, 'dash');
  step(world, command({ punch: true }));
  assert.equal(world.fighters[0].animation.name, 'punch', 'cancela no golpe');
});

test('yoruichi: dash aereo com toque duplo no ar', () => {
  const world = arena(record, 400, 800);
  step(world, command({ up: true, jump: true }));
  for (let tick = 0; tick < 6; tick += 1) step(world);
  const before = world.fighters[0].x;
  step(world, command({ combo: { animation: 'dashForward', movement: true } }));
  assert.equal(world.fighters[0].animation.name, 'airDashForward');
  for (let tick = 0; tick < 20; tick += 1) step(world);
  assert.ok(world.fighters[0].x - before > 60, `andou ${(world.fighters[0].x - before).toFixed(0)}px`);
});

test('yoruichi: comandos das tres forcas', () => {
  const feed = (entries) => {
    const detector = new ComboDetector(config.combos);
    let match = null;
    entries.forEach((entry, index) => { match = detector.feed(command(entry), 1, index * 16) ?? match; });
    return match?.animation ?? null;
  };
  assert.equal(feed([{ down: true }, { down: true, right: true }, { right: true, kick: true }]), 'ankenMedium');
  assert.equal(feed([{ left: true }, { down: true }, { down: true, right: true }, { right: true, special: true }]), 'kokuStrong');
  assert.equal(feed([{ down: true }, {}, { up: true, punch: true }]), 'orukaLight');
  assert.equal(feed([{ right: true }, { down: true }, { right: true, punch: true }]), 'owarija');
  assert.equal(feed([{ down: true }, { right: true }, { down: true }, { right: true, kick: true }]), 'bakamonoga');
});
