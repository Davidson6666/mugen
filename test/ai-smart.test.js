import test from 'node:test';
import assert from 'node:assert/strict';
import { AIController } from '../src/systems/AIController.js';
import { analyzeMove, buffActive, phaseOf, reachOf } from '../src/systems/AIKnowledge.js';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, loadRecord, seedRandom } from './helpers/world.js';

// A IA que entende os golpes: o papel de cada um (defender, curar, ligar
// bonus, finalizar) e o que ela ve do oponente (comecando, acertando,
// recuperando).

const record = (id) => loadRecord(id);
const aiFor = (rec, difficulty = 'hard', options = {}) => new AIController(new ComboDetector(rec.config.combos).combos, difficulty, options);
const constant = (value) => () => value;

test('ia: o papel de cada golpe sai do config (bonus, cura, contra-ataque, finalizador, debuff)', () => {
  const goku = record('goku').config;
  assert.deepEqual(analyzeMove(goku, 'kaioken').buff.tags, ['kaioken']);
  assert.equal(analyzeMove(goku, 'finalRush').requires, 'kaioken');
  assert.ok(analyzeMove(record('nezuko').config, 'regenerate').heal);
  assert.ok(analyzeMove(record('dante').config, 'royalGuard').counter);
  assert.ok(analyzeMove(record('dante').config, 'doppelganger').buff.buffs.includes('doppelganger'));
  assert.deepEqual(analyzeMove(record('dante').config, 'quicksilver').debuff, ['slow']);
  assert.ok(analyzeMove(record('killua').config, 'finale').finisher > 0);
  assert.ok(analyzeMove(goku, 'superKamehameha').super);
  assert.ok(analyzeMove(goku, 'superKamehameha').damage > analyzeMove(goku, 'punch').damage);
});

test('ia: o alcance do golpe vem da caixa de acerto e do que ele anda', () => {
  const world = arena(record('goku'), 500, 700);
  const [goku] = world.fighters;
  assert.ok(reachOf(goku, 'punch') > 0);
  assert.ok(reachOf(goku, 'kick') >= reachOf(goku, 'punch') * 0.5);
});

test('ia: liga o Kaioken quando esta longe e ainda sem a aura, e nao repete com a aura ligada', () => {
  const rec = record('goku');
  const world = arena(rec, 300, 900);
  const [goku, rival] = world.fighters;
  const ai = aiFor(rec, 'hard', { random: constant(0) });
  ai.decisionTimer = 0;
  const intent = ai.decide(goku, rival);
  assert.equal(intent.type, 'combo');
  assert.equal(intent.combo.animation, 'kaioken');

  goku.effectTags.add('kaioken');
  assert.ok(buffActive(goku, analyzeMove(rec.config, 'kaioken')));
  const again = aiFor(rec, 'hard', { random: constant(0) }).decide(goku, rival);
  assert.notEqual(again.combo?.animation, 'kaioken', 'com a aura ligada nao liga de novo');
});

test('ia: a sequencia final do Goku so entra com o Kaioken em campo', () => {
  const rec = record('goku');
  const restore = seedRandom(3);
  try {
    const ask = (aura) => {
      const world = arena(rec, 500, 545);
      const [goku, rival] = world.fighters;
      if (aura) goku.effectTags.add('kaioken');
      const ai = aiFor(rec, 'hard');
      const chosen = new Set();
      for (let round = 0; round < 400; round += 1) {
        ai.decisionTimer = 0;
        const intent = ai.decide(goku, rival);
        if (intent.type === 'combo') chosen.add(intent.combo.animation);
      }
      return chosen;
    };
    assert.ok(!ask(false).has('finalRush'), 'sem aura nao escolhe');
    assert.ok(ask(true).has('finalRush'), 'com aura escolhe');
  } finally {
    restore();
  }
});

test('ia: cura quando esta ferida e com espaco, e nao com a vida cheia', () => {
  const rec = record('nezuko');
  const world = arena(rec, 300, 900);
  const [nezuko, rival] = world.fighters;
  const ai = aiFor(rec, 'hard', { random: constant(0) });
  nezuko.health = 30;
  assert.equal(ai.decide(nezuko, rival).combo?.animation, 'regenerate');
  nezuko.health = nezuko.config.stats.maxHealth;
  assert.notEqual(aiFor(rec, 'hard', { random: constant(0) }).decide(nezuko, rival).combo?.animation, 'regenerate');
});

