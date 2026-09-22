import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Texture } from 'pixi.js';
import { Fighter } from '../src/systems/Fighter.js';
import { resolveAttack, resolveBodyCollision } from '../src/systems/CollisionDetector.js';

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
const record = { config, frames: Array.from({ length: cols * rows }, () => Texture.EMPTY) };

const NEUTRAL = { left: false, right: false, up: false, down: false, jump: false, punch: false, kick: false, special: false };
const command = (overrides = {}) => ({ ...NEUTRAL, ...overrides });

function step(a, b, commandA = command()) {
  a.faceTowards(b.x);
  b.faceTowards(a.x);
  a.update(commandA, 1);
  b.update(command(), 1);
  resolveBodyCollision(a, b);
  return resolveAttack(a, b);
}

// Corpos encostados: a colisao de corpo afasta os dois ate a distancia minima,
// que e a pior situacao de alcance para quem ataca.
function pressedTogether() {
  const a = new Fighter({ record, map, x: 600, facing: 1 });
  const b = new Fighter({ record, map, x: 602, facing: -1 });
  for (let tick = 0; tick < 3; tick += 1) step(a, b);
  return [a, b];
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

for (const [name, trigger] of ATTACKS) {
  test(`${name} do Itachi conecta com os corpos encostados`, () => {
    const [a, b] = pressedTogether();
    let result = null;
    for (let tick = 0; tick < 90 && !result; tick += 1) {
      result = step(a, b, tick === 0 ? trigger : command());
    }
    assert.equal(result?.outcome, 'hit', `${name} nao alcancou o oponente`);
  });
}
