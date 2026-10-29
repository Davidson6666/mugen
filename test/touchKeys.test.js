import test from 'node:test';
import assert from 'node:assert/strict';
import { TOUCH_ACTIONS, pressAction, wantsTouchControls } from '../src/utils/touchKeys.js';
import { DEFAULT_CONTROLS } from '../src/utils/controls.js';

// Botoes na tela disparam as teclas do jogador 1 (do mapa atual, inclusive remapeado).
function fakeTarget() {
  const events = [];
  return { events, dispatchEvent: (event) => events.push(event) };
}
const create = (type, code) => ({ type, code });

test('toque: cada botao dispara a tecla do jogador 1 do mapa de controles', () => {
  for (const action of TOUCH_ACTIONS) {
    const target = fakeTarget();
    assert.ok(pressAction(action, true, { target, controls: DEFAULT_CONTROLS, create }));
    assert.ok(pressAction(action, false, { target, controls: DEFAULT_CONTROLS, create }));
    assert.deepEqual(target.events.map((event) => event.type), ['keydown', 'keyup']);
    assert.equal(target.events[0].code, DEFAULT_CONTROLS[0][action]);
  }
});

test('toque: respeita teclas remapeadas', () => {
  const target = fakeTarget();
  const controls = [{ ...DEFAULT_CONTROLS[0], punch: 'KeyU' }, DEFAULT_CONTROLS[1]];
  pressAction('punch', true, { target, controls, create });
  assert.equal(target.events[0].code, 'KeyU');
});

test('toque: pausa manda Escape e acao sem tecla nao faz nada', () => {
  const target = fakeTarget();
  assert.ok(pressAction('pause', true, { target, controls: DEFAULT_CONTROLS, create }));
  assert.equal(target.events[0].code, 'Escape');
  assert.equal(pressAction('guard', true, { target, controls: DEFAULT_CONTROLS, create }), false);
  assert.equal(target.events.length, 1);
});

test('toque: so aparece em tela de toque ou com ?touch', () => {
  assert.equal(wantsTouchControls({ location: { search: '' }, matchMedia: () => ({ matches: false }) }), false);
  assert.equal(wantsTouchControls({ location: { search: '' }, matchMedia: () => ({ matches: true }) }), true);
  assert.equal(wantsTouchControls({ location: { search: '?touch' }, matchMedia: () => ({ matches: false }) }), true);
  assert.equal(wantsTouchControls(undefined), false);
});
