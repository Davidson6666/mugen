import test from 'node:test';
import assert from 'node:assert/strict';
import { DelayAgreement, MAX_INPUT_DELAY, MIN_INPUT_DELAY, proposeDelay } from '../src/systems/net/inputDelay.js';

// Atraso de input do online: cada lado mede a conexao e os dois usam o maior
// dos dois. Os dois PRECISAM terminar com o mesmo numero.

test('atraso: conexao boa da atraso pequeno, ruim da maior, dentro dos limites', () => {
  assert.equal(proposeDelay([20, 22, 25]), 6);
  assert.ok(proposeDelay([200, 210, 220]) > proposeDelay([40, 40, 40]));
  assert.ok(proposeDelay([5]) >= MIN_INPUT_DELAY && proposeDelay([5]) <= 5);
  assert.equal(proposeDelay([2000]), MAX_INPUT_DELAY);
  assert.equal(proposeDelay([]), null);
});

test('atraso: um pico isolado nao pesa (mediana)', () => {
  assert.equal(proposeDelay([40, 40, 900, 40, 40]), proposeDelay([40, 40, 40, 40, 40]));
});

// Dois lados ligados por um canal falso com latencia (ms) em cada direcao, e
// um relogio simulado (nada de esperar de verdade).
function wire({ latencyAB, latencyBA, lose = () => false }) {
  let clock = 0;
  const queue = [];
  const now = () => clock;
  const deliver = (target, delay, event, payload) => queue.push({ at: clock + delay, target, event, payload });
  const a = new DelayAgreement({ now, fallback: 8, send: (event, payload) => { if (!lose(event, 'a')) deliver('b', latencyAB, event, payload); } });
  const b = new DelayAgreement({ now, fallback: 8, send: (event, payload) => { if (!lose(event, 'b')) deliver('a', latencyBA, event, payload); } });
  const sides = { a, b };
  // Avanca o relogio entregando as mensagens que vencem no caminho.
  const wait = async (ms) => {
    const until = clock + ms;
    for (;;) {
      queue.sort((x, y) => x.at - y.at);
      const next = queue[0];
      if (!next || next.at > until) break;
      queue.shift();
      clock = next.at;
      sides[next.target].receive(next.event, next.payload);
    }
    clock = until;
    await Promise.resolve();
  };
  return { a, b, wait };
}

for (const [name, latencyAB, latencyBA] of [['conexao boa', 15, 15], ['conexao ruim', 120, 140], ['assimetrica', 10, 160]]) {
  test(`atraso: os dois lados combinam o mesmo numero (${name})`, async () => {
    const { a, b, wait } = wire({ latencyAB, latencyBA });
    const [delayA, delayB] = await Promise.all([a.run({ wait }), b.run({ wait })]);
    assert.ok(delayA !== null);
    assert.equal(delayA, delayB);
    assert.equal(delayA, Math.max(a.mine, b.mine));
  });
}

test('atraso: um lado que comeca bem depois ainda combina o mesmo numero', async () => {
  const { a, b, wait } = wire({ latencyAB: 30, latencyBA: 30 });
  const first = a.run({ wait });
  await wait(700);
  const [delayA, delayB] = await Promise.all([first, b.run({ wait })]);
  assert.equal(delayA, delayB);
});

test('atraso: a primeira proposta perdida e reenviada ate chegar', async () => {
  let dropped = 0;
  const { a, b, wait } = wire({ latencyAB: 20, latencyBA: 20, lose: (event) => event === 'delay' && dropped++ < 3 });
  const [delayA, delayB] = await Promise.all([a.run({ wait }), b.run({ wait })]);
  assert.equal(delayA, delayB);
});

test('atraso: sem resposta do outro lado, desiste (null) em vez de travar', async () => {
  const { a, wait } = wire({ latencyAB: 20, latencyBA: 20, lose: () => true });
  assert.equal(await a.run({ wait, timeoutMs: 2000 }), null);
});
