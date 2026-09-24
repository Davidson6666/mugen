import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Texture } from 'pixi.js';
import { Fighter } from '../src/systems/Fighter.js';

const load = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const map = load('../public/assets/maps/dummy/dummy_map_config.json');
const dummy = load('../public/assets/characters/dummy/dummy_config.json');
const itachi = load('../public/assets/characters/itachi/itachi_config.json');
const blank = (count) => Array.from({ length: count }, () => Texture.EMPTY);

const NEUTRAL = { left: false, right: false, up: false, down: false, jump: false, punch: false, kick: false, special: false };
const command = (overrides = {}) => ({ ...NEUTRAL, ...overrides });
const JUMP = command({ up: true, jump: true });

function fighter(config = dummy) {
  const frames = config.atlas ? blank(config.atlas.length) : blank(84);
  const effectFrames = Object.fromEntries(Object.entries(config.effects ?? {}).map(([id, e]) => [id, blank(e.atlas?.length ?? 1)]));
  return new Fighter({ record: { config, frames, effectFrames }, map, x: 600 });
}

// Altura maxima (px acima do chao) de uma sequencia de comandos.
function peak(f, commands, ticks = 120) {
  let top = 0;
  for (let tick = 0; tick < ticks; tick += 1) {
    f.update(commands[tick] ?? command(), 1);
    top = Math.max(top, map.groundLevel - f.y);
  }
  return top;
}

test('apertar para cima de novo no ar da o pulo duplo, que sobe mais alto', () => {
  const single = peak(fighter(), [JUMP]);
  const commands = [JUMP];
  commands[10] = JUMP;
  const double = peak(fighter(), commands);
  assert.ok(double > single + 20, `simples ${single.toFixed(0)}px, duplo ${double.toFixed(0)}px`);
});

test('o aperto que tira do chao nao gasta o pulo duplo', () => {
  const f = fighter();
  f.update(JUMP, 1);
  assert.equal(f.airJumpsLeft, 1);
});

test('so um pulo duplo por salto, e ele volta ao tocar o chao', () => {
  const f = fighter();
  const commands = [JUMP];
  commands[8] = JUMP;
  commands[14] = JUMP;
  peak(f, commands, 20);
  assert.equal(f.airJumpsLeft, 0);
  const vy = f.vy;
  f.update(JUMP, 1);
  assert.ok(f.vy > vy, 'terceiro aperto nao impulsiona');
  peak(f, [], 150);
  assert.equal(f.grounded, true);
  assert.equal(f.airJumpsLeft, 1);
});

test('no pulo duplo da para mudar de direcao', () => {
  const f = fighter();
  f.update(command({ up: true, jump: true, right: true }), 1);
  for (let tick = 0; tick < 6; tick += 1) f.update(command(), 1);
  f.update(command({ up: true, jump: true, left: true }), 1);
  assert.ok(f.vx < 0);
});

test('selo sem pulo tambem bloqueia o pulo duplo', () => {
  const f = fighter();
  f.update(JUMP, 1);
  f.applySeal({ kind: 'noJump', ticks: 300 });
  f.update(command(), 1);
  f.update(JUMP, 1);
  assert.equal(f.airJumpsLeft, 1);
});

test('itachi solta a revoada de corvos no pulo duplo', () => {
  const f = fighter(itachi);
  f.update(JUMP, 1);
  f.update(command(), 1);
  f.update(JUMP, 1);
  assert.equal(f.pendingEffects.at(-1)?.spawn.id, 'crowBurst');
});
