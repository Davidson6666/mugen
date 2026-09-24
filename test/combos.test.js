import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Texture } from 'pixi.js';
import { Fighter } from '../src/systems/Fighter.js';
import { ComboDetector, COMBO_BUFFER_MS } from '../src/systems/ComboDetector.js';
import { resolveAttack, resolveBodyCollision } from '../src/systems/CollisionDetector.js';

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

const comboById = (id) => characterConfig.combos.find((combo) => combo.id === id);

// Reproduz uma sequencia de inputs no detector, um frame por passo, avancando o
// relogio. Devolve o ultimo combo reconhecido.
function playInputs(detector, steps, { facing = 1, frameMs = 16 } = {}) {
  let now = 0;
  let matched = null;
  for (const step of steps) {
    matched = detector.feed(command(step), facing, now) ?? matched;
    now += frameMs;
  }
  return matched;
}

test('botao solto dispara o combo de token unico', () => {
  const detector = new ComboDetector(characterConfig.combos);
  const matched = playInputs(detector, [{ punch: true }]);

  assert.equal(matched?.id, 'basic_punch');
});

test('frente + soco vence o soco simples', () => {
  const detector = new ComboDetector(characterConfig.combos);
  const matched = playInputs(detector, [{ right: true }, { right: true, punch: true }]);

  assert.equal(matched?.id, 'forward_punch');
});

test('a meia-lua reconhece o padrao de quatro tokens', () => {
  const detector = new ComboDetector(characterConfig.combos);
  const matched = playInputs(detector, [
    { right: true },
    { right: true, down: true },
    { down: true },
    { punch: true },
  ]);

  assert.equal(matched?.id, 'hadoken_like');
});

test('o padrao mais longo tem prioridade sobre o mais curto', () => {
  const detector = new ComboDetector(characterConfig.combos);
  const matched = playInputs(detector, [
    { right: true },
    { right: true, down: true },
    { down: true },
    { punch: true },
  ]);

  assert.notEqual(matched?.id, 'forward_punch');
  assert.notEqual(matched?.id, 'basic_punch');
});

test('direcao e relativa ao lado que o personagem encara', () => {
  const steps = [{ left: true }, { left: true, punch: true }];

  const facingLeft = new ComboDetector(characterConfig.combos);
  assert.equal(playInputs(facingLeft, steps, { facing: -1 })?.id, 'forward_punch');

  // Os mesmos inputs, encarando o outro lado, viram "para tras" e nao fecham
  // o mesmo combo.
  const facingRight = new ComboDetector(characterConfig.combos);
  assert.equal(playInputs(facingRight, steps, { facing: 1 })?.id, 'basic_punch');
});

test('o padrao expira quando o jogador demora demais', () => {
  const detector = new ComboDetector(characterConfig.combos);
  const matched = playInputs(
    detector,
    [{ right: true }, {}, { punch: true }],
    { frameMs: COMBO_BUFFER_MS },
  );

  assert.equal(matched?.id, 'basic_punch');
});

test('token intermediario extra nao invalida o movimento', () => {
  const detector = new ComboDetector(characterConfig.combos);
  const matched = playInputs(detector, [
    { right: true },
    { right: true, down: true },
    { down: true },
    { left: true, down: true },
    { punch: true },
  ]);

  assert.equal(matched?.id, 'hadoken_like');
});

test('um botao diferente nao aproveita o padrao do outro', () => {
  const detector = new ComboDetector(characterConfig.combos);
  const matched = playInputs(detector, [
    { right: true },
    { right: true, down: true },
    { down: true },
    { kick: true },
  ]);

  assert.equal(matched?.id, 'basic_kick');
});

test('segurar a direcao nao enche o buffer', () => {
  const detector = new ComboDetector(characterConfig.combos);
  playInputs(detector, Array.from({ length: 10 }, () => ({ right: true })));

  assert.equal(detector.buffer.length, 1);
});

test('combo sem campo animation cai no ataque basico do botao', () => {
  const detector = new ComboDetector(characterConfig.combos);
  assert.equal(comboById('basic_kick').animation, undefined);

  const matched = playInputs(detector, [{ kick: true }]);
  assert.equal(matched.animation, 'kick');
});

test('combo com campo animation usa a animacao declarada', () => {
  const detector = new ComboDetector(characterConfig.combos);
  const matched = playInputs(detector, [
    { right: true },
    { right: true, down: true },
    { down: true },
    { punch: true },
  ]);

  assert.equal(matched.animation, comboById('hadoken_like').animation);
});

/* ------------------------------------------- combo aplicado ao combate ---- */

function makePair(leftX = 500, rightX = 540) {
  return [
    new Fighter({ record, map, x: leftX, facing: 1 }),
    new Fighter({ record, map, x: rightX, facing: -1 }),
  ];
}

