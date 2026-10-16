import test from 'node:test';
import assert from 'node:assert/strict';
import { GUARD_GAP_TICKS } from '../src/systems/Fighter.js';
import { arena, command, loadRecord, step } from './helpers/world.js';

// Pressao na guarda: depois de um golpe bloqueado, quem atacou so comeca um
// golpe novo quando o defensor ja saiu da defesa e ficou livre por um tempo.
// Sem isso, martelar o chute rapido da Chun-Li prendia o outro na defesa para
// sempre, sem nenhuma janela para reagir.

// Atacante martela o botao contra um defensor que segura para tras, encostado
// na parede. Conta as janelas em que o defensor ficou livre pelo menos
// GUARD_GAP_TICKS seguidos depois de uma defesa.
function pressure(id, button) {
  const world = arena(loadRecord(id), 1150, 1200);
  const defender = world.fighters[1];
  let blocks = 0;
  let windows = 0;
  let free = 0;
  for (let tick = 0; tick < 600; tick += 1) {
    const before = world.results.length;
    step(world, command(tick % 2 === 0 ? { [button]: true } : {}), command({ right: true }));
    blocks += world.results.slice(before).filter((result) => result.outcome === 'block').length;
    if (defender.state === 'blockstun' || defender.state === 'hitstun') {
      if (free >= GUARD_GAP_TICKS) windows += 1;
      free = 0;
    } else {
      free += 1;
    }
  }
  return { blocks, windows };
}

for (const [id, button] of [['chunli', 'kick'], ['chunli', 'punch'], ['aizen', 'punch']]) {
  test(`guarda: ${id} martelando ${button} no canto deixa o defensor reagir`, () => {
    const { blocks, windows } = pressure(id, button);
    assert.ok(blocks > 10, `so ${blocks} bloqueios: o teste nem pressionou`);
    assert.ok(windows >= 5, `${windows} janelas livres em ${blocks} bloqueios`);
  });
}

test('guarda: golpe bloqueado impede comecar outro ate o defensor ficar livre', () => {
  const world = arena(loadRecord('chunli'), 1150, 1200);
  const [attacker, defender] = world.fighters;
  let tick = 0;
  // Primeiro chute, bloqueado.
  while (tick < 40 && defender.state !== 'blockstun') {
    step(world, command(tick === 0 ? { kick: true } : {}), command({ right: true }));
    tick += 1;
  }
  assert.equal(defender.state, 'blockstun');
  assert.ok(attacker.blockRecoil > defender.stunTimer, 'o atacante espera mais que a defesa do outro');
  // Espera o chute terminar e tenta comecar outro ainda dentro da trava.
  while (attacker.state === 'attack' && tick < 120) {
    step(world, command(), command({ right: true }));
    tick += 1;
  }
  if (attacker.blockRecoil > 0) {
    step(world, command({ kick: true }), command({ right: true }));
    assert.notEqual(attacker.state, 'attack');
  }
});
