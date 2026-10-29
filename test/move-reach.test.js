import test from 'node:test';
import assert from 'node:assert/strict';
import { arena, command, loadRecord, step } from './helpers/world.js';

// Golpes que "nao contavam" por causa dos dados (alcance e caixa de acerto),
// achados pela auditoria golpe a golpe: cada um tem que acertar nas distancias
// em que o jogador usa.
function hitsFrom(id, animation, distance, ticks = 300) {
  const world = arena(loadRecord(id), 400, 400 + distance);
  const rival = world.fighters[1];
  rival.minHealth = 1;
  world.fighters[0].update(command({ combo: { animation } }), 1);
  for (let tick = 0; tick < ticks; tick += 1) step(world);
  return world.results.filter((result) => result.outcome === 'hit').length;
}

// L do Aizen: o clone corre e acerta, inclusive colado (antes nascia 30 px a
// frente, depois do oponente, e passava direto).
for (const distance of [30, 60, 100, 250, 400]) {
  test(`alcance: L do Aizen (strong) acerta a ${distance} px`, () => {
    assert.ok(hitsFrom('aizen', 'strong', distance) >= 1);
  });
}

// Rajada de tiros do Dante: as balas voam e a caixa fica na altura do corpo
// (antes ficava acima da cabeca e as balas nao andavam).
for (const distance of [40, 100, 200, 350]) {
  test(`alcance: gunBurst do Dante acerta a ${distance} px com as 3 balas`, () => {
    assert.equal(hitsFrom('dante', 'gunBurst', distance), 3);
  });
}

test('alcance: cada bala do Dante some ao acertar (nao acerta duas vezes)', () => {
  assert.equal(hitsFrom('dante', 'gunBurst', 60, 400), 3);
});
