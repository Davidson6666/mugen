import test from 'node:test';
import assert from 'node:assert/strict';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, assertConfigIntegrity, cast, command, hits, loadRecord, run, step } from './helpers/world.js';

// Unohana (pacote MUGEN "RetsuUnohana"): sequencia de corte, especiais de
// meia-lua, golpes de segurar para baixo, cura e Bankai.
const record = loadRecord('unohana');
const { config } = record;

test('unohana: frames, efeitos e golpes citados no config existem', () => {
  assertConfigIntegrity(assert, config);
});

test('unohana: sprite pequeno do pacote ampliado para a altura do elenco', () => {
  assert.equal(config.spriteScale, 1.7);
});

test('unohana: a, a, b, b encadeia e c fecha', () => {
  const world = arena(record, 600, 640);
  const presses = { 0: { punch: true }, 12: { punch: true }, 24: { kick: true }, 36: { kick: true }, 48: { special: true } };
  for (let tick = 0; tick < 140; tick += 1) step(world, command(presses[tick] ?? {}));
  for (const name of ['punch', 'punch2', 'kick', 'kick2', 'strong']) assert.ok(world.visited.has(name), name);
  assert.ok(hits(world).length >= 5, `${hits(world).length} acertos`);
});

for (const [name, [leftX, rightX], ticks, minimum] of [
  ['flyingBlades', [400, 700], 150, 1],
  ['byakurai', [560, 680], 120, 2],
  ['tornado', [600, 660], 120, 2],
  ['bladeRain', [400, 700], 200, 2],
  ['phantomSlash', [400, 640], 120, 1],
  ['risingSlash', [500, 640], 80, 1],
]) {
  test(`unohana: ${name} acerta`, () => {
    const world = run(arena(record, leftX, rightX), cast(name), ticks);
    assert.ok(hits(world).length >= minimum, `${name}: ${hits(world).length} acertos`);
  });
}

test('unohana: cinturao e Rikujokoro prendem o oponente', () => {
  for (const name of ['bindingBelt', 'rikujokoro']) {
    const world = run(arena(record, 560, 640), cast(name), 70);
    assert.ok(hits(world).length > 0, `${name} pegou`);
    assert.equal(world.fighters[1].state, 'hitstun', `${name}: ainda preso`);
  }
});

test('unohana: Danku segura o projetil do oponente', () => {
  const rival = loadRecord('unohana');
  const world = arena(record, 400, 800, rival);
  step(world, cast('danku'), command());
  for (let tick = 0; tick < 60; tick += 1) step(world);
  step(world, command(), cast('flyingBlades'));
  // Sem a parede, as laminas do rival pegariam.
  for (let tick = 0; tick < 120; tick += 1) step(world);
  assert.equal(world.fighters[0].health, config.stats.maxHealth, 'nenhuma lamina passou');
  assert.ok(world.effects.effects.some((effect) => effect.spawn.id === 'dankuWall'), 'a parede segue de pe');
});

test('unohana: Minazuki cura', () => {
  const world = arena(record, 400, 800);
  world.fighters[0].health = 50;
  run(world, cast('minazuki'), 200);
  assert.ok(world.fighters[0].health >= 58, `vida ${world.fighters[0].health}`);
});

test('unohana: Bankai prende o oponente e fecha no golpe final', () => {
  const world = run(arena(record, 600, 650), cast('bankai'), 320);
  for (const name of ['bankaiCharge', 'bankaiSlash']) assert.ok(world.visited.has(name), name);
  assert.ok(world.fighters[1].health <= config.stats.maxHealth - 25, `vida ${world.fighters[1].health}`);
});

test('unohana: comandos', () => {
  const feed = (entries) => {
    const detector = new ComboDetector(config.combos);
    let match = null;
    entries.forEach((entry, index) => { match = detector.feed(command(entry), 1, index * 16) ?? match; });
    return match?.animation ?? null;
  };
  assert.equal(feed([{ down: true }, { down: true, right: true }, { right: true, punch: true }]), 'flyingBlades');
  assert.equal(feed([{ down: true }, { down: true, left: true }, { left: true, special: true }]), 'bindingBelt');
  assert.equal(feed([{ down: true }, {}, { down: true, punch: true }]), 'bankai');
});
