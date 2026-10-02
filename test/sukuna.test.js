import test from 'node:test';
import assert from 'node:assert/strict';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, assertConfigIntegrity, cast, command, hits, loadRecord, mash, run } from './helpers/world.js';

// Sukuna (pacote "Sukuna Heian"): as caixas de acerto sao as que o autor
// desenhou no .air (clsn1), quadro a quadro; nos especiais, que no MUGEN
// acertam por helpers que este motor nao roda, elas foram declaradas do
// tamanho do desenho.
const record = loadRecord('sukuna');
const { config } = record;

test('sukuna: frames, efeitos e golpes citados no config existem', () => {
  assertConfigIntegrity(assert, config);
});

test('sukuna: parado nao machuca', () => {
  const world = run(arena(record, 600, 630), command(), 120);
  assert.equal(hits(world).length, 0);
  assert.equal(config.animations.idle.hits, undefined);
});

test('sukuna: de longe, o soco nao acerta', () => {
  const world = run(arena(record, 300, 900), command({ punch: true }), 40);
  assert.equal(hits(world).length, 0);
});

// O pacote traz as correntes completas do MOVESET.txt: sete socos, cinco
// chutes e tres da lanca.
for (const [button, names] of [
  ['punch', ['punch', 'punch2', 'punch3', 'punch4', 'punch5', 'punch6', 'punch7']],
  ['kick', ['kick', 'kick2', 'kick3', 'kick4', 'kick5']],
  ['special', ['lance', 'lance2', 'lance3']],
]) {
  test(`sukuna: sequencia do ${button}`, () => {
    const world = mash(arena(record, 600, 640), button, { ticks: 400, gap: 4 });
    for (const name of names) assert.ok(world.visited.has(name), name);
  });
}

// A estocada (anim 400) e o golpe de maior alcance dele: o autor desenhou a
// caixa indo ate x = 113, contra 39 do soco.
test('sukuna: a estocada da lanca alcanca mais que o soco', () => {
  const longe = (animation) => run(arena(record, 600, 750), cast(animation), 60);
  assert.equal(hits(longe('punch')).length, 0);
  assert.ok(hits(longe('lance')).length >= 1);
});

for (const [name, [leftX, rightX], ticks, minimum] of [
  ['crouchSummon', [560, 650], 60, 1],
  ['airStrong', [560, 620], 40, 1],
  ['dismantle', [500, 650], 110, 1],
  ['cursedBlast', [500, 680], 140, 1],
  ['vortex', [560, 680], 90, 2],
  ['eruption', [560, 660], 100, 2],
  ['shrineCall', [560, 660], 130, 2],
  ['voidStorm', [560, 680], 140, 2],
  ['elbow', [600, 640], 40, 1],
  ['summon', [560, 700], 110, 2],
  ['portal', [560, 680], 90, 2],
]) {
  test(`sukuna: ${name} acerta`, () => {
    const world = run(arena(record, leftX, rightX), cast(name), ticks);
    assert.ok(hits(world).length >= minimum, `${name}: ${hits(world).length} acertos`);
  });
}

test('sukuna: a explosao de cortes passa pela carga e pega atras tambem', () => {
  const world = run(arena(record, 600, 560), cast('spearCharge'), 80);
  assert.ok(world.visited.has('spearBurst'), 'spearBurst');
  assert.ok(hits(world).length >= 1, `${hits(world).length} acertos`);
});

test('sukuna: o dominio prende o oponente sob os cortes', () => {
  const world = run(arena(record, 400, 700), cast('domain'), 280);
  assert.ok(hits(world).length >= 8, `${hits(world).length} acertos`);
  assert.ok(world.fighters[1].health <= config.stats.maxHealth - 20, `vida ${world.fighters[1].health}`);
});

// Os especiais do pacote nao sao o pose: o ataque vem de helpers encadeados,
// que aqui viram efeitos. Um especial com dois ou tres efeitos e sinal de que
// a leitura do .cns se perdeu - foi assim que a primeira versao saiu vazia.
test('sukuna: os especiais soltam os efeitos do pacote, nao dois ou tres', () => {
  const contagem = (nome) => (config.animations[nome].events ?? []).filter((evento) => evento.effect).length;
  for (const nome of ['dismantle', 'cursedBlast', 'eruption', 'shrineCall', 'voidStorm', 'domain']) {
    assert.ok(contagem(nome) >= 10, `${nome}: so ${contagem(nome)} efeitos`);
  }
});

test('sukuna: comandos', () => {
  const feed = (entries) => {
    const detector = new ComboDetector(config.combos);
    let match = null;
    entries.forEach((entry, index) => { match = detector.feed(command(entry), 1, index * 16) ?? match; });
    return match?.animation ?? null;
  };
  assert.equal(feed([{ down: true }, { down: true, right: true }, { right: true, punch: true }]), 'dismantle');
  assert.equal(feed([{ down: true }, { down: true, left: true }, { left: true, special: true }]), 'shrineCall');
  // O dominio e o quarto de volta repetido: precisa ganhar do Dismantle, que
  // e o prefixo dele.
  assert.equal(feed([{ down: true }, { right: true }, { down: true }, { right: true, punch: true }]), 'domain');
});
