// Torneio automatico do elenco: a IA do jogo joga todos contra todos, sem
// abrir o navegador, e o script mede quem vence, em quanto tempo, e que golpes
// fazem o dano. Serve para achar personagem forte ou fraco demais e golpe
// quebrado (dano infinito, sequencia que mata sozinha).
//
// Uso:
//   node scripts/balance-sim.mjs                 torneio completo (normal)
//   node scripts/balance-sim.mjs --rounds 6      partidas por lado e par
//   node scripts/balance-sim.mjs --only yoruichi,goku
//   node scripts/balance-sim.mjs --difficulty hard
//   node scripts/balance-sim.mjs --json saida.json
//
// Fiel ao GameCanvas: mesmo detector de combos, mesma IA, mesma ordem do
// laco. Nao simula o hitstop (o congelamento do impacto), entao os rounds
// saem um pouco mais rapidos que no jogo.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { arena, loadRecord, seedRandom } from '../test/helpers/world.js';
import { resolveAttack, resolveBodyCollision } from '../src/systems/CollisionDetector.js';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { AIController } from '../src/systems/AIController.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROUND_TICKS = 90 * 60;
// Posicoes iniciais do jogo: no meio da arena, a START_GAP de distancia.
const CENTER = 640;
const START_GAP = 220;

const NEUTRAL = { left: false, right: false, up: false, down: false, jump: false, punch: false, kick: false, special: false };

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : fallback;
};

export function realRoster() {
  const list = JSON.parse(readFileSync(resolve(ROOT, 'src/data/characters.json'), 'utf8'));
  return list
    .map((entry) => entry.id)
    .filter((id) => {
      try {
        return Boolean(JSON.parse(readFileSync(resolve(ROOT, `public/assets/characters/${id}/${id}_config.json`), 'utf8')).atlas);
      } catch {
        return false;
      }
    });
}

// Uma partida (um round de 90 s): devolve quem venceu e o que cada um fez.
// ai: qual IA comanda cada lado ('smart' = a que entende os golpes, 'legacy' =
// a antiga, que so sorteia).
export function playRound(recordA, recordB, { difficulty = 'normal', seed = 1, ai = ['smart', 'smart'] } = {}) {
  const restore = seedRandom(seed);
  try {
    const world = arena(recordA, CENTER - START_GAP / 2, CENTER + START_GAP / 2, recordB);
    const fighters = world.fighters;
    const sides = [recordA, recordB].map((record, index) => {
      const detector = new ComboDetector(record.config.combos);
      return {
        fighter: fighters[index],
        detector,
        ai: new AIController(detector.combos, Array.isArray(difficulty) ? difficulty[index] : difficulty, { smart: ai[index] === 'smart' }),
        damageDealt: 0,
        byMove: {},
        startsByMove: {},
        hitsByMove: {},
        lastMove: 'basico',
        lastSerial: 0,
        starts: 0,
      };
    });

    let koTick = null;
    for (let tick = 0; tick < ROUND_TICKS; tick += 1) {
      const now = (tick * 1000) / 60;
      const [a, b] = fighters;
      a.faceTowards(b.x);
      b.faceTowards(a.x);
      const before = fighters.map((fighter) => fighter.health);
      sides.forEach((side, index) => {
        const { fighter } = side;
        const opponent = fighters[1 - index];
        const command = { ...NEUTRAL, ...side.ai.update(fighter, opponent, 1) };
        command.combo = side.detector.feed(command, fighter.facing, now, fighter.comboModes);
        fighter.update(command, 1);
        if (fighter.attackSerial !== side.lastSerial) {
          side.lastSerial = fighter.attackSerial;
          side.starts += 1;
          side.lastMove = fighter.animation.name;
          side.startsByMove[side.lastMove] = (side.startsByMove[side.lastMove] ?? 0) + 1;
        }
      });
      world.effects.collect(fighters);
      resolveBodyCollision(a, b);
      resolveAttack(a, b);
      resolveAttack(b, a);
      world.effects.update(1, fighters);
      // Quem perdeu vida neste tick apanhou do outro: atribui o dano ao golpe
      // que o oponente soltou por ultimo.
      fighters.forEach((fighter, index) => {
        const lost = before[index] - fighter.health;
        if (lost > 0) {
          const attacker = sides[1 - index];
          attacker.damageDealt += lost;
          attacker.byMove[attacker.lastMove] = (attacker.byMove[attacker.lastMove] ?? 0) + lost;
          attacker.hitsByMove[attacker.lastMove] = (attacker.hitsByMove[attacker.lastMove] ?? 0) + 1;
        }
      });
      if (a.health <= 0 || b.health <= 0) { koTick = tick; break; }
    }

    const [a, b] = fighters;
    let winner = null;
    if (a.health !== b.health) winner = a.health > b.health ? 0 : 1;
    return {
      winner,
      ko: koTick !== null,
      ticks: koTick ?? ROUND_TICKS,
      health: [a.health, b.health],
      damage: sides.map((side) => side.damageDealt),
      byMove: sides.map((side) => side.byMove),
      startsByMove: sides.map((side) => side.startsByMove),
      hitsByMove: sides.map((side) => side.hitsByMove),
      starts: sides.map((side) => side.starts),
    };
  } finally {
    restore();
  }
}

