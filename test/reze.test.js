import test from 'node:test';
import assert from 'node:assert/strict';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, assertConfigIntegrity, cast, command, hits, loadRecord, mash, run, step } from './helpers/world.js';

// Reze (pacote "BombDevil" da DrAnimation): a pose do golpe e uma coisa e o
// dano vem dos helpers que ele solta (a bomba, as explosoes, os misseis), que
// aqui viram efeitos que andam e acertam.
const record = loadRecord('reze');
const { config } = record;

test('reze: frames, efeitos e golpes citados no config existem', () => {
  assertConfigIntegrity(assert, config);
});

test('reze: parada nao machuca', () => {
  const world = run(arena(record, 600, 630), command(), 120);
  assert.equal(hits(world).length, 0);
});

test('reze: de longe, o soco nao acerta', () => {
  const world = run(arena(record, 300, 900), command({ punch: true }), 40);
  assert.equal(hits(world).length, 0);
});

for (const [button, names] of [
  ['punch', ['punch', 'punch2', 'punch3', 'punch4']],
  ['kick', ['kick', 'kick2', 'kick3', 'kick4']],
]) {
  test(`reze: sequencia do ${button}`, () => {
    const world = mash(arena(record, 600, 640), button, { ticks: 400, gap: 4 });
    for (const name of names) assert.ok(world.visited.has(name), name);
  });
}

// Golpes de alcance acertam de longe: o oponente fica fora do alcance de
// qualquer golpe de perto (o soco vai a ~70 px).
for (const [name, [leftX, rightX], ticks, minimum] of [
  ['bomb', [500, 760], 120, 1],
  ['blastColumn', [500, 570], 80, 3],
  ['bombKick', [500, 640], 140, 1],
  ['dashPunch', [500, 600], 70, 1],
  ['missile', [500, 780], 100, 1],
  ['missileBarrage', [500, 780], 200, 2],
  ['grenades', [500, 640], 120, 1],
  ['groundBomb', [500, 560], 40, 1],
  ['uppercut', [600, 640], 40, 1],
  ['airSpecial', [600, 640], 40, 0],
]) {
  test(`reze: ${name} acerta`, () => {
    const world = run(arena(record, leftX, rightX), cast(name), ticks);
    assert.ok(hits(world).length >= minimum, `${name}: ${hits(world).length} acertos`);
  });
}

test('reze: o super agarra, escurece a tela e fecha com a explosao gigante', () => {
  const world = run(arena(record, 500, 600), cast('super'), 330);
  assert.ok(world.visited.has('superBlast'), 'o agarrao nao virou a cena');
  assert.ok(hits(world).length >= 8, `${hits(world).length} acertos`);
  assert.ok(world.fighters[1].health <= config.stats.maxHealth - 25, `vida ${world.fighters[1].health}`);
});

test('reze: o super nao acerta de longe e acaba sozinho', () => {
  const world = run(arena(record, 300, 900), cast('super'), 120);
  assert.ok(!world.visited.has('superBlast'));
  assert.equal(hits(world).length, 0);
});

test('reze: comandos', () => {
  const feed = (entries) => {
    const detector = new ComboDetector(config.combos);
    let match = null;
    entries.forEach((entry, index) => { match = detector.feed(command(entry), 1, index * 16) ?? match; });
    return match?.animation ?? null;
  };
  assert.equal(feed([{ down: true }, { down: true, right: true }, { right: true, punch: true }]), 'bomb');
  assert.equal(feed([{ down: true }, { down: true, left: true }, { left: true, punch: true }]), 'blastColumn');
  assert.equal(feed([{ down: true }, { down: true, right: true }, { right: true, kick: true }]), 'bombKick');
  assert.equal(feed([{ down: true }, { down: true, left: true }, { left: true, kick: true }]), 'dashPunch');
  assert.equal(feed([{ down: true }, { down: true, right: true }, { right: true, special: true }]), 'missileBarrage');
  assert.equal(feed([{ down: true }, { right: true }, { down: true }, { right: true, punch: true }]), 'super');
  assert.equal(feed([{ down: true, punch: true }]), 'uppercut');
  assert.equal(feed([{ down: true, kick: true }]), 'groundBomb');
  assert.equal(feed([{ down: true, special: true }]), 'grenades');
});

