import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Texture } from 'pixi.js';
import { Fighter, RENDER_SCALE } from '../src/systems/Fighter.js';
import { resolveAttack, resolveBodyCollision } from '../src/systems/CollisionDetector.js';

// Os testes rodam contra os mesmos JSONs que o jogo carrega: se um valor de
// balanceamento mudar no config, o teste acusa aqui.
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

const NEUTRAL = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  punch: false,
  kick: false,
  special: false,
};

const command = (overrides = {}) => ({ ...NEUTRAL, ...overrides });

function makePair(leftX = 500, rightX = 620) {
  return [
    new Fighter({ record, map, x: leftX, facing: 1 }),
    new Fighter({ record, map, x: rightX, facing: -1 }),
  ];
}

// Mesma ordem de operacoes do game loop em GameCanvas.
function step(a, b, commandA = command(), commandB = command(), delta = 1) {
  a.faceTowards(b.x);
  b.faceTowards(a.x);
  a.update(commandA, delta);
  b.update(commandB, delta);
  resolveBodyCollision(a, b);
  return [resolveAttack(a, b), resolveAttack(b, a)];
}

// Executa o golpe ate ele resolver (ou ate o limite de ticks) e devolve o
// resultado mais o numero de ticks gastos.
function runAttack(a, b, { defenderCommand = command(), button = 'punch', ticks = 60 } = {}) {
  for (let tick = 0; tick < ticks; tick += 1) {
    const attackerCommand = tick === 0 ? command({ [button]: true }) : command();
    const [result] = step(a, b, attackerCommand, defenderCommand);
    if (result) return { result, ticks: tick };
  }
  return { result: null, ticks };
}

test('soco conecta a queima-roupa e aplica dano e hitstun do config', () => {
  const [a, b] = makePair();
  const { result } = runAttack(a, b);

  assert.equal(result?.outcome, 'hit');
  assert.equal(b.health, characterConfig.stats.maxHealth - characterConfig.animations.punch.damage);
  assert.equal(b.state, 'hitstun');
  assert.equal(b.stunTimer, characterConfig.animations.punch.hitstun);
  assert.equal(b.animation.name, 'hitReaction');
});

test('golpe bloqueado passa so o chip damage e gera blockstun mais curto', () => {
  const [a, b] = makePair();
  // b esta a direita e encara a esquerda: segurar "direita" e segurar para tras.
  const { result } = runAttack(a, b, { defenderCommand: command({ right: true }) });

  const { damage, hitstun } = characterConfig.animations.punch;
  assert.equal(result?.outcome, 'block');
  assert.equal(result.damage, Math.round(damage * 0.15));
  assert.equal(b.health, characterConfig.stats.maxHealth - result.damage);
  assert.equal(b.state, 'blockstun');
  assert.equal(b.stunTimer, Math.round(hitstun * 0.5));
  assert.ok(b.stunTimer < hitstun, 'blockstun precisa ser menor que o hitstun');
});

test('chip damage nunca e zero, senao bloquear seria seguro para sempre', () => {
  const [a, b] = makePair();
  const weakest = Math.min(
    ...Object.values(characterConfig.animations)
      .filter((animation) => animation.damage !== undefined)
      .map((animation) => animation.damage),
  );
  const { result } = runAttack(a, b, { defenderCommand: command({ right: true }) });
  assert.ok(result.damage >= 1, `chip de um golpe de ${weakest} de dano ficou em ${result.damage}`);
});

test('golpe erra quando o oponente esta fora do alcance', () => {
  const [a, b] = makePair(400, 900);
  const { result } = runAttack(a, b);

  assert.equal(result, null);
  assert.equal(b.health, characterConfig.stats.maxHealth);
  assert.equal(b.state, 'idle');
});

test('um mesmo golpe so conecta uma vez', () => {
  const [a, b] = makePair();
  runAttack(a, b);
  const healthAfterFirstHit = b.health;

  // Deixa a animacao do soco terminar inteira sem novo input de ataque.
  for (let tick = 0; tick < 60; tick += 1) step(a, b);

  assert.equal(b.health, healthAfterFirstHit);
});

test('quem esta em hitstun nao consegue agir', () => {
  const [a, b] = makePair();
  runAttack(a, b);
  assert.ok(b.stunTimer > 0);

  step(a, b, command(), command({ punch: true }));
  assert.equal(b.state, 'hitstun');
  assert.equal(a.health, characterConfig.stats.maxHealth);
});

