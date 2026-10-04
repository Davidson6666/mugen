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

// Os golpes de alcance acertam de longe: o oponente fica fora do alcance de
// qualquer golpe de perto (o soco vai a 39 px), a 280-400 px.
for (const [name, [leftX, rightX], ticks, minimum] of [
  ['cutBarrage', [560, 900], 90, 1],
  ['pillar', [560, 960], 80, 1],
  ['cleave', [500, 900], 90, 1],
  ['hiten', [500, 900], 110, 1],
  ['cursedBlast', [500, 900], 170, 1],
  ['shrineCall', [500, 860], 170, 2],
  ['airStrong', [560, 620], 40, 1],
  ['dismantle', [500, 650], 110, 1],
  ['vortex', [560, 680], 100, 1],
  ['eruption', [560, 660], 100, 2],
  ['voidStorm', [560, 680], 140, 2],
  ['elbow', [600, 640], 40, 1],
  ['rush', [560, 600], 90, 6],
  ['portal', [560, 680], 90, 2],
]) {
  test(`sukuna: ${name} acerta`, () => {
    const world = run(arena(record, leftX, rightX), cast(name), ticks);
    assert.ok(hits(world).length >= minimum, `${name}: ${hits(world).length} acertos`);
  });
}

test('sukuna: a voadora passa pela carga e atravessa a arena', () => {
  const world = run(arena(record, 500, 820), cast('flyKick'), 90);
  assert.ok(world.visited.has('flyKickDash'), 'flyKickDash');
  assert.ok(hits(world).length >= 1, `${hits(world).length} acertos`);
});

// O corte instantaneo some e reaparece colado no adversario: ele acaba
// do lado de la do ponto de partida, perto do alvo.
test('sukuna: o corte instantaneo chega no adversario de longe', () => {
  const world = run(arena(record, 400, 900), cast('cleave'), 90);
  const [attacker, target] = world.fighters;
  assert.ok(Math.abs(target.x - attacker.x) < 160, `ficou a ${Math.abs(target.x - attacker.x)} px`);
});

// O pilar cai onde o adversario esta quando ele cai, nao onde o Sukuna esta.
test('sukuna: o pilar acerta o adversario no outro lado da arena', () => {
  const world = run(arena(record, 300, 1000), cast('pillar'), 90);
  assert.ok(hits(world).length >= 1, `${hits(world).length} acertos`);
});

// Golpe de projetil e o que da o alcance: precisa soltar um efeito que anda.
test('sukuna: a onda gigante, a flecha, a lanca e os cortes sao projeteis que andam', () => {
  for (const id of ['bigWave', 'fugaArrow', 'hitenSpear', 'cutWave']) {
    assert.ok(config.effects[id].velocityX > 0, `${id} nao anda`);
    assert.ok(config.effects[id].hits?.length > 0, `${id} nao acerta`);
  }
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
  for (const nome of ['dismantle', 'eruption', 'voidStorm', 'domain']) {
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
  // Os golpes de alcance: ↓ segurado + botao, o duplo toque ↓↓K (que precisa
  // ganhar da voadora, que e o mesmo botao com ↓ segurado) e o arremesso da
  // lanca em →↓↘S.
  assert.equal(feed([{ down: true, punch: true }]), 'cutBarrage');
  assert.equal(feed([{ down: true }, {}, { down: true }, { down: true, punch: true }]), 'rush');
  assert.equal(feed([{ down: true, kick: true }]), 'flyKick');
  assert.equal(feed([{ down: true, special: true }]), 'pillar');
  assert.equal(feed([{ down: true }, {}, { down: true }, { down: true, kick: true }]), 'cleave');
  assert.equal(feed([{ right: true }, { down: true }, { down: true, right: true }, { down: true, right: true, special: true }]), 'hiten');
});
