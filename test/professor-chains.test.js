import test from 'node:test';
import assert from 'node:assert/strict';
import { arena, assertConfigIntegrity, command, hits, loadRecord, mash, step } from './helpers/world.js';

// Sequencias de golpes basicos dos professores (scripts/add-basic-chains.mjs):
// o soco e o chute encadeiam ao encostar, misturando mao direita, esquerda e
// chute, e o ultimo golpe derruba ou lanca.

// Aperta os botoes na ordem dada, um a cada "gap" ticks, e depois espera.
function press(world, buttons, gap = 6, rest = 120) {
  buttons.forEach((button) => {
    for (let tick = 0; tick < gap; tick += 1) step(world, command(tick === 0 ? { [button]: true } : {}));
  });
  for (let tick = 0; tick < rest; tick += 1) step(world);
  return world;
}

for (const id of ['ensina_god', 'humberto']) {
  const record = loadRecord(id);

  test(`${id}: golpes das sequencias existem e usam quadros validos`, () => {
    assertConfigIntegrity(assert, record.config);
    for (const name of ['punch2', 'punch3', 'kick2']) assert.ok(record.config.animations[name], name);
  });

  test(`${id}: socos em sequencia (direita, esquerda, finalizador)`, () => {
    const world = mash(arena(record, 600, 640), 'punch', { ticks: 300, gap: 5 });
    for (const name of ['punch', 'punch2', 'punch3']) assert.ok(world.visited.has(name), name);
  });

  test(`${id}: chutes em sequencia`, () => {
    const world = mash(arena(record, 600, 640), 'kick', { ticks: 300, gap: 5 });
    for (const name of ['kick', 'kick2']) assert.ok(world.visited.has(name), name);
  });

  test(`${id}: soco e chute se misturam (P P K)`, () => {
    const world = press(arena(record, 600, 640), ['punch', 'punch', 'kick']);
    for (const name of ['punch', 'punch2', 'kick2']) assert.ok(world.visited.has(name), name);
    assert.ok(hits(world).length >= 3, `acertos ${hits(world).length}`);
  });

  test(`${id}: socando o ar, de longe, a sequencia nao continua`, () => {
    const world = press(arena(record, 300, 900), ['punch', 'punch', 'punch']);
    assert.ok(!world.visited.has('punch2'));
  });
}
