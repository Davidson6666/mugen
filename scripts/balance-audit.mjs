// Auditoria estatica do elenco: procura ciclos no grafo de golpes (um golpe
// que leva a si mesmo por cancel, onHit ou next) e mede, por personagem, o
// maior dano que uma sequencia de cancels consegue somar. Um ciclo sem freio
// vira ataque infinito (a jab da Yoruichi). Uso: npm run balance:audit
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const roster = JSON.parse(readFileSync(resolve(ROOT, 'src/data/characters.json'), 'utf8'));
const readConfig = (id) => JSON.parse(readFileSync(resolve(ROOT, `public/assets/characters/${id}/${id}_config.json`), 'utf8'));

const ticksOf = (animation) => animation.durations.reduce((sum, ticks) => sum + ticks, 0);
const damageOf = (animation) => {
  const hits = animation.hits ?? [];
  return hits.reduce((sum, hit) => {
    const count = hit.every ? (hit.count ?? 1) : 1;
    return sum + (hit.damage ?? animation.damage ?? 0) * count;
  }, 0) || (animation.damage ?? 0);
};
// Para onde o golpe pode ir depois de sair (so o que o jogador provoca).
const edgesOf = (animation) => [
  ...(animation.cancels ?? []).map((cancel) => ({ to: cancel.to, kind: 'cancel', after: cancel.after ?? 0 })),
  ...(animation.onHit ? [{ to: animation.onHit.to, kind: 'onHit' }] : []),
  ...(animation.next ? [{ to: animation.next, kind: 'next' }] : []),
  ...(animation.onLand ? [{ to: animation.onLand, kind: 'onLand' }] : []),
];

export function auditCharacter(id) {
  const config = readConfig(id);
  const { animations } = config;
  const cycles = [];
  // DFS com pilha do caminho: achou um golpe ja no caminho, e ciclo.
  const seen = new Set();
  const visit = (name, path) => {
    const animation = animations[name];
    if (!animation) return;
    for (const edge of edgesOf(animation)) {
      if (!animations[edge.to]) continue;
      const at = path.indexOf(edge.to);
      if (at >= 0) {
        const loop = [...path.slice(at), edge.to];
        const key = [...loop].sort().join('>');
        if (!seen.has(key)) {
          seen.add(key);
          const members = path.slice(at);
          const ticks = members.reduce((sum, member) => sum + ticksOf(animations[member]), 0);
          const damage = members.reduce((sum, member) => sum + damageOf(animations[member]), 0);
          cycles.push({ loop, ticks, damage, dps: ticks ? (damage / ticks) * 60 : 0 });
        }
      } else if (path.length < 12) {
        visit(edge.to, [...path, edge.to]);
      }
    }
  };
  for (const name of Object.keys(animations)) visit(name, [name]);
  return { id, cycles, health: config.stats.maxHealth };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const { id } of roster) {
    let audit;
    try { audit = auditCharacter(id); } catch { continue; }
    if (audit.cycles.length === 0) { console.log(`${id.padEnd(11)} sem ciclos`); continue; }
    console.log(`${id.padEnd(11)} ${audit.cycles.length} ciclo(s):`);
    for (const cycle of audit.cycles.sort((a, b) => b.dps - a.dps)) {
      console.log(`   ${cycle.loop.join(' -> ')}   ${cycle.damage} dano / ${cycle.ticks} ticks = ${cycle.dps.toFixed(1)}/s (${(audit.health / Math.max(cycle.dps, 0.01)).toFixed(1)} s para matar)`);
    }
  }
}
