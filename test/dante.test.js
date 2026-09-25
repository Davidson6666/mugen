import test from 'node:test';
import assert from 'node:assert/strict';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, assertConfigIntegrity, cast, command, hits, loadRecord, mash, run, step } from './helpers/world.js';

// Dante (pacote "Dante_AI" de bugya): as tres sequencias, especiais, Royal
// Guard e os supers, inclusive o Quicksilver e o Doppelganger.
const record = loadRecord('dante');
const { config } = record;

test('dante: frames, efeitos e golpes citados no config existem', () => {
  assertConfigIntegrity(assert, config);
});

test('dante: tamanho parecido com o do elenco', () => {
  const height = config.hurtbox.height * config.spriteScale;
  assert.ok(height > 80 && height < 120, `hurtbox com ${height} px`);
});

for (const [button, expected] of [
  ['punch', ['punch', 'sword2', 'sword3']],
  ['kick', ['kick', 'kick2', 'kick3']],
  ['special', ['guns', 'guns2', 'guns3', 'gunsFinale']],
]) {
  test(`dante: martelar ${button} faz a sequencia inteira`, () => {
    const world = mash(arena(record, 500, 560), button, { ticks: 320, gap: 5 });
    for (const name of expected) assert.ok(world.visited.has(name), name);
  });
}

test('dante: desvios da sequencia de espada (K nos tres cortes, S no Million Stab)', () => {
  const world = arena(record, 500, 560);
  const presses = { 0: { punch: true }, 14: { kick: true }, 52: { special: true } };
  for (let tick = 0; tick < 200; tick += 1) step(world, command(presses[tick] ?? {}));
  for (const name of ['punch', 'swordFlurry', 'millionStab']) assert.ok(world.visited.has(name), name);
});

test('dante: rajada de chutes fecha no Kick 13', () => {
  const world = arena(record, 500, 560);
  const presses = { 0: { kick: true }, 14: { kick: true }, 30: { special: true }, 86: { special: true } };
  for (let tick = 0; tick < 260; tick += 1) step(world, command(presses[tick] ?? {}));
  for (const name of ['kick2', 'kickRush', 'kick13']) assert.ok(world.visited.has(name), name);
  assert.ok(hits(world).length >= 10, `${hits(world).length} acertos`);
});

for (const [name, gap, minimum] of [
  ['risingUpper', 60, 1],
  ['crouchKick', 60, 1],
  ['crouchSweep', 45, 1],
  ['royalKick', 80, 1],
  ['highTime', 80, 1],
  ['stinger', 300, 1],
  ['straight', 140, 1],
  ['risingDragon', 80, 1],
  ['divineDragon', 60, 5],
  ['volcano', 60, 3],
  ['kickSlide', 80, 1],
  ['throw', 45, 5],
  ['millionStab', 80, 15],
  ['millionDollars', 300, 15],
  ['realImpact', 60, 2],
  ['crystal', 150, 2],
  ['danceMacabre', 80, 20],
]) {
  test(`dante: ${name} acerta`, () => {
    const world = run(arena(record, 500, 500 + gap), cast(name), 400);
    assert.ok(hits(world).length >= minimum, `${name}: ${hits(world).length} acertos`);
  });
}

// Pula e solta o golpe no alto do pulo.
function airborne(name, gap = 60, ticks = 80) {
  const world = arena(record, 500, 500 + gap);
  step(world, command({ up: true, jump: true }));
  for (let tick = 0; tick < 6; tick += 1) step(world);
  step(world, command({ combo: { animation: name, airAnimation: name } }));
  for (let tick = 0; tick < ticks; tick += 1) step(world);
  return world;
}

test('dante: espada no ar encadeia os quatro cortes', () => {
  const world = arena(record, 500, 540);
  step(world, command({ up: true, jump: true }));
  for (let tick = 0; tick < 4; tick += 1) step(world);
  for (let tick = 0; tick < 60; tick += 1) step(world, command(tick % 5 === 0 ? { punch: true } : {}));
  for (const name of ['airSword', 'airSword2']) assert.ok(world.visited.has(name), name);
});

test('dante: Helm Breaker mergulha e o impacto acerta no chao', () => {
  const world = airborne('helmBreaker');
  assert.ok(world.visited.has('helmImpact'));
  assert.ok(hits(world).length >= 1);
});

test('dante: Volcano aereo termina na erupcao', () => {
  const world = airborne('airVolcano', 60, 120);
  assert.ok(world.visited.has('volcanoImpact'));
  assert.ok(hits(world).length >= 2, `${hits(world).length} acertos`);
});

