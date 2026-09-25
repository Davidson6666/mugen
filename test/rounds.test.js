import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Texture } from 'pixi.js';
import { Fighter } from '../src/systems/Fighter.js';
import {
  GameStateManager,
  ROUNDS_TO_WIN,
  ROUND_TIME_SECONDS,
} from '../src/systems/GameStateManager.js';

const characterConfig = JSON.parse(
  readFileSync(new URL('../public/assets/characters/dummy/dummy_config.json', import.meta.url)),
);
const map = JSON.parse(
  readFileSync(new URL('../public/assets/maps/dummy/dummy_map_config.json', import.meta.url)),
);

const record = {
  config: characterConfig,
  frames: Array.from({ length: 84 }, () => Texture.EMPTY),
};

function makePair() {
  return [
    new Fighter({ record, map, x: 440, facing: 1 }),
    new Fighter({ record, map, x: 840, facing: -1 }),
  ];
}

// Avanca a partida ate ela devolver um evento, ou ate o limite de ticks.
function runUntilEvent(match, fighters, ticks = 400) {
  for (let tick = 0; tick < ticks; tick += 1) {
    const event = match.update(fighters, 1);
    if (event) return event;
  }
  return null;
}

// Leva o round ate o fim e atravessa a espera das poses, devolvendo o evento de
// inicio do round seguinte (ou o fim da partida).
function finishRound(match, fighters, { loser = 1, draw = false, timeout = false } = {}) {
  if (draw) {
    fighters[0].health = 0;
    fighters[1].health = 0;
  } else if (timeout) {
    match.timeRemaining = 0;
  } else {
    fighters[loser].health = 0;
  }

  const end = runUntilEvent(match, fighters);
  const next = runUntilEvent(match, fighters);
  for (const fighter of fighters) fighter.health = characterConfig.stats.maxHealth;
  return { end, next };
}

test('a partida comeca no round 1, com placar zerado e tempo cheio', () => {
  const match = new GameStateManager();

  assert.equal(match.roundNumber, 1);
  assert.deepEqual(match.wins, [0, 0]);
  assert.equal(match.timeRemaining, ROUND_TIME_SECONDS);
  assert.equal(match.phase, 'fighting');
});

test('o cronometro corre durante o round', () => {
  const match = new GameStateManager();
  const fighters = makePair();

  for (let tick = 0; tick < 60; tick += 1) match.update(fighters, 1);

  assert.ok(Math.abs(match.timeRemaining - (ROUND_TIME_SECONDS - 1)) < 0.001);
});

test('zerar a vida do oponente vence o round', () => {
  const match = new GameStateManager();
  const fighters = makePair();
  fighters[1].health = 0;

  const event = runUntilEvent(match, fighters);

  assert.equal(event.type, 'roundEnd');
  assert.equal(event.reason, 'ko');
  assert.equal(event.winner, 0);
  assert.deepEqual(match.wins, [1, 0]);
});

test('double KO no mesmo frame e empate e ninguem pontua', () => {
  const match = new GameStateManager();
  const fighters = makePair();
  fighters[0].health = 0;
  fighters[1].health = 0;

  const event = runUntilEvent(match, fighters);

  assert.equal(event.reason, 'doubleKo');
  assert.equal(event.winner, null);
  assert.deepEqual(match.wins, [0, 0]);
});

test('no fim do tempo vence quem tem mais vida', () => {
  const match = new GameStateManager();
  const fighters = makePair();
  fighters[0].health = 40;
  fighters[1].health = 70;
  match.timeRemaining = 0;

  const event = runUntilEvent(match, fighters);

  assert.equal(event.reason, 'timeout');
  assert.equal(event.winner, 1);
  assert.deepEqual(match.wins, [0, 1]);
});

test('tempo esgotado com vida igual tambem e empate', () => {
  const match = new GameStateManager();
  const fighters = makePair();
  fighters[0].health = 55;
  fighters[1].health = 55;
  match.timeRemaining = 0;

  const event = runUntilEvent(match, fighters);

  assert.equal(event.reason, 'timeDraw');
  assert.equal(event.winner, null);
  assert.deepEqual(match.wins, [0, 0]);
});

test('o round seguinte comeca com vida cheia e posicoes reiniciadas', () => {
  const match = new GameStateManager();
  const fighters = makePair();
  const startX = fighters.map((fighter) => fighter.x);

  fighters[0].x = 200;
  fighters[1].x = 300;
  fighters[0].health = 12;
  fighters[1].health = 0;

  const { next } = finishRound(match, fighters, { loser: 1 });
  assert.equal(next.type, 'roundStart');
  assert.equal(next.round, 2);

  // O GameCanvas reposiciona no evento de roundStart; aqui vale a regra do
  // proprio Fighter.
  fighters.forEach((fighter, index) => fighter.resetForRound(startX[index], index === 0 ? 1 : -1));

  assert.deepEqual(fighters.map((fighter) => fighter.x), startX);
  assert.deepEqual(
    fighters.map((fighter) => fighter.health),
    fighters.map((fighter) => fighter.config.stats.maxHealth),
  );
  assert.equal(match.timeRemaining, ROUND_TIME_SECONDS);
});

