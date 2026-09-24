// Arena de teste com personagens importados do MUGEN: mesma ordem do game
// loop (GameCanvas), sem desenho. Guarda por onde o lutador da esquerda
// passou (nomes das animacoes) e tudo o que conectou.
import { readFileSync } from 'node:fs';
import { Container, Texture } from 'pixi.js';
import { Fighter } from '../../src/systems/Fighter.js';
import { resolveAttack, resolveBodyCollision } from '../../src/systems/CollisionDetector.js';
import { EffectManager } from '../../src/systems/EffectManager.js';

export const map = JSON.parse(
  readFileSync(new URL('../../public/assets/maps/dummy/dummy_map_config.json', import.meta.url)),
);

const blank = (count) => Array.from({ length: count }, () => Texture.EMPTY);

export function loadRecord(id) {
  const config = JSON.parse(
    readFileSync(new URL(`../../public/assets/characters/${id}/${id}_config.json`, import.meta.url)),
  );
  return {
    config,
    frames: blank(config.atlas.length),
    effectFrames: Object.fromEntries(
      Object.entries(config.effects).map(([effectId, effect]) => [effectId, blank(effect.atlas.length)]),
    ),
  };
}

const NEUTRAL = { left: false, right: false, up: false, down: false, jump: false, punch: false, kick: false, special: false };
export const command = (overrides = {}) => ({ ...NEUTRAL, ...overrides });
export const cast = (animation) => command({ combo: { animation } });

export function arena(record, leftX, rightX, rivalRecord = record) {
  const fighters = [
    new Fighter({ record, map, x: leftX, facing: 1 }),
    new Fighter({ record: rivalRecord, map, x: rightX, facing: -1 }),
  ];
  fighters[0].opponent = fighters[1];
  fighters[1].opponent = fighters[0];
  const effects = new EffectManager({ back: new Container(), front: new Container(), bounds: { left: 0, right: 1280 } });
  return { fighters, effects, visited: new Set(), results: [] };
}

export function step(world, commandA = command(), commandB = command()) {
  const [a, b] = world.fighters;
  a.faceTowards(b.x);
  b.faceTowards(a.x);
  a.update(commandA, 1);
  b.update(commandB, 1);
  world.effects.collect(world.fighters);
  resolveBodyCollision(a, b);
  const results = [resolveAttack(a, b), resolveAttack(b, a), ...world.effects.update(1, world.fighters)].filter(Boolean);
  if (a.state === 'attack' || a.state === 'dash') world.visited.add(a.animation.name);
  world.results.push(...results);
  return results;
}

// Aperta o botao a cada "gap" ticks (quem joga "martela" para encadear).
export function mash(world, button, { ticks = 300, gap = 6, extra = {} } = {}) {
  for (let tick = 0; tick < ticks; tick += 1) {
    step(world, command(tick % gap === 0 ? { [button]: true, ...extra } : {}));
  }
  return world;
}

export function run(world, trigger, ticks = 400) {
  for (let tick = 0; tick < ticks; tick += 1) step(world, tick === 0 ? trigger : command());
  return world;
}

export const hits = (world) => world.results.filter((result) => result.outcome === 'hit' || result.outcome === 'ko');

// Frames, efeitos e golpes citados no config existem (vale para todo
// personagem importado).
export function assertConfigIntegrity(assert, config) {
  const effectIds = new Set(Object.keys(config.effects));
  const spawnsIn = (definition) => [
    definition.effect,
    ...(definition.events ?? []).map((event) => event.effect),
    ...(definition.spawns ?? []),
    definition.onHitSpawn,
    definition.onDeathSpawn,
    ...(definition.seal?.kinds ?? []).map((kind) => (kind.mark ? { id: kind.mark } : null)),
  ].filter(Boolean);
  const animationNames = (definition) => [
    definition.next,
    definition.onHit?.to,
    definition.charge?.to,
    definition.counter?.to,
    ...(definition.cancels ?? []).map((entry) => entry.to),
  ].filter(Boolean);

  for (const [name, animation] of Object.entries(config.animations)) {
    for (const frame of animation.frames) assert.ok(frame >= 0 && frame < config.atlas.length, `${name}: frame ${frame}`);
    assert.equal(animation.frames.length, animation.durations.length, `${name}: um tempo por quadro`);
    for (const spawn of spawnsIn(animation)) assert.ok(effectIds.has(spawn.id), `${name} pede o efeito ${spawn.id}`);
    for (const target of animationNames(animation)) assert.ok(config.animations[target], `${name} segue para ${target}`);
  }
  for (const [id, effect] of Object.entries(config.effects)) {
    for (const frame of effect.animation.frames) assert.ok(frame < effect.atlas.length, `${id}: frame ${frame}`);
    for (const spawn of spawnsIn(effect)) assert.ok(effectIds.has(spawn.id), `${id} solta o efeito ${spawn.id}`);
  }
  for (const combo of config.combos) assert.ok(config.animations[combo.animation], `combo ${combo.id}`);
  const maps = [config.buttons, ...Object.values(config.modes ?? {}).map((mode) => mode.buttons)].filter(Boolean);
  for (const buttons of maps) {
    for (const group of Object.values(buttons)) {
      for (const name of Object.values(group)) assert.ok(config.animations[name], `botao -> ${name}`);
    }
  }
}
