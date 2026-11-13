import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, assertConfigIntegrity, cast, command, hits, loadRecord, mash, run, step } from './helpers/world.js';

const record = loadRecord('professor_web');
const c = record.config;
const war = (x = 500, y = 800) => {
  const world = arena(record, x, y);
  const fighter = world.fighters[0];
  fighter.mode = 'godOfWar'; fighter.awakened = true; fighter.awakeGauge = 900;
  return world;
};

test('DW: a forma de guerra tem movimento, defesa, reações e arremesso sem sprites normais', () => {
  assertConfigIntegrity(assert, c);
  for (const name of ['idle', 'walkForward', 'walkBackward', 'turn', 'crouchDown', 'crouch', 'crouchUp', 'jumpUp', 'jumpForward', 'jumpBack', 'airJump', 'jumpFall', 'landing', 'blockStanding', 'blockCrouching', 'guardEndStanding', 'guardEndCrouching', 'hitReaction', 'hitCrouching', 'hitAir', 'launched', 'falling', 'knockdown', 'getUp', 'ko', 'defeatPose', 'victoryPose', 'dashForward', 'dashBackward', 'airDashForward', 'airDashBackward', 'grab', 'universalThrow']) {
    const target = c.modes.godOfWar.animations[name];
    assert.ok(target, name);
    assert.ok(c.animations[target].frames.every((frame) => frame >= 72 && frame < 144), name);
  }
});

test('DW: novas poses transparentes e armas completas nos limites do atlas', async () => {
  const pages = await Promise.all(c.sheets.map((file) => sharp(readFileSync(new URL(`../public/assets/characters/professor_web/${file}`, import.meta.url))).metadata()));
  assert.equal(c.atlas.length, 160);
  for (const def of [c, ...Object.values(c.effects)]) for (const [p, x, y, w, h, dx, dy] of def.atlas) {
    assert.ok(pages[p].hasAlpha);
    assert.ok(x >= 0 && y >= 0 && x + w <= pages[p].width && y + h <= pages[p].height);
    assert.ok(dx >= 0 && dy >= 0 && dx + w <= def.spriteGridSize.frameWidth && dy + h <= def.spriteGridSize.frameHeight);
  }
});

test('DW: transformação manual dura 15 segundos, aumenta dano e remove aura ao acabar', () => {
  const world = run(arena(record, 400, 800), cast('godWarTransform'), 60);
  const f = world.fighters[0];
  assert.equal(f.mode, 'godOfWar'); assert.equal(f.awakened, true);
  assert.equal(f.damageScale, 1.15); assert.equal(f.health, 100);
  assert.ok(world.effects.effects.some((effect) => effect.spawn.id === 'warAura'));
  assert.ok(f.awakeGauge > 875 && f.awakeGauge < 900);
  for (let tick = 0; tick < 910; tick += 1) step(world);
  assert.equal(f.mode, null); assert.equal(f.damageScale, 1); assert.equal(f.animation.name, 'idle');
  assert.equal(world.effects.effects.length, 0);
  assert.equal(f.startAttack('godWarTransform'), false, 'uma tentativa por round');
  f.resetForRound(400, 1);
  assert.equal(f.roundUses.size, 0); assert.equal(f.awakeGauge, 0); assert.equal(f.mode, null);
  assert.equal(f.startAttack('godWarTransform'), true);
});

test('DW: interromper a preparação impede o despertar e limpa o efeito', () => {
  const world = run(arena(record, 400, 800), cast('godWarTransform'), 20);
  world.fighters[0].takeHit(5, 15, { from: 800 });
  for (let tick = 0; tick < 160; tick += 1) step(world);
  assert.equal(world.fighters[0].mode, null);
  assert.equal(world.fighters[0].awakeGauge, 0);
  assert.equal(world.effects.effects.length, 0);
});