// Compara as duas IAs: cada personagem com a IA nova contra todos os outros
// com a antiga (nos dois lados da arena), e o inverso. Se a nova for melhor,
// vence mais que 50% nas duas direcoes.
function compare() {
  const rounds = Number(option('rounds', 4));
  const difficulty = option('difficulty', 'normal');
  // Dificuldades diferentes para cada IA: a nova no facil contra a antiga no
  // normal mostra se a escada de dificuldade se manteve.
  const newDifficulty = option('new-difficulty', difficulty);
  const oldDifficulty = option('old-difficulty', difficulty);
  const only = option('only', null)?.split(',');
  const ids = realRoster().filter((id) => !only || only.includes(id));
  const records = Object.fromEntries(ids.map((id) => [id, loadRecord(id, { balanced: true })]));
  const perCharacter = Object.fromEntries(ids.map((id) => [id, { newWins: 0, games: 0 }]));
  let newWins = 0;
  let games = 0;
  let timeouts = 0;
  for (const id of ids) {
    for (const other of ids) {
      if (id === other) continue;
      for (let round = 0; round < rounds; round += 1) {
        for (const side of [0, 1]) {
          // "id" joga com a IA nova, "other" com a antiga.
          const left = side === 0 ? id : other;
          const right = side === 0 ? other : id;
          const ai = side === 0 ? ['smart', 'legacy'] : ['legacy', 'smart'];
          const result = playRound(records[left], records[right], { difficulty: side === 0 ? [newDifficulty, oldDifficulty] : [oldDifficulty, newDifficulty], seed: 7000 + round * 11 + ids.indexOf(id) * 37 + ids.indexOf(other), ai });
          games += 1;
          perCharacter[id].games += 1;
          if (result.winner === null) { timeouts += 1; newWins += 0.5; perCharacter[id].newWins += 0.5; } else if (result.winner === side) { newWins += 1; perCharacter[id].newWins += 1; }
        }
      }
    }
  }
  console.log(`
IA nova (${newDifficulty}) contra IA antiga (${oldDifficulty}), ${games} partidas: a nova vence ${((newWins / games) * 100).toFixed(1)}%`);
  console.log('quando o personagem usa a IA nova contra a antiga dos outros:');
  for (const id of [...ids].sort((a, b) => perCharacter[b].newWins / perCharacter[b].games - perCharacter[a].newWins / perCharacter[a].games)) {
    console.log(`  ${id.padEnd(11)} ${((perCharacter[id].newWins / perCharacter[id].games) * 100).toFixed(0).padStart(3)}%`);
  }
}

