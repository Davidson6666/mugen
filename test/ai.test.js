import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Texture } from 'pixi.js';
import { Fighter } from '../src/systems/Fighter.js';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { AIController, DIFFICULTY_PRESETS } from '../src/systems/AIController.js';
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

// Combos ja interpretados, do mesmo jeito que o GameCanvas entrega para a IA.
const parsedCombos = new ComboDetector(characterConfig.combos).combos;

function makePair(leftX = 500, rightX = 540) {
  return [
    new Fighter({ record, map, x: leftX, facing: 1 }),
    new Fighter({ record, map, x: rightX, facing: -1 }),
  ];
}

// Random fixo deixa a decisao da IA deterministica: 0 faz toda chance passar,
// 0.99 faz toda chance falhar.
const fixedRandom = (value) => () => value;

test('a dificuldade e uma escala de parametros, nao um liga/desliga', () => {
  const { easy, normal, hard } = DIFFICULTY_PRESETS;

  assert.ok(easy.reactionFrames > normal.reactionFrames);
  assert.ok(normal.reactionFrames > hard.reactionFrames);
  assert.ok(easy.aggression < normal.aggression);
  assert.ok(normal.aggression < hard.aggression);
  assert.ok(easy.blockChance < hard.blockChance);
  assert.ok(easy.comboChance < hard.comboChance);
  assert.ok(easy.spacingError > hard.spacingError, 'a CPU facil erra mais o espacamento');
});

test('dificuldade desconhecida cai no normal em vez de quebrar', () => {
  const ai = new AIController(parsedCombos, 'impossivel');
  assert.equal(ai.difficulty, 'normal');
});

test('a CPU anda na direcao do oponente quando esta longe', () => {
  const [cpu, player] = makePair(300, 900);
  const ai = new AIController(parsedCombos, 'normal', { random: fixedRandom(0.99) });

  const command = ai.update(cpu, player, 1);

  assert.equal(ai.intent.type, 'approach');
  assert.equal(command.right, true, 'o oponente esta a direita');
});

test('a CPU persegue para o outro lado quando o oponente troca de lado', () => {
  const [cpu, player] = makePair(900, 300);
  const ai = new AIController(parsedCombos, 'normal', { random: fixedRandom(0.99) });

  const command = ai.update(cpu, player, 1);

  assert.equal(command.left, true);
  assert.equal(command.right, false);
});

test('a CPU ataca quando o oponente esta no alcance', () => {
  const [cpu, player] = makePair(500, 540);
  const ai = new AIController(parsedCombos, 'normal', { random: fixedRandom(0) });

  const command = ai.update(cpu, player, 1);

  assert.equal(ai.intent.type, 'combo', 'com toda chance passando, escolhe o combo');
  assert.ok(command.left || command.right || command.punch || command.kick);
});

test('a CPU usa ataque simples quando nao vai de combo', () => {
  const [cpu, player] = makePair(500, 540);
  // 0.4 passa na agressividade do normal (0.55) mas falha na chance de combo (0.3).
  const ai = new AIController(parsedCombos, 'normal', { random: fixedRandom(0.4) });

  ai.update(cpu, player, 1);

  assert.equal(ai.intent.type, 'attack');
  assert.ok(['punch', 'kick'].includes(ai.intent.button));
});

test('a CPU defende quando o oponente esta atacando perto', () => {
  const [cpu, player] = makePair(500, 540);
  player.startAttack('punch');
  const ai = new AIController(parsedCombos, 'hard', { random: fixedRandom(0) });

  const command = ai.update(cpu, player, 1);

  assert.equal(ai.intent.type, 'block');
  // cpu esta a esquerda e encara a direita: segurar esquerda e segurar para tras.
  assert.equal(command.left, true);
});

test('a CPU recua quando esta com pouca vida', () => {
  const [cpu, player] = makePair(500, 540);
  cpu.health = characterConfig.stats.maxHealth * 0.1;
  // 0.26 falha no bloqueio do easy (0.25) mas passa no sorteio de recuo (0.5).
  const ai = new AIController(parsedCombos, 'easy', { random: fixedRandom(0.26) });

  const command = ai.update(cpu, player, 1);

  assert.equal(ai.intent.type, 'retreat');
  assert.equal(command.left, true, 'recuar e se afastar do oponente');
});

