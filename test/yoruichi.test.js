import test from 'node:test';
import assert from 'node:assert/strict';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, assertConfigIntegrity, cast, command, hits, loadRecord, run, step } from './helpers/world.js';

// Yoruichi (pacote MUGEN "Yoruichi TYBW", Mounir): soco em ate tres golpes (o
// terceiro com um Shunpo ate o oponente), chute que lanca, forte, os tres
// golpes no ar, Shunpo para frente/tras, Choque Eletrico e o super Raiju Senkei.
const record = loadRecord('yoruichi');
const { config } = record;

test('yoruichi: frames, efeitos e golpes citados no config existem', () => {
  assertConfigIntegrity(assert, config);
});

test('yoruichi: a acao 0 (parada) e o corpo inteiro, nao o busto do icone de vida', () => {
  // O pacote original define "Action 0" duas vezes; a segunda (so a cabeca,
  // grupo 9000) sobrescrevia a primeira. A corrigida tem 4 quadros com hurtbox.
  assert.equal(config.animations.idle.frames.length, 4);
});

test('yoruichi: soco martelado encadeia em tres, o terceiro com Shunpo', () => {
  const world = arena(record, 600, 645);
  const presses = { 0: { punch: true }, 10: { punch: true }, 20: { punch: true } };
  for (let tick = 0; tick < 80; tick += 1) step(world, command(presses[tick] ?? {}));
  for (const name of ['punch', 'punch2', 'punch3']) assert.ok(world.visited.has(name), name);
  assert.ok(hits(world).length >= 3, `${hits(world).length} acertos`);
});

test('yoruichi: chute encadeia no lancador, que lanca o oponente', () => {
  const world = arena(record, 600, 645);
  const presses = { 0: { kick: true }, 16: { kick: true } };
  let sawLaunched = false;
  for (let tick = 0; tick < 60; tick += 1) {
    step(world, command(presses[tick] ?? {}));
    if (world.fighters[1].state === 'launched') sawLaunched = true;
  }
  assert.ok(world.visited.has('kick2'));
  assert.ok(sawLaunched, 'o oponente e lancado em algum momento');
});

test('yoruichi: chute tambem emenda direto no forte', () => {
  const world = arena(record, 600, 645);
  const presses = { 0: { kick: true }, 16: { special: true } };
  for (let tick = 0; tick < 60; tick += 1) step(world, command(presses[tick] ?? {}));
  assert.ok(world.visited.has('strong'));
});

function airborne(name, gap = 45, ticks = 40) {
  // Golpe disparado logo ao decolar: o alcance vertical e curto (encadeia
  // melhor num oponente ja no ar, apos o chute-lancador).
  const world = arena(record, 500, 500 + gap);
  step(world, command({ up: true, jump: true }));
  step(world, command({ combo: { animation: name, airAnimation: name } }));
  let sawLaunched = false;
  for (let tick = 0; tick < ticks; tick += 1) {
    step(world);
    if (world.fighters[1].state === 'launched') sawLaunched = true;
  }
  return { world, sawLaunched };
}

test('yoruichi: os tres golpes no ar acertam, e os dois ultimos lancam', () => {
  for (const [name, launches] of [['airLight', false], ['airMedium', true], ['airStrong', true]]) {
    const { world, sawLaunched } = airborne(name);
    assert.ok(hits(world).length >= 1, name);
    if (launches) assert.ok(sawLaunched, name);
  }
});

test('yoruichi: golpe normal cancela no especial ao conectar', () => {
  const world = arena(record, 600, 640);
  step(world, command({ punch: true }));
  for (let tick = 0; tick < 8; tick += 1) step(world);
  step(world, command({ combo: { animation: 'electroShock' } }));
  assert.equal(world.fighters[0].animation.name, 'electroShock');
});

test('yoruichi: Choque Eletrico acerta forte e lanca', () => {
  const world = arena(record, 500, 545);
  const [, rival] = world.fighters;
  let sawLaunched = false;
  for (let tick = 0; tick < 80; tick += 1) {
    step(world, tick === 0 ? cast('electroShock') : command());
    if (rival.state === 'launched') sawLaunched = true;
  }
  assert.ok(hits(world).length >= 1);
  assert.ok(sawLaunched);
});

test('yoruichi: o super Raiju Senkei acerta e nao pode ser defendido', () => {
  const world = arena(record, 500, 545);
  const [, rival] = world.fighters;
  rival.blocking = true;
  run(world, cast('raijuSenkei'), 260);
  const landed = hits(world);
  assert.ok(landed.length >= 1, `${landed.length} acertos`);
  assert.ok(landed.every((result) => result.outcome !== 'block'), 'ninguem bloqueia');
});

test('yoruichi: Shunpo atravessa e emenda num golpe', () => {
  const world = arena(record, 560, 620);
  step(world, command({ combo: { animation: 'dashForward', movement: true } }));
  for (let tick = 0; tick < 6; tick += 1) step(world);
  assert.equal(world.fighters[0].state, 'dash');
  step(world, command({ punch: true }));
  assert.equal(world.fighters[0].animation.name, 'punch', 'cancela no golpe');
});

test('yoruichi: comandos dos dois especiais', () => {
  const feed = (entries) => {
    const detector = new ComboDetector(config.combos);
    let match = null;
    entries.forEach((entry, index) => { match = detector.feed(command(entry), 1, index * 16) ?? match; });
    return match?.animation ?? null;
  };
  assert.equal(feed([{ down: true }, { down: true, right: true }, { right: true, special: true }]), 'electroShock');
  assert.equal(feed([{ down: true }, { right: true }, { down: true }, { right: true, special: true }]), 'raijuSenkei');
});
