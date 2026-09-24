import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Container, Texture } from 'pixi.js';
import { Fighter } from '../src/systems/Fighter.js';
import { resolveAttack, resolveBodyCollision } from '../src/systems/CollisionDetector.js';
import { EffectManager } from '../src/systems/EffectManager.js';
import { ComboDetector } from '../src/systems/ComboDetector.js';

// Personagens com arte real: o config e gerado por scripts/import-<id>.mjs a
// partir do pacote MUGEN, com as caixas e os tempos do pacote. Estes testes
// garantem que a importacao continua produzindo um personagem jogavel e que
// cada golpe do pacote faz o que o .cns faz: encadeia, acerta, segue.
const map = JSON.parse(
  readFileSync(new URL('../public/assets/maps/dummy/dummy_map_config.json', import.meta.url)),
);
const config = JSON.parse(
  readFileSync(new URL('../public/assets/characters/itachi/itachi_config.json', import.meta.url)),
);

const blank = (count) => Array.from({ length: count }, () => Texture.EMPTY);
const record = {
  config,
  frames: blank(config.atlas.length),
  effectFrames: Object.fromEntries(
    Object.entries(config.effects).map(([id, effect]) => [id, blank(effect.atlas.length)]),
  ),
};

const NEUTRAL = { left: false, right: false, up: false, down: false, jump: false, punch: false, kick: false, special: false };
const command = (overrides = {}) => ({ ...NEUTRAL, ...overrides });
const cast = (animation) => command({ combo: { animation } });

// Mesma ordem do game loop em GameCanvas, com os efeitos. Guarda por onde o
// atacante passou (nomes das animacoes) e tudo o que conectou.
function arena(leftX, rightX) {
  const fighters = [
    new Fighter({ record, map, x: leftX, facing: 1 }),
    new Fighter({ record, map, x: rightX, facing: -1 }),
  ];
  fighters[0].opponent = fighters[1];
  fighters[1].opponent = fighters[0];
  const effects = new EffectManager({ back: new Container(), front: new Container(), bounds: { left: 0, right: 1280 } });
  return { fighters, effects, visited: new Set(), results: [] };
}

function step(world, commandA = command(), commandB = command()) {
  const [a, b] = world.fighters;
  a.faceTowards(b.x);
  b.faceTowards(a.x);
  a.update(commandA, 1);
  b.update(commandB, 1);
  world.effects.collect(world.fighters);
  resolveBodyCollision(a, b);
  const results = [resolveAttack(a, b), resolveAttack(b, a), ...world.effects.update(1, world.fighters)].filter(Boolean);
  if (a.state === 'attack') world.visited.add(a.animation.name);
  world.results.push(...results);
  return results;
}

// Aperta o botao a cada "gap" ticks (quem joga "martela" para encadear).
function mash(world, button, { ticks = 300, gap = 6, extra = {} } = {}) {
  for (let tick = 0; tick < ticks; tick += 1) {
    step(world, command(tick % gap === 0 ? { [button]: true, ...extra } : {}));
  }
  return world;
}

function run(world, trigger, ticks = 400) {
  for (let tick = 0; tick < ticks; tick += 1) step(world, tick === 0 ? trigger : command());
  return world;
}

const hits = (world) => world.results.filter((result) => result.outcome === 'hit' || result.outcome === 'ko');

test('itachi: frames, efeitos e golpes citados no config existem', () => {
  const effectIds = new Set(Object.keys(config.effects));
  const spawnsIn = (definition) => [
    definition.effect,
    ...(definition.events ?? []).map((event) => event.effect),
    ...(definition.spawns ?? []),
    definition.onHitSpawn,
    definition.onDeathSpawn,
    ...(definition.seal?.kinds ?? []).map((kind) => (kind.mark ? { id: kind.mark } : null)),
  ].filter(Boolean);

  for (const [name, animation] of Object.entries(config.animations)) {
    for (const frame of animation.frames) assert.ok(frame >= 0 && frame < config.atlas.length, `${name}: frame ${frame}`);
    assert.equal(animation.frames.length, animation.durations.length, `${name}: um tempo por quadro`);
    for (const spawn of spawnsIn(animation)) assert.ok(effectIds.has(spawn.id), `${name} pede o efeito ${spawn.id}`);
    const targets = [animation.next, animation.onHit?.to, ...(animation.cancels ?? []).map((entry) => entry.to)];
    for (const target of targets.filter(Boolean)) assert.ok(config.animations[target], `${name} segue para ${target}`);
  }
  for (const [id, effect] of Object.entries(config.effects)) {
    for (const frame of effect.animation.frames) assert.ok(frame < effect.atlas.length, `${id}: frame ${frame}`);
    for (const spawn of spawnsIn(effect)) assert.ok(effectIds.has(spawn.id), `${id} solta o efeito ${spawn.id}`);
  }
  for (const combo of config.combos) assert.ok(config.animations[combo.animation], `combo ${combo.id}`);
  for (const map of Object.values(config.buttons)) {
    for (const name of Object.values(map)) assert.ok(config.animations[name], `botao -> ${name}`);
  }
});

