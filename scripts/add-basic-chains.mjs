// Sequencias de golpes basicos dos professores (Ensina GOD e Humberto): soco e
// chute deixam de ser um golpe so e viram cadeias que misturam mao direita,
// mao esquerda e chute, terminando num golpe que derruba ou lanca. Usa so
// quadros que ja existem nos atlas.
//
// Pode rodar quantas vezes quiser: reescreve sempre os mesmos golpes. Rodar de
// novo depois do scripts/upgrade-humberto-combat.mjs, que mexe no punch/punch2.
//
//   node scripts/add-basic-chains.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('../public/assets/characters/', import.meta.url);

// A cadeia so continua se o golpe anterior encostou (acerto ou defesa), como
// nos outros lutadores. "after" e o tick a partir do qual o proximo aperto vale.
const chain = (pairs, after) => pairs.map(([on, to]) => ({ on, to, after }));

function update(file, apply) {
  const url = new URL(file, ROOT);
  const config = JSON.parse(readFileSync(url, 'utf8'));
  apply(config);
  writeFileSync(url, `${JSON.stringify(config, null, 2)}\n`);
  console.log('ok', file);
}

// Troca (ou poe) as entradas basicas da lista de golpes, no lugar das antigas.
function setBasics(config, oldNames, entries) {
  const list = config.moveList.filter((entry) => !oldNames.includes(entry.name));
  const at = config.moveList.findIndex((entry) => oldNames.includes(entry.name));
  list.splice(at < 0 ? 0 : at, 0, ...entries);
  config.moveList = list;
}

// ---- Ensina GOD (celula 320x300) ----
// Soco reto (6-8) -> palmada de mao aberta (5) -> gancho que lanca (16)
// Chute alto (9-11) -> rasteira que derruba (22-23)
update('ensina_god/ensina_god_config.json', (c) => {
  c.description = 'O Deus do código';
  const a = c.animations;
  a.punch.cancels = chain([['punch', 'punch2'], ['kick', 'kick']], 6);
  a.kick.cancels = chain([['kick', 'kick2'], ['punch', 'punch3']], 8);
  a.punch2 = {
    frames: [1, 5, 5, 0],
    durations: [4, 3, 5, 6],
    loop: false,
    hits: [{ from: 1, until: 2, damage: 12, hitstun: 16, push: 3, box: { offsetX: 190, offsetY: 70, width: 85, height: 60 } }],
    cancels: chain([['punch', 'punch3'], ['kick', 'kick2']], 6),
  };
  a.punch3 = {
    frames: [4, 16, 16, 0],
    durations: [5, 4, 9, 10],
    loop: false,
    hits: [{ from: 1, until: 2, damage: 18, hitstun: 20, heavy: true, launch: { vx: 9, vy: 5 }, box: { offsetX: 140, offsetY: 20, width: 95, height: 150 } }],
  };
  a.kick2 = {
    frames: [22, 23, 23, 4],
    durations: [4, 4, 8, 10],
    loop: false,
    hits: [{ from: 1, until: 2, damage: 16, hitstun: 18, launch: { vx: 8, vy: 3 }, box: { offsetX: 170, offsetY: 205, width: 105, height: 55 } }],
  };
  setBasics(c, ['Soco', 'Chute', 'Sequência de socos', 'Sequência de chutes'], [
    { section: 'Básicos', name: 'Sequência de socos', input: 'PPP', note: 'Soco reto, palmada e gancho que lança' },
    { section: 'Básicos', name: 'Sequência de chutes', input: 'KK', note: 'Chute alto e rasteira que derruba' },
    { section: 'Básicos', name: 'Mistura', input: 'PPK', note: 'Soco e chute se encadeiam: PK, KP, PPK...' },
  ]);
});

// ---- Humberto (celula 320x350) ----
// Soco direito (76-79) -> jab de esquerda (73, 7) -> soco pesado (26)
// Chute (80-83) -> empurrao de duas maos que lanca (84-87)
// Na forma lendaria, os mesmos golpes com os quadros de cabelo verde.
update('humberto/humberto_config.json', (c) => {
  c.description = 'O químico lendário';
  const a = c.animations;
  const punchBox = { offsetX: 185, offsetY: 155, width: 120, height: 95 };
  const pushBox = { offsetX: 180, offsetY: 145, width: 140, height: 115 };
  const trail = (at, x, y) => ({ at, effect: { id: 'combatTrail', offsetX: x, offsetY: y } });

  for (const prefix of ['', 'legend_']) {
    const legend = prefix === 'legend_';
    const name = (move) => prefix + move;
    a[name('punch')].cancels = chain([['punch', name('punch2')], ['kick', name('kick')]], 8);
    a[name('kick')].cancels = chain([['kick', name('kick2')], ['punch', name('punch3')]], 10);
    a[name('punch2')] = {
      frames: legend ? [38, 39, 39, 38] : [73, 7, 7, 72],
      durations: [4, 3, 5, 6],
      loop: false,
      hits: [{ from: 1, until: 2, damage: 7.801, hitstun: 15, push: 4, box: punchBox }],
      cancels: chain([['punch', name('punch3')], ['kick', name('kick2')]], 7),
      events: [{ at: 4, sound: 'swing' }, trail(4, 220, 175)],
    };
    a[name('punch3')] = {
      frames: legend ? [38, 58, 58, 32] : [75, 26, 26, 87],
      durations: [5, 4, 9, 9],
      loop: false,
      hits: [{ from: 1, until: 2, damage: 10, hitstun: 18, push: 7, heavy: true, box: punchBox }],
      events: [{ at: 5, sound: 'swing' }, trail(5, 230, 170)],
    };
    a[name('kick2')] = {
      frames: legend ? [60, 52, 61, 61, 32] : [84, 85, 86, 86, 87],
      durations: [5, 4, 4, 8, 9],
      loop: false,
      hits: [{ from: 2, until: 3, damage: 12, hitstun: 18, heavy: true, launch: { vx: 5, vy: 4 }, box: pushBox }],
      events: [{ at: 9, sound: 'reaction' }, trail(9, 240, 190)],
    };
  }
  const mapped = c.modes.legendary.animations;
  for (const move of ['punch3', 'kick2']) mapped[move] = `legend_${move}`;

  setBasics(c, ['Soco — combo', 'Chute', 'Sequência de socos', 'Sequência de chutes', 'Mistura'], [
    { section: 'Laboratório de combate', name: 'Sequência de socos', input: 'PPP', note: 'Direita, jab de esquerda e soco pesado' },
    { section: 'Laboratório de combate', name: 'Sequência de chutes', input: 'KK', note: 'Chute e empurrão de duas mãos que lança' },
    { section: 'Laboratório de combate', name: 'Mistura', input: 'PPK', note: 'Soco e chute se encadeiam: PK, KP, PPK...' },
  ]);
});