test('so o placar atravessa a virada de round', () => {
  const match = new GameStateManager();
  const fighters = makePair();

  finishRound(match, fighters, { loser: 1 });

  assert.deepEqual(match.wins, [1, 0]);
  assert.equal(match.roundNumber, 2);
});

test('vencer dois rounds vence a partida', () => {
  const match = new GameStateManager();
  const fighters = makePair();

  finishRound(match, fighters, { loser: 1 });
  const { next } = finishRound(match, fighters, { loser: 1 });

  assert.equal(next.type, 'matchEnd');
  assert.equal(next.winner, 0);
  assert.equal(match.matchWinner, 0);
  assert.equal(match.phase, 'matchEnd');
  assert.deepEqual(match.wins, [ROUNDS_TO_WIN, 0]);
});

test('o desempate 1 a 1 roda sem cronometro', () => {
  const match = new GameStateManager();
  const fighters = makePair();

  finishRound(match, fighters, { loser: 1 });
  finishRound(match, fighters, { loser: 0 });

  assert.deepEqual(match.wins, [1, 1]);
  assert.ok(match.isSuddenDeath);

  const before = match.timeRemaining;
  for (let tick = 0; tick < 300; tick += 1) match.update(fighters, 1);

  assert.equal(match.timeRemaining, before, 'o cronometro nao corre na morte subita');
  assert.equal(match.phase, 'fighting', 'a luta continua ate alguem cair');
});

test('a morte subita so termina por nocaute', () => {
  const match = new GameStateManager();
  const fighters = makePair();

  finishRound(match, fighters, { loser: 1 });
  finishRound(match, fighters, { loser: 0 });
  assert.ok(match.isSuddenDeath);

  // Mesmo com vidas diferentes e o tempo zerado, nada decide o round.
  match.timeRemaining = 0;
  fighters[0].health = 90;
  fighters[1].health = 10;
  assert.equal(runUntilEvent(match, fighters), null);

  fighters[1].health = 0;
  const event = runUntilEvent(match, fighters);
  assert.equal(event.reason, 'ko');
  assert.equal(event.winner, 0);
});

test('um empate no meio nao antecipa a morte subita', () => {
  const match = new GameStateManager();
  const fighters = makePair();

  finishRound(match, fighters, { draw: true });

  assert.equal(match.roundNumber, 2);
  assert.deepEqual(match.wins, [0, 0]);
  assert.equal(match.isSuddenDeath, false, 'placar 0 a 0 ainda tem cronometro');
  assert.equal(match.timeRemaining, ROUND_TIME_SECONDS);
});

test('o vencedor do round faz pose de vitoria e o perdedor de derrota', () => {
  const fighters = makePair();

  fighters[0].playRoundEndPose(true);
  fighters[1].playRoundEndPose(false);

  assert.equal(fighters[0].animation.name, 'victoryPose');
  assert.equal(fighters[1].animation.name, 'defeatPose');
  assert.equal(fighters[0].canAct, false, 'ninguem age durante a pose');
});

test('quem cai nocauteado so faz a pose depois da animacao de KO', () => {
  const fighters = makePair();
  fighters[1].knockOut();
  assert.equal(fighters[1].animation.name, 'ko');

  fighters[1].playRoundEndPose(false);
  assert.equal(fighters[1].animation.name, 'ko', 'a queda precisa terminar primeiro');

  const neutral = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    punch: false,
    kick: false,
    special: false,
  };
  for (let tick = 0; tick < 60; tick += 1) fighters[1].update({ ...neutral }, 1);

  assert.equal(fighters[1].animation.name, 'defeatPose');
});

// ---- Abertura do round ("ROUND N", depois "FIGHT!") ----

test('com abertura, o round comeca parado: sem cronometro e sem nocaute ate o FIGHT', () => {
  const match = new GameStateManager({ introFrames: 80 });
  const fighters = makePair();
  assert.equal(match.phase, 'intro');

  fighters[1].health = 0;
  for (let tick = 0; tick < 79; tick += 1) assert.equal(match.update(fighters, 1), null);
  assert.equal(match.timeRemaining, ROUND_TIME_SECONDS, 'o cronometro espera o FIGHT');

  assert.deepEqual(match.update(fighters, 1), { type: 'fight', round: 1 });
  assert.equal(match.phase, 'fighting');
  assert.equal(runUntilEvent(match, fighters).type, 'roundEnd', 'depois do FIGHT a luta vale');
});

test('com abertura, cada round novo passa de novo pelo FIGHT', () => {
  const match = new GameStateManager({ introFrames: 80 });
  const fighters = makePair();
  runUntilEvent(match, fighters);
  fighters[1].health = 0;
  runUntilEvent(match, fighters);
  const next = runUntilEvent(match, fighters);
  assert.deepEqual(next, { type: 'roundStart', round: 2 });
  assert.equal(match.phase, 'intro');
  for (const fighter of fighters) fighter.health = characterConfig.stats.maxHealth;
  assert.deepEqual(runUntilEvent(match, fighters), { type: 'fight', round: 2 });
});
