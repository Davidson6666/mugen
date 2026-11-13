import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, cast, command, hits, loadRecord, run, step } from './helpers/world.js';

const record = loadRecord('coordenadora');
const idle = (world, ticks) => { for (let i = 0; i < ticks; i += 1) step(world); };

test('Flavia: nome no elenco e no pacote, preservando o ID das partidas', () => {
  const roster = JSON.parse(readFileSync(new URL('../src/data/characters.json', import.meta.url)));
  assert.equal(roster.find((entry) => entry.id === 'coordenadora').name, 'Flavia');
  assert.equal(record.config.name, 'Flavia');
  assert.equal(record.config.id, 'coordenadora');
});

for (const facing of [1, -1]) {
  const x = facing === 1 ? 450 : 850;
  const worldAt = (distance) => arena(record, x, x + facing * distance);
  test(`Espada: meia-lua para trás vence a barreira, nos dois lados (${facing})`, () => {
    const detector = new ComboDetector(record.config.combos);
    const back = facing === 1 ? 'left' : 'right';
    detector.feed(command({ down: true }), facing, 0);
    detector.feed(command({ down: true, [back]: true }), facing, 45);
    const combo = detector.feed(command({ [back]: true, special: true }), facing, 90);
    assert.equal(combo?.animation, 'executionerSword');
    assert.equal(new ComboDetector(record.config.combos).feed(command({ [back]: true, special: true }), facing, 90)?.animation, 'special4');
  });

  test(`Espada: preparação sem dano, corte único, derrubada e retorno ao neutro (${facing})`, () => {
    const world = worldAt(130);
    run(world, cast('executionerSword'), 24);
    assert.equal(hits(world).length, 0);
    assert.equal(world.fighters[1].health, 100);
    const seen = new Set(world.effects.effects.map((effect) => effect.spawn.id));
    let launched = false;
    for (let i = 0; i < 180; i += 1) {
      step(world);
      for (const effect of world.effects.effects) seen.add(effect.spawn.id);
      launched ||= world.fighters[1].state === 'launched';
    }
    assert.equal(hits(world).length, 1);
    assert.ok(Math.abs(100 - world.fighters[1].health - 14.4) < 1e-6);
    assert.ok(launched);
    assert.ok(seen.has('swordTrail'));
    assert.equal(world.effects.effects.length, 0);
    assert.equal(world.fighters[0].state, 'idle');
  });

  test(`Espada: aceita defesa e não alcança o outro lado da arena (${facing})`, () => {
    const blocked = worldAt(130);
    for (let i = 0; i < 120; i += 1) step(blocked, i === 0 ? cast('executionerSword') : command(), command({ guard: true }));
    assert.equal(hits(blocked).length, 0);
    assert.equal(blocked.results.filter((result) => result.outcome === 'block').length, 1);
    assert.equal(hits(run(worldAt(300), cast('executionerSword'), 120)).length, 0);
  });
}

test('Espada: a passiva aumenta o dano de 14,4 a 43,2 sem duplicar o acerto', () => {
  const world = arena(record, 450, 580);
  world.fighters[0].takeHit(80, 1);
  idle(world, 60);
  run(world, cast('executionerSword'), 180);
  assert.equal(hits(world).length, 1);
  assert.ok(Math.abs(100 - world.fighters[1].health - 43.2) < 1e-6);
});

test('Espada: acertar Flavia antes do corte cancela o ataque e limpa a luz', () => {
  const world = run(arena(record, 450, 580), cast('executionerSword'), 12);
  assert.ok(world.effects.effects.some((effect) => effect.spawn.id === 'swordSummon'));
  world.fighters[0].takeHit(10, 12);
  idle(world, 150);
  assert.equal(hits(world).length, 0);
  assert.equal(world.effects.effects.length, 0);
  assert.equal(world.fighters[1].health, 100);
});

test('Espada: permite escapar durante a preparação e respeita a recarga', () => {
  const world = arena(record, 450, 580);
  step(world, cast('executionerSword'));
  idle(world, 12);
  step(world, command(), command({ combo: { animation: 'dashBackward', movement: true } }));
  idle(world, 55);
  assert.equal(hits(world).length, 0);
  assert.equal(world.fighters[0].startAttack('executionerSword'), false);
  idle(world, 120);
  assert.equal(world.fighters[0].startAttack('executionerSword'), true);
});
