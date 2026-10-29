import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// O jogo e em portugues: o navegador oferecia "traduzir do ingles" e leitores
// de tela liam com a pronuncia errada.
test('acessibilidade: a pagina declara o idioma portugues do Brasil', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<html[^>]*lang="pt-BR"/);
});

test('acessibilidade: opcao de menu tem papel e nome para leitor de tela', () => {
  const source = readFileSync(new URL('../src/components/cvs2.jsx', import.meta.url), 'utf8');
  const option = source.slice(source.indexOf('export function MenuOption'));
  assert.match(option, /role="menuitem"/);
  assert.match(option, /aria-label=\{label\}/);
  assert.match(option, /aria-current=/);
});
