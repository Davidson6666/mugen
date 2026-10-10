import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clashLayout, sheetPageOf } from '../src/utils/clashPose.js';

// A cena de confronto da abertura nasce das configs reais: para todo par de
// lutadores, os dois cabem na tela, o soco chega no outro e os quadros existem.
const roster = JSON.parse(readFileSync(new URL('../src/data/characters.json', import.meta.url)));
const configs = Object.fromEntries(roster.filter((entry) => entry.id !== 'dummy').map((entry) => [
  entry.id,
  JSON.parse(readFileSync(new URL(`../public${entry.dir}/${entry.config}`, import.meta.url))),
]));
const ids = Object.keys(configs).filter((id) => id !== 'ensina_god');

test('confronto: todo par se encosta, cabe na tela e usa quadros que existem', () => {
  for (const a of ids) {
    for (const b of ids) {
      if (a === b) continue;
      const scene = clashLayout(configs[a], configs[b]);
      const gap = scene.defender.x - scene.attacker.x;
      assert.ok(gap >= 300 && gap <= 700, `${a} x ${b}: distancia ${gap}`);
      assert.ok(scene.attacker.x > 150 && scene.defender.x < 1130, `${a} x ${b}: sai da tela`);
      // O ponto de contato fica entre os dois e dentro da tela.
      assert.ok(scene.contact.x >= scene.attacker.x && scene.contact.x <= scene.defender.x, `${a} x ${b}: contato fora`);
      assert.ok(scene.contact.y > 150 && scene.contact.y < 590, `${a} x ${b}: contato em y ${scene.contact.y}`);
      for (const side of [scene.attacker, scene.defender]) {
        assert.ok(Number.isInteger(side.sheetFrame), `${a} x ${b}: quadro invalido`);
      }
      assert.ok(Number.isInteger(sheetPageOf(configs[a], scene.attacker.sheetFrame)));
    }
  }
});

test('confronto: quem bate usa o quadro do soco esticado, quem apanha o de apanhar', () => {
  const scene = clashLayout(configs.dante, configs.reze);
  assert.equal(scene.attacker.clip, 'punch');
  assert.equal(scene.defender.clip, 'hitReaction');
  assert.equal(scene.attacker.index, configs.dante.animations.punch.hits[0].from);
});

test('confronto: sem soco ou reacao, cai na pose parada em vez de quebrar', () => {
  const bare = { ...configs.goku, animations: { idle: configs.goku.animations.idle }, hitbox: undefined };
  const scene = clashLayout(bare, bare);
  assert.equal(scene.attacker.clip, 'idle');
  assert.equal(scene.defender.clip, 'idle');
  assert.ok(Number.isFinite(scene.contact.x) && Number.isFinite(scene.contact.y));
});
