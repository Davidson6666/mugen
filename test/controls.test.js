import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BINDABLE,
  DEFAULT_CONTROLS,
  assignKey,
  keyLabel,
  resetControls,
} from '../src/utils/controls.js';

// O pedido era "da pra trocar qualquer tecla", sem mexer em comando nenhum:
// entao o padrao tem que continuar sendo exatamente o controle de sempre.
test('o padrao e o controle que o jogo sempre teve', () => {
  assert.equal(DEFAULT_CONTROLS[0].up, 'KeyW');
  assert.equal(DEFAULT_CONTROLS[0].left, 'KeyA');
  assert.equal(DEFAULT_CONTROLS[0].down, 'KeyS');
  assert.equal(DEFAULT_CONTROLS[0].right, 'KeyD');
  assert.equal(DEFAULT_CONTROLS[0].punch, 'KeyJ');
  assert.equal(DEFAULT_CONTROLS[0].kick, 'KeyK');
  assert.equal(DEFAULT_CONTROLS[0].special, 'KeyL');
  assert.equal(DEFAULT_CONTROLS[1].up, 'ArrowUp');
  assert.equal(DEFAULT_CONTROLS[1].punch, 'Numpad1');
  // Pulo e defesa nascem sem tecla propria: hoje saem do "cima" e de segurar
  // para tras, e isso nao pode mudar sozinho.
  assert.equal(DEFAULT_CONTROLS[0].jump, null);
  assert.equal(DEFAULT_CONTROLS[0].guard, null);
});

test('trocar para uma tecla livre so mexe na acao escolhida', () => {
  const { controls, swappedWith } = assignKey(resetControls(), 0, 'jump', 'KeyF');
  assert.equal(controls[0].jump, 'KeyF');
  assert.equal(swappedWith, null, 'nada foi tirado de ninguem');
  assert.equal(controls[0].punch, 'KeyJ', 'o resto fica como estava');
});

test('tecla ja usada troca de lugar, em vez de ficar repetida', () => {
  // Soco vai pro D, que era a direita: a direita fica com o J, que era do soco.
  const { controls, swappedWith } = assignKey(resetControls(), 0, 'punch', 'KeyD');
  assert.equal(controls[0].punch, 'KeyD');
  assert.equal(controls[0].right, 'KeyJ');
  assert.deepEqual(swappedWith, { player: 0, action: 'right' });
});

test('a troca tambem vale entre os dois jogadores', () => {
  const { controls, swappedWith } = assignKey(resetControls(), 0, 'punch', 'ArrowUp');
  assert.equal(controls[0].punch, 'ArrowUp');
  assert.equal(controls[1].up, 'KeyJ');
  assert.deepEqual(swappedWith, { player: 1, action: 'up' });
});

test('nenhuma tecla fica controlando duas coisas, em qualquer troca', () => {
  let controls = resetControls();
  const alvos = [[0, 'punch', 'KeyD'], [1, 'kick', 'KeyJ'], [0, 'jump', 'ArrowUp'], [1, 'up', 'KeyW']];
  for (const [player, action, key] of alvos) controls = assignKey(controls, player, action, key).controls;

  const usadas = [];
  for (const side of [0, 1]) {
    for (const { action } of BINDABLE) {
      const key = controls[side][action];
      if (key) usadas.push(key);
    }
  }
  assert.equal(new Set(usadas).size, usadas.length, `tecla repetida em ${usadas}`);
});

test('nome da tecla sai legivel na tela', () => {
  assert.equal(keyLabel('KeyF'), 'F');
  assert.equal(keyLabel('ArrowUp'), '↑');
  assert.equal(keyLabel('Numpad1'), 'NUM 1');
  assert.equal(keyLabel('Space'), 'ESPACO');
  assert.equal(keyLabel(null), '—', 'sem tecla aparece como vazio');
});
