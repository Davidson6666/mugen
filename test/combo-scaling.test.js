import test from 'node:test';
import assert from 'node:assert/strict';
import { arena, loadRecord, mash } from './helpers/world.js';

// Combo longo perde forca: os 3 primeiros golpes tiram o dano cheio, cada golpe
// a mais tira 10% a menos, ate a metade. Conta golpes, nao acertos.
function scalesFor(id, moves) {
  const [fighter] = arena(loadRecord(id), 600, 640).fighters;
  const scales = [];
  for (let serial = 1; serial <= moves; serial += 1) {
    scales.push(fighter.comboScaleFor(serial));
    fighter.onAttackResolved('hit', serial);
  }
  return scales.map((value) => Math.round(value * 100));
}

test('combo: 3 golpes cheios, depois 10% a menos por golpe, ate 50%', () => {
  assert.deepEqual(scalesFor('goku', 10), [100, 100, 100, 90, 80, 70, 60, 50, 50, 50]);
});

test('combo: varios acertos do mesmo golpe contam como um golpe so', () => {
  const [fighter] = arena(loadRecord('chunli'), 600, 640).fighters;
  for (let hit = 0; hit < 12; hit += 1) fighter.onAttackResolved('hit', 1);
  assert.equal(fighter.comboScaleFor(1), 1);
  assert.equal(fighter.comboScaleFor(2), 1);
});

test('combo: defesa ou fim do combo zera a contagem', () => {
  const [fighter] = arena(loadRecord('goku'), 600, 640).fighters;
  for (let serial = 1; serial <= 6; serial += 1) fighter.onAttackResolved('hit', serial);
  assert.ok(fighter.comboScaleFor(7) < 1);
  fighter.breakCombo();
  assert.equal(fighter.comboScaleFor(8), 1);
});

test('combo: o Ensina GOD nao perde forca (forte de proposito)', () => {
  assert.deepEqual(scalesFor('ensina_god', 6), [100, 100, 100, 100, 100, 100]);
});

test('combo: a sequencia de 4 socos da Reze tira menos no quarto golpe', () => {
  const world = mash(arena(loadRecord('reze'), 600, 640), 'punch', { ticks: 200, gap: 4 });
  const config = world.fighters[0].config.animations;
  const fourth = config.punch4.hits?.[0]?.damage ?? config.punch4.damage;
  const hits = world.results.filter((result) => result.outcome === 'hit');
  assert.ok(hits.length >= 4);
  assert.ok(hits.some((result) => Math.abs(result.damage - fourth * 0.9) < 0.6 || result.damage < fourth),
    `danos ${hits.map((result) => result.damage).join(', ')} (quarto cheio seria ${fourth})`);
});
