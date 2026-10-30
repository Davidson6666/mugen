import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTES, guardFor, pathFor, screenFor } from '../src/routes.js';

// Cada tela tem uma URL propria, sem repeticao, e URL inexistente nao vira tela.
test('rotas: cada tela tem um caminho unico que comeca com /', () => {
  const paths = ROUTES.map((route) => route.path);
  assert.equal(new Set(paths).size, paths.length);
  assert.equal(new Set(ROUTES.map((route) => route.screen)).size, ROUTES.length);
  for (const path of paths) assert.match(path, /^\/[a-z]*$/);
});

test('rotas: ida e volta entre tela e endereco', () => {
  for (const route of ROUTES) {
    assert.equal(pathFor(route.screen), route.path);
    assert.equal(screenFor(route.path), route.screen);
  }
});

test('rotas: barra final e ignorada, endereco inexistente da null (pagina 404)', () => {
  assert.equal(screenFor('/ranking/'), 'leaderboard');
  assert.equal(screenFor('/'), 'mainMenu');
  assert.equal(screenFor('/nao-existe'), null);
  assert.equal(screenFor('/ranking/extra'), null);
  assert.equal(screenFor('/LUTA'), null);
});

test('rotas: tela desconhecida volta ao menu e as paginas publicas nao tem guarda', () => {
  assert.equal(pathFor('nada'), '/');
  for (const screen of ['mainMenu', 'leaderboard', 'achievements', 'settings', 'login', 'register']) {
    assert.equal(guardFor(screen), null, screen);
  }
});

test('rotas: luta, resultado e conta exigem pre-condicao; conta exige login', () => {
  assert.equal(guardFor('battle'), 'setup');
  assert.equal(guardFor('result'), 'result');
  assert.equal(guardFor('account'), 'auth');
});
