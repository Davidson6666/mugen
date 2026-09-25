import test from 'node:test';
import assert from 'node:assert/strict';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, assertConfigIntegrity, cast, command, hits, loadRecord, mash, run, step } from './helpers/world.js';

// Gojo (pacote "WR-Gojo"): as sequencias, os seis especiais, Guard Break,
// Black Flash e os tres supers.
const record = loadRecord('gojo');
const { config } = record;

test('gojo: frames, efeitos e golpes citados no config existem', () => {
  assertConfigIntegrity(assert, config);
});

test('gojo: sequencia do soco vai ate o quinto golpe', () => {
  const world = mash(arena(record, 600, 640), 'punch', { ticks: 300, gap: 4 });
  for (const name of ['punch', 'punch2', 'punch3', 'punch4', 'punch5']) assert.ok(world.visited.has(name), name);
});

test('gojo: chute e especial encadeiam', () => {
  const kick = mash(arena(record, 600, 640), 'kick', { ticks: 80, gap: 4 });
  assert.ok(kick.visited.has('kick2'));
  const strong = mash(arena(record, 600, 640), 'special', { ticks: 160, gap: 4 });
  assert.ok(strong.visited.has('strong2'));
  assert.ok(hits(strong).length >= 5, `${hits(strong).length} acertos`);
});

for (const [name, [leftX, rightX], ticks, minimum] of [
  ['windBurst', [400, 700], 120, 1],
  ['blueStrafe', [560, 640], 90, 3],
  ['blueMax', [400, 700], 250, 3],
  ['redReversal', [400, 700], 250, 3],
  ['blueField', [560, 640], 200, 3],
  ['blackFlash', [480, 640], 150, 1],
  ['guardBreak', [540, 640], 80, 1],
  ['redBlast', [400, 700], 250, 5],
  ['hollowPurple', [400, 800], 320, 3],
]) {
  test(`gojo: ${name} acerta`, () => {
    const world = run(arena(record, leftX, rightX), cast(name), ticks);
    assert.ok(hits(world).length >= minimum, `${name}: ${hits(world).length} acertos`);
  });
}

test('gojo: Red Counter - quem bate leva o vermelho', () => {
  const world = arena(record, 600, 640, loadRecord('itachi'));
  step(world, cast('redCounter'), command());
  for (let tick = 0; tick < 10; tick += 1) step(world);
  step(world, command(), command({ punch: true }));
  for (let tick = 0; tick < 100; tick += 1) step(world);
  assert.ok(world.visited.has('redCounterStrike'));
  assert.ok(world.fighters[1].health < config.stats.maxHealth - 5, `vida ${world.fighters[1].health}`);
});

test('gojo: Infinite Void prende o oponente e drena a vida', () => {
  const world = run(arena(record, 400, 700), cast('infiniteVoid'), 420);
  assert.ok(world.fighters[1].health <= config.stats.maxHealth - 10, `vida ${world.fighters[1].health}`);
  assert.ok(world.effects.effects.length === 0 || !world.effects.effects.some((effect) => effect.spawn.id === 'voidWorld'), 'o dominio acaba');
});

test('gojo: comandos', () => {
  const feed = (entries) => {
    const detector = new ComboDetector(config.combos);
    let match = null;
    entries.forEach((entry, index) => { match = detector.feed(command(entry), 1, index * 16) ?? match; });
    return match?.animation ?? null;
  };
  assert.equal(feed([{ down: true }, { down: true, right: true }, { right: true, kick: true }]), 'blueStrafe');
  assert.equal(feed([{ down: true }, { right: true }, { down: true }, { right: true, special: true }]), 'infiniteVoid');
  assert.equal(feed([{ down: true }, {}, { down: true, special: true }]), 'blackFlash');
});

test('gojo: esquivas ficam intocaveis; a da frente atravessa o oponente', () => {
  const rival = loadRecord('itachi');
  const world = arena(record, 600, 650, rival);
  step(world, cast('spotDodge'), command());
  step(world, command(), command({ punch: true }));
  for (let tick = 0; tick < 25; tick += 1) step(world);
  assert.equal(world.fighters[0].health, config.stats.maxHealth, 'a esquiva no lugar nao leva o soco');

  const through = run(arena(record, 560, 640), cast('dodgeForward'), 20);
  assert.ok(through.fighters[0].x > through.fighters[1].x, 'passou para o outro lado');
});

test('gojo: parry empurra quem bateu', () => {
  const world = arena(record, 600, 640, loadRecord('itachi'));
  step(world, cast('parry'), command());
  step(world, command(), command({ punch: true }));
  for (let tick = 0; tick < 40; tick += 1) step(world);
  assert.ok(world.visited.has('parryPush'));
  assert.equal(world.fighters[0].health, config.stats.maxHealth);
});

test('gojo: agarrao passa pela defesa e bate varias vezes', () => {
  const world = arena(record, 600, 640);
  for (let tick = 0; tick < 120; tick += 1) step(world, tick === 0 ? cast('grab') : command(), command({ right: true, down: true }));
  assert.ok(world.visited.has('grabCombo'));
  assert.ok(hits(world).length >= 5, `${hits(world).length} acertos`);
});

test('gojo: Origin Mode liga quando o medidor enche: cura, dano maior, e acaba sozinho', () => {
  const world = arena(record, 400, 800);
  const [gojo] = world.fighters;
  gojo.health = 40;
  gojo.awakeGauge = config.awakening.gauge;
  step(world);
  assert.equal(gojo.mode, 'origin');
  assert.ok(gojo.health > 50, `vida ${gojo.health}`);
  assert.ok(gojo.damageScale > 1);
  for (let tick = 0; tick < config.awakening.gauge / config.awakening.drain + 5; tick += 1) step(world);
  assert.equal(gojo.mode, null, 'o modo acabou');
});

test('gojo: no Origin Mode os golpes normais continuam e o Hollow Nuke aparece', () => {
  const detector = new ComboDetector(config.combos);
  const feedNuke = (modes) => {
    detector.reset();
    [{ down: true }, { down: true, left: true }, { left: true }, { down: true }, { down: true, left: true }, { left: true, special: true }]
      .forEach((entry, index) => { detector.feed(command(entry), 1, index * 16, modes); });
    return detector.feed(command({ left: true, special: true }), 1, 96, modes)?.animation ?? null;
  };
  const feedBlue = (modes) => {
    detector.reset();
    detector.feed(command({ down: true }), 1, 0, modes);
    detector.feed(command({ down: true, right: true }), 1, 16, modes);
    return detector.feed(command({ right: true, kick: true }), 1, 32, modes)?.animation ?? null;
  };
  assert.equal(feedBlue([null, 'origin']), 'blueStrafe');
  assert.notEqual(feedNuke(null), 'hollowNuke');
});

test('gojo: Hollow Nuke so com o oponente abaixo de 1/3 da vida, e acaba com ele', () => {
  const healthy = arena(record, 500, 700);
  step(healthy, cast('hollowNuke'));
  assert.notEqual(healthy.fighters[0].animation.name, 'hollowNuke');

  const world = arena(record, 500, 700);
  world.fighters[1].health = 30;
  run(world, cast('hollowNuke'), 330);
  for (const name of ['hollowNuke', 'nukeRed', 'nukeBlast']) assert.ok(world.visited.has(name), name);
  assert.equal(world.fighters[1].health, 0);
});
