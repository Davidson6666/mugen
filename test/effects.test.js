import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Container, Texture } from 'pixi.js';
import { Fighter } from '../src/systems/Fighter.js';
import { EffectManager } from '../src/systems/EffectManager.js';
import { resolveAttack, resolveBodyCollision } from '../src/systems/CollisionDetector.js';
import { AIController } from '../src/systems/AIController.js';

const base = JSON.parse(
  readFileSync(new URL('../public/assets/characters/dummy/dummy_config.json', import.meta.url)),
);
const map = JSON.parse(
  readFileSync(new URL('../public/assets/maps/dummy/dummy_map_config.json', import.meta.url)),
);

const box = { width: 20, height: 20, offsetX: 0, offsetY: 0 };
const grid = { cols: 1, rows: 1, frameWidth: 20, frameHeight: 20 };

// Tres tipos de efeito: projetil (special1), area que surge no oponente
// (special2) e aura presa ao corpo (special3). Nenhum deles tem hitbox de
// corpo a corpo: o dano vem so do efeito.
function withoutMelee(animation, effect) {
  const result = { ...animation, effect };
  delete result.hitboxFrame;
  delete result.hitbox;
  return result;
}

const config = {
  ...base,
  animations: {
    ...base.animations,
    special1: withoutMelee(base.animations.special1, { id: 'orb', spawnFrame: 2, offsetX: 30, offsetY: 40 }),
    special2: withoutMelee(base.animations.special2, { id: 'fire', spawnFrame: 1, target: 'opponent' }),
    special3: withoutMelee(base.animations.special3, { id: 'aura', spawnFrame: 0 }),
  },
  effects: {
    orb: {
      spriteSheet: 'orb.png', spriteGridSize: grid,
      animation: { frames: [0], speed: 0.2, loop: true },
      hitbox: box, velocityX: 10, lifetime: 300, destroyOnHit: true,
    },
    fire: {
      spriteSheet: 'fire.png', spriteGridSize: { ...grid, frameHeight: 60 },
      animation: { frames: [0, 0, 0, 0, 0, 0], speed: 0.1, loop: false },
      hitbox: { width: 20, height: 60, offsetX: 0, offsetY: 0 }, activeFrom: 2,
    },
    aura: {
      spriteSheet: 'aura.png', spriteGridSize: { ...grid, frameWidth: 200, frameHeight: 100 },
      animation: { frames: [0, 0, 0, 0, 0, 0, 0, 0], speed: 0.15, loop: false },
      hitbox: { width: 100, height: 100, offsetX: 100, offsetY: 0 }, activeFrom: 7,
      attached: true, layer: 'back',
    },
  },
};

const record = {
  config,
  frames: Array.from({ length: 84 }, () => Texture.EMPTY),
  effectFrames: { orb: [Texture.EMPTY], fire: [Texture.EMPTY], aura: [Texture.EMPTY] },
};

const NEUTRAL = { left: false, right: false, up: false, down: false, jump: false, punch: false, kick: false, special: false };
const command = (overrides = {}) => ({ ...NEUTRAL, ...overrides });
const cast = (animation) => command({ combo: { animation } });

function setup(leftX, rightX) {
  const fighters = [
    new Fighter({ record, map, x: leftX, facing: 1 }),
    new Fighter({ record, map, x: rightX, facing: -1 }),
  ];
  const layers = { back: new Container(), front: new Container() };
  const effects = new EffectManager({ ...layers, bounds: { left: 0, right: 1280 } });
  return { fighters, effects, layers };
}

// Mesma ordem do game loop em GameCanvas.
function step({ fighters, effects }, commands = []) {
  fighters[0].faceTowards(fighters[1].x);
  fighters[1].faceTowards(fighters[0].x);
  fighters.forEach((fighter, index) => fighter.update(commands[index] ?? command(), 1));
  effects.collect(fighters);
  resolveBodyCollision(fighters[0], fighters[1]);
  const melee = [resolveAttack(fighters[0], fighters[1]), resolveAttack(fighters[1], fighters[0])];
  return [...melee.filter(Boolean), ...effects.update(1, fighters)];
}

function runUntilHit(world, trigger, { ticks = 200, defender = command() } = {}) {
  for (let tick = 0; tick < ticks; tick += 1) {
    const results = step(world, [tick === 0 ? trigger : command(), defender]);
    if (results.length > 0) return { result: results[0], tick };
  }
  return { result: null, tick: ticks };
}

test('projetil nasce no frame declarado, atravessa a arena e acerta de longe', () => {
  const world = setup(200, 1000);
  const [attacker, defender] = world.fighters;

  step(world, [cast('special1')]);
  assert.equal(world.effects.effects.length, 0, 'nao deveria nascer antes do spawnFrame');

  const { result } = runUntilHit(world, command());
  assert.equal(result?.outcome, 'hit');
  assert.equal(defender.health, base.stats.maxHealth - config.animations.special1.damage);
  assert.equal(attacker.health, base.stats.maxHealth, 'o projetil nunca acerta quem lancou');
  assert.equal(world.effects.effects.length, 0, 'projetil some ao acertar');
});

test('projetil bloqueado causa so dano de guarda', () => {
  const world = setup(200, 1000);
  const [, defender] = world.fighters;
  // Segurar para tras (direita, ja que ele encara a esquerda) e defender.
  const { result } = runUntilHit(world, cast('special1'), { defender: command({ right: true }) });

  assert.equal(result?.outcome, 'block');
  assert.ok(defender.health > base.stats.maxHealth - config.animations.special1.damage);
  assert.ok(defender.health < base.stats.maxHealth);
});

test('efeito com target "opponent" surge embaixo do oponente, mesmo do outro lado da arena', () => {
  const world = setup(200, 1000);
  const [, defender] = world.fighters;
  const { result } = runUntilHit(world, cast('special2'));

  assert.equal(result?.outcome, 'hit');
  assert.equal(defender.health, base.stats.maxHealth - config.animations.special2.damage);
});

test('efeito preso ao corpo some quando o golpe e interrompido', () => {
  const world = setup(400, 900);
  const [attacker] = world.fighters;

  step(world, [cast('special3')]);
  assert.equal(world.effects.effects.length, 1);
  assert.equal(world.layers.back.children.length, 1, 'aura fica atras dos lutadores');

  attacker.takeHit(5, 20);
  step(world);
  assert.equal(world.effects.effects.length, 0);
  assert.equal(world.layers.back.children.length, 0, 'sprite removido do palco');
});

test('clear remove todos os efeitos do palco (inicio de round)', () => {
  const world = setup(200, 1000);
  step(world, [cast('special3')]);
  step(world, [command(), cast('special1')]);
  for (let tick = 0; tick < 20; tick += 1) step(world);
  assert.ok(world.effects.effects.length > 0);

  world.effects.clear();
  assert.equal(world.effects.effects.length, 0);
  assert.equal(world.layers.front.children.length + world.layers.back.children.length, 0);
});

test('IA usa golpe de longo alcance quando esta longe do oponente', () => {
  const combos = [
    { id: 'orb', input: '→↘↓P', tokens: ['→', '↘', '↓', 'P'], animation: 'special1' },
    { id: 'aura', input: '↓↘→K', tokens: ['↓', '↘', '→', 'K'], animation: 'special3' },
  ];
  const ai = new AIController(combos, 'hard', { random: () => 0 });
  const { fighters } = setup(200, 1000);

  const intent = ai.decide(fighters[1], fighters[0]);
  assert.equal(intent.type, 'combo');
  assert.equal(intent.combo.animation, 'special1', 'so o projetil alcanca daquela distancia');
});
