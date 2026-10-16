import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { arena, command, loadRecord, step } from './helpers/world.js';

// Nenhum lutador pode prender o outro para sempre so martelando botao. O
// defensor fica parado ate tomar o primeiro golpe e, dai em diante, segura a
// guarda sempre que consegue: pressao no levantar ele bloqueia, mas um laco de
// verdade (o chute relampago da Chun-Li emendava nele mesmo) nunca deixa ele
// ter um tick livre. Sem nocaute, para o laco aparecer inteiro.
const roster = JSON.parse(readFileSync(new URL('../src/data/characters.json', import.meta.url)))
  .filter((entry) => entry.id !== 'dummy');
const PATTERNS = [['punch'], ['kick'], ['special'], ['kick', 'special'], ['punch', 'special']];
const TICKS = 720;
// 5 s seguidos preso ja e laco (o maior combo de verdade do elenco fica em ~3,5 s).
const LIMIT = 300;

function longestLock(id, pattern, gap) {
  const world = arena(loadRecord(id), 600, 640);
  const rival = world.fighters[1];
  rival.minHealth = 1;
  let hitOnce = false;
  let locked = 0;
  let longest = 0;
  let press = 0;
  for (let tick = 0; tick < TICKS; tick += 1) {
    const button = tick % gap === 0 ? { [pattern[press++ % pattern.length]]: true } : {};
    const before = world.results.length;
    step(world, command(button), command({ guard: hitOnce }));
    if (world.results.slice(before).some((result) => result.outcome === 'hit')) hitOnce = true;
    const stuck = ['hitstun', 'launched', 'knockdown', 'down', 'getUp'].includes(rival.state);
    locked = stuck ? locked + 1 : 0;
    longest = Math.max(longest, locked);
  }
  return longest;
}

for (const { id } of roster) {
  test(`sem laco infinito: ${id}`, () => {
    for (const pattern of PATTERNS) {
      for (const gap of [2, 5]) {
        const longest = longestLock(id, pattern, gap);
        assert.ok(longest < LIMIT, `${pattern.join('+')} a cada ${gap} ticks prende ${longest} ticks seguidos`);
      }
    }
  });
}
