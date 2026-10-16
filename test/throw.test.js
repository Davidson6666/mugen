import test from 'node:test';
import assert from 'node:assert/strict';
import { THROW_DAMAGE, THROW_MOVE } from '../src/systems/Fighter.js';
import { arena, command, loadRecord, step } from './helpers/world.js';

// Arremesso: soco + chute juntos, colado no oponente. Nao se defende, derruba,
// e quem aperta soco + chute junto escapa.
function attempt(id, { gap = 40, rival = { right: true }, techAt = null, sequence = [[2, { punch: true, kick: true }]] } = {}) {
  const world = arena(loadRecord(id), 600, 600 + gap);
  const presses = new Map(sequence);
  for (let tick = 0; tick < 80; tick += 1) {
    const defend = techAt === tick ? { ...rival, punch: true, kick: true } : rival;
    step(world, command(presses.get(tick) ?? {}), command(defend));
  }
  return { world, defender: world.fighters[1] };
}

for (const id of ['chunli', 'goku', 'ensina_god', 'humberto']) {
  test(`arremesso: ${id} pega quem esta defendendo`, () => {
    const { world, defender } = attempt(id);
    assert.ok(world.visited.has(THROW_MOVE));
    assert.ok(world.results.some((result) => result.outcome === 'hit' && result.damage === THROW_DAMAGE));
    assert.equal(defender.health, defender.config.stats.maxHealth - THROW_DAMAGE);
  });
}

test('arremesso: longe do oponente nao acontece', () => {
  const { world, defender } = attempt('goku', { gap: 200 });
  assert.ok(!world.visited.has(THROW_MOVE));
  assert.equal(defender.health, defender.config.stats.maxHealth);
});

test('arremesso: quem aperta soco + chute junto escapa sem dano', () => {
  const { world, defender } = attempt('goku', { techAt: 4 });
  assert.ok(world.results.some((result) => result.tech));
  assert.equal(defender.health, defender.config.stats.maxHealth);
});

test('arremesso: o botao que saiu primeiro vira arremesso (chute e logo depois soco)', () => {
  const { world } = attempt('goku', { sequence: [[2, { kick: true }], [4, { punch: true }]] });
  assert.ok(world.visited.has(THROW_MOVE));
});

test('arremesso: nao pega quem esta no ar', () => {
  const { world } = attempt('goku', { rival: { up: true, jump: true } });
  assert.ok(!world.results.some((result) => result.damage === THROW_DAMAGE));
});

test('arremesso: aparece na lista de golpes de todo mundo', async () => {
  const { moveListFor } = await import('../src/utils/moveList.js');
  const { config } = loadRecord('pikachu');
  assert.ok(moveListFor(config).some((move) => move.name.startsWith('Arremesso')));
});
