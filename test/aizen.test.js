import test from 'node:test';
import assert from 'node:assert/strict';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, assertConfigIntegrity, cast, command, hits, loadRecord, mash, run, step } from './helpers/world.js';

// Aizen (pacote MUGEN "Aizen Sosuke TYBW"): as duas sequencias, o clone,
// os kidou, os especiais e o Goryu Tenmetsu, com dano normal (o pacote
// original mata com um golpe).
const record = loadRecord('aizen');
const { config } = record;

test('aizen: frames, efeitos e golpes citados no config existem', () => {
  assertConfigIntegrity(assert, config);
});

test('aizen: nenhum golpe tira mais que um quarto da vida', () => {
  const damages = [
    ...Object.values(config.animations).flatMap((animation) => (animation.hits ?? []).map((hit) => hit.damage ?? 0)),
    ...Object.values(config.effects).flatMap((effect) => (effect.hits ?? []).map((hit) => hit.damage ?? 0)),
  ];
  assert.ok(Math.max(...damages) <= 25, `maior dano ${Math.max(...damages)}`);
});

test('aizen: sequencia do soco some e reaparece no terceiro golpe', () => {
  const world = mash(arena(record, 600, 640), 'punch', { ticks: 120, gap: 5 });
  for (const name of ['punch', 'punch2', 'punch3']) assert.ok(world.visited.has(name), name);
});

test('aizen: sequencia do chute vai ate o arremesso', () => {
  const world = mash(arena(record, 600, 640), 'kick', { ticks: 500, gap: 4 });
  for (const name of ['kick', 'kick2', 'kick3', 'kick4', 'kick5', 'kick6', 'kick7', 'kick8']) assert.ok(world.visited.has(name), name);
});

for (const [name, [leftX, rightX], ticks, minimum] of [
  ['strong', [500, 640], 80, 1],
  ['haien', [400, 700], 150, 1],
  ['sokatsui', [500, 680], 60, 1],
  ['shakkaho', [400, 700], 120, 1],
  ['byakurai', [560, 640], 60, 3],
  ['raikoho', [400, 620], 200, 4],
  ['darkWaves', [500, 640], 160, 2],
  ['goryu', [500, 700], 200, 2],
]) {
  test(`aizen: ${name} acerta`, () => {
    const world = run(arena(record, leftX, rightX), cast(name), ticks);
    assert.ok(hits(world).length >= minimum, `${name}: ${hits(world).length} acertos`);
  });
}

test('aizen: corte silencioso passa pelo oponente e fecha com o clone', () => {
  const world = run(arena(record, 560, 620), cast('silentSlash'), 200);
  for (const name of ['silentDash', 'silentFinish']) assert.ok(world.visited.has(name), name);
  assert.ok(hits(world).length >= 3, `${hits(world).length} acertos`);
});

test('aizen: Kyouka Suigetsu - quem bate acerta a ilusao', () => {
  const world = arena(record, 600, 640, loadRecord('itachi'));
  step(world, cast('kyouka'), command());
  for (let tick = 0; tick < 10; tick += 1) step(world);
  step(world, command(), command({ punch: true }));
  for (let tick = 0; tick < 80; tick += 1) step(world);
  assert.ok(world.visited.has('kyoukaStrike'));
  assert.ok(world.results.some((result) => result.outcome === 'evade'));
});

test('aizen: pressao espiritual passa pela defesa e esmaga', () => {
  const world = arena(record, 560, 640);
  for (let tick = 0; tick < 200; tick += 1) step(world, tick === 0 ? cast('reiatsuCrush') : command(), command({ right: true }));
  assert.ok(world.visited.has('reiatsuFinish'));
  assert.ok(world.fighters[1].health <= config.stats.maxHealth - 15, `vida ${world.fighters[1].health}`);
});

test('aizen: Kurohitsugi segura, solta e o caixao fecha', () => {
  const world = arena(record, 400, 700);
  step(world, command({ combo: { animation: 'kurohitsugi' }, holding: { special: true } }));
  for (let tick = 0; tick < 40; tick += 1) step(world, command({ holding: { special: true } }));
  for (let tick = 0; tick < 200; tick += 1) step(world);
  assert.ok(world.visited.has('kurohitsugiCast'));
  assert.ok(hits(world).length >= 5, `${hits(world).length} acertos`);
});

test('aizen: Death Impact encadeia os teleportes ate o golpe final', () => {
  const world = run(arena(record, 560, 640), cast('deathImpact'), 400);
  for (const name of ['deathImpact2', 'deathImpact3', 'deathImpact4', 'deathImpact5', 'deathImpact6', 'deathImpactFinish']) {
    assert.ok(world.visited.has(name), name);
  }
});

test('aizen: Rikujokoro prende o oponente de longe', () => {
  const world = run(arena(record, 300, 800), cast('rikujokoro'), 80);
  assert.ok(hits(world).length > 0);
  assert.equal(world.fighters[1].state, 'hitstun');
});

test('aizen: Shunpo reaparece do outro lado', () => {
  const world = run(arena(record, 500, 640), cast('shunpo'), 30);
  assert.ok(world.fighters[0].x > world.fighters[1].x);
});

test('aizen: comandos', () => {
  const feed = (entries) => {
    const detector = new ComboDetector(config.combos);
    let match = null;
    entries.forEach((entry, index) => { match = detector.feed(command(entry), 1, index * 16) ?? match; });
    return match?.animation ?? null;
  };
  assert.equal(feed([{ down: true }, {}, { up: true, punch: true }]), 'haien');
  assert.equal(feed([{ right: true }, { down: true }, { right: true, punch: true }]), 'byakurai');
  assert.equal(feed([{ down: true }, { down: true, left: true }, { left: true, special: true }]), 'deathImpact');
});

test('aizen: hipnose - o primeiro golpe do oponente acerta a ilusao e o Aizen reaparece', () => {
  const world = arena(record, 600, 640, loadRecord('itachi'));
  const [aizen] = world.fighters;
  run(world, cast('hypnosis'), 40);
  assert.ok(aizen.illusion, 'ilusao ativa');
  step(world, command(), command({ punch: true }));
  for (let tick = 0; tick < 80; tick += 1) step(world);
  assert.equal(aizen.health, config.stats.maxHealth, 'o golpe acertou so o reflexo');
  assert.ok(world.visited.has('hypnosisBreak'));
  assert.equal(aizen.illusion, null);
});

test('aizen: hipnose so uma vez por round, e passa sozinha', () => {
  const world = run(arena(record, 300, 900), cast('hypnosis'), 40);
  const [aizen] = world.fighters;
  for (let tick = 0; tick < 500; tick += 1) step(world);
  assert.equal(aizen.illusion, null, 'acabou sozinha');
  step(world, cast('hypnosis'));
  assert.notEqual(aizen.animation.name, 'hypnosis', 'segunda vez no mesmo round');
  aizen.resetForRound(300, 1);
  step(world, cast('hypnosis'));
  assert.equal(aizen.animation.name, 'hypnosis', 'round novo, pode de novo');
});