// Todo efeito visual agendado cabe na duracao do golpe (os que passam do fim
// nunca disparam).
test('reze: nenhum golpe agenda efeito depois do proprio fim', () => {
  for (const [name, move] of Object.entries(config.animations)) {
    const total = move.durations.reduce((sum, ticks) => sum + ticks, 0);
    if (move.next || move.onHit || move.loop) continue;
    const late = (move.events ?? []).filter((event) => event.effect && event.at > total);
    assert.equal(late.length, 0, `${name}: ${late.length} efeitos depois do fim (${total} ticks)`);
  }
});

// Sem arma de fogo guiada nao ha rajada: os tres misseis acompanham a altura do
// oponente (aim) e o terceiro tipo e maior que os outros.
test('reze: os misseis andam e acertam, e o grande bate mais forte', () => {
  for (const id of ['missile', 'missileHoming', 'missileBig', 'bombOrb']) {
    assert.ok(config.effects[id].velocityX > 0, `${id} nao anda`);
    assert.ok(config.effects[id].hits?.length > 0, `${id} nao acerta`);
  }
  assert.ok(config.effects.missileBig.hits[0].damage > config.effects.missileHoming.hits[0].damage);
});

test('reze: pular e atacar no ar', () => {
  const world = arena(record, 600, 640);
  step(world, command({ jump: true }));
  for (let tick = 0; tick < 12; tick += 1) step(world, command());
  step(world, command({ punch: true }));
  assert.equal(world.fighters[0].animation.name, 'airPunch');
});

// Forma Bomb Devil: transforma, troca os sprites e os golpes, aumenta o dano e
// o mesmo comando volta.
test('reze: a forma Bomb Devil troca os golpes, sobe o dano e volta', () => {
  const lost = (transformed) => {
    const world = arena(record, 600, 640);
    if (transformed) run(world, cast('toBombDevil'), 80);
    const before = world.fighters[1].health;
    run(world, cast(transformed ? 'bdPunch' : 'punch'), 25);
    return { world, dano: before - world.fighters[1].health };
  };
  const base = lost(false), boosted = lost(true);
  assert.ok(base.dano > 0, 'o soco normal nao acertou');
  assert.equal(boosted.world.fighters[0].mode, 'bombDevil');
  assert.ok(boosted.dano > base.dano, `transformada ${boosted.dano}, normal ${base.dano}`);

  const world = arena(record, 600, 900);
  run(world, cast('toBombDevil'), 80);
  assert.equal(world.fighters[0].base('idle'), 'bdIdle');
  run(world, cast('fromBombDevil'), 40);
  assert.equal(world.fighters[0].mode, null);
});

test('reze: os comandos da forma Bomb Devil so valem nela', () => {
  const feed = (entries, mode) => {
    const detector = new ComboDetector(config.combos);
    let match = null;
    entries.forEach((entry, index) => { match = detector.feed(command(entry), 1, index * 16, mode) ?? match; });
    return match?.animation ?? null;
  };
  const left = [{ left: true }, { down: true }, { special: true }];
  assert.equal(feed(left, null), 'toBombDevil');
  assert.equal(feed(left, 'bombDevil'), 'fromBombDevil');
  const bombs = [{ down: true }, { down: true, right: true }, { right: true, punch: true }];
  assert.equal(feed(bombs, null), 'bomb');
  assert.equal(feed(bombs, 'bombDevil'), 'bdBombs');
});

test('reze: os especiais da forma acertam', () => {
  for (const [name, left, right, ticks] of [['bdBombs', 500, 700, 140], ['bdBeam', 500, 640, 120], ['bdKickBomb', 500, 640, 140], ['bdDash', 500, 600, 80], ['bdMissiles', 500, 780, 200]]) {
    const world = arena(record, left, right);
    run(world, cast('toBombDevil'), 80);
    const before = hits(world).length;
    run(world, cast(name), ticks);
    assert.ok(hits(world).length > before, `${name} nao acertou`);
  }
});
