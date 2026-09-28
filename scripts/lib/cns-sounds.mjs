// Sons dos golpes tirados do .cns do pacote MUGEN: cada estado do personagem
// toca seus sons com PlaySnd (value = grupo, item), em gatilhos como
// "Time = 3" ou "AnimElem = 4". Aqui os estados sao lidos e ligados aos golpes
// do jogo pela animacao (o estado que usa a animacao 200 fala pelo golpe cuja
// especificacao tem a acao 200).
//
// So entram os gatilhos simples (Time, !Time, AnimElem, AnimElemTime): os que
// dependem de acerto, sorteio ou variavel ficam de fora. Sons com prefixo "F"
// (fight.snd, o som comum do MUGEN) tambem: o jogo nao tem esse arquivo. O
// prefixo "S" (ou nenhum) e o .snd do proprio personagem.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';

const read = (path) => readFileSync(path, 'latin1');
const clean = (line) => line.replace(/;.*$/, '').trim();

// Arquivos de estado listados no .def ([Files]: cns, st, st1... e stcommon).
function stateFiles(defPath) {
  const dir = dirname(defPath);
  const files = [];
  let inFiles = false;
  for (const raw of read(defPath).split(/\r?\n/)) {
    const line = clean(raw);
    const section = line.match(/^\[(.+)\]$/);
    if (section) { inFiles = section[1].toLowerCase() === 'files'; continue; }
    const pair = inFiles && line.match(/^(cns|st\d*|stcommon)\s*=\s*(.+)$/i);
    if (!pair) continue;
    const name = pair[2].replace(/"/g, '').trim();
    for (const candidate of [resolve(dir, name), resolve(dir, basename(name))]) {
      if (existsSync(candidate)) { files.push(candidate); break; }
    }
  }
  return [...new Set(files)];
}

// Um gatilho simples vira { kind: 'time', n } ou { kind: 'elem', n, k }.
function parseWhen(text) {
  const t = text.replace(/\s+/g, '').toLowerCase();
  let m;
  if (t === '!time') return { kind: 'time', n: 0 };
  if ((m = t.match(/^time=(\d+)$/))) return { kind: 'time', n: Number(m[1]) };
  if ((m = t.match(/^animelem=(\d+)$/))) return { kind: 'elem', n: Number(m[1]), k: 0 };
  if ((m = t.match(/^animelemtime\((\d+)\)=(\d+)$/))) return { kind: 'elem', n: Number(m[1]), k: Number(m[2]) };
  return null;
}

// O bloco vale se tiver um unico gatilho (trigger1), sem triggerall, feito de
// condicoes simples: uma de tempo/quadro (ou varias ligadas por ||) e, no
// maximo, "anim = N" para dizer qual animacao esta tocando.
function whensOf(block) {
  if (block.triggerall.length > 0 || Object.keys(block.triggers).length !== 1 || !block.triggers[1]) return null;
  const parts = [];
  for (const condition of block.triggers[1]) {
    if (/^anim\s*=\s*\d+$/i.test(condition.trim())) continue;
    for (const piece of condition.split('||')) {
      const when = parseWhen(piece);
      if (!when) return null;
      parts.push(when);
    }
  }
  return parts.length > 0 ? parts : null;
}

// states: numero -> { anim, sounds: [{ group, item, when }] }
export function loadCnsSounds(defPath) {
  const states = new Map();
  for (const file of stateFiles(defPath)) {
    let state = null;
    let block = null;
    const flush = () => {
      if (state && block?.type === 'playsnd' && block.value) {
        // "S2,44 + var(48)": variacao de voz escolhida por variavel; vale o
        // som base. Sons totalmente calculados (S0,var(1)) ficam de fora.
        const m = block.value.match(/^[sS]?\s*(\d+)\s*,\s*(\d+)\s*(?:\+.*)?$/);
        const whens = m && whensOf(block);
        if (whens) for (const when of whens) state.sounds.push({ group: Number(m[1]), item: Number(m[2]), when });
      }
      block = null;
    };
    for (const raw of read(file).split(/\r?\n/)) {
      const line = clean(raw);
      const statedef = line.match(/^\[Statedef\s+(-?\d+)/i);
      if (statedef) {
        flush();
        state = { anim: null, sounds: [] };
        states.set(Number(statedef[1]), state);
        continue;
      }
      if (/^\[State\s/i.test(line)) {
        flush();
        block = { type: '', value: '', triggerall: [], triggers: {} };
        continue;
      }
      if (/^\[/.test(line)) { flush(); state = null; continue; }
      const pair = line.match(/^([\w.]+)\s*=\s*(.*)$/);
      if (!pair || !state) continue;
      const key = pair[1].toLowerCase();
      if (!block) {
        if (key === 'anim' && /^\d+$/.test(pair[2].trim())) state.anim = Number(pair[2].trim());
        continue;
      }
      if (key === 'type') block.type = pair[2].trim().toLowerCase();
      else if (key === 'value') block.value = pair[2].trim();
      else if (key === 'triggerall') block.triggerall.push(pair[2]);
      else if (/^trigger\d+$/.test(key)) (block.triggers[Number(key.slice(7))] ??= []).push(pair[2]);
    }
    flush();
  }
  return states;
}

const idOf = (action) => (typeof action === 'number' ? action : action.id);

// Estados que falam pelo golpe: os que usam a animacao de cada acao dele (se
// houver um com o numero da propria acao, so ele).
function statesFor(actionId, states) {
  const byAnim = [...states].filter(([number, s]) => s.anim === actionId && number >= 40 && !(number >= 5000 && number < 6000));
  const same = byAnim.find(([number]) => number === actionId);
  if (same) return [same];
  if (byAnim.length > 0) return byAnim;
  const own = states.get(actionId);
  return own && actionId >= 200 ? [[actionId, own]] : [];
}

// Eventos de som de um golpe: [{ action, at | frame, sound: 'sG_I' }] e o
// conjunto dos sons usados ("g,i"). Golpes em loop (andar, parado) ficam mudos.
// has(group, item): so entram sons que existem no .snd (o .cns cita alguns que o
// pacote nunca trouxe).
export function soundEventsFor(spec, states, has = () => true) {
  if (spec.loop || !spec.actions) return { events: [], used: new Set() };
  const events = [];
  const used = new Set();
  const seen = new Set();
  for (const actionId of new Set(spec.actions.map(idOf))) {
    for (const [, state] of statesFor(actionId, states)) {
      for (const { group, item, when } of state.sounds) {
        if (!has(group, item)) continue;
        const key = `${actionId}|${group},${item}|${when.kind}|${when.n}|${when.k ?? 0}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const sound = `s${group}_${item}`;
        events.push(when.kind === 'time'
          ? { action: actionId, at: when.n, sound }
          : { action: actionId, frame: when.n, sound });
        used.add(`${group},${item}`);
      }
    }
  }
  return { events, used };
}
