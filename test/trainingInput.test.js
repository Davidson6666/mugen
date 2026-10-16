import test from 'node:test';
import assert from 'node:assert/strict';
import { ComboDamage, InputHistory, inputLabel } from '../src/utils/trainingInput.js';

// Area de treino: historico de teclas e dano do combo no boneco.

test('treino: tecla vira seta relativa ao lado que o lutador encara', () => {
  assert.equal(inputLabel({ right: true }, 1), '→');
  assert.equal(inputLabel({ right: true }, -1), '←');
  assert.equal(inputLabel({ down: true, right: true, punch: true }, 1), '↘ P');
  assert.equal(inputLabel({ punch: true, kick: true }, 1), 'P+K');
  assert.equal(inputLabel({}, 1), '');
});

test('treino: segurar a mesma direcao nao repete linha; botao sempre entra', () => {
  const history = new InputHistory(5);
  history.push({ right: true }, 1);
  history.push({ right: true }, 1);
  history.push({ right: true, punch: true }, 1);
  history.push({ punch: true }, 1);
  history.push({ punch: true }, 1);
  assert.deepEqual(history.entries, ['P', 'P', '→ P', '→']);
});

test('treino: o historico guarda so as ultimas linhas', () => {
  const history = new InputHistory(3);
  for (const key of ['punch', 'kick', 'special', 'punch']) history.push({ [key]: true }, 1);
  assert.equal(history.entries.length, 3);
  assert.equal(history.entries[0], 'P');
});

test('treino: dano soma no combo, fica na tela e zera no proximo combo', () => {
  const damage = new ComboDamage();
  damage.update(5, 1);
  damage.update(0, 1);
  damage.update(7, 2);
  assert.equal(damage.current, 12);
  assert.equal(damage.last, 7);
  damage.update(0, 0);
  assert.equal(damage.current, 12, 'o numero fica na tela depois do combo');
  damage.update(3, 1);
  assert.equal(damage.current, 3);
  assert.equal(damage.best, 12);
});