function step(a, b, commandA = command(), commandB = command(), delta = 1) {
  a.faceTowards(b.x);
  b.faceTowards(a.x);
  a.update(commandA, delta);
  b.update(commandB, delta);
  resolveBodyCollision(a, b);
  return [resolveAttack(a, b), resolveAttack(b, a)];
}

test('o combo aplica o proprio dano, e nao o da animacao', () => {
  const [a, b] = makePair();
  // forward_punch reaproveita a animacao special2 mas com dano proprio, entao e
  // o combo que serve para distinguir as duas fontes de valor.
  const combo = comboById('forward_punch');
  const animationDamage = characterConfig.animations[combo.animation].damage;

  step(a, b, { ...command(), combo });
  let landed = null;
  for (let tick = 0; tick < 80 && !landed; tick += 1) [landed] = step(a, b);

  assert.equal(landed?.damage, combo.damage);
  assert.equal(b.health, characterConfig.stats.maxHealth - combo.damage);
  assert.notEqual(combo.damage, animationDamage, 'o teste perde o sentido se forem iguais');
});

test('o cooldown do combo impede repetir o golpe na sequencia', () => {
  const [a, b] = makePair();
  const combo = comboById('hadoken_like');

  step(a, b, { ...command(), combo });
  assert.equal(a.animation.name, combo.animation);
  assert.ok(a.isOnCooldown(combo.animation));

  // Espera a animacao terminar e tenta de novo, ainda dentro do cooldown.
  for (let tick = 0; tick < 55; tick += 1) step(a, b);
  step(a, b, { ...command(), combo });

  assert.notEqual(a.animation.name, combo.animation);
});

test('o cooldown libera o golpe depois do tempo declarado', () => {
  const [a, b] = makePair();
  const combo = comboById('hadoken_like');

  step(a, b, { ...command(), combo });
  for (let tick = 0; tick < combo.cooldown + 2; tick += 1) step(a, b);

  assert.equal(a.isOnCooldown(combo.animation), false);
});

/* ------------------------------------------------ contador de combo ------- */

function attack(a, b, { defenderCommand = command(), button = 'punch', ticks = 60 } = {}) {
  for (let tick = 0; tick < ticks; tick += 1) {
    const attackerCommand = tick === 0 ? command({ [button]: true }) : command();
    const [landed] = step(a, b, attackerCommand, defenderCommand);
    if (landed) return landed;
  }
  return null;
}

// Durante a animacao do golpe o input de ataque e ignorado, entao encadear dois
// golpes exige esperar a recuperacao — como um jogador de verdade faria.
function recover(a, b, defenderCommand = command()) {
  for (let tick = 0; tick < 120 && a.state === 'attack'; tick += 1) {
    step(a, b, command(), defenderCommand);
  }
}

test('acertos consecutivos aumentam o contador', () => {
  const [a, b] = makePair();

  assert.equal(attack(a, b)?.outcome, 'hit');
  assert.equal(a.comboCount, 1);

  recover(a, b);
  assert.equal(attack(a, b)?.outcome, 'hit');
  assert.equal(a.comboCount, 2);
});

test('o contador zera quando o golpe e bloqueado', () => {
  // Encostado na parede: recuar para defender nao tira o defensor do alcance.
  const [a, b] = makePair(map.rightBound - 56, map.rightBound - 16);
  attack(a, b);
  assert.equal(a.comboCount, 1);
  recover(a, b);

  // b encara a esquerda: segurar direita e segurar para tras.
  const landed = attack(a, b, { defenderCommand: command({ right: true }) });

  assert.equal(landed?.outcome, 'block');
  assert.equal(a.comboCount, 0);
});

test('o contador zera quando o golpe erra', () => {
  const [a, b] = makePair(500, 1000);
  a.comboCount = 3;
  a.comboTimer = 60;

  // A animacao do soco fecha em 40 ticks; parar em 42 garante que quem zerou o
  // contador foi o erro, e nao o tempo de inatividade (que so venceria em 60).
  assert.equal(attack(a, b, { ticks: 42 }), null);

  assert.equal(a.comboCount, 0);
});

test('o contador zera depois de um tempo sem atacar', () => {
  const [a, b] = makePair();
  attack(a, b);
  assert.equal(a.comboCount, 1);

  for (let tick = 0; tick < 70; tick += 1) step(a, b);

  assert.equal(a.comboCount, 0);
});

test('levar um golpe interrompe a propria sequencia', () => {
  const [a, b] = makePair();
  attack(a, b);
  assert.equal(a.comboCount, 1);

  a.takeHit(10, 12);

  assert.equal(a.comboCount, 0);
});
