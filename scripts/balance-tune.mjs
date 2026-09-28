// Ajuste automatico de equilibrio: joga o torneio da IA (balance-sim.mjs) e
// corrige, personagem por personagem, o multiplicador de dano ate as taxas de
// vitoria ficarem parelhas. Quem ganha demais perde dano; quem perde demais
// ganha. O resultado vai para src/data/balance.json e para o campo
// "balance.damage" do config de cada personagem (o importador tambem le o
// arquivo, entao reimportar nao desfaz o ajuste).
//
// Limite honesto: a IA joga de forma generica, entao isto nivela os
// desequilibrios grosseiros. Nao substitui jogar. Um multiplicador que
// encosta no limite (--min/--max) avisa que o problema e o kit do
// personagem, nao so o numero.
//
// Uso:
//   node scripts/balance-tune.mjs                       10 iteracoes, dificuldade normal
//   node scripts/balance-tune.mjs --iterations 14 --rounds 5
//   node scripts/balance-tune.mjs --dry                 so mostra, nao grava
//   node scripts/balance-tune.mjs --reset               volta tudo a x1
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRecord } from '../test/helpers/world.js';
import { playRound, realRoster } from './balance-sim.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BALANCE_FILE = resolve(ROOT, 'src/data/balance.json');

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);

const rounds = Number(option('rounds', 4));
const iterations = Number(option('iterations', 10));
const difficulty = option('difficulty', 'normal');
const min = Number(option('min', 0.5));
const max = Number(option('max', 2));
// Quanto de cada correcao aplicar por iteracao (1 = toda; menos evita oscilar).
const step = Number(option('step', 0.3));
const dry = flag('dry');
// Quanto da correcao medida entra no jogo: o multiplicador aplicado e o medido
// elevado a isto (1 = tudo). A IA usa mal os kits, entao aplicar tudo
// exageraria; abaixo de 1 corrige o desnivel sem apostar tudo nela.
const strength = Number(option('strength', 0.6));

const ids = realRoster();
const records = Object.fromEntries(ids.map((id) => [id, loadRecord(id, { balanced: true })]));

const stored = existsSync(BALANCE_FILE) ? JSON.parse(readFileSync(BALANCE_FILE, 'utf8')) : {};
const multiplier = Object.fromEntries(ids.map((id) => [id, flag('reset') ? 1 : (stored[id] ?? 1)]));

const apply = () => {
  for (const id of ids) records[id].config.balance = { damage: multiplier[id] };
};

// Taxa de vitoria de cada um no torneio todos contra todos.
function evaluate(seedBase) {
  const wins = Object.fromEntries(ids.map((id) => [id, 0]));
  const games = Object.fromEntries(ids.map((id) => [id, 0]));
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      for (let round = 0; round < rounds; round += 1) {
        for (const [left, right] of [[ids[i], ids[j]], [ids[j], ids[i]]]) {
          const result = playRound(records[left], records[right], { difficulty, seed: seedBase + round * 7 + i * 31 + j });
          for (const [side, id] of [left, right].entries()) {
            games[id] += 1;
            if (result.winner === side) wins[id] += 1;
            else if (result.winner === null) wins[id] += 0.5;
          }
        }
      }
    }
  }
  return Object.fromEntries(ids.map((id) => [id, wins[id] / games[id]]));
}

const logit = (p) => Math.log(p / (1 - p));
const error = (rates) => Math.sqrt(ids.reduce((sum, id) => sum + (rates[id] - 0.5) ** 2, 0) / ids.length);
const show = (rates, label) => {
  const order = [...ids].sort((a, b) => rates[b] - rates[a]);
  console.log(`${label}  erro ${(error(rates) * 100).toFixed(1)} pontos | ${order.map((id) => `${id} ${(rates[id] * 100).toFixed(0)}%`).join('  ')}`);
};

apply();
let best = { multiplier: { ...multiplier }, error: Infinity };
console.log(`Ajuste: ${ids.length} personagens, ${iterations} iteracoes, ${rounds} partidas por lado e par, IA ${difficulty}`);
for (let iteration = 0; iteration < iterations; iteration += 1) {
  // Sementes diferentes a cada volta: o ajuste nao decora um sorteio.
  const rates = evaluate(1000 + iteration * 97);
  show(rates, `iteracao ${String(iteration + 1).padStart(2)}`);
  const current = error(rates);
  if (current < best.error) best = { multiplier: { ...multiplier }, error: current };
  if (iteration === iterations - 1) break;
  for (const id of ids) {
    const p = Math.min(0.95, Math.max(0.05, rates[id]));
    multiplier[id] *= Math.exp(-step * logit(p));
  }
  // O nivel geral de dano nao muda: a media geometrica dos multiplicadores
  // fica em 1, e cada um respeita os limites.
  const mean = Math.exp(ids.reduce((sum, id) => sum + Math.log(multiplier[id]), 0) / ids.length);
  for (const id of ids) multiplier[id] = Math.min(max, Math.max(min, multiplier[id] / mean));
  apply();
}

// Conferencia com sorteios que o ajuste nunca viu: a correcao inteira, so a
// parte que sera aplicada e, para comparar, sem ajuste nenhum.
Object.assign(multiplier, best.multiplier);
apply();
console.log('\nCorrecao inteira, sorteios novos:');
show(evaluate(50000), 'inteira     ');
const measured = { ...multiplier };
for (const id of ids) multiplier[id] = Math.min(max, Math.max(min, measured[id] ** strength));
apply();
const final = evaluate(50000);
console.log(`Correcao aplicada (a medida elevada a ${strength}):`);
show(final, 'aplicada    ');
for (const id of ids) records[id].config.balance = { damage: 1 };
console.log('Sem ajuste algum (x1), para comparar:');
show(evaluate(50000), 'sem ajuste  ');
apply();
console.log('\nMultiplicadores de dano (aplicado, medido):');
for (const id of [...ids].sort((a, b) => multiplier[b] - multiplier[a])) {
  const m = multiplier[id];
  const note = measured[id] >= max - 0.01 ? '  <- no limite de cima: o kit e fraco demais' : measured[id] <= min + 0.01 ? '  <- no limite de baixo: o kit e forte demais' : '';
  console.log(`  ${id.padEnd(11)} x${m.toFixed(3)}  (medido x${measured[id].toFixed(3)})${note}`);
}

if (dry) {
  console.log('\n(--dry: nada foi gravado)');
} else {
  const rounded = Object.fromEntries(ids.map((id) => [id, Math.round(multiplier[id] * 1000) / 1000]));
  writeFileSync(BALANCE_FILE, `${JSON.stringify({ ...stored, ...rounded }, null, 2)}\n`);
  for (const id of ids) {
    const path = resolve(ROOT, `public/assets/characters/${id}/${id}_config.json`);
    const config = JSON.parse(readFileSync(path, 'utf8'));
    if (rounded[id] === 1) delete config.balance;
    else config.balance = { damage: rounded[id] };
    writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
  }
  console.log(`\nGravado em src/data/balance.json e nos ${ids.length} configs.`);
}
