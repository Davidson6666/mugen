import test from 'node:test';
import assert from 'node:assert/strict';
import { markerPositions } from '../src/utils/markerLayout.js';

// Setas 1P / 2P: ficam no meio do corpo, acima da cabeca, e nao se cobrem
// quando os dois lutadores estao colados.
test('marcador: no meio do corpo e acima da cabeca', () => {
  const [spot] = markerPositions([{ x: 100, y: 300, width: 60, height: 120 }]);
  assert.equal(spot.x, 130);
  assert.ok(spot.y < 300);
});

test('marcador: separados, cada um na altura do proprio lutador', () => {
  const [p1, p2] = markerPositions([
    { x: 100, y: 300, width: 60, height: 120 },
    { x: 400, y: 280, width: 60, height: 140 },
  ]);
  assert.ok(p1.y < 300 && p2.y < 280);
  assert.ok(p2.y > p1.y - 40);
});

test('marcador: colados, o 2P sobe para as setas nao se cobrirem', () => {
  const [p1, p2] = markerPositions([
    { x: 100, y: 300, width: 60, height: 120 },
    { x: 110, y: 300, width: 60, height: 120 },
  ]);
  assert.ok(p1.y - p2.y >= 30, `diferenca ${p1.y - p2.y}`);
});
