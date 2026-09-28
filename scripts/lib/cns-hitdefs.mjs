// Como cada golpe joga o oponente, lido dos HitDef do .cns do pacote MUGEN:
// "fall = 1" derruba, "air.velocity" / "ground.velocity" dizem para onde e com
// que forca. Os estados sao ligados aos golpes do jogo pela animacao, como em
// cns-sounds.mjs (o estado que usa a animacao 200 fala pelo golpe cuja
// especificacao tem a acao 200).
import { readFileSync } from 'node:fs';
import { stateFiles } from './cns-sounds.mjs';

const clean = (line) => line.replace(/;.*$/, '').trim();
const numbers = (text) => text.split(',').map((part) => Number.parseFloat(part.trim()));
const number = (text) => {
  const value = Number.parseFloat(text);
  return Number.isFinite(value) ? value : null;
};

// states: numero -> { anim, hitdefs: [{ fall, airVelocity, groundVelocity, groundType, airType, animType, damage }] }
export function loadCnsHitDefs(defPath) {
  const states = new Map();
  for (const file of stateFiles(defPath)) {
    let state = null;
    let hitdef = null;
    let block = null;
    const flush = () => {
      if (state && hitdef) state.hitdefs.push(hitdef);
      hitdef = null;
      block = null;
    };
    for (const raw of readFileSync(file, 'latin1').split(/\r?\n/)) {
      const line = clean(raw);
      const statedef = line.match(/^\[Statedef\s+(-?\d+)/i);
      if (statedef) {
        flush();
        state = { anim: null, hitdefs: [] };
        states.set(Number(statedef[1]), state);
        continue;
      }
      if (/^\[State\s/i.test(line)) { flush(); block = {}; continue; }
      if (/^\[/.test(line)) { flush(); state = null; continue; }
      const pair = line.match(/^([\w.]+)\s*=\s*(.*)$/);
      if (!pair || !state) continue;
      const key = pair[1].toLowerCase();
      const value = pair[2].trim();
      if (!block) {
        if (key === 'anim' && /^\d+$/.test(value)) state.anim = Number(value);
        continue;
      }
      if (key === 'type') {
        if (value.toLowerCase() === 'hitdef') hitdef = { fall: false, airVelocity: null, groundVelocity: null, groundType: 'high', airType: null, animType: null, damage: 0 };
        continue;
      }
      if (!hitdef) continue;
      if (key === 'fall') hitdef.fall = number(value) === 1;
      else if (key === 'air.velocity') hitdef.airVelocity = numbers(value);
      else if (key === 'ground.velocity') hitdef.groundVelocity = numbers(value);
      else if (key === 'ground.type') hitdef.groundType = value.toLowerCase();
      else if (key === 'air.type') hitdef.airType = value.toLowerCase();
      else if (key === 'animtype') hitdef.animType = value.toLowerCase();
      else if (key === 'damage') hitdef.damage = number(value.split(',')[0]) ?? 0;
    }
    flush();
  }
  return states;
}

const idOf = (action) => (typeof action === 'number' ? action : action.id);

// HitDef dos estados que usam as animacoes dessas acoes.
export function hitDefsForActions(actions, states) {
  const ids = new Set(actions.map(idOf));
  const found = [];
  for (const [number, state] of states) {
    if (state.anim === null || !ids.has(state.anim) || (number >= 5000 && number < 6000)) continue;
    found.push(...state.hitdefs);
  }
  return found;
}

const round = (value) => Math.round(value * 100) / 100;

// Lancamento do golpe: o do HitDef "fall = 1" que joga mais alto entre os
// estados das acoes. vx e vy sao magnitudes em px/tick do pacote (vx: para
// longe de quem bateu, vy: para cima). Sem queda no .cns, null.
export function launchFor(actions, states) {
  let best = null;
  for (const hitdef of hitDefsForActions(actions, states)) {
    if (!hitdef.fall) continue;
    const [vx, vy] = hitdef.groundVelocity ?? hitdef.airVelocity ?? [];
    const launch = {
      vx: round(Math.max(0, -(Number.isFinite(vx) ? vx : 0))),
      // Queda rasteira (o golpe que so derruba) ainda sobe um pouco.
      vy: round(Math.max(2, -(Number.isFinite(vy) ? vy : 0))),
    };
    if (!best || launch.vy > best.vy) best = launch;
  }
  return best;
}