test('dante: Rainstorm atira girando e aterrissa', () => {
  const world = airborne('rainstorm', 40, 120);
  assert.ok(world.visited.has('landing'));
});

test('dante: Stinger que acerta emenda no Million Stab com P', () => {
  const world = arena(record, 500, 700);
  step(world, cast('stinger'));
  for (let tick = 0; tick < 120; tick += 1) step(world, command(tick % 4 === 0 ? { punch: true } : {}));
  for (const name of ['stingerHit', 'millionStab']) assert.ok(world.visited.has(name), name);
});

test('dante: Royal Guard apara o golpe e devolve com o Release', () => {
  const world = arena(record, 600, 650, loadRecord('itachi'));
  step(world, cast('royalGuard'), command());
  step(world, command(), command({ punch: true }));
  for (let tick = 0; tick < 70; tick += 1) step(world);
  for (const name of ['royalBlock', 'royalRelease']) assert.ok(world.visited.has(name), name);
  assert.equal(world.fighters[0].health, config.stats.maxHealth, 'aparado nao tira vida');
  assert.ok(world.fighters[1].health < world.fighters[1].config.stats.maxHealth, 'o Release acerta');
});

test('dante: Real Impact que pega vira o gancho duplo e aterrissa', () => {
  const world = run(arena(record, 500, 560), cast('realImpact'), 300);
  for (const name of ['realImpactRise', 'realImpactLand']) assert.ok(world.visited.has(name), name);
});

test('dante: Crystal levanta a torre de gelo com S', () => {
  const world = arena(record, 500, 600);
  step(world, cast('crystal'));
  for (let tick = 0; tick < 200; tick += 1) step(world, command(tick % 6 === 0 ? { special: true } : {}));
  assert.ok(world.visited.has('crystalTower'));
});

test('dante: Dance Macabre segue para os cortes, o Million Stab e a estocada final', () => {
  const world = run(arena(record, 500, 580), cast('danceMacabre'), 500);
  for (const name of ['danceSlashes', 'danceStab', 'danceFinish']) assert.ok(world.visited.has(name), name);
});

test('dante: Quicksilver deixa o oponente em camera lenta', () => {
  const world = arena(record, 400, 700);
  step(world, cast('quicksilver'));
  for (let tick = 0; tick < 20; tick += 1) step(world);
  const rival = world.fighters[1];
  assert.ok(rival.seals.slow > 0, 'selo slow no oponente');
  step(world, command(), cast('punch'));
  for (let tick = 0; tick < 10; tick += 1) step(world);
  assert.ok(rival.moveClock > 4 && rival.moveClock < 7, `relogio do golpe em ${rival.moveClock}`);
  assert.ok(world.fighters[0].isOnCooldown('quicksilver'));
});

test('dante: Doppelganger - o clone repete o golpe e bate de novo', () => {
  const lone = run(arena(record, 500, 560), cast('punch'), 60);
  const world = arena(record, 500, 560);
  step(world, cast('doppelganger'));
  for (let tick = 0; tick < 70; tick += 1) step(world);
  assert.ok(world.fighters[0].buffs.doppelganger > 0);
  assert.ok(world.effects.effects.some((effect) => effect.definition.mirrorOwner), 'clone em campo');
  run(world, cast('punch'), 60);
  assert.equal(hits(lone).length, 1);
  assert.equal(hits(world).length, 2, 'o golpe e o eco do clone');
});

test('dante: comandos', () => {
  const feed = (entries) => {
    const detector = new ComboDetector(config.combos);
    let match = null;
    entries.forEach((entry, index) => { match = detector.feed(command(entry), 1, index * 16) ?? match; });
    return match?.animation ?? null;
  };
  assert.equal(feed([{ down: true }, { down: true, left: true }, { left: true, punch: true }]), 'stinger');
  assert.equal(feed([{ right: true }, { down: true }, { right: true, punch: true }]), 'highTime');
  assert.equal(feed([{ down: true }, { right: true }, { down: true }, { right: true, kick: true }]), 'realImpact');
  assert.equal(feed([{ down: true }, { left: true }, { down: true }, { left: true, special: true }]), 'doppelganger');
});

test('dante: todos os sons citados nos golpes existem', () => {
  for (const [name, animation] of Object.entries(config.animations)) {
    for (const event of animation.events ?? []) {
      if (event.sound) assert.ok(config.sounds[event.sound], `${name} pede ${event.sound}`);
    }
  }
});
