import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Texture } from 'pixi.js';
import { Fighter } from '../src/systems/Fighter.js';
import { ComboDetector, DASH_WINDOW_MS } from '../src/systems/ComboDetector.js';
import { resolveAttack, resolveBodyCollision } from '../src/systems/CollisionDetector.js';

const config = JSON.parse(
  readFileSync(new URL('../public/assets/characters/itachi/itachi_config.json', import.meta.url)),
);
const map = JSON.parse(
  readFileSync(new URL('../public/assets/maps/dummy/dummy_map_config.json', import.meta.url)),
);
const emptyFrames = (atlas) => Array.from({ length: atlas.length }, () => Texture.EMPTY);
const record = {
  config,
  frames: emptyFrames(config.atlas),
  effectFrames: Object.fromEntries(
    Object.entries(config.effects).map(([id, effect]) => [id, emptyFrames(effect.atlas)]),
  ),
};

const NEUTRAL = { left: false, right: false, up: false, down: false, jump: false, punch: false, kick: false, special: false };
const command = (overrides = {}) => ({ ...NEUTRAL, ...overrides });

test('toque duplo para frente dispara o dash; tecla segurada ou toque lento nao', () => {
  const detector = new ComboDetector(config.combos);
  assert.equal(detector.feed(command({ right: true }), 1, 0), null);
  assert.equal(detector.feed(command(), 1, 60), null);
  assert.equal(detector.feed(command({ right: true }), 1, 120)?.animation, 'dashForward');

  const slow = new ComboDetector(config.combos);
  slow.feed(command({ right: true }), 1, 0);
  slow.feed(command(), 1, 60);
  assert.equal(slow.feed(command({ right: true }), 1, DASH_WINDOW_MS + 100), null);

  const held = new ComboDetector(config.combos);
  for (let tick = 0; tick < 10; tick += 1) assert.equal(held.feed(command({ right: true }), 1, tick * 16), null);
});

test('toque duplo para tras (relativo ao lado que o personagem encara) e o dash para tras', () => {
  const detector = new ComboDetector(config.combos);
  // Olhando para a esquerda, "para tras" e a direita.
  detector.feed(command({ right: true }), -1, 0);
  detector.feed(command(), -1, 50);
  assert.equal(detector.feed(command({ right: true }), -1, 100)?.animation, 'dashBackward');
});

function runDash(animation, facing = 1) {
  const fighter = new Fighter({ record, map, x: 640, facing });
  const start = fighter.x;
  let invulnerableTicks = 0;
  fighter.update(command({ combo: { animation, movement: true } }), 1);
  assert.equal(fighter.state, 'dash');
  for (let tick = 0; tick < 120 && fighter.state === 'dash'; tick += 1) {
    if (fighter.invulnerable) invulnerableTicks += 1;
    fighter.update(command(), 1);
  }
  return { fighter, moved: fighter.x - start, invulnerableTicks };
}

test('dash para frente anda a distancia do config e volta a ficar parado', () => {
  const { fighter, moved, invulnerableTicks } = runDash('dashForward');
  assert.equal(fighter.state, 'idle');
  assert.ok(moved > 140 && moved < 180, `andou ${moved}px`);
  assert.ok(invulnerableTicks > 0, 'deveria ficar invulneravel enquanto some');
});

test('dash para tras recua, olhando para o mesmo lado', () => {
  const { fighter, moved } = runDash('dashBackward');
  assert.ok(moved < -90, `recuou ${moved}px`);
  assert.equal(fighter.facing, 1);
});

test('golpe nao pega em quem esta sumindo no dash', () => {
  const attacker = new Fighter({ record, map, x: 600, facing: 1 });
  attacker.update(command({ punch: true }), 1);
  while (!attacker.activeAttack) attacker.update(command(), 1);
  const ghost = { invulnerable: true, isKnockedOut: false, hurtRect: attacker.hitRect };
  assert.equal(resolveAttack(attacker, ghost), null);
});

test('o dash atravessa o oponente e ele vira de frente de novo depois', () => {
  const fighters = [
    new Fighter({ record, map, x: 600, facing: 1 }),
    new Fighter({ record, map, x: 640, facing: -1 }),
  ];
  const [runner, rival] = fighters;
  const tick = (cmd = command()) => {
    runner.faceTowards(rival.x);
    rival.faceTowards(runner.x);
    runner.update(cmd, 1);
    rival.update(command(), 1);
    resolveBodyCollision(runner, rival);
  };
  tick(command({ combo: { animation: 'dashForward', movement: true } }));
  for (let step = 0; step < 60; step += 1) tick();
  assert.ok(runner.x > rival.x, `parou em ${runner.x.toFixed(0)}, o rival esta em ${rival.x.toFixed(0)}`);
  assert.equal(runner.facing, -1, 'depois do dash volta a encarar o rival');
});

test('andando o corpo continua barrando', () => {
  const runner = new Fighter({ record, map, x: 600, facing: 1 });
  const rival = new Fighter({ record, map, x: 640, facing: -1 });
  for (let step = 0; step < 60; step += 1) {
    runner.update(command({ right: true }), 1);
    rival.update(command(), 1);
    resolveBodyCollision(runner, rival);
  }
  assert.ok(runner.x < rival.x);
});
