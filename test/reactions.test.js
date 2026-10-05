import test from 'node:test';
import assert from 'node:assert/strict';
import { launchOf } from '../src/systems/hits.js';
import { phaseOf } from '../src/systems/AIKnowledge.js';
import { readFileSync } from 'node:fs';
import { Texture } from 'pixi.js';
import { arena, cast, command, loadRecord, run, step } from './helpers/world.js';

// As animacoes comuns do pacote MUGEN (apanhar, ser lancado, cair, deitar,
// levantar, fases do pulo, virar, agachar) e o que o motor faz com elas.

const CHARACTERS = [
  'aizen', 'chunli', 'dante', 'escanor', 'gojo', 'goku', 'itachi', 'killua',
  'miku', 'nezuko', 'pikachu', 'sukuna', 'reze', 'tanjiro', 'unohana', 'zenitsu',
];
const COMMON = [
  'jumpUp', 'jumpForward', 'jumpBack', 'crouchDown', 'crouchUp',
  'hitStanding', 'hitCrouching', 'hitAir', 'launched', 'falling', 'knockdown', 'getUp',
];

test('reacoes: todo personagem importado traz as animacoes comuns do pacote', () => {
  for (const id of CHARACTERS) {
    const { config } = loadRecord(id);
    for (const name of COMMON) {
      const animation = config.animations[name];
      assert.ok(animation, `${id}: falta ${name}`);
      assert.equal(animation.frames.length, animation.durations.length, `${id}/${name}: um tempo por quadro`);
      for (const frame of animation.frames) assert.ok(frame >= 0 && frame < config.atlas.length, `${id}/${name}: quadro ${frame}`);
    }
  }
});

test('reacoes: o golpe que derruba no .cns leva o lancamento (Tanjiro: chute alto lanca, soco nao)', () => {
  const { config } = loadRecord('tanjiro');
  const launch = config.animations.kick2.hits.at(-1).launch;
  assert.ok(launch.vy >= 8, 'o chute lanca alto');
  assert.ok(launch.vx >= 0);
  assert.equal(config.animations.punch.hits.some((hit) => hit.launch), false);
});

test('reacoes: rajada de projeteis nao derruba a cada bala, so o disparo final', () => {
  const { config } = loadRecord('dante');
  assert.equal(config.effects.dollarBullet.hits.some((hit) => hit.launch), false);
  assert.ok(config.effects.dollarsFinal.hits.some((hit) => hit.launch));
});

test('reacoes: janela que repete so derruba no ultimo acerto', () => {
  const launch = { vx: 2, vy: 8 };
  const hit = { every: 5, count: 3, launch };
  const log = new Map();
  assert.equal(launchOf(hit, log, 0), undefined);
  log.set(0, { count: 1, clock: 0 });
  assert.equal(launchOf(hit, log, 0), undefined);
  log.set(0, { count: 2, clock: 5 });
  assert.equal(launchOf(hit, log, 0), launch);
  assert.equal(launchOf({ launch }, log, 0), launch, 'janela de um acerto so derruba sempre');
  assert.equal(launchOf({}, log, 0), undefined);
});

const knockedWorld = (id = 'tanjiro', rivalId = 'gojo') => {
  const world = arena(loadRecord(id), 500, 560, loadRecord(rivalId));
  const [attacker, victim] = world.fighters;
  return { world, attacker, victim };
};

test('reacoes: lancado sobe, cai, fica deitado sem poder ser acertado e se levanta', () => {
  const { world, attacker, victim } = knockedWorld();
  const outcome = victim.takeHit(10, 20, { launch: { vx: 3, vy: 9 }, from: attacker.x, scale: 2 });
  assert.equal(outcome, 'hit');
  assert.equal(victim.state, 'launched');
  assert.equal(victim.grounded, false);
  assert.ok(victim.vx > 0, 'cai para longe de quem bateu (o oponente esta a esquerda)');
  assert.equal(victim.canAct, false);

  const seen = new Set();
  let downInvulnerable = true;
  for (let tick = 0; tick < 200 && victim.state !== 'idle'; tick += 1) {
    step(world);
    seen.add(`${victim.state}/${victim.animation.name}`);
    if (victim.state === 'down' && !victim.invulnerable) downInvulnerable = false;
  }
  for (const key of ['launched/launched', 'launched/falling', 'down/knockdown', 'down/getUp']) assert.ok(seen.has(key), key);
  assert.ok(downInvulnerable, 'deitado e levantando ninguem acerta');
  assert.equal(victim.state, 'idle');
  assert.equal(victim.canAct, true);
  assert.equal(victim.grounded, true);
});

test('reacoes: o lado da queda depende de onde esta quem bateu', () => {
  const { victim } = knockedWorld();
  victim.takeHit(5, 10, { launch: { vx: 3, vy: 6 }, from: victim.x + 80, scale: 1 });
  assert.ok(victim.vx < 0);
});

test('reacoes: quem esta deitado nao leva golpe (sem combo infinito no chao)', () => {
  const { world, attacker, victim } = knockedWorld();
  victim.takeHit(5, 10, { launch: { vx: 1, vy: 6 }, from: attacker.x, scale: 1 });
  while (victim.state !== 'down') step(world);
  const before = victim.health;
  attacker.x = victim.x - 40;
  attacker.facing = 1;
  run(world, cast('punch'), 30);
  assert.equal(victim.health, before);
});