test('itachi: martelando soco a sequencia A vai do 200 ao golpe final', () => {
  const world = mash(arena(600, 640), 'punch');
  for (const name of ['punch', 'punch2', 'punch3', 'punch4Far']) assert.ok(world.visited.has(name), name);
  assert.ok(hits(world).length >= 4, `${hits(world).length} acertos`);
});

test('itachi: longe da parede a sequencia A usa o clone (230); encostado nela, o corte (240)', () => {
  const open = mash(arena(500, 540), 'punch', { ticks: 200 });
  assert.ok(open.visited.has('punch4Far'));
  const cornered = mash(arena(930, 970), 'punch', { ticks: 200 });
  assert.ok(cornered.visited.has('punch4'));
  assert.ok(cornered.visited.has('punch5'));
});

test('itachi: sequencia do chute termina no redemoinho de corvos, que acerta varias vezes', () => {
  const world = mash(arena(600, 640), 'kick', { ticks: 400, gap: 5 });
  for (const name of ['kick', 'kick2', 'kick3', 'kick4', 'kick5']) assert.ok(world.visited.has(name), name);
  assert.ok(hits(world).length >= 8, `${hits(world).length} acertos`);
});

test('itachi: sequencia do botao especial prende com o Sharingan e fecha no 440', () => {
  const world = mash(arena(600, 640), 'special', { ticks: 400, gap: 5 });
  for (const name of ['slash1', 'slash2', 'slash3', 'slash4', 'slash5']) assert.ok(world.visited.has(name), name);
});

test('itachi: golpe errado nao encadeia', () => {
  const world = mash(arena(320, 960), 'punch', { ticks: 120 });
  assert.ok(world.visited.has('punch'));
  assert.ok(!world.visited.has('punch3'), 'sem contato a sequencia para no segundo golpe');
});

test('itachi: no ar o soco vira a sequencia aerea, que acaba ao tocar o chao', () => {
  const world = arena(600, 660);
  step(world, command({ up: true, jump: true }));
  for (let tick = 0; tick < 6; tick += 1) step(world);
  step(world, command({ punch: true }));
  assert.equal(world.fighters[0].animation.name, 'airPunch');
  for (let tick = 0; tick < 200; tick += 1) step(world);
  assert.equal(world.fighters[0].grounded, true);
  assert.notEqual(world.fighters[0].state, 'attack');
});

test('itachi: chute no ar atira tres corvos para baixo', () => {
  const world = arena(500, 700);
  step(world, command({ up: true, jump: true }));
  for (let tick = 0; tick < 8; tick += 1) step(world);
  step(world, command({ kick: true }));
  for (let tick = 0; tick < 20; tick += 1) step(world);
  const crows = world.effects.effects.filter((effect) => effect.spawn.id === 'thrownCrow');
  assert.equal(crows.length, 3);
});

// Jutsus de longe: do outro lado da arena.
// Os corvos do genjutsu so acertam nos primeiros ~280px do voo, como no pacote.
for (const [name, [leftX, rightX]] of [['shuriken', [320, 960]], ['katon', [320, 960]], ['crowGenjutsu', [450, 700]], ['amaterasu', [320, 960]]]) {
  test(`itachi: ${name} acerta de longe`, () => {
    const world = run(arena(leftX, rightX), cast(name), 250);
    assert.ok(hits(world).length > 0, `${name} nao alcancou`);
  });
}

// Jutsus de perto e supers: um corpo de distancia.
for (const name of ['sharingan', 'finger', 'crowDash', 'mangekyou', 'tsukuyomi', 'susanoo']) {
  test(`itachi: ${name} acerta de perto`, () => {
    const world = run(arena(600, 640), cast(name), 500);
    assert.ok(hits(world).length > 0, `${name} nao acertou`);
  });
}

test('itachi: a bola de fogo do Katon explode ao acertar', () => {
  const world = run(arena(400, 700), cast('katon'), 200);
  assert.ok(world.results.some((result) => result.heavy), 'a explosao e um golpe forte');
});

test('itachi: shuriken e bola de fogo no ar saem com meia-lua pulando', () => {
  for (const [name, air] of [['shuriken', 'housenka'], ['katon', 'airKaton']]) {
    const world = arena(400, 800);
    step(world, command({ up: true, jump: true }));
    for (let tick = 0; tick < 5; tick += 1) step(world);
    step(world, command({ combo: { animation: name, airAnimation: air } }));
    assert.equal(world.fighters[0].animation.name, air);
  }
});

test('itachi: doze corvos do genjutsu levam ao golpe final', () => {
  const world = run(arena(400, 600), cast('crowGenjutsu'), 600);
  assert.ok(world.visited.has('crowFinisher'));
});

test('itachi: o olhar do Sharingan emenda nos cortes de ilusao', () => {
  const world = run(arena(600, 640), cast('sharingan'), 400);
  assert.ok(world.visited.has('sharinganIllusion'));
  assert.ok(hits(world).length >= 4);
});

test('itachi: Susanoo emenda a espada de Totsuka quando o primeiro golpe pega', () => {
  const world = run(arena(600, 640), cast('susanoo'), 400);
  assert.ok(world.visited.has('susanooHold'));
  assert.ok(hits(world).length >= 3, `${hits(world).length} acertos`);
});

