import test from 'node:test';
import assert from 'node:assert/strict';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, assertConfigIntegrity, cast, command, hits, loadRecord, mash, run, step } from './helpers/world.js';

// Escanor (pacote MUGEN "Escanor RSK OP"): sequencias de A e B, golpes de
// segurar e soltar, e o modo The One.
const record = loadRecord('escanor');
const { config } = record;

test('escanor: frames, efeitos e golpes citados no config existem', () => {
  assertConfigIntegrity(assert, config);
});

test('escanor: martelando A a sequencia vai do 200 ao 203', () => {
  const world = mash(arena(record, 600, 640), 'punch', { ticks: 300, gap: 5 });
  for (const name of ['punch', 'punch2', 'punch3', 'punch4']) assert.ok(world.visited.has(name), name);
  assert.ok(hits(world).length >= 5, `${hits(world).length} acertos`);
});

test('escanor: sequencia de B fecha jogando o oponente longe', () => {
  const world = mash(arena(record, 500, 540), 'kick', { ticks: 200, gap: 5 });
  for (const name of ['kick', 'kick2', 'kick3']) assert.ok(world.visited.has(name), name);
  assert.ok(world.fighters[1].x - 540 > 80, `o oponente andou ${(world.fighters[1].x - 540).toFixed(0)}px`);
});

test('escanor: A e B cruzam na sequencia', () => {
  const world = arena(record, 600, 640);
  const presses = { 0: { punch: true }, 36: { kick: true } };
  for (let tick = 0; tick < 120; tick += 1) step(world, command(presses[tick] ?? {}));
  assert.ok(world.visited.has('punch') && world.visited.has('kick'));
});

test('escanor: segurar C carrega; soltar dispara a onda de energia', () => {
  const world = arena(record, 350, 800);
  step(world, command({ special: true, holding: { special: true } }));
  for (let tick = 0; tick < 30; tick += 1) step(world, command({ holding: { special: true } }));
  assert.equal(world.fighters[0].animation.name, 'special', 'ainda carregando');
  for (let tick = 0; tick < 200; tick += 1) step(world);
  assert.ok(world.visited.has('energyWave'));
  assert.ok(hits(world).length > 0, 'a onda alcanca de longe');
});

for (const [name, [leftX, rightX], ticks] of [
  ['sunRush', [500, 640], 200],
  ['sunDrop', [450, 600], 200],
  ['fireWave', [350, 800], 200],
  ['cruelSun', [350, 800], 250],
  ['sunRain', [500, 640], 400],
  ['prideFlash', [600, 650], 250],
  ['stunStrike', [600, 640], 120],
]) {
  test(`escanor: ${name} acerta`, () => {
    const world = run(arena(record, leftX, rightX), cast(name), ticks);
    assert.ok(hits(world).length > 0, `${name} nao acertou`);
  });
}

test('escanor: na postura de contra-ataque, apanhar dispara o contra', () => {
  const rival = loadRecord('itachi');
  const world = arena(record, 600, 640, rival);
  step(world, cast('sunCounter'), command());
  for (let tick = 0; tick < 20; tick += 1) step(world, command({ holding: { punch: true } }));
  for (let tick = 0; tick < 40; tick += 1) {
    step(world, command({ holding: { punch: true } }), command(tick === 0 ? { punch: true } : {}));
  }
  assert.ok(world.visited.has('sunStrike'), 'o contra saiu');
  assert.ok(world.results.some((result) => result.outcome === 'evade'), 'o golpe do rival nao pegou');
});

test('escanor: agarrao de ↓+A derruba', () => {
  const world = run(arena(record, 600, 640), cast('grab'), 150);
  assert.ok(world.visited.has('grabSlam'));
  assert.ok(world.fighters[1].health < config.stats.maxHealth - 3);
});

test('escanor: na metade do round vira The One e troca de golpes', () => {
  const world = arena(record, 400, 800);
  world.fighters[0].roundClock = config.modes.theOne.after;
  for (let tick = 0; tick < 130; tick += 1) step(world);
  const [escanor] = world.fighters;
  assert.equal(escanor.mode, 'theOne');
  assert.equal(escanor.animation.name, 'theOneIdle');
  step(world, command({ punch: true }));
  assert.equal(escanor.animation.name, 'theOnePunch');
});

test('escanor: combos do The One so valem no modo', () => {
  const detector = new ComboDetector(config.combos);
  const feed = (mode) => {
    detector.reset();
    detector.feed(command({ down: true }), 1, 0, mode);
    detector.feed(command(), 1, 16, mode);
    detector.feed(command({ down: true }), 1, 32, mode);
    return detector.feed(command({ down: true, kick: true }), 1, 48, mode)?.animation ?? null;
  };
  assert.notEqual(feed(null), 'divineSword');
  assert.equal(feed('theOne'), 'divineSword');
});

test('escanor: The One - sequencia de A e Divine Sword', () => {
  const chain = arena(record, 600, 640);
  chain.fighters[0].mode = 'theOne';
  mash(chain, 'punch', { ticks: 200, gap: 5 });
  for (const name of ['theOnePunch', 'theOnePunch2', 'theOnePunch3']) assert.ok(chain.visited.has(name), name);

  const sword = arena(record, 560, 640);
  sword.fighters[0].mode = 'theOne';
  run(sword, cast('divineSword'), 100);
  assert.ok(hits(sword).some((result) => result.heavy), 'o golpe forte da espada pegou');
});

test('escanor: The One - agarrao ergue e bate varias vezes', () => {
  const world = arena(record, 600, 640);
  world.fighters[0].mode = 'theOne';
  run(world, cast('theOneGrab'), 200);
  assert.ok(world.visited.has('theOneLift'));
  assert.ok(hits(world).length >= 5, `${hits(world).length} acertos`);
});

test('escanor: The One - sol teleguiado e golpe final', () => {
  const sun = arena(record, 350, 800);
  sun.fighters[0].mode = 'theOne';
  run(sun, cast('theOneSun'), 250);
  assert.ok(hits(sun).length > 0, 'o sol mira e acerta');

  const finisher = arena(record, 600, 650);
  finisher.fighters[0].mode = 'theOne';
  run(finisher, cast('theOneFinisher'), 150);
  assert.ok(hits(finisher).length >= 2);
});
