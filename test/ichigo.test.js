import test from 'node:test';
import assert from 'node:assert/strict';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, assertConfigIntegrity, cast, command, hits, loadRecord, run, step } from './helpers/world.js';

// Ichigo (pacote MUGEN "Ichigo FinalBankai", A.C.Z). O .cmd do pacote cita
// varios golpes (Getsuga Tenshou, os socos/chutes medios e fortes em pe, os
// supers) cujos estados nao existem em nenhum arquivo do pacote - so entram
// aqui os que realmente acertam: o soco, o chute agachado, os tres golpes no
// ar, o Hard Cut, o mergulho Falling Sword e o super Bankai.
const record = loadRecord('ichigo');
const { config } = record;

test('ichigo: frames, efeitos e golpes citados no config existem', () => {
  assertConfigIntegrity(assert, config);
});

test('ichigo: soco e chute agachado acertam', () => {
  for (const name of ['punch', 'crouchLight']) {
    const world = run(arena(record, 500, 545), cast(name), 60);
    assert.ok(hits(world).length >= 1, name);
  }
});

function airborne(name, gap = 45, ticks = 40) {
  const world = arena(record, 500, 500 + gap);
  step(world, command({ up: true, jump: true }));
  step(world, command({ combo: { animation: name, airAnimation: name } }));
  for (let tick = 0; tick < ticks; tick += 1) step(world);
  return world;
}

test('ichigo: os tres golpes no ar acertam', () => {
  for (const name of ['airLight', 'airMedium', 'airStrong']) {
    assert.ok(hits(airborne(name)).length >= 1, name);
  }
});

test('ichigo: Falling Sword mergulha e acerta no ar', () => {
  const world = airborne('fallingSword', 45, 60);
  assert.ok(hits(world).length >= 1);
});

test('ichigo: Hard Cut acerta e emenda de um golpe normal que conectou', () => {
  const world = run(arena(record, 500, 545), cast('hardCut'), 60);
  assert.ok(hits(world).length >= 1);

  const chained = arena(record, 500, 545);
  step(chained, command({ punch: true }));
  for (let tick = 0; tick < 14; tick += 1) step(chained);
  step(chained, command({ combo: { animation: 'hardCut' } }));
  assert.equal(chained.fighters[0].animation.name, 'hardCut', 'cancela no golpe');
});

test('ichigo: o super Bankai acerta os dois cortes', () => {
  const world = run(arena(record, 500, 545), cast('bankai'), 120);
  assert.ok(hits(world).length >= 2, `${hits(world).length} acertos`);
});

test('ichigo: golpe normal cancela no especial ao conectar', () => {
  const world = arena(record, 500, 545);
  step(world, command({ punch: true }));
  for (let tick = 0; tick < 14; tick += 1) step(world);
  step(world, command({ combo: { animation: 'bankai' } }));
  assert.equal(world.fighters[0].animation.name, 'bankai');
});

test('ichigo: comandos dos tres especiais', () => {
  const feed = (entries) => {
    const detector = new ComboDetector(config.combos);
    let match = null;
    entries.forEach((entry, index) => { match = detector.feed(command(entry), 1, index * 16) ?? match; });
    return match?.animation ?? null;
  };
  assert.equal(feed([{ down: true }, { down: true, right: true }, { right: true, special: true }]), 'hardCut');
  assert.equal(feed([{ down: true }, { down: true, left: true }, { left: true, special: true }]), 'fallingSword');
  assert.equal(feed([{ down: true }, { right: true }, { down: true }, { right: true, special: true }]), 'bankai');
});

test('ichigo: corrida atravessa e emenda num golpe', () => {
  const world = arena(record, 560, 620);
  step(world, command({ combo: { animation: 'dashForward', movement: true } }));
  for (let tick = 0; tick < 6; tick += 1) step(world);
  assert.equal(world.fighters[0].state, 'dash');
  step(world, command({ punch: true }));
  assert.equal(world.fighters[0].animation.name, 'punch', 'cancela no golpe');
});