test('itachi: Susanoo alcanca a meia distancia, mas nao a arena inteira', () => {
  assert.ok(hits(run(arena(560, 660), cast('susanoo'), 300)).length > 0);
  assert.equal(hits(run(arena(320, 960), cast('susanoo'), 300)).length, 0);
});

test('itachi: Mangekyou passa pelos clones ate o genjutsu final', () => {
  const world = run(arena(600, 640), cast('mangekyou'), 700);
  assert.ok(world.visited.has('mangekyouClones'));
  assert.ok(world.visited.has('mangekyouFinish'));
});

test('itachi: Tsukuyomi prende no mundo do genjutsu e fecha com o golpe forte', () => {
  const world = run(arena(600, 640), cast('tsukuyomi'), 700);
  assert.ok(world.visited.has('tsukuyomiWorld'));
  const defender = world.fighters[1];
  assert.ok(defender.health <= config.stats.maxHealth - 25, `vida ${defender.health}`);
});

test('itachi: Kotoamatsukami so sai com o corvo do Shisui em campo, e sela o oponente', () => {
  const world = arena(400, 700);
  step(world, cast('kotoamatsukami'));
  assert.notEqual(world.fighters[0].animation.name, 'kotoamatsukami', 'sem corvo nao sai');

  run(world, cast('shisuiCrow'), 150);
  assert.ok(world.fighters[0].effectTags.has('shisuiCrow'));
  run(world, cast('kotoamatsukami'), 200);
  assert.ok(world.visited.has('kotoamatsukami'));
  assert.ok(!world.fighters[0].effectTags.has('shisuiCrow'), 'o corvo e consumido');
  const seals = Object.keys(world.fighters[1].seals);
  assert.equal(seals.length, 1, 'um selo sorteado');
});

test('itachi: selo sem defesa impede a guarda', () => {
  const world = arena(600, 660);
  const [, defender] = world.fighters;
  defender.applySeal({ kind: 'noGuard', ticks: 300 });
  step(world, command(), command({ right: true }));
  assert.equal(defender.blocking, false);
});

test('itachi: Genjutsu do dedo faz metade dos golpes virar corvos e deixa um clone explosivo', (t) => {
  const world = run(arena(600, 640), cast('finger'), 200);
  const [itachi, rival] = world.fighters;
  assert.ok(itachi.buffs.crowEvade > 0, 'o genjutsu pegou');

  t.mock.method(Math, 'random', () => 0.4);
  const before = itachi.health;
  // O rival (dummy sem efeitos: usa o proprio Itachi) ataca.
  world.results.length = 0;
  for (let tick = 0; tick < 80; tick += 1) step(world, command(), command(tick === 0 ? { punch: true } : {}));
  assert.equal(itachi.health, before, 'nenhum dano');
  assert.ok(world.results.some((result) => result.outcome === 'evade'));
  for (let tick = 0; tick < 200; tick += 1) step(world);
  assert.ok(world.results.some((result) => result.outcome === 'hit' && result.heavy), 'o clone explodiu');
  assert.ok(rival.health < config.stats.maxHealth);
});

test('itachi: ↓ segurado + botao e o super; a meia-lua continua sendo o jutsu', () => {
  const press = (detector, commands) => {
    let match = null;
    commands.forEach((entry, index) => { match = detector.feed(command(entry), 1, index * 16) ?? match; });
    return match;
  };
  assert.equal(press(new ComboDetector(config.combos), [{ down: true }, { down: true, punch: true }])?.animation, 'mangekyou');
  assert.equal(
    press(new ComboDetector(config.combos), [{ down: true }, { down: true, right: true }, { right: true }, { right: true, punch: true }])?.animation,
    'shuriken',
  );
  assert.equal(press(new ComboDetector(config.combos), [{ down: true }, {}, { down: true }, { down: true, kick: true }])?.animation, 'shisuiCrow');
  assert.equal(press(new ComboDetector(config.combos), [{ punch: true }])?.animation ?? null, null, 'soco sozinho fica com o botao');
});

test('itachi: a sequencia empurra o oponente para tras e mesmo assim continua pegando', () => {
  const world = mash(arena(500, 540), 'kick', { ticks: 300, gap: 5 });
  const [, rival] = world.fighters;
  assert.ok(world.visited.has('kick5'), 'chegou no redemoinho');
  assert.ok(rival.x - 540 > 100, `o oponente andou so ${(rival.x - 540).toFixed(0)}px`);
});

test('itachi: no Tsukuyomi o oponente fica preso no centro da arena, suspenso', () => {
  const world = arena(400, 440);
  run(world, cast('tsukuyomi'), 180);
  const [itachi, rival] = world.fighters;
  assert.ok(world.visited.has('tsukuyomiWorld'));
  const center = (map.leftBound + map.rightBound) / 2;
  assert.equal(rival.x, center);
  assert.ok(rival.y < map.groundLevel, 'suspenso');
  assert.ok(Math.abs(itachi.x - rival.x) > 60, 'o Itachi fica a frente, sem sobrepor');
});
