import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { arena, command, hits, loadRecord, step } from './helpers/world.js';
import { auditCharacter } from '../scripts/balance-audit.mjs';

// Equilibrio: golpe que se repete sem parar (a jab da Reze) e o
// multiplicador de dano de cada personagem.
const roster = JSON.parse(readFileSync(new URL('../src/data/characters.json', import.meta.url)));
const imported = roster
  .map((entry) => entry.id)
  .filter((id) => {
    try {
      return Boolean(JSON.parse(readFileSync(new URL(`../public/assets/characters/${id}/${id}_config.json`, import.meta.url))).atlas);
    } catch {
      return false;
    }
  });

test('equilibrio: os personagens importados sao 16 e a auditoria roda em todos', () => {
  assert.ok(imported.length >= 16, `${imported.length} personagens`);
  for (const id of imported) assert.ok(auditCharacter(id), id);
});

// Personagens cujo config tem um cancel que volta a um golpe da mesma
// sequencia (jab que leva a jab): sem a regra do motor, martelar o botao
// emendaria para sempre.
const WITH_CYCLES = imported.filter((id) => auditCharacter(id).cycles.length > 0);

test('equilibrio: a auditoria acha os ciclos conhecidos (Miku, Pikachu, Goku)', () => {
  // A Reze (e a Yoruichi que ela substituiu) nao tem ciclo: o soco e o chute
  // nunca voltam a um golpe anterior da mesma sequencia.
  for (const id of ['miku', 'pikachu', 'goku']) assert.ok(WITH_CYCLES.includes(id), id);
});

for (const id of WITH_CYCLES) {
  test(`equilibrio: ${id} martelando botoes nunca repete um golpe dentro da mesma sequencia`, () => {
    const record = loadRecord(id);
    for (const button of ['punch', 'kick', 'special']) {
      const world = arena(record, 500, 545);
      const [a, b] = world.fighters;
      let serial = a.attackSerial;
      let chain = [];
      for (let tick = 0; tick < 600; tick += 1) {
        step(world, command(tick % 3 === 0 ? { [button]: true } : {}));
        b.health = 100000;
        if (a.state !== 'attack') chain = [];
        if (a.attackSerial !== serial) {
          serial = a.attackSerial;
          // chainUsed tem so o golpe atual quando a sequencia recomecou.
          if (a.chainUsed.size <= 1) chain = [];
          chain.push(a.animation.name);
          assert.equal(new Set(chain).size, chain.length, `${id} (${button}) repetiu golpe na sequencia: ${chain.join(' > ')}`);
        }
      }
    }
  });
}

test('equilibrio: cada golpe entra uma vez so numa sequencia por cancels', () => {
  const record = loadRecord('reze');
  const world = arena(record, 500, 560);
  const [a] = world.fighters;
  const used = [];
  let serial = a.attackSerial;
  for (let tick = 0; tick < 300; tick += 1) {
    step(world, command(tick % 3 === 0 ? { punch: true } : {}));
    world.fighters[1].health = 100000;
    if (a.attackSerial !== serial) {
      serial = a.attackSerial;
      // chainUsed tem so o golpe atual quando uma sequencia nova comecou (sem
      // deixar o estado "attack" entre uma e outra, quando o mashing emenda
      // o ultimo golpe de uma sequencia direto no primeiro da proxima).
      if (a.chainUsed.size <= 1) used.length = 0;
      used.push(a.animation.name);
    }
    if (a.state !== 'attack') used.length = 0;
    assert.equal(new Set(used).size, used.length, `sequencia repetiu golpe: ${used.join(' > ')}`);
  }
});

test('equilibrio: o multiplicador de dano vale (x2 causa o dobro; fracionario sem arredondar)', () => {
  const record = loadRecord('goku');
  const damageOf = (multiplier) => {
    const local = { ...record, config: { ...record.config, balance: multiplier === 1 ? undefined : { damage: multiplier } } };
    const world = arena(local, 500, 545);
    for (let tick = 0; tick < 12; tick += 1) step(world, command(tick === 0 ? { punch: true } : {}));
    const rival = world.fighters[1];
    return { taken: rival.config.stats.maxHealth - rival.health, hits: hits(world).length };
  };
  const base = damageOf(1);
  assert.ok(base.hits >= 1 && base.taken > 0);
  // Com dano fracionario, o dobro de 3.04 nao bate casa a casa em ponto
  // flutuante: a conta chega a 6.079999999999998 por um lado e
  // 6.0800000000000125 pelo outro. O que importa e o multiplicador valer.
  const igual = (a, b) => Math.abs(a - b) < 1e-9;
  assert.ok(igual(damageOf(2).taken, base.taken * 2), `${damageOf(2).taken} != ${base.taken * 2}`);
  assert.ok(igual(damageOf(0.5).taken, base.taken / 2), `${damageOf(0.5).taken} != ${base.taken / 2}`);
});

test('equilibrio: dano fracionario nao impede o nocaute (sem sobra de ponto flutuante)', () => {
  const record = loadRecord('goku');
  const world = arena(record, 500, 545);
  const rival = world.fighters[1];
  rival.health = 0.3;
  for (let tick = 0; tick < 30; tick += 1) step(world, command(tick === 0 ? { punch: true } : {}));
  assert.equal(rival.health, 0);
  assert.ok(rival.isKnockedOut);
});
