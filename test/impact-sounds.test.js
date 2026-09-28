import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { AudioManager } from '../src/systems/AudioManager.js';
import { kindOf } from '../src/systems/HitFeedback.js';

// Sons de impacto: cada tipo de acerto toca uma amostra com a altura e o
// volume do seu tipo, e uma rajada nao vira metralhadora.

class FakeContext {
  constructor() {
    this.currentTime = 0;
    this.started = [];
    this.destination = {};
  }

  createGain() {
    return { gain: { value: 1 }, connect() {} };
  }

  createBufferSource() {
    const context = this;
    return {
      buffer: null,
      playbackRate: { value: 1 },
      connect(node) { this.output = node; },
      start() { context.started.push(this); },
    };
  }
}

function manager() {
  globalThis.window = { AudioContext: FakeContext, localStorage: { getItem: () => null, setItem() {} } };
  const audio = new AudioManager(1);
  for (const name of ['impact_hit_a', 'impact_hit_b', 'impact_heavy']) {
    audio.buffers.set(`/assets/sfx/${name}.mp3`, { name });
  }
  // O contexto nasce na primeira chamada; o teste precisa dele antes para
  // controlar o relogio.
  audio.ensureContext();
  return audio;
}

test('impacto: as amostras existem em public/assets/sfx', () => {
  for (const name of ['impact_hit_a', 'impact_hit_b', 'impact_heavy']) {
    assert.ok(existsSync(new URL(`../public/assets/sfx/${name}.mp3`, import.meta.url)), name);
  }
});

test('impacto: sem as amostras carregadas nao toca nem quebra', () => {
  globalThis.window = { AudioContext: FakeContext, localStorage: { getItem: () => null, setItem() {} } };
  const audio = new AudioManager(1);
  audio.playImpact('hit');
  assert.equal(audio.context.started.length, 0);
});

for (const [kind, rate, gain, names] of [
  ['hit', [0.94, 1.08], 0.55, ['impact_hit_a', 'impact_hit_b']],
  ['heavy', [0.9, 1.02], 0.7, ['impact_heavy']],
  ['block', [1.3, 1.42], 0.28, ['impact_hit_a']],
  ['ko', [0.72, 0.8], 0.85, ['impact_heavy']],
]) {
  test(`impacto: ${kind} toca a amostra do tipo, com a altura e o volume dele`, () => {
    const audio = manager();
    for (let round = 0; round < 20; round += 1) {
      audio.context.currentTime += 1;
      audio.playImpact(kind);
    }
    const { started } = audio.context;
    assert.equal(started.length, 20);
    for (const source of started) {
      assert.ok(names.includes(source.buffer.name), `${kind}: ${source.buffer.name}`);
      assert.ok(source.playbackRate.value >= rate[0] && source.playbackRate.value <= rate[1], `altura ${source.playbackRate.value}`);
      assert.equal(source.output.gain.value, gain);
    }
  });
}

test('impacto: rajada no mesmo instante toca um so; tipos diferentes nao se cortam', () => {
  const audio = manager();
  audio.context.currentTime = 5;
  audio.playImpact('hit');
  audio.playImpact('hit');
  audio.playImpact('hit');
  assert.equal(audio.context.started.length, 1);
  audio.playImpact('heavy');
  assert.equal(audio.context.started.length, 2);
  audio.context.currentTime = 5.06;
  audio.playImpact('hit');
  assert.equal(audio.context.started.length, 3);
});

test('impacto: tipo desconhecido e ignorado', () => {
  const audio = manager();
  audio.playImpact('nada');
  assert.equal(audio.context.started.length, 0);
});

test('impacto: o tipo do acerto vem do resultado (leve, forte, bloqueio, nocaute)', () => {
  assert.equal(kindOf({ outcome: 'hit', damage: 2 }), 'hit');
  assert.equal(kindOf({ outcome: 'hit', damage: 2, heavy: true }), 'heavy');
  assert.equal(kindOf({ outcome: 'block', damage: 1 }), 'block');
  assert.equal(kindOf({ outcome: 'ko', damage: 5 }), 'ko');
});
