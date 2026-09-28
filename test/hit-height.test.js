import test from 'node:test';
import assert from 'node:assert/strict';
import { fitToTarget } from '../src/systems/CollisionDetector.js';
import { arena, cast, hits, loadRecord, run } from './helpers/world.js';

// Golpes de personagens altos passavam por cima da cabeca de quem e baixo
// (o soco da Chun-Li no Goku). A caixa desce na proporcao das alturas.

const punchHits = (attackerId, defenderId) => {
  const world = arena(loadRecord(attackerId), 500, 545, loadRecord(defenderId));
  return hits(run(world, cast('punch'), 60)).length;
};

test('altura: o soco da Chun-Li acerta os mais baixos (Goku, Itachi, Zenitsu)', () => {
  for (const defender of ['goku', 'itachi', 'zenitsu', 'pikachu', 'killua', 'gojo']) {
    assert.ok(punchHits('chunli', defender) >= 1, `chunli > ${defender}`);
  }
});

test('altura: o miku tambem alcanca o Goku', () => {
  const world = arena(loadRecord('miku'), 500, 545, loadRecord('goku'));
  assert.ok(hits(run(world, cast('punch'), 60)).length >= 1);
});

test('altura: alvo da mesma altura ou mais alto nao muda a caixa', () => {
  const world = arena(loadRecord('goku'), 500, 545, loadRecord('tanjiro'));
  const [goku, tanjiro] = world.fighters;
  const rect = { x: 500, y: 480, width: 40, height: 30 };
  assert.equal(fitToTarget(goku, tanjiro, rect), rect);
  assert.equal(fitToTarget(goku, goku, rect), rect);
});

test('altura: contra um alvo mais baixo a caixa desce em relacao aos pes, sem sair do lugar na horizontal', () => {
  const world = arena(loadRecord('tanjiro'), 500, 545, loadRecord('goku'));
  const [tanjiro, goku] = world.fighters;
  const rect = { x: 500, y: tanjiro.y - 100, width: 40, height: 30 };
  const fitted = fitToTarget(tanjiro, goku, rect);
  const ratio = goku.bodyHeight / tanjiro.bodyHeight;
  assert.ok(ratio < 1);
  assert.equal(fitted.x, rect.x);
  assert.equal(fitted.width, rect.width);
  assert.ok(fitted.y > rect.y, 'desceu');
  assert.ok(Math.abs((tanjiro.y - fitted.y) - 100 * ratio) < 1e-9, 'na proporcao das alturas');
  assert.ok(fitted.height < rect.height);
});
