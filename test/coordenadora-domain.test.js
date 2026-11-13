import test from 'node:test';
import assert from 'node:assert/strict';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { applyHit } from '../src/systems/CollisionDetector.js';
import { GameStateManager } from '../src/systems/GameStateManager.js';
import { arena, cast, command, hits, loadRecord, run, step } from './helpers/world.js';

const record = loadRecord('coordenadora');
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} ≈ ${expected}`);
const wait = (world, ticks) => { for (let i = 0; i < ticks; i += 1) step(world); };
const trial = (health, facing = 1) => {
  const world = arena(record, facing === 1 ? 400 : 880, facing === 1 ? 900 : 380);
  world.fighters[1].health = health;
  return world;
};

test('Rigor: começa em 60% e cresce continuamente com o dano real recebido até 180%', () => {
  const [fighter] = arena(record, 400, 900).fighters;
  near(fighter.damageScale, 0.6);
  for (const scale of [0.9, 1.2, 1.5, 1.8]) {
    fighter.takeHit(20, 1);
    near(fighter.damageScale, scale);
  }
  fighter.takeHit(10, 1);
  near(fighter.damageScale, 1.8);
  assert.equal(fighter.damageTaken, 80);
  assert.equal(fighter.passiveProgress, 1);
});

test('Rigor: chip conta, cura preserva o acúmulo e o round restaura a força inicial', () => {
  const [fighter] = arena(record, 400, 900).fighters;
  fighter.takeBlockedHit(10, 1);
  near(fighter.damageScale, 0.75);
  fighter.applyEvent({ heal: 10 });
  assert.equal(fighter.health, 100);
  near(fighter.damageScale, 0.75);
  fighter.takeHit(10, 1);
  near(fighter.damageScale, 0.9);
  fighter.resetForRound(400, 1);
  assert.equal(fighter.damageTaken, 0);
  near(fighter.damageScale, 0.6);
});

test('Rigor: conta somente a vida perdida e respeita o limite de vida do treino', () => {
  const [fighter] = arena(record, 400, 900).fighters;
  fighter.health = 4;
  fighter.minHealth = 1;
  fighter.takeHit(1000, 1);
  assert.equal(fighter.damageTaken, 3);
  fighter.takeBlockedHit(1000, 1);
  assert.equal(fighter.damageTaken, 3);
  near(fighter.damageScale, 0.645);
});

for (const animation of ['punch', 'special1']) {
  test(`Rigor: ${animation} causa três vezes mais dano no máximo, sem aplicar a passiva duas vezes`, () => {
    const damageAt = (damageTaken) => {
      const world = arena(record, 500, animation === 'punch' ? 550 : 800);
      world.fighters[0].takeHit(damageTaken, 1);
      wait(world, 60);
      run(world, cast(animation), 200);
      assert.ok(hits(world).length > 0);
      return 100 - world.fighters[1].health;
    };
    near(damageAt(80), damageAt(0) * 3);
  });
}

test('Rigor: personagens sem esta passiva preservam o multiplicador normal', () => {
  const [fighter] = arena(loadRecord('professor_web'), 400, 900).fighters;
  fighter.takeHit(80, 1);
  assert.equal(fighter.damageScale, 1);
  assert.equal(fighter.damageTaken, 0);
});

for (const facing of [1, -1]) {
  test(`Tribunal: ↓↓S vence o atalho ↓S e funciona nos dois lados (${facing})`, () => {
    const detector = new ComboDetector(record.config.combos);
    detector.feed(command({ down: true }), facing, 0);
    detector.feed(command(), facing, 40);
    detector.feed(command({ down: true }), facing, 80);
    assert.equal(detector.feed(command({ down: true, special: true }), facing, 100)?.animation, 'domainTrial');
  });

  test(`Tribunal: cenário, advertências, veredito e liberação do alvo com bastante vida (${facing})`, () => {
    const world = trial(100, facing);
    const [owner, target] = world.fighters;
    const seen = new Set();
    for (let i = 0; i < 240; i += 1) {
      step(world, i === 0 ? cast('domainTrial') : command(), command({ guard: true }));
      for (const effect of world.effects.effects) seen.add(effect.spawn.id);
    }
    for (const id of ['domainCourt', 'domainWarning1', 'domainWarning2', 'domainWarningFinal']) assert.ok(seen.has(id), id);
    assert.equal(seen.has('domainExpulsion'), false);
    assert.equal(hits(world).length, 3);
    assert.ok(target.health > 70 && target.health < 100);
    assert.equal(target.expulsion, null);
    assert.equal(target.pinned, null);
    assert.equal(target.canAct, true);
    assert.equal(owner.state, 'idle');
    assert.equal(world.effects.effects.length, 0);
  });

  test(`Tribunal: expulsa por K.O., sem mover a posição física nem permitir novos ataques (${facing})`, () => {
    const world = run(trial(20, facing), cast('domainTrial'), 120);
    const target = world.fighters[1];
    assert.equal(target.health, 0);
    assert.equal(target.isKnockedOut, true);
    assert.equal(target.expulsion.direction, facing);
    assert.equal(target.pinned, null);
    assert.equal(target.canAct, false);
    const x = target.x;
    for (let i = 0; i < 60; i += 1) step(world, command(), cast('special1'));
    assert.equal(target.x, x);
    assert.ok((target.sprite.x - x) * facing > 800);
    assert.equal(target.sprite.alpha, 0);
    assert.equal(world.effects.effects.length, 0);
    const state = new GameStateManager();
    assert.deepEqual(state.update(world.fighters, 1), { type: 'roundEnd', round: 1, winner: 0, reason: 'ko' });
    target.playRoundEndPose(false);
    wait(world, 10);
    assert.equal(target.isKnockedOut, true);
    assert.equal(target.sprite.alpha, 0);
    target.resetForRound(900, -1);
    assert.equal(target.expulsion, null);
    assert.equal(target.sprite.alpha, 1);
    assert.equal(target.canAct, true);
  });
}

test('Tribunal: duas advertências nunca antecipam a expulsão, mesmo contra 1 de vida', () => {
  const world = run(trial(1), cast('domainTrial'), 105);
  const target = world.fighters[1];
  assert.equal(hits(world).length, 2);
  assert.equal(target.health, 1);
  assert.equal(target.expulsion, null);
  assert.equal(target.isKnockedOut, false);
  wait(world, 10);
  assert.equal(target.health, 0);
  assert.ok(target.expulsion);
});

for (const [health, expelled] of [[30, true], [30.01, false]]) {
  test(`Tribunal: verifica o limite de 30% no instante do veredito (${health})`, () => {
    const world = run(trial(100), cast('domainTrial'), 105);
    world.fighters[1].health = health;
    wait(world, 10);
    assert.equal(Boolean(world.fighters[1].expulsion), expelled);
  });
}

test('Tribunal: captura cancela o golpe anterior e impede soco, especial, pulo e dash', () => {
  const world = trial(100);
  step(world, cast('domainTrial'), cast('special3'));
  wait(world, 28);
  const target = world.fighters[1];
  assert.ok(target.pinned?.disableActions);
  assert.notEqual(target.state, 'attack');
  const x = target.x;
  for (const input of [command({ punch: true }), cast('special1'), command({ up: true, jump: true }), command({ combo: { animation: 'dashBackward', movement: true } })]) {
    step(world, command(), input);
    assert.equal(target.x, x);
    assert.equal(target.grounded, true);
    assert.notEqual(target.state, 'attack');
    assert.notEqual(target.state, 'dash');
  }
});

test('Tribunal: interromper a preparação cancela o cenário e todo o julgamento', () => {
  const world = run(trial(100), cast('domainTrial'), 10);
  world.fighters[0].takeHit(10, 12);
  wait(world, 180);
  assert.equal(hits(world).length, 0);
  assert.equal(Boolean(world.fighters[1].pinned), false);
  assert.equal(world.effects.effects.length, 0);
});

test('Tribunal: interrupção após a captura libera o adversário e remove o cenário', () => {
  const world = run(trial(100), cast('domainTrial'), 30);
  assert.ok(world.fighters[1].pinned);
  assert.ok(world.effects.effects.some((effect) => effect.spawn.id === 'domainCourt'));
  // Um acerto garantido de outro domínio pode atravessar a invulnerabilidade.
  const [owner, target] = world.fighters;
  applyHit(target, owner, { damage: 10, hitstun: 12, guaranteed: true, unblockable: true, push: 0 }, owner.hurtRect);
  wait(world, 2);
  assert.equal(target.pinned, null);
  assert.equal(world.effects.effects.length, 0);
  wait(world, 180);
  assert.equal(target.health, 100);
  assert.equal(owner.damageTaken, 6);
});

test('Tribunal: uma tentativa por round e restauração do uso no round seguinte', () => {
  const world = run(trial(100), cast('domainTrial'), 950);
  const owner = world.fighters[0];
  assert.equal(owner.startAttack('domainTrial'), false);
  owner.resetForRound(400, 1);
  assert.equal(owner.startAttack('domainTrial'), true);
});

test('Tribunal: treino preserva a vida mínima e não aplica expulsão', () => {
  const world = trial(1);
  world.fighters[1].minHealth = 1;
  run(world, cast('domainTrial'), 240);
  assert.equal(world.fighters[1].health, 1);
  assert.equal(world.fighters[1].expulsion, null);
  assert.equal(world.fighters[1].canAct, true);
});

test('Tribunal e Rigor: mesmos comandos produzem o mesmo julgamento e estado serializável', () => {
  const simulate = () => {
    const world = trial(35);
    world.fighters[0].takeHit(25, 1);
    wait(world, 60);
    run(world, cast('domainTrial'), 180);
    return JSON.stringify(world.fighters.map((fighter) => ({ health: fighter.health, damageTaken: fighter.damageTaken, state: fighter.state, pinned: fighter.pinned, expulsion: fighter.expulsion, x: fighter.x, y: fighter.y })));
  };
  assert.equal(simulate(), simulate());
});
