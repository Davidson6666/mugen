import test from 'node:test';
import assert from 'node:assert/strict';
import { runBoot } from '../src/utils/bootTasks.js';

test('boot: o progresso sobe por unidade e termina em 100%', async () => {
  const seen = [];
  const { failed } = await runBoot([
    { label: 'FONTES', units: 2, run: async (tick) => { tick(); tick(); } },
    { label: 'RETRATOS', units: 3, run: async (tick) => { tick(); tick(); tick(); } },
  ], { onProgress: ({ fraction }) => seen.push(fraction) });
  assert.deepEqual(failed, []);
  assert.equal(seen[0], 0);
  assert.equal(seen.at(-1), 1);
  assert.ok(seen.every((value, index) => index === 0 || value >= seen[index - 1]), 'a barra nunca volta');
});

test('boot: tarefa que falha nao trava e ainda fecha as unidades dela', async () => {
  let last = 0;
  const { failed } = await runBoot([
    { label: 'FONTES', run: async () => { throw new Error('sem fonte'); } },
    { label: 'RETRATOS', units: 4, run: async (tick) => { tick(); } },
  ], { onProgress: ({ fraction }) => { last = fraction; } });
  assert.deepEqual(failed, ['FONTES']);
  assert.equal(last, 1);
});

test('boot: tarefa que nunca termina e cortada pelo tempo limite', async () => {
  const started = Date.now();
  const { failed } = await runBoot([
    { label: 'CONTA', run: () => new Promise(() => {}) },
  ], { taskTimeoutMs: 40 });
  assert.deepEqual(failed, ['CONTA']);
  assert.ok(Date.now() - started < 1000);
});

test('boot: lista o que ainda esta pendente', async () => {
  const pendings = [];
  await runBoot([
    { label: 'A', run: async () => {} },
    { label: 'B', run: () => new Promise((resolve) => setTimeout(resolve, 20)) },
  ], { onProgress: ({ pending }) => pendings.push(pending.join(',')) });
  assert.ok(pendings.includes('A,B'));
  assert.ok(pendings.includes('B'));
  assert.equal(pendings.at(-1), '');
});

test('boot: sem tarefas termina na hora, cheio', async () => {
  let last = -1;
  await runBoot([], { onProgress: ({ fraction }) => { last = fraction; } });
  assert.equal(last, 1);
});