function main() {
  if (args.includes('--compare')) return compare();
  const rounds = Number(option('rounds', 4));
  const difficulty = option('difficulty', 'normal');
  const only = option('only', null)?.split(',');
  const jsonOut = option('json', null);
  const detail = option('detail', null)?.split(',') ?? [];
  const ids = realRoster().filter((id) => !only || only.includes(id));
  const records = Object.fromEntries(ids.map((id) => [id, loadRecord(id, { balanced: true })]));

  const stats = Object.fromEntries(ids.map((id) => [id, {
    games: 0, wins: 0, kos: 0, koTicks: 0, timeouts: 0, damage: 0, taken: 0, byMove: {}, startsByMove: {}, hitsByMove: {}, fastest: [], zeroDamage: 0,
  }]));
  const matrix = Object.fromEntries(ids.map((id) => [id, Object.fromEntries(ids.map((other) => [other, { w: 0, n: 0 }]))]));

  const started = Date.now();
  let played = 0;
  const pairs = ids.length * (ids.length - 1) / 2;
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      // Cada par joga nos dois lados (quem fica na esquerda importa um pouco).
      for (let round = 0; round < rounds; round += 1) {
        for (const [left, right] of [[ids[i], ids[j]], [ids[j], ids[i]]]) {
          const result = playRound(records[left], records[right], { difficulty, seed: 1000 + round * 7 + i * 31 + j });
          played += 1;
          [left, right].forEach((id, side) => {
            const s = stats[id];
            const other = [left, right][1 - side];
            s.games += 1;
            matrix[id][other].n += 1;
            if (result.winner === side) { s.wins += 1; matrix[id][other].w += 1; }
            if (result.winner === null) matrix[id][other].w += 0.5;
            if (result.ko) { s.kos += result.winner === side ? 1 : 0; if (result.winner === side) s.koTicks += result.ticks; } else s.timeouts += 1;
            s.damage += result.damage[side];
            s.taken += result.damage[1 - side];
            if (result.damage[side] === 0) s.zeroDamage += 1;
            for (const [move, amount] of Object.entries(result.byMove[side])) s.byMove[move] = (s.byMove[move] ?? 0) + amount;
            for (const [move, amount] of Object.entries(result.startsByMove[side])) s.startsByMove[move] = (s.startsByMove[move] ?? 0) + amount;
            for (const [move, amount] of Object.entries(result.hitsByMove[side])) s.hitsByMove[move] = (s.hitsByMove[move] ?? 0) + amount;
            if (result.ko && result.winner === side) {
              s.fastest.push({ seconds: result.ticks / 60, vs: other, health: result.health[side] });
              s.fastest.sort((x, y) => x.seconds - y.seconds);
              s.fastest.length = Math.min(s.fastest.length, 3);
            }
          });
        }
      }
      process.stderr.write(`\r${played} partidas (${Math.round((played / (pairs * rounds * 2)) * 100)}%)  ${Math.round((Date.now() - started) / 1000)}s   `);
    }
  }
  process.stderr.write('\n');

  const table = ids.map((id) => {
    const s = stats[id];
    return {
      id,
      winRate: s.wins / s.games,
      games: s.games,
      koWins: s.kos,
      avgKoSeconds: s.kos ? s.koTicks / s.kos / 60 : null,
      timeouts: s.timeouts / s.games,
      damagePerGame: s.damage / s.games,
      takenPerGame: s.taken / s.games,
      zeroDamage: s.zeroDamage / s.games,
      topMoves: Object.entries(s.byMove).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, amount]) => `${name} ${(amount / s.damage * 100).toFixed(0)}%`),
      fastest: s.fastest,
    };
  }).sort((a, b) => b.winRate - a.winRate);

  console.log(`\nTorneio (${difficulty}, ${ids.length} personagens, ${played} partidas em ${Math.round((Date.now() - started) / 1000)}s)\n`);
  console.log('personagem   vitorias  KO(s)  timeout  dano/partida  levado  sem dano  golpes que mais machucam');
  for (const row of table) {
    console.log([
      row.id.padEnd(11),
      `${(row.winRate * 100).toFixed(0).padStart(5)}%`,
      row.avgKoSeconds === null ? '   -  ' : `${row.avgKoSeconds.toFixed(0).padStart(4)}s `,
      `${(row.timeouts * 100).toFixed(0).padStart(6)}%`,
      row.damagePerGame.toFixed(0).padStart(11),
      row.takenPerGame.toFixed(0).padStart(9),
      `${(row.zeroDamage * 100).toFixed(0).padStart(6)}%`,
      '  ' + row.topMoves.join(', '),
    ].join('  '));
  }
  console.log('\nKO mais rapido de cada um:');
  for (const row of table) {
    if (row.fastest[0]) console.log(`  ${row.id.padEnd(11)} ${row.fastest.map((f) => `${f.seconds.toFixed(1)}s vs ${f.vs}`).join(' | ')}`);
  }
  for (const id of detail) {
    const s = stats[id];
    if (!s) continue;
    const config = records[id].config;
    console.log(`
Detalhe de ${id} (${s.games} partidas):`);
    console.log('  golpe               saidas  acertos  taxa   dano   dano/saida  recarga');
    const names = new Set([...Object.keys(s.startsByMove), ...Object.keys(s.byMove)]);
    for (const name of [...names].sort((a, b) => (s.byMove[b] ?? 0) - (s.byMove[a] ?? 0))) {
      const starts = s.startsByMove[name] ?? 0;
      const hitsCount = s.hitsByMove[name] ?? 0;
      const damage = s.byMove[name] ?? 0;
      console.log(`  ${name.padEnd(19)} ${String(starts).padStart(6)}  ${String(hitsCount).padStart(7)}  ${starts ? ((hitsCount / starts) * 100).toFixed(0).padStart(3) + '%' : '   -'}  ${String(Math.round(damage)).padStart(5)}  ${starts ? (damage / starts).toFixed(1).padStart(9) : '        -'}  ${String(config.animations[name]?.cooldown ?? '-').padStart(7)}`);
    }
  }
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ difficulty, table, matrix }, null, 2));
  return { table, matrix };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