test('a CPU nao age enquanto esta em hitstun ou nocauteada', () => {
  const [cpu, player] = makePair();
  const ai = new AIController(parsedCombos, 'hard', { random: fixedRandom(0) });

  cpu.takeHit(10, 20);
  const stunned = ai.update(cpu, player, 1);
  assert.ok(Object.values(stunned).every((pressed) => pressed === false));

  cpu.knockOut();
  const knockedOut = ai.update(cpu, player, 1);
  assert.ok(Object.values(knockedOut).every((pressed) => pressed === false));
});

test('a CPU nao reavalia no meio de uma sequencia de combo', () => {
  const [cpu, player] = makePair();
  const ai = new AIController(parsedCombos, 'hard', { random: fixedRandom(0) });

  ai.update(cpu, player, 1);
  assert.equal(ai.intent.type, 'combo');
  const pending = ai.script.length;
  assert.ok(pending > 0);

  ai.update(cpu, player, 1);
  assert.equal(ai.script.length, pending - 1, 'a sequencia avanca um token por frame');
});

test('a CPU nao escolhe combo que esta em cooldown', () => {
  const [cpu] = makePair();
  const withCooldown = parsedCombos.filter((combo) => combo.cooldown !== undefined);
  assert.ok(withCooldown.length > 0);

  for (const combo of withCooldown) cpu.cooldowns.set(combo.animation, 60);
  const ai = new AIController(withCooldown, 'hard', { random: fixedRandom(0) });

  assert.equal(ai.pickCombo(cpu), null);
});

test('a CPU nao escolhe combo de token unico como especial', () => {
  const [cpu] = makePair();
  const ai = new AIController(parsedCombos, 'hard', { random: fixedRandom(0) });

  const combo = ai.pickCombo(cpu);

  assert.ok(combo.tokens.length > 1, 'combo de um botao so nao e movimento especial');
});

test('a sequencia emitida pela CPU e reconhecida pelo proprio ComboDetector', () => {
  const [cpu, player] = makePair();
  const ai = new AIController(parsedCombos, 'hard', { random: fixedRandom(0) });
  const detector = new ComboDetector(characterConfig.combos);

  const chosen = ai.update(cpu, player, 1);
  const expected = ai.intent.combo;
  assert.equal(ai.intent.type, 'combo');

  let now = 0;
  let matched = detector.feed(chosen, cpu.facing, now);
  while (ai.script.length > 0) {
    now += 16;
    matched = detector.feed(ai.update(cpu, player, 1), cpu.facing, now) ?? matched;
  }

  assert.equal(matched?.id, expected.id, 'a CPU precisa jogar pelas mesmas regras de input');
});

test('a CPU encosta no jogador e consegue acertar um golpe', () => {
  // Uns dois corpos de distancia, como o comeco de um round.
  const [cpu, player] = makePair(300, 500);
  const ai = new AIController(parsedCombos, 'hard');
  const detector = new ComboDetector(characterConfig.combos);
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

  let landed = null;
  for (let tick = 0; tick < 600 && !landed; tick += 1) {
    cpu.faceTowards(player.x);
    player.faceTowards(cpu.x);

    const command = ai.update(cpu, player, 1);
    command.combo = detector.feed(command, cpu.facing, tick * 16);
    cpu.update(command, 1);
    player.update({ ...neutral }, 1);

    resolveBodyCollision(cpu, player);
    landed = resolveAttack(cpu, player);
  }

  assert.ok(landed, 'a CPU precisa fechar a distancia e conectar sozinha');
  assert.ok(player.health < characterConfig.stats.maxHealth);
});

test('a CPU facil demora mais para decidir que a dificil', () => {
  const [cpu, player] = makePair(300, 900);
  const easy = new AIController(parsedCombos, 'easy', { random: fixedRandom(0.5) });
  const hard = new AIController(parsedCombos, 'hard', { random: fixedRandom(0.5) });

  easy.update(cpu, player, 1);
  hard.update(cpu, player, 1);

  assert.ok(easy.decisionTimer > hard.decisionTimer);
});
