import test from 'node:test';
import assert from 'node:assert/strict';
import { roundEndAnnounce } from '../src/utils/roundAnnounce.js';

// Nao da pra confiar em pegar uma luta sem dano por sorte no teste de tela,
// entao a decisao do anuncio vive numa funcao propria e os dois lados dela
// sao cobrados aqui.
test('vencer sem a vida encostar anuncia PERFECT', () => {
  assert.equal(roundEndAnnounce('ko', 0, [1, 0]), 'PERFECT!');
  assert.equal(roundEndAnnounce('ko', 1, [0, 1]), 'PERFECT!');
  // Vale tambem quando o round acaba no tempo, de barra cheia.
  assert.equal(roundEndAnnounce('timeout', 0, [1, 0.4]), 'PERFECT!');
});

test('qualquer dano, por menor que seja, tira o PERFECT', () => {
  // O arranhao da defesa custa um tiquinho de vida: isso ja basta.
  assert.equal(roundEndAnnounce('ko', 0, [0.999, 0]), 'K.O.');
  assert.equal(roundEndAnnounce('ko', 0, [0.5, 0]), 'K.O.');
});

test('empate nao e PERFECT de ninguem, mesmo com os dois de vida cheia', () => {
  assert.equal(roundEndAnnounce('timeDraw', null, [1, 1]), 'EMPATE');
  assert.equal(roundEndAnnounce('doubleKo', null, [1, 1]), 'EMPATE');
});

test('a vida cheia do perdedor nao vale: quem conta e o vencedor', () => {
  assert.equal(roundEndAnnounce('ko', 0, [0.3, 1]), 'K.O.');
});