for (const facing of [1, -1]) {
  const x = facing === 1 ? 400 : 880;
  for (const [move, distance] of [['footballShot', 300], ['footballCurve', 300], ['footballBicycle', 300], ['footballGoal', 300]]) {
    test(`DW futebol: ${move} acerta, permite defesa e limpa efeitos (${facing})`, () => {
      const world = run(arena(record, x, x + distance * facing), cast(move), 230);
      assert.ok(hits(world).length > 0, move);
      assert.equal(world.effects.effects.length, 0);
      assert.equal(world.fighters[0].grounded, true);
      const guarded = arena(record, x, x + distance * facing);
      for (let tick = 0; tick < 230; tick += 1) step(guarded, tick === 0 ? cast(move) : command(), command({ guard: true }));
      assert.equal(hits(guarded).length, 0);
      assert.ok(guarded.results.some((r) => r.outcome === 'block'));
    });
  }
  for (const [move, distance] of [['war_axeThrow', 300], ['war_frostSlam', 65], ['war_chaosBlades', 65], ['war_chaosAscension', 65], ['war_olympus', 300]]) {
    test(`DW guerra: ${move} acerta, permite defesa e limpa efeitos (${facing})`, () => {
      const world = run(war(x, x + distance * facing), cast(move), 230);
      assert.ok(hits(world).length > 0, move);
      assert.equal(world.effects.effects.length, 0);
      const guarded = war(x, x + distance * facing);
      for (let tick = 0; tick < 230; tick += 1) step(guarded, tick === 0 ? cast(move) : command(), command({ guard: true }));
      assert.equal(hits(guarded).length, 0);
      assert.ok(guarded.results.some((r) => r.outcome === 'block'));
    });
  }
  test(`DW: comandos selecionam futebol e armas conforme o modo (${facing})`, () => {
    const forward = facing === 1 ? 'right' : 'left', back = facing === 1 ? 'left' : 'right';
    const detector = () => new ComboDetector(c.combos);
    assert.equal(detector().feed(command({ [forward]: true, kick: true }), facing, 0)?.animation, 'footballShot');
    assert.equal(detector().feed(command({ [back]: true, special: true }), facing, 0)?.animation, 'footballCurve');
    assert.equal(detector().feed(command({ [forward]: true, special: true }), facing, 0, 'godOfWar')?.animation, 'war_chaosBlades');
    assert.equal(detector().feed(command({ [back]: true, special: true }), facing, 0, 'godOfWar')?.animation, 'war_chaosAscension');
    assert.notEqual(detector().feed(command({ [forward]: true, kick: true }), facing, 0, 'godOfWar')?.animation, 'footballShot');
    const transform = detector();
    transform.feed(command({ down: true }), facing, 0);
    transform.feed(command(), facing, 40);
    assert.equal(transform.feed(command({ down: true, special: true }), facing, 80)?.animation, 'godWarTransform');
  });
}

test('DW guerra: combos básicos usam o machado e continuam sem laço infinito', () => {
  for (const [button, chain] of [['punch', ['war_punch', 'war_punch2', 'war_punch3']], ['kick', ['war_kick', 'war_kick2']]]) {
    const world = war(600, 655);
    world.fighters[1].minHealth = 1;
    mash(world, button, { gap: 5, ticks: 300 });
    for (const name of chain) assert.ok(world.visited.has(name), name);
    assert.ok(hits(world).length >= chain.length);
  }
});

test('DW guerra: defesa, dash, ataques aéreos e quedas preservam o visual', () => {
  for (const down of [false, true]) {
    const world = war(500, 750), f = world.fighters[0];
    for (let tick = 0; tick < 20; tick += 1) step(world, command({ guard: true, down }));
    if (down) assert.equal(f.animation.name, 'war_blockCrouching');
    f.takeHit(5, 15, { from: 750, launch: { vx: 3, vy: 7 } });
    const seen = new Set();
    for (let tick = 0; tick < 160; tick += 1) { step(world); seen.add(f.animation.name); assert.ok(f.animation.sheetFrame >= 72 && f.animation.sheetFrame < 144); }
    for (const name of ['war_launched', 'war_falling', 'war_knockdown', 'war_getUp']) assert.ok(seen.has(name), name);
  }
  for (const [button, name] of [['punch', 'war_airPunch'], ['kick', 'war_airKick'], ['special', 'war_airHeavy']]) {
    const world = war(500, 850);
    step(world, command({ jump: true, up: true }));
    for (let tick = 0; tick < 5; tick += 1) step(world);
    step(world, command({ [button]: true }));
    assert.equal(world.fighters[0].animation.name, name);
    for (let tick = 0; tick < 100; tick += 1) step(world);
    assert.equal(world.fighters[0].state, 'idle');
    assert.equal(world.fighters[0].animation.name, 'war_idle');
    step(world, command({ combo: { animation: 'dashForward', movement: true } }));
    assert.equal(world.fighters[0].animation.name, 'war_dashForward');
  }
});

test('DW guerra: arremesso usa o Kratos e a defesa não impede a agarrada', () => {
  const world = war(600, 655);
  step(world, command({ punch: true, kick: true }), command({ guard: true }));
  assert.equal(world.fighters[0].animation.name, 'war_throw');
  for (let tick = 0; tick < 100; tick += 1) step(world, command(), command({ guard: true }));
  assert.ok(hits(world).length > 0);
});

test('DW: reset durante a transformação restaura a forma normal e o dano', () => {
  const world = run(arena(record, 400, 800), cast('godWarTransform'), 60), f = world.fighters[0];
  f.resetForRound(400, 1);
  assert.equal(f.mode, null); assert.equal(f.awakened, false); assert.equal(f.awakeGauge, 0);
  assert.equal(f.damageScale, 1); assert.equal(f.animation.name, 'idle');
});

test('DW: magia de futebol e magia de guerra produzem a mesma simulação ao repetir os inputs', () => {
  const simulate = () => {
    const world = arena(record, 400, 800);
    for (let tick = 0; tick < 500; tick += 1) {
      const move = tick === 0 ? 'footballCurve' : tick === 170 ? 'godWarTransform' : tick === 240 ? 'war_axeThrow' : tick === 350 ? 'war_olympus' : null;
      step(world, move ? cast(move) : command());
    }
    return world.fighters.map((f) => [f.x, f.y, f.health, f.mode, f.awakeGauge, f.animation.name]);
  };
  assert.deepEqual(simulate(), simulate());
});