test('o hitstun acaba e devolve o controle', () => {
  const [a, b] = makePair();
  runAttack(a, b);

  for (let tick = 0; tick < characterConfig.animations.punch.hitstun + 1; tick += 1) step(a, b);

  assert.equal(b.stunTimer, 0);
  assert.equal(b.state, 'idle');
  assert.ok(b.canAct);
});

test('a guarda segue de pe durante o blockstun', () => {
  const [a, b] = makePair();
  runAttack(a, b, { defenderCommand: command({ right: true }) });

  assert.equal(b.state, 'blockstun');
  assert.ok(b.blocking, 'segundo golpe da sequencia passaria direto se a guarda caisse');
});

test('vida zerada leva a KO e encerra a troca de golpes', () => {
  const [a, b] = makePair();
  b.health = 10;
  const { result } = runAttack(a, b);

  assert.equal(result?.outcome, 'ko');
  assert.equal(b.health, 0);
  assert.equal(b.state, 'ko');
  assert.equal(b.animation.name, 'ko');

  const healthBefore = b.health;
  runAttack(a, b);
  assert.equal(b.health, healthBefore, 'nao se bate em quem ja esta nocauteado');
});

test('os corpos nunca ocupam o mesmo espaco no chao', () => {
  const [a, b] = makePair(600, 610);
  step(a, b);

  const minDistance = a.halfWidth + b.halfWidth;
  assert.ok(
    Math.abs(b.x - a.x) >= minDistance - 0.001,
    `distancia ${Math.abs(b.x - a.x)} menor que o minimo ${minDistance}`,
  );
});

test('no ar da para passar por cima do oponente', () => {
  const [a, b] = makePair(600, 700);
  a.grounded = false;
  a.y = map.groundLevel - 150;
  a.x = 700;
  resolveBodyCollision(a, b);

  assert.equal(a.x, 700, 'quem esta no ar nao e empurrado pelo corpo de baixo');
});

test('o personagem vira quando o oponente passa para o outro lado', () => {
  const [a, b] = makePair();
  assert.equal(a.facing, 1);

  b.x = a.x - 200;
  step(a, b);

  assert.equal(a.facing, -1);
  assert.equal(b.facing, 1);
});

test('a hitbox espelha junto com o flip', () => {
  const [a] = makePair();
  const facingRight = a.hitRect;

  a.facing = -1;
  const facingLeft = a.hitRect;

  assert.ok(facingRight.x > a.x, 'virado para a direita o alcance fica a direita do centro');
  assert.ok(facingLeft.x + facingLeft.width < a.x, 'virado para a esquerda o alcance espelha');
  assert.equal(facingRight.width, facingLeft.width);
});

test('o alcance do golpe cobre a distancia minima entre os corpos', () => {
  const [a, b] = makePair();
  const minDistance = a.halfWidth + b.halfWidth;
  const reach = a.hitRect.x + a.hitRect.width - a.x;
  const defenderNearEdge = minDistance - b.halfWidth;

  assert.ok(
    reach > defenderNearEdge,
    `alcance de ${reach}px nao chega na hurtbox que comeca a ${defenderNearEdge}px`,
  );
});

test('a hitbox so existe no hitboxFrame declarado', () => {
  const [a, b] = makePair();
  const { hitboxFrame } = characterConfig.animations.punch;

  const framesWithHitbox = new Set();
  step(a, b, command({ punch: true }));
  for (let tick = 0; tick < 60; tick += 1) {
    if (a.activeAttack) framesWithHitbox.add(a.animation.localFrame);
    step(a, b);
  }

  assert.deepEqual([...framesWithHitbox], [hitboxFrame]);
});

test('as caixas acompanham o pulo', () => {
  const [a, b] = makePair();
  const groundedTop = a.hurtRect.y;

  step(a, b, command({ jump: true }));
  for (let tick = 0; tick < 8; tick += 1) step(a, b);

  assert.ok(a.hurtRect.y < groundedTop, 'a hurtbox precisa subir junto com o personagem');
  assert.equal(a.hurtRect.height, characterConfig.hurtbox.height * RENDER_SCALE);
});
