import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// O multiplicador de dano mora em dois lugares: src/data/balance.json (que o
// balance-tune e o importador leem) e "balance.damage" no config de cada
// lutador (que o jogo le). Se um mudar sem o outro, o jogo e o ajuste
// discordam sem ninguem perceber.
const roster = JSON.parse(readFileSync(new URL('../src/data/characters.json', import.meta.url))).filter((entry) => entry.id !== 'dummy');
const balance = JSON.parse(readFileSync(new URL('../src/data/balance.json', import.meta.url)));

for (const entry of roster) {
  test(`balanceamento: ${entry.id} tem o mesmo multiplicador no balance.json e no config`, () => {
    const config = JSON.parse(readFileSync(new URL(`../public${entry.dir}/${entry.config}`, import.meta.url)));
    assert.equal(config.balance?.damage ?? 1, balance[entry.id] ?? 1);
  });
}
