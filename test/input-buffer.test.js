import test from 'node:test';
import assert from 'node:assert/strict';
import { arena, command, loadRecord, step } from './helpers/world.js';

// Aperto que nao se perde: um botao apertado enquanto o golpe anterior ainda
// esta acontecendo (ou logo depois de um golpe defendido) tem que virar golpe,
// nao sumir. Sem isso, "alguns golpes nao contam".

const nameOf = (fighter) => fighter.animation.name;

// Atacante solta um soco; defensor na guarda. Devolve o mundo depois do soco.
function afterBlockedPunch(id, delay, button = 'special') {
  const world = arena(loadRecord(id), 600, 640);
  const [attacker] = world.fighters;
  step(world, command({ punch: true }), command({ guard: true }));
  const seen = new Set();
  for (let tick = 1; tick < 100; tick += 1) {
    step(world, command(tick === delay ? { [button]: true } : {}), command({ guard: true }));
    if (tick >= delay && attacker.state === 'attack') seen.add(nameOf(attacker));
  }
  return { world, seen, special: attacker.config.buttons.ground[button] };
}

// Regressao da regra de pressao na guarda: ela nao pode engolir o especial.
for (const [id, delay] of [['gojo', 24], ['chunli', 12], ['chunli', 16]]) {
  test(`aperto: L ${delay} ticks depois de um soco defendido sai (${id})`, () => {
    const { seen } = afterBlockedPunch(id, delay);
    const basics = new Set(['punch', 'punch2', 'punch3', 'punch4', 'punch5']);
    assert.ok([...seen].some((name) => !basics.has(name)), `so saiu: ${[...seen].join(',') || 'nada'}`);
  });
}

// O botao apertado no meio de um golpe (sem cancel para ele) dispara quando o
// golpe acaba, desde que o aperto seja recente (ate 10 ticks antes do fim).
for (const id of ['dante', 'goku', 'gojo', 'killua', 'itachi']) {
  test(`aperto: L apertado perto do fim do soco dispara o especial (${id})`, () => {
    const world = arena(loadRecord(id), 600, 900);
    const [fighter] = world.fighters;
    const special = fighter.config.buttons.ground.special;
    step(world, command({ punch: true }));
    const seen = new Set();
    let pressed = false;
    for (let tick = 0; tick < 160; tick += 1) {
      const left = fighter.animation.length - fighter.animation.progress;
      const press = !pressed && fighter.state === 'attack' && fighter.animation.name === fighter.config.buttons.ground.punch && left <= 6;
      if (press) pressed = true;
      step(world, command(press ? { special: true } : {}));
      if (fighter.state === 'attack') seen.add(nameOf(fighter));
    }
    assert.ok(pressed, 'nao achou o fim do soco para apertar');
    assert.ok(seen.has(special) || [...seen].some((name) => name !== fighter.config.buttons.ground.punch && !/^punch/.test(name)),
      `esperava ${special}, saiu: ${[...seen].join(',') || 'nada'}`);
  });
}

test('aperto: aperto velho demais nao dispara depois (so vale por 10 ticks)', () => {
  const world = arena(loadRecord('dante'), 600, 900);
  const [fighter] = world.fighters;
  step(world, command({ punch: true }));
  step(world, command({ special: true }));
  for (let tick = 0; tick < 150; tick += 1) step(world);
  // Ja acabou tudo e o L foi apertado cedo demais: nada pendente.
  assert.equal(fighter.state, 'idle');
});