test('ia: faz o contra-ataque quando o oponente ataca perto', () => {
  const rec = record('dante');
  const world = arena(rec, 500, 560, record('gojo'));
  const [dante, rival] = world.fighters;
  rival.startAttack('punch');
  // Comecando o golpe, perto: ameaca.
  assert.equal(phaseOf(rival).kind, 'startup');
  const intent = aiFor(rec, 'hard', { random: constant(0) }).decide(dante, rival);
  assert.equal(intent.combo?.animation, 'royalGuard');
});

test('ia: defende quando nao tem contra-ataque e o oponente ataca perto', () => {
  const rec = record('tanjiro');
  const world = arena(rec, 500, 560, record('gojo'));
  const [cpu, rival] = world.fighters;
  rival.startAttack('punch');
  const intent = aiFor(rec, 'hard', { random: constant(0) }).decide(cpu, rival);
  assert.equal(intent.type, 'block');
});

test('ia: o finalizador do Killua so entra com o oponente abaixo de 1/3 da vida', () => {
  const rec = record('killua');
  const restore = seedRandom(9);
  try {
    const ask = (health) => {
      const world = arena(rec, 500, 545);
      const [killua, rival] = world.fighters;
      rival.health = health;
      const ai = aiFor(rec, 'hard');
      const chosen = new Set();
      for (let round = 0; round < 500; round += 1) {
        ai.decisionTimer = 0;
        const intent = ai.decide(killua, rival);
        if (intent.type === 'combo') chosen.add(intent.combo.animation);
      }
      return chosen;
    };
    assert.ok(!ask(100).has('finale'), 'oponente com a vida cheia');
    assert.ok(ask(20).has('finale'), 'oponente quase morto');
  } finally {
    restore();
  }
});

test('ia: pune o oponente que esta se recuperando mais do que ataca quem esta parado', () => {
  const rec = record('chunli');
  const restore = seedRandom(5);
  try {
    const rate = (recovering) => {
      const world = arena(rec, 500, 545, record('gojo'));
      const [cpu, rival] = world.fighters;
      if (recovering) {
        rival.startAttack('punch');
        rival.moveClock = 500;
        assert.equal(phaseOf(rival).kind, 'recovery');
      }
      const ai = aiFor(rec, 'normal');
      let attacks = 0;
      for (let round = 0; round < 600; round += 1) {
        ai.decisionTimer = 0;
        const intent = ai.decide(cpu, rival);
        if (intent.type === 'attack' || intent.type === 'combo') attacks += 1;
      }
      return attacks;
    };
    assert.ok(rate(true) > rate(false) * 1.15, 'pune mais na recuperacao');
  } finally {
    restore();
  }
});

test('ia: um combo de dash nunca e escolhido como golpe', () => {
  const rec = record('dante');
  const world = arena(rec, 500, 545);
  const [dante, rival] = world.fighters;
  const restore = seedRandom(2);
  try {
    const ai = aiFor(rec, 'hard');
    for (let round = 0; round < 500; round += 1) {
      ai.decisionTimer = 0;
      const intent = ai.decide(dante, rival);
      if (intent.type === 'combo') assert.ok(!/^(dash|airDash)/.test(intent.combo.animation ?? ''), intent.combo.animation);
    }
  } finally {
    restore();
  }
});

test('ia: a postura de contra-ataque so entra se ficar pronta antes do golpe chegar (Escanor: 15 ticks)', () => {
  const rec = record('escanor');
  const world = arena(rec, 500, 560, record('gojo'));
  const [escanor, rival] = world.fighters;
  rival.startAttack('punch');
  // Golpe do oponente comecando agora: falta tempo? Simula pouco tempo restante.
  rival.moveClock = 0;
  const phase = phaseOf(rival);
  assert.equal(phase.kind, 'startup');
  const counter = analyzeMove(rec.config, 'sunCounter');
  assert.equal(counter.counterFrom, 15);

  // Com folga (mais de 15 ticks ate acertar) a IA arma a postura.
  rival.animation.current.hits = [{ from: 6, until: 6, box: rival.animation.current.hits?.[0]?.box ?? { offsetX: 0, width: 1, offsetY: 0, height: 1 } }];
  rival.animation.current.durations = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
  assert.ok(phaseOf(rival).remaining >= 15);
  const early = aiFor(rec, 'hard', { random: constant(0) }).decide(escanor, rival);
  assert.equal(early.combo?.animation, 'sunCounter');

  // Sem folga (o golpe chega em poucos ticks) ela defende em vez de armar.
  rival.moveClock = 25;
  assert.ok(phaseOf(rival).remaining < 15);
  const late = aiFor(rec, 'hard', { random: constant(0) }).decide(escanor, rival);
  assert.notEqual(late.combo?.animation, 'sunCounter');
});
