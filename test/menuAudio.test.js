import test from 'node:test';
import assert from 'node:assert/strict';

// Som dos menus: com um AudioContext de mentira, confere que os efeitos
// disparam, que a trilha so agenda notas depois do primeiro gesto e que desligar
// para o agendamento.
class FakeParam {
  constructor() { this.value = 0; }
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
  linearRampToValueAtTime() {}
  cancelScheduledValues() {}
}
const made = { oscillators: 0, sources: 0 };
class FakeNode {
  constructor() { this.gain = new FakeParam(); this.frequency = new FakeParam(); }
  connect(target) { return target; }
  start() {}
  stop() {}
}
class FakeContext {
  constructor() { this.currentTime = 0; this.state = 'suspended'; this.sampleRate = 8000; this.destination = new FakeNode(); }
  resume() { this.state = 'running'; return Promise.resolve(); }
  createGain() { return new FakeNode(); }
  createOscillator() { made.oscillators += 1; return new FakeNode(); }
  createBiquadFilter() { return new FakeNode(); }
  createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; }
  createBufferSource() { made.sources += 1; return new FakeNode(); }
}

const timers = [];
const listeners = {};
globalThis.window = {
  AudioContext: FakeContext,
  localStorage: { getItem: () => '0.8', setItem() {} },
  setInterval: (fn) => { timers.push(fn); return timers.length; },
  clearInterval: (id) => { timers[id - 1] = null; },
  addEventListener: (name, fn) => { listeners[name] = fn; },
  removeEventListener: (name) => { delete listeners[name]; },
};

const { menuSound, setMenuMusic } = await import('../src/systems/MenuAudio.js');

test('menu: a trilha espera o primeiro gesto e depois agenda notas', () => {
  setMenuMusic(true);
  assert.ok(listeners.keydown, 'nao ficou esperando o gesto');
  listeners.keydown();
  const tick = timers.findLast(Boolean);
  assert.ok(tick, 'nao armou o agendador');
  const before = made.oscillators;
  tick();
  assert.ok(made.oscillators > before, 'nenhuma nota agendada');
});

test('menu: os tres efeitos tocam e acordam o contexto', () => {
  const before = made.oscillators;
  menuSound.tick();
  menuSound.confirm();
  menuSound.back();
  assert.ok(made.oscillators - before >= 4, `${made.oscillators - before} osciladores`);
});

test('menu: desligar a trilha para o agendamento', () => {
  setMenuMusic(false);
  assert.ok(timers.every((entry) => entry === null || entry === undefined) || timers.at(-1) === null);
});