test('reacoes: no ar o golpe ainda ergue ate o limite do combo aereo, depois so cai', () => {
  const { world, attacker, victim } = knockedWorld();
  victim.takeHit(1, 10, { launch: { vx: 1, vy: 9 }, from: attacker.x, scale: 1 });
  const lifts = [];
  for (let round = 0; round < 5; round += 1) {
    for (let tick = 0; tick < 100 && !(victim.vy > 0.5) && victim.state === 'launched'; tick += 1) step(world);
    if (victim.state !== 'launched') break;
    victim.takeHit(1, 10, { from: attacker.x, scale: 1 });
    lifts.push(victim.vy < 0);
  }
  assert.deepEqual(lifts.slice(0, 3), [true, true, true]);
  assert.equal(lifts[3] ?? false, false, 'o quarto acerto no ar nao ergue mais');
});

test('reacoes: apanhar em pe, agachado, pesado e no ar usa a animacao de cada situacao', () => {
  const { victim } = knockedWorld();
  const names = (times, options = {}) => new Set(Array.from({ length: times }, () => {
    victim.state = 'idle';
    victim.takeHit(1, 10, { from: 400, ...options });
    return victim.animation.name;
  }));
  assert.ok([...names(6)].every((name) => name.startsWith('hitStanding')));
  assert.ok(names(6).size > 1, 'os golpes leves alternam a reacao');
  assert.ok([...names(4, { heavy: true })].every((name) => name.startsWith('hitHeavy')));

  victim.state = 'crouch';
  victim.takeHit(1, 10, { from: 400 });
  assert.ok(victim.animation.name.startsWith('hitCrouching'));

  victim.state = 'air';
  victim.grounded = false;
  victim.takeHit(1, 10, { from: 400 });
  assert.equal(victim.animation.name, 'hitAir');
});

test('reacoes: nocaute derruba para tras e o personagem fica deitado', () => {
  const { world, attacker, victim } = knockedWorld();
  victim.health = 1;
  assert.equal(victim.takeHit(5, 10, { from: attacker.x, scale: 1 }), 'ko');
  assert.equal(victim.state, 'ko');
  assert.equal(victim.grounded, false);
  assert.equal(victim.animation.name, 'launched');
  for (let tick = 0; tick < 120 && !victim.grounded; tick += 1) step(world);
  assert.equal(victim.state, 'ko');
  assert.equal(victim.animation.name, 'knockdown');
  assert.equal(victim.isKnockedOut, true);
});

test('reacoes: o Kick alto do Tanjiro lanca o oponente de verdade', () => {
  const world = arena(loadRecord('tanjiro'), 500, 545, loadRecord('gojo'));
  const seen = new Set();
  for (let tick = 0; tick < 140; tick += 1) {
    step(world, tick === 0 ? cast('kick2') : command());
    seen.add(world.fighters[1].state);
  }
  assert.ok(seen.has('launched'), [...seen].join(','));
  assert.ok(seen.has('down'));
});

test('reacoes: o pulo usa a animacao da direcao e o pulo duplo a sua', () => {
  const jump = (extra) => {
    const world = arena(loadRecord('tanjiro'), 500, 800);
    const [fighter] = world.fighters;
    step(world, command({ jump: true, ...extra }));
    return { world, fighter };
  };
  assert.equal(jump({}).fighter.animation.name, 'jumpUp');
  assert.equal(jump({ right: true }).fighter.animation.name, 'jumpForward');
  assert.equal(jump({ left: true }).fighter.animation.name, 'jumpBack');

  const { world, fighter } = jump({});
  step(world);
  step(world, command({ jump: true }));
  assert.ok(fighter.animation.name.startsWith('airJump'), fighter.animation.name);
});

test('reacoes: aterrissar, agachar, levantar e virar tocam a animacao de passagem sem travar', () => {
  const world = arena(loadRecord('tanjiro'), 500, 800);
  const [fighter, rival] = world.fighters;

  step(world, command({ down: true }));
  assert.equal(fighter.animation.name, 'crouchDown');
  assert.equal(fighter.state, 'crouch');
  for (let tick = 0; tick < 12; tick += 1) step(world, command({ down: true }));
  assert.equal(fighter.animation.name, 'crouch');
  step(world);
  assert.equal(fighter.animation.name, 'crouchUp');
  assert.equal(fighter.canAct, true);
  for (let tick = 0; tick < 12; tick += 1) step(world);
  assert.equal(fighter.animation.name, 'idle');

  rival.x = 300;
  step(world);
  assert.equal(fighter.facing, -1);
  assert.equal(fighter.animation.name, 'turn');
  for (let tick = 0; tick < 20; tick += 1) step(world);
  assert.equal(fighter.animation.name, 'idle');

  rival.x = 800;
  step(world, command({ jump: true }));
  let landed = false;
  for (let tick = 0; tick < 120 && !landed; tick += 1) {
    step(world);
    landed = fighter.grounded;
  }
  assert.equal(fighter.animation.name, 'landing');
});

test('reacoes: personagem sem as animacoes comuns (elenco provisorio) segue com a reacao unica', () => {
  const dummy = {
    config: JSON.parse(readFileSync(new URL('../public/assets/characters/dummy/dummy_config.json', import.meta.url))),
    frames: Array.from({ length: 84 }, () => Texture.EMPTY),
  };
  const world = arena(dummy, 500, 560);
  const [, victim] = world.fighters;
  victim.takeHit(5, 20, { launch: { vx: 3, vy: 9 }, from: 400, scale: 1 });
  assert.equal(victim.state, 'hitstun');
  assert.equal(victim.animation.name, 'hitReaction');
});

test('ia: o oponente lancado e alvo (ainda acerta no ar) e o deitado nao', () => {
  const { victim } = knockedWorld();
  victim.takeHit(1, 10, { launch: { vx: 1, vy: 6 }, from: 400, scale: 1 });
  assert.equal(phaseOf(victim).kind, 'stun');
  victim.state = 'down';
  victim.downTimer = 12;
  assert.deepEqual(phaseOf(victim), { kind: 'down', remaining: 12 });
});
