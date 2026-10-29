import test from 'node:test';
import assert from 'node:assert/strict';
import { NETWORK_MESSAGE, isNetworkError } from '../src/utils/networkError.js';

// Servidor fora do ar vira uma frase em portugues em vez de "Failed to fetch".
test('rede: reconhece as mensagens de falha de conexao dos navegadores e do supabase-js', () => {
  for (const message of ['Failed to fetch', 'NetworkError when attempting to fetch resource.', 'Load failed', 'fetch failed', 'Network request failed']) {
    assert.ok(isNetworkError({ message }), message);
  }
  assert.ok(isNetworkError({ name: 'AuthRetryableFetchError', message: '' }));
});

test('rede: erro comum nao vira erro de rede', () => {
  assert.ok(!isNetworkError({ message: 'Invalid login credentials' }));
  assert.ok(!isNetworkError(null));
  assert.ok(!isNetworkError({}));
});

test('rede: a mensagem esta em portugues e diz o que fazer', () => {
  assert.match(NETWORK_MESSAGE, /internet/);
});
