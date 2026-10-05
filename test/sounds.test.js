import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { arena, cast, loadRecord, step } from './helpers/world.js';

// Sons dos golpes: todo som citado num golpe esta registrado e o arquivo
// existe; e, ao soltar o golpe, o lutador pede o som de verdade.
const roster = JSON.parse(readFileSync(new URL('../src/data/characters.json', import.meta.url)));

// Lidos do .cns do pacote (scripts/lib/cns-sounds.mjs), com quantos golpes
// costumam ficar com som (piso, para pegar uma leitura que quebre).
const FROM_CNS = { escanor: 30, unohana: 20, aizen: 40, gojo: 25, sukuna: 25 };

// Personagens de rascunho nao tem atlas nem sons: so os importados entram.
const readConfig = (id) => JSON.parse(readFileSync(new URL(`../public/assets/characters/${id}/${id}_config.json`, import.meta.url)));

for (const { id, dir } of roster) {
  const config = readConfig(id);
  const { sounds } = config;
  if (!sounds) continue;

  test(`${id}: sons citados nos golpes estao registrados e os arquivos existem`, () => {
    for (const [name, animation] of Object.entries(config.animations)) {
      for (const event of animation.events ?? []) {
        if (event.sound) assert.ok(sounds[event.sound], `${name} pede ${event.sound}`);
      }
    }
    for (const [key, file] of Object.entries(sounds)) {
      const path = new URL(`../public${dir}/${file}`, import.meta.url);
      assert.ok(existsSync(path), `${key}: ${file} nao existe`);
    }
  });
}

for (const [id, minimum] of Object.entries(FROM_CNS)) {
  test(`${id}: golpes com som lido do pacote`, () => {
    const { animations } = readConfig(id);
    const withSound = Object.entries(animations).filter(([, animation]) => animation.events?.some((event) => event.sound));
    assert.ok(withSound.length >= minimum, `${id}: ${withSound.length} golpes com som (esperava ${minimum}+)`);
  });

  test(`${id}: soltar um golpe com som pede o som ao tocador`, () => {
    const record = loadRecord(id);
    const [name, animation] = Object.entries(record.config.animations)
      .find(([, entry]) => !entry.air && entry.events?.some((event) => event.sound && event.at < 10));
    const world = arena(record, 500, 560);
    step(world, cast(name));
    for (let tick = 0; tick < 30; tick += 1) step(world);
    const wanted = new Set(animation.events.filter((event) => event.sound && event.at < 30).map((event) => event.sound));
    const asked = new Set(world.fighters[0].pendingSounds.map((request) => request.key));
    assert.ok([...wanted].some((key) => asked.has(key)), `${name}: esperava ${[...wanted].join(', ')}, pediu ${[...asked].join(', ') || 'nada'}`);
  });
}
