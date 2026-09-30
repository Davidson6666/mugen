import test from 'node:test';
import assert from 'node:assert/strict';
import { createRandom } from '../src/utils/rng.js';
import { arena, cast, command, loadRecord, step } from './helpers/world.js';

// Partida online funciona por lockstep: os dois computadores rodam a luta
// inteira localmente e so trocam os comandos. Isso so fecha se a mesma
// sequencia de comandos, com a mesma semente, chegar exatamente no mesmo
// resultado dos dois lados - e o que estes testes seguram.

test('rng: mesma semente da a mesma sequencia', () => {
  const a = createRandom(12345);
  const b = createRandom(12345);
  const first = Array.from({ length: 10 }, () => a());
  const second = Array.from({ length: 10 }, () => b());
  assert.deepEqual(first, second);
  for (const value of first) {
    assert.ok(value >= 0 && value < 1, `fora de [0,1): ${value}`);
  }
});

test('rng: sementes diferentes dao sequencias diferentes', () => {
  const a = Array.from({ length: 10 }, createRandom(1));
  const b = Array.from({ length: 10 }, createRandom(2));
  assert.notDeepEqual(a, b);
});

// Se algum golpe sorteado ainda chamasse Math.random direto, o sorteio
// injetado nao mudaria nada e estes dois casos cairiam na mesma variacao.
test('golpe sorteado sai do random injetado, nao do Math.random', () => {
  const miku = loadRecord('miku');
  const variations = miku.config.animations.music.randomNext;

  const pickWith = (value) => {
    const world = arena(miku, 400, 700, miku, { random: () => value });
    step(world, cast('music'));
    return world.fighters[0].animation.name;
  };

  assert.equal(pickWith(0), variations[0]);
  assert.equal(pickWith(0.999), variations.at(-1));
});

// Uma luta inteira: mesma semente, mesmo roteiro, duas vezes.
function runFight(seed) {
  const miku = loadRecord('miku');
  const itachi = loadRecord('itachi');
  const world = arena(miku, 420, 700, itachi, { random: createRandom(seed) });
  const [a, b] = world.fighters;

  const snapshots = [];
  const snapshot = () => {
    const fighter = (f) => [f.health, f.x.toFixed(6), f.y.toFixed(6), f.state, f.animation.name].join(':');
    const effects = world.effects.effects
      .map((effect) => `${effect.spawn.id}@${effect.x.toFixed(6)},${effect.y.toFixed(6)}`)
      .join('|');
    return `${fighter(a)} / ${fighter(b)} / ${effects}`;
  };

  // Roteiro fixo: anda, solta os golpes sorteados da Miku, e leva pancada do
  // Itachi no meio (efeitos com espalhamento aleatorio entram aqui).
  for (let tick = 0; tick < 240; tick += 1) {
    let commandA = command();
    if (tick === 10 || tick === 90 || tick === 170) commandA = cast('music');
    if (tick === 50) commandA = cast('nicoNico');
    if (tick > 20 && tick < 40) commandA = command({ right: true });

    let commandB = command();
    if (tick === 30) commandB = cast('amaterasu');
    if (tick === 120) commandB = cast('crowGenjutsu');

    step(world, commandA, commandB);
    snapshots.push(snapshot());
  }
  return snapshots;
}

test('mesma semente e mesmos comandos: luta identica do inicio ao fim', () => {
  const first = runFight(987654);
  const second = runFight(987654);
  assert.equal(first.length, second.length);
  const diverged = first.findIndex((value, index) => value !== second[index]);
  assert.equal(diverged, -1, diverged === -1 ? '' : `divergiu no tick ${diverged}:\n${first[diverged]}\n${second[diverged]}`);
});

test('sementes diferentes mudam a luta (o sorteio esta sendo usado mesmo)', () => {
  assert.notDeepEqual(runFight(1), runFight(999));
});
