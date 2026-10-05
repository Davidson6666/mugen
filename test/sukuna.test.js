import test from 'node:test';
import assert from 'node:assert/strict';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, assertConfigIntegrity, cast, command, hits, loadRecord, mash, run, step } from './helpers/world.js';

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
test('sukuna: a flecha, a lanca e os cortes sao projeteis que andam', () => {
  for (const id of ['fugaArrow', 'hitenSpear', 'cutWave']) {
    assert.ok(config.effects[id].velocityX > 0, `${id} nao anda`);
    assert.ok(config.effects[id].hits?.length > 0, `${id} nao acerta`);
  }
});

// O corte da onda gigante (↓←P) cruza a arena inteira de uma vez: a caixa e
// mais larga que o campo.
test('sukuna: o corte do ↓←P e mais largo que a arena', () => {
  const box = config.effects.bigCut.hits[0].box;
  assert.ok(box.width * (config.spriteScale ?? 1) >= 700, `caixa de ${box.width}`);
});

// Todo corte do video e a mesma lamina preta; nenhum golpe usa mais os cortes
// brancos do pacote (varreduras, garras, riscos de luz).
test('sukuna: os cortes sao as laminas pretas do video', () => {
  const white = ['crossCut', 'crescent', 'clawSlash', 'slashArc', 'clawSweep', 'bigWave', 'ringSlash'];
  for (const id of white) assert.equal(config.effects[id], undefined, `${id} ainda existe`);
  for (const [name, move] of Object.entries(config.animations)) {
    for (const event of move.events ?? []) {
      assert.ok(!white.includes(event.effect?.id), `${name} usa ${event.effect?.id}`);
    }
  }
});

// A lanca: arremessa, fica fincada no chao e so entao pode ser chamada de volta.
test('sukuna: a lanca arremessada fica fincada e o recall traz ela de volta acertando', () => {
  const world = arena(record, 400, 800);
  run(world, cast('hiten'), 110);
  const tags = () => [...world.fighters[0].effectTags];
  assert.ok(tags().includes('plantedSpear'), `sem lanca fincada: ${tags()}`);
  const before = hits(world).length;
  assert.ok(before >= 1, 'o arremesso nao acertou');
  run(world, cast('recall'), 140);
  assert.ok(world.visited.has('recall'), 'o recall nao saiu');
  assert.ok(!tags().includes('plantedSpear'), 'a lanca continua fincada');
  assert.ok(hits(world).length > before, `o disco nao acertou: ${hits(world).length} acertos`);
});

test('sukuna: sem a lanca no chao, o recall nao sai', () => {
  const world = run(arena(record, 500, 700), cast('recall'), 60);
  assert.ok(!world.visited.has('recall'));
});

// Power Charge: carregar liga o buff de dano (config.damageBuff) por 10 s.
test('sukuna: carregar energia liga o buff e o dano sobe', () => {
  const lost = (charged) => {
    const world = arena(record, 600, 640);
    if (charged) run(world, cast('chargeEnd'), 20);
    else run(world, command(), 20);
    const before = world.fighters[1].health;
    run(world, cast('punch'), 25);
    return before - world.fighters[1].health;
  };
  const base = lost(false), boosted = lost(true);
  assert.ok(base > 0, 'o soco nao acertou');
  assert.ok(boosted > base, `com buff ${boosted}, sem ${base}`);
  const world = arena(record, 600, 640);
  run(world, cast('chargeEnd'), 5);
  assert.ok(world.fighters[0].buffs.cursedPower > 0);
  assert.ok(world.fighters[0].effectTags.has('cursedPower'), 'a aura nao ficou');
});

test('sukuna: segurar o especial carrega e soltar termina com o buff', () => {
  const world = arena(record, 600, 900);
  step(world, command({ combo: { animation: 'powerCharge' }, special: true, holding: { special: true } }));
  for (let tick = 0; tick < 50; tick += 1) step(world, command({ holding: { special: true } }));
  assert.equal(world.fighters[0].animation.name, 'powerCharge');
  for (let tick = 0; tick < 40; tick += 1) step(world, command());
  assert.ok(world.fighters[0].buffs.cursedPower > 0, 'nao ligou o buff');
});

test('sukuna: curar recupera vida, mas nao passa do maximo', () => {
  const world = arena(record, 600, 900);
  const f = world.fighters[0];
  f.health = config.stats.maxHealth - 20;
  run(world, cast('heal'), 120);
  assert.ok(f.health > config.stats.maxHealth - 20, `vida ${f.health}`);
  assert.ok(f.health <= config.stats.maxHealth);
});

test('sukuna: a barreira deixa ele invulneravel por um instante', () => {
  const world = arena(record, 600, 640);
  step(world, cast('barrier'));
  for (let tick = 0; tick < 30; tick += 1) step(world, command());
  assert.ok(world.fighters[0].invulnerable, 'nao ficou invulneravel');
});

test('sukuna: o contra-ataque guarda e responde com o corte instantaneo', () => {
  assert.equal(config.animations.counter.counter.to, 'cleave');
  assert.ok(config.animations.cleave);
});

test('sukuna: o dominio prende o oponente sob os cortes', () => {
  const world = run(arena(record, 400, 700), cast('domain'), 360);
  assert.ok(hits(world).length >= 8, `${hits(world).length} acertos`);
  assert.ok(world.fighters[1].health <= config.stats.maxHealth - 20, `vida ${world.fighters[1].health}`);
});

// O dominio tinha efeitos agendados depois do fim do golpe (165 ticks), que
// nunca disparavam - a caveira de 10 de dano entre eles. Todo efeito precisa
// caber na duracao do golpe. (Sons lidos do .cns do pacote podem cair depois: o
// pacote os toca em cinematicas longas que aqui nao existem, e nao fazem mal.)
test('sukuna: nenhum golpe agenda efeito depois do proprio fim', () => {
  for (const [name, move] of Object.entries(config.animations)) {
    const total = move.durations.reduce((sum, ticks) => sum + ticks, 0);
    if (move.next || move.onHit || move.loop) continue;
    const late = (move.events ?? []).filter((event) => event.effect && event.at > total);
    assert.equal(late.length, 0, `${name}: ${late.length} efeitos depois do fim (${total} ticks): ${late.map((e) => `${e.effect.id}@${e.at}`).join(' ')}`);
  }
});

test('sukuna: o dominio chega a caveira no fim', () => {
  const world = run(arena(record, 400, 700), cast('domain'), 360);
  const skull = world.effects.effects.some((effect) => effect.spawn.id === 'cursedSkull') || world.results.length > 0;
  assert.ok(skull);
  assert.ok(config.animations.domain.events.some((event) => event.effect?.id === 'cursedSkull'));
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
  assert.equal(feed([{ down: true }, {}, { down: true }, { down: true, special: true }]), 'recall');
  assert.equal(feed([{ left: true }, { down: true }, { special: true }]), 'powerCharge');
  assert.equal(feed([{ left: true }, { down: true }, { kick: true }]), 'heal');
  assert.equal(feed([{ left: true }, { down: true }, { punch: true }]), 'counter');
  assert.equal(feed([{ left: true }, { down: true }, { right: true }, { special: true }]), 'barrier');
  assert.equal(feed([{ right: true }, { down: true }, { down: true, right: true }, { down: true, right: true, special: true }]), 'hiten');
});
