import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { isSuperMove } from '../src/utils/superMoves.js';
import { arena, assertConfigIntegrity, cast, command, hits, loadRecord, mash, run, step } from './helpers/world.js';

const record = loadRecord('coordenadora');
const config = record.config;
const dir = new URL('../public/assets/characters/coordenadora/', import.meta.url);

test('Coordenadora: atlas transparente, poses completas, retrato, sons e referências válidos', async () => {
  assertConfigIntegrity(assert, config);
  assert.equal(config.atlas.length, 100);
  const pages = await Promise.all(config.sheets.map((name) => sharp(readFileSync(new URL(name, dir))).metadata()));
  for (const def of [config, ...Object.values(config.effects)]) {
    for (const [page, x, y, w, h, dx, dy] of def.atlas) {
      if (config.sheets[page] !== 'coordenadora_domain-court.webp') assert.ok(pages[page].hasAlpha);
      assert.ok(x >= 0 && y >= 0 && x + w <= pages[page].width && y + h <= pages[page].height);
      assert.ok(dx >= 0 && dy >= 0 && dx + w <= def.spriteGridSize.frameWidth && dy + h <= def.spriteGridSize.frameHeight);
    }
  }
  for (const name of config.sheets) assert.equal((await sharp(readFileSync(new URL(name, dir))).stats()).isOpaque, name === 'coordenadora_domain-court.webp');
  const pixels = await Promise.all(config.sheets.map((name) => sharp(readFileSync(new URL(name, dir))).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
  for (const [page, x, y, w, h] of config.atlas) {
    const { data, info } = pixels[page];
    for (const [cx, cy] of [[x, y], [x + w - 1, y], [x, y + h - 1], [x + w - 1, y + h - 1]]) {
      assert.equal(data[(cy * info.width + cx) * 4 + 3], 0, 'canto do recorte deve estar transparente');
    }
  }
  const portrait = await sharp(readFileSync(new URL('coordenadora_portrait.png', dir))).metadata();
  assert.equal(portrait.width, 96);
  assert.equal(portrait.height, 112);
  for (const file of Object.values(config.sounds)) assert.ok(existsSync(new URL(file, dir)), file);
});

for (const facing of [1, -1]) {
  const left = facing === 1 ? 520 : 760;
  const near = left + facing * 55;
  for (const [button, chain] of [['punch', ['punch', 'punch2', 'punch3']], ['kick', ['kick', 'kick2']]]) {
    test(`Coordenadora: sequência de ${button} conecta e termina (${facing})`, () => {
      const world = mash(arena(record, left, near), button, { gap: 5, ticks: 180 });
      for (const name of chain) assert.ok(world.visited.has(name), name);
      assert.ok(hits(world).length >= chain.length);
    });
  }
  for (const [name, distance] of [['special1', 300], ['special2', 270], ['special3', 300]]) {
    test(`Coordenadora: ${name} acerta, aceita guarda e limpa efeitos (${facing})`, () => {
      const world = run(arena(record, left, left + facing * distance), cast(name), 240);
      assert.ok(hits(world).length > 0, name);
      assert.equal(world.effects.effects.length, 0);
      const guarded = arena(record, left, left + facing * distance);
      for (let tick = 0; tick < 240; tick += 1) step(guarded, tick === 0 ? cast(name) : command(), command({ guard: true }));
      assert.equal(hits(guarded).length, 0);
      assert.ok(guarded.results.some((r) => r.outcome === 'block'));
      assert.equal(guarded.effects.effects.length, 0);
    });
  }
  test(`Coordenadora: atalhos e meia-lua seguem a direção do lutador (${facing})`, () => {
    const forward = facing === 1 ? 'right' : 'left';
    const back = facing === 1 ? 'left' : 'right';
    assert.equal(new ComboDetector(config.combos).feed(command({ [back]: true, special: true }), facing, 0)?.animation, 'special4');
    assert.equal(new ComboDetector(config.combos).feed(command({ down: true, special: true }), facing, 0)?.animation, 'special2');
    assert.equal(new ComboDetector(config.combos).feed(command({ [forward]: true, special: true }), facing, 0)?.animation, 'special3');
    const detector = new ComboDetector(config.combos);
    detector.feed(command({ down: true }), facing, 0);
    detector.feed(command({ down: true, [forward]: true }), facing, 50);
    assert.equal(detector.feed(command({ [forward]: true, special: true }), facing, 100)?.animation, 'special3');
    const crouch = new ComboDetector(config.combos).feed(command({ down: true, punch: true }), facing, 0);
    assert.equal(crouch?.animation, 'crouchPunch');
  });
}

test('Coordenadora: soco e chute no ar usam ataques próprios, terminando na aterrissagem', () => {
  for (const [button, name] of [['punch', 'airPunch'], ['kick', 'airKick'], ['special', 'airHeavy']]) {
    const world = arena(record, 500, 800);
    step(world, command({ jump: true, up: true }));
    for (let tick = 0; tick < 5; tick += 1) step(world);
    step(world, command({ [button]: true }));
    assert.equal(world.fighters[0].animation.name, name);
    for (let tick = 0; tick < 130; tick += 1) step(world);
    assert.equal(world.fighters[0].grounded, true);
    assert.equal(world.fighters[0].state, 'idle');
  }
});

test('Coordenadora: guarda em pé e agachada usam suas poses e bloqueiam', () => {
  for (const down of [false, true]) {
    const world = arena(record, 600, 650);
    const seen = new Set();
    for (let tick = 0; tick < 40; tick += 1) {
      step(world, tick === 0 ? cast('punch') : command(), command({ guard: true, down }));
      seen.add(world.fighters[1].animation.name);
    }
    assert.ok(seen.has(down ? 'blockCrouching' : 'blockStanding'));
    assert.equal(hits(world).length, 0);
    assert.ok(world.results.some((r) => r.outcome === 'block'));
  }
});

test('Coordenadora: dash no chão e no ar usa as animações disponíveis', () => {
  for (const airborne of [false, true]) for (const name of ['dashForward', 'dashBackward']) {
    const world = arena(record, 600, 1050);
    if (airborne) step(world, command({ jump: true, up: true }));
    step(world, command({ combo: { animation: name, movement: true } }));
    assert.equal(world.fighters[0].animation.name, airborne ? `air${name[0].toUpperCase()}${name.slice(1)}` : name);
    assert.equal(world.fighters[0].state, 'dash');
  }
});

test('Coordenadora: lançamento percorre queda, chão e levantar; K.O. continua deitado', () => {
  const world = arena(record, 500, 700);
  const victim = world.fighters[1];
  victim.takeHit(5, 15, { launch: { vx: 3, vy: 7 }, from: 500 });
  const seen = new Set();
  for (let tick = 0; tick < 200; tick += 1) { step(world); seen.add(victim.animation.name); }
  for (const name of ['launched', 'falling', 'knockdown', 'getUp', 'idle']) assert.ok(seen.has(name), name);
  victim.takeHit(200, 15, { from: 500 });
  for (let tick = 0; tick < 200; tick += 1) step(world);
  assert.equal(victim.health, 0);
  assert.equal(victim.animation.sheetFrame, config.animations.ko.frames.at(-1));
});

test('Coordenadora: arremesso usa o agarre próprio e derruba', () => {
  const world = run(arena(record, 600, 650), command({ punch: true, kick: true }), 160);
  assert.ok(world.visited.has('universalThrow'));
  assert.ok(hits(world).some((r) => r.damage >= 10 * config.damagePassive.minScale));
  assert.deepEqual(world.fighters[0].config.animations.universalThrow.frames.slice(0, 2), [68, 69]);
});

test('Coordenadora: Plano Cartesiano intercepta a equação adversária sem causar dano', () => {
  const world = arena(record, 500, 720);
  step(world, cast('special4'), cast('special1'));
  for (let tick = 0; tick < 100; tick += 1) step(world);
  assert.equal(world.fighters[0].health, 100);
  assert.equal(world.fighters[1].health, 100);
  assert.equal(world.effects.effects.length, 0);
});

test('Coordenadora: Parábola sobe, desce com gravidade e desaparece no chão', () => {
  const world = arena(record, 400, 1100);
  let rose = false, fell = false;
  step(world, cast('special2'));
  for (let tick = 0; tick < 140; tick += 1) {
    step(world);
    const orb = world.effects.effects.find((e) => e.spawn.id === 'parabola');
    if (orb?.vy < 0) rose = true;
    if (orb?.vy > 0) fell = true;
  }
  assert.ok(rose && fell);
  assert.equal(world.effects.effects.length, 0);
  assert.equal(hits(world).length, 0, 'o arco não atravessa a arena inteira');
});

test('Coordenadora: Conselho de Classe avisa, não segue o alvo e permite escapar com dash', () => {
  const world = arena(record, 400, 800);
  step(world, cast('special3'));
  for (let tick = 0; tick < 20; tick += 1) step(world);
  const mark = world.effects.effects.find((e) => e.spawn.id === 'council');
  assert.ok(mark);
  assert.equal(mark.activeHit, null, 'aviso antes da janela de dano');
  const originalX = mark.x;
  step(world, command(), command({ combo: { animation: 'dashBackward', movement: true } }));
  for (let tick = 0; tick < 100; tick += 1) {
    step(world);
    assert.equal(mark.x, originalX, 'a área não persegue o adversário');
  }
  assert.equal(hits(world).length, 0);
});

test('Coordenadora: martelar ataques não prende o adversário em combo infinito', () => {
  for (const button of ['punch', 'kick']) {
    const world = arena(record, 600, 650);
    const rival = world.fighters[1];
    rival.minHealth = 1;
    let locked = 0, longest = 0;
    for (let tick = 0; tick < 600; tick += 1) {
      step(world, command(tick % 2 === 0 ? { [button]: true } : {}));
      locked = ['hitstun', 'launched', 'down'].includes(rival.state) ? locked + 1 : 0;
      longest = Math.max(longest, locked);
    }
    assert.ok(longest < 120, `${button}: preso por ${longest} ticks`);
  }
});

test('Coordenadora: super tem recarga e limite real de dois usos por round', () => {
  assert.ok(isSuperMove(config.animations.special3));
  const world = arena(record, 300, 950);
  world.fighters[1].minHealth = 1;
  run(world, cast('special3'), 620);
  run(world, cast('special3'), 620);
  assert.equal(world.fighters[0].startAttack('special3'), false);
});
