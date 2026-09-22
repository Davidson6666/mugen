import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Container, Texture } from 'pixi.js';
import { Fighter } from '../src/systems/Fighter.js';
import { resolveAttack, resolveBodyCollision } from '../src/systems/CollisionDetector.js';
import { EffectManager } from '../src/systems/EffectManager.js';

// O config do Itachi e gerado por scripts/import-itachi.mjs a partir da arte
// real, com hitboxes tiradas do desenho. Estes testes garantem que a
// importacao continua produzindo um personagem jogavel.
const config = JSON.parse(
  readFileSync(new URL('../public/assets/characters/itachi/itachi_config.json', import.meta.url)),
);
const map = JSON.parse(
  readFileSync(new URL('../public/assets/maps/dummy/dummy_map_config.json', import.meta.url)),
);

const { cols, rows } = config.spriteGridSize;
const emptyFrames = ({ cols: c, rows: r }) => Array.from({ length: c * r }, () => Texture.EMPTY);
const record = {
  config,
  frames: emptyFrames(config.spriteGridSize),
  effectFrames: Object.fromEntries(
    Object.entries(config.effects).map(([id, effect]) => [id, emptyFrames(effect.spriteGridSize)]),
  ),
};

const NEUTRAL = { left: false, right: false, up: false, down: false, jump: false, punch: false, kick: false, special: false };
const command = (overrides = {}) => ({ ...NEUTRAL, ...overrides });

// Mesma ordem do game loop em GameCanvas, com os efeitos.
function step(world, commandA = command()) {
  const [a, b] = world.fighters;
  a.faceTowards(b.x);
  b.faceTowards(a.x);
  a.update(commandA, 1);
  b.update(command(), 1);
  world.effects.collect(world.fighters);
  resolveBodyCollision(a, b);
  const melee = resolveAttack(a, b);
  const fromEffects = world.effects.update(1, world.fighters);
  return melee ?? fromEffects[0] ?? null;
}

function arena(leftX, rightX) {
  const fighters = [
    new Fighter({ record, map, x: leftX, facing: 1 }),
    new Fighter({ record, map, x: rightX, facing: -1 }),
  ];
  const effects = new EffectManager({ back: new Container(), front: new Container(), bounds: { left: 0, right: 1280 } });
  const world = { fighters, effects };
  for (let tick = 0; tick < 3; tick += 1) step(world);
  return world;
}

function attempt(world, trigger, ticks = 150) {
  for (let tick = 0; tick < ticks; tick += 1) {
    const result = step(world, tick === 0 ? trigger : command());
    if (result) return result;
  }
  return null;
}

test('todas as animacoes apontam para frames que existem na grade', () => {
  for (const [name, animation] of Object.entries(config.animations)) {
    for (const frame of animation.frames) {
      assert.ok(frame >= 0 && frame < cols * rows, `${name} usa frame ${frame} fora da grade ${cols}x${rows}`);
    }
  }
});

const ATTACKS = [
  ['punch', command({ punch: true })],
  ['kick', command({ kick: true })],
  ['special1', command({ combo: { animation: 'special1' } })],
  ['special2', command({ combo: { animation: 'special2' } })],
  ['special3', command({ combo: { animation: 'special3' } })],
];

// Corpos encostados (a colisao afasta os dois ate a distancia minima): a
// pior situacao de alcance para quem ataca, e a melhor para projetil passar
// por cima sem acertar.
for (const [name, trigger] of ATTACKS) {
  test(`${name} do Itachi conecta com os corpos encostados`, () => {
    const result = attempt(arena(600, 602), trigger);
    assert.equal(result?.outcome, 'hit', `${name} nao alcancou o oponente`);
  });
}

test('shuriken e Amaterasu acertam do outro lado da arena', () => {
  for (const special of ['special1', 'special2']) {
    const result = attempt(arena(200, 1000), command({ combo: { animation: special } }));
    assert.equal(result?.outcome, 'hit', `${special} deveria alcancar de longe`);
  }
});

test('Susanoo alcanca a meia distancia, mas nao a arena inteira', () => {
  const susanoo = command({ combo: { animation: 'special3' } });
  assert.equal(attempt(arena(400, 800), susanoo)?.outcome, 'hit');
  assert.equal(attempt(arena(200, 1000), susanoo), null);
});
