import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Executado pelo construtor principal depois dos 72 quadros da forma normal.
const root = new URL('../', import.meta.url);
const source = new URL('assets-src/professor-web/', root);
const output = new URL('public/assets/characters/professor_web/', root);
const configPath = new URL('professor_web_config.json', output);
const c = JSON.parse(await readFile(configPath, 'utf8'));
c.atlas = c.atlas.slice(0, 72);
c.sheets = c.sheets.slice(0, 4);
for (const name of Object.keys(c.animations)) if (/^(war_|football|godWar)/.test(name)) delete c.animations[name];
for (const name of Object.keys(c.effects)) if (!['httpPacket', 'firewall', 'deployPacket', 'codeImpact', 'codeCharge'].includes(name)) delete c.effects[name];
c.combos = c.combos.filter((combo) => !/^(war_|football|godWar)/.test(combo.id));
c.moveList = c.moveList.filter((move) => !['Futebol', 'Transformação', 'Deus da Guerra'].includes(move.section));
// A espada do Olimpo precisa de margem horizontal maior. A origem e todas as
// caixas da forma normal se deslocam juntas, preservando seu alcance no mundo.
const coordinatePad = 32;
const shift = (448 - c.spriteGridSize.frameWidth) / 2;
if (shift) {
  for (const frame of c.atlas) frame[5] += shift;
  c.hurtbox.offsetX += shift;
  c.hitbox.offsetX += shift;
  for (const a of Object.values(c.animations)) {
    for (const h of a.hits ?? []) h.box.offsetX += shift;
    if (a.hitbox) a.hitbox.offsetX += shift;
  }
}
c.spriteGridSize.frameWidth = 448;
const { frameWidth: fw, frameHeight: fh, baseline } = c.spriteGridSize;

// Uma máscara por componente remove fundo e fragmentos de células vizinhas.
function isolate(data, width, height, rows) {
  const labels = new Int32Array(width * height), queue = new Int32Array(width * height), figures = new Map();
  for (let start = 0; start < labels.length; start += 1) {
    if (labels[start] || data[start * 4 + 3] < 100) continue;
    const component = start + 1;
    let head = 0, tail = 1, left = width, top = height, right = 0, bottom = 0;
    queue[0] = start; labels[start] = component;
    while (head < tail) {
      const at = queue[head++], x = at % width, y = Math.floor(at / width);
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      for (const next of [x ? at - 1 : -1, x < width - 1 ? at + 1 : -1, at - width, at + width]) {
        if (next < 0 || next >= labels.length || labels[next] || data[next * 4 + 3] < 100) continue;
        labels[next] = component; queue[tail++] = next;
      }
    }
    if (tail < 1000) continue;
    const col = Math.min(3, Math.floor((left + right) / 2 / (width / 4)));
    const row = Math.min(rows - 1, Math.floor((top + bottom) / 2 / (height / rows)));
    const index = row * 4 + col;
    if ((figures.get(index)?.area ?? 0) < tail) figures.set(index, { left, top, right, bottom, component, area: tail });
  }
  if (figures.size !== rows * 4) throw new Error(`Esperava ${rows * 4} poses; encontrei ${figures.size}: ${[...figures.keys()]}`);
  return { figures: Array.from({ length: rows * 4 }, (_, i) => figures.get(i)), labels };
}

async function pack(name, rows) {
  const { data, info } = await sharp(fileURLToPath(new URL(`${name}-source.png`, source))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { figures, labels } = isolate(data, info.width, info.height, rows);
  const factor = 240 / (figures[0].bottom - figures[0].top + 1);
  const first = c.atlas.length, page = c.sheets.length, layers = [];
  for (let index = 0; index < figures.length; index += 1) {
    const fig = figures[index], left = Math.max(0, fig.left - 2), top = Math.max(0, fig.top - 2);
    const width = Math.min(info.width, fig.right + 3) - left, height = Math.min(info.height, fig.bottom + 3) - top;
    const raw = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const at = (top + y) * info.width + left + x;
      if (labels[at] !== fig.component) continue;
      data.copy(raw, (y * width + x) * 4, at * 4, at * 4 + 4);
    }
    for (let at = 3; at < raw.length; at += 4) if (raw[at] > 224) raw[at] = 255;
    const w = Math.round(width * factor), h = Math.round(height * factor);
    const dx = fw / 2 + Math.round((left - (index % 4 + 0.5) * info.width / 4) * factor), dy = baseline - h;
    if (dx < 0 || dy < 0 || dx + w > fw || dy + h > fh) throw new Error(`${name}/${index}: pose fora da célula (${dx},${dy},${w},${h}); ${JSON.stringify(fig)}`);
    const png = await sharp(raw, { raw: { width, height, channels: 4 } }).resize(w, h, { kernel: 'nearest' }).png().toBuffer();
    const x = index % 4 * fw + dx, y = Math.floor(index / 4) * fh + dy;
    layers.push({ input: png, left: x, top: y });
    c.atlas.push([page, x, y, w, h, dx, dy]);
  }
  const filename = `professor_web_${name}.webp`;
  await sharp({ create: { width: fw * 4, height: fh * rows, channels: 4, background: '#00000000' } }).composite(layers).webp({ lossless: true }).toFile(fileURLToPath(new URL(filename, output)));
  c.sheets.push(filename);
  return first;
}
const warFirst = await pack('war-movement', 6);
await pack('war-combat', 6);
await pack('war-reactions', 6);
const footballFirst = await pack('football', 4);
const W = (...indices) => indices.map((i) => warFirst + i);
const F = (...indices) => indices.map((i) => footballFirst + i);

// Efeitos pintados: bola azul, bola dourada, machado, correntes, Olimpo e gelo.
const fxPage = c.sheets.length;
const { data: fxRaw, info: fxInfo } = await sharp(fileURLToPath(new URL('war-fx-source.png', source))).ensureAlpha().resize(512, 768, { kernel: 'nearest' }).raw().toBuffer({ resolveWithObject: true });
for (let at = 0; at < fxRaw.length; at += 4) {
  if (fxRaw[at + 3] < 96) fxRaw.fill(0, at, at + 4);
  else if (fxRaw[at + 3] > 235) fxRaw[at + 3] = 255;
}
await sharp(fxRaw, { raw: fxInfo }).webp({ lossless: true }).toFile(fileURLToPath(new URL('professor_web_war-fx.webp', output)));
c.sheets.push('professor_web_war-fx.webp');

// Impactos e aura geométricos pequenos, com transparência e sem fontes.
const auxPage = c.sheets.length;
let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">';
for (let row = 0; row < 4; row += 1) for (let frame = 0; frame < 4; frame += 1) {
  const color = ['#7ce3ff', '#ff942e', '#ffe58a', '#ed4b41'][row], r = [16, 28, 39, 48][frame];
  svg += `<g transform="translate(${frame * 128} ${row * 128})">`;
  if (row === 3) {
    svg += `<ellipse cx="64" cy="105" rx="${44 + frame}" ry="12" fill="none" stroke="${color}" stroke-width="3" opacity=".65"/><path d="M24 100Q6 ${10 + frame * 6} 50 12M104 100Q122 ${10 + frame * 6} 78 12" fill="none" stroke="${color}" stroke-width="4" opacity=".4"/>`;
    for (let i = 0; i < 6; i += 1) svg += `<rect x="${14 + i * 18}" y="${25 + (i * 17 + frame * 11) % 65}" width="3" height="7" fill="#ffe5aa" opacity=".65"/>`;
  } else {
    for (let i = 0; i < 10; i += 1) svg += `<path transform="rotate(${i * 36 + frame * 7} 64 64)" d="M61 ${64 - r}H67L65 58H63Z" fill="${i % 2 ? color : '#ffffff'}"/>`;
    svg += `<circle cx="64" cy="64" r="${r / 2}" fill="none" stroke="${color}" stroke-width="4" opacity="${1 - frame * 0.2}"/><circle cx="64" cy="64" r="${10 - frame * 2}" fill="#ffffff"/>`;
  }
  svg += '</g>';
}
svg += '</svg>';
await sharp(Buffer.from(svg)).webp({ lossless: true }).toFile(fileURLToPath(new URL('professor_web_war-aux.webp', output)));
c.sheets.push('professor_web_war-aux.webp');
const grid = { frameWidth: 128, frameHeight: 128, baseline: 64 };
const effect = (row, extra = {}, page = fxPage) => ({ spriteGridSize: grid, atlas: Array.from({ length: 4 }, (_, i) => [page, i * 128, row * 128, 128, 128, 0, 0]), animation: { frames: [0, 1, 2, 3], durations: [3, 3, 3, 3], loop: false }, ...extra });
const loop = { frames: [0, 1, 2, 3], durations: [3, 3, 3, 3], loop: true };
const ballBox = { offsetX: 85, offsetY: 44, width: 37, height: 42 };
Object.assign(c.effects, {
  footballBall: effect(0, { animation: loop, renderScale: 0.95, velocityX: 23, lifetime: 130, destroyOnHit: true, onHitSpawn: { id: 'footballImpact' }, hits: [{ from: 0, until: 3, damage: 12, hitstun: 19, push: 5, box: ballBox }] }),
  footballCurve: effect(0, { animation: loop, renderScale: 0.95, velocityX: 19, velocityY: -8, gravity: 0.3, lifetime: 150, endOnGround: true, destroyOnHit: true, onHitSpawn: { id: 'footballImpact' }, hits: [{ from: 0, until: 3, damage: 13, hitstun: 21, push: 5, box: ballBox }] }),
  footballBicycle: effect(1, { animation: loop, renderScale: 0.95, velocityX: 24, velocityY: 2, gravity: 0.16, lifetime: 120, endOnGround: true, destroyOnHit: true, onHitSpawn: { id: 'footballImpact' }, hits: [{ from: 0, until: 3, damage: 15, hitstun: 22, heavy: true, launch: { vx: 5, vy: 5 }, box: ballBox }] }),
  footballGoal: effect(1, { animation: loop, renderScale: 1.35, velocityX: 30, lifetime: 120, destroyOnHit: true, onHitSpawn: { id: 'footballImpact', scale: 1.7 }, hits: [{ from: 0, until: 3, damage: 24, hitstun: 26, heavy: true, launch: { vx: 7, vy: 6 }, box: ballBox }] }),
  footballCharge: effect(0, { renderScale: 0.65, lifetime: 10, follow: 'owner', endWithMove: true }),
  footballImpact: effect(2, { renderScale: 1.5, lifetime: 12 }, auxPage),
  warAxe: effect(2, { animation: loop, renderScale: 0.95, velocityX: 26, lifetime: 90, destroyOnHit: true, onHitSpawn: { id: 'warIceImpact' }, onDeathSpawn: { id: 'warAxeReturn' }, hits: [{ from: 0, until: 3, damage: 14, hitstun: 21, push: 5, heavy: true, box: { offsetX: 20, offsetY: 20, width: 90, height: 90 } }] }),
  warAxeReturn: effect(2, { animation: loop, renderScale: 0.9, velocityX: -30, lifetime: 24 }),
  warFrost: effect(5, { spriteGridSize: { ...grid, baseline: 120 }, renderScale: 2.2, lifetime: 22, onHitSpawn: { id: 'warIceImpact' }, animation: { frames: [0, 1, 2, 3], durations: [3, 5, 6, 8], loop: false }, hits: [{ from: 1, until: 2, damage: 16, hitstun: 22, heavy: true, launch: { vx: 5, vy: 7 }, box: { offsetX: 8, offsetY: 20, width: 112, height: 100 } }] }),
  warChaos: effect(3, { renderScale: 2.7, attached: true, lifetime: 23, animation: { frames: [0, 1, 2, 3], durations: [3, 6, 6, 8], loop: false }, onHitSpawn: { id: 'warFireImpact' }, hits: [{ from: 1, until: 3, damage: 5, hitstun: 17, push: 1, every: 6, count: 3, launch: { vx: 4, vy: 5 }, box: { offsetX: 55, offsetY: 54, width: 70, height: 54 } }] }),
  warChaosRise: effect(3, { renderScale: 2.3, attached: true, lifetime: 22, animation: { frames: [0, 1, 2, 3], durations: [3, 5, 6, 8], loop: false }, onHitSpawn: { id: 'warFireImpact' }, hits: [{ from: 1, until: 3, damage: 6, hitstun: 19, push: 1, every: 7, count: 2, heavy: true, launch: { vx: 3, vy: 8 }, box: { offsetX: 45, offsetY: 25, width: 80, height: 90 } }] }),
  warOlympus: effect(4, { animation: loop, renderScale: 1.8, velocityX: 28, lifetime: 120, destroyOnHit: true, onHitSpawn: { id: 'warIceImpact', scale: 2 }, hits: [{ from: 0, until: 3, damage: 26, hitstun: 28, heavy: true, launch: { vx: 8, vy: 7 }, box: { offsetX: 65, offsetY: 34, width: 60, height: 65 } }] }),
  warIceTrail: effect(4, { renderScale: 1.2, lifetime: 10, endWithMove: true }),
  warIceImpact: effect(0, { renderScale: 1.5, lifetime: 12 }, auxPage),
  warFireImpact: effect(1, { renderScale: 1.5, lifetime: 12 }, auxPage),
  warCharge: effect(3, { renderScale: 2.7, lifetime: 48, follow: 'owner', endWithMove: true }, auxPage),
  warAura: effect(3, { animation: { frames: [0, 1, 2, 3], durations: [8, 8, 8, 8], loop: true }, tag: 'warAura', renderScale: 2.6, lifetime: 900, follow: 'owner' }, auxPage),
});

const anim = (name, frames, durations, extra = {}) => { c.animations[name] = { frames, durations, loop: false, ...extra }; };
const box = (offsetX, offsetY, width, height) => ({ offsetX: offsetX + coordinatePad, offsetY, width, height });
const hit = (damage, bounds, extra = {}) => ({ from: 2, until: 2, damage, hitstun: 18, push: 4, box: bounds, ...extra });
const spawn = (at, id, offsetX = 0, offsetY = 0) => ({ at, effect: { id, offsetX, offsetY } });
const modeAnimations = {};
for (const [name, definition] of Object.entries(c.animations)) {
  if (['special1', 'special2', 'special3'].includes(name)) continue;
  const key = `war_${name}`, a = structuredClone(definition);
  a.frames = a.frames.map((f) => warFirst + f);
  for (const cancel of a.cancels ?? []) cancel.to = `war_${cancel.to}`;
  if (a.events) a.events = a.events.filter((e) => !e.effect).map((e) => e.sound ? { ...e, sound: 'warSwing' } : e);
  c.animations[key] = a; modeAnimations[name] = key;
}
// O botão de soco vira combo de machado; o chute também usa cortes de machado.
anim('war_punch', W(24, 25, 26, 27), [4, 4, 6, 8], { hits: [hit(7, box(220, 100, 160, 105))], events: [{ at: 8, sound: 'warSwing' }, spawn(8, 'warIceTrail', 150, 160)], cancels: [{ on: 'punch', to: 'war_punch2', after: 9 }, { on: 'kick', to: 'war_kick', after: 9 }] });
anim('war_punch2', W(28, 29, 30, 31), [4, 4, 6, 8], { hits: [hit(8, box(216, 90, 165, 120))], events: [{ at: 8, sound: 'warSwing' }, spawn(8, 'warIceTrail', 155, 165)], cancels: [{ on: 'punch', to: 'war_punch3', after: 9 }, { on: 'kick', to: 'war_kick2', after: 9 }] });
anim('war_punch3', W(32, 33, 34, 35), [5, 6, 8, 13], { hits: [hit(12, box(210, 150, 170, 145), { heavy: true, launch: { vx: 5, vy: 6 } })], events: [{ at: 11, sound: 'frost' }, spawn(11, 'warIceTrail', 160, 95)] });
anim('war_kick', W(32, 33, 34, 35), [5, 5, 7, 10], { hits: [hit(10, box(215, 155, 165, 138))], events: [{ at: 10, sound: 'warSwing' }], cancels: [{ on: 'kick', to: 'war_kick2', after: 11 }, { on: 'punch', to: 'war_punch3', after: 11 }] });
anim('war_kick2', W(36, 37, 38, 39), [5, 5, 8, 12], { hits: [hit(12, box(210, 225, 170, 72), { heavy: true, launch: { vx: 6, vy: 3 } })], events: [{ at: 10, sound: 'warSwing' }] });
for (const name of ['sweep', 'crouchKick', 'crouchPunch']) c.animations[`war_${name}`] = structuredClone(c.animations.war_kick2);
anim('war_uppercut', W(28, 29, 30, 31), [5, 5, 8, 13], { cooldown: 55, hits: [hit(13, box(210, 45, 170, 220), { heavy: true, launch: { vx: 4, vy: 8 } })], events: [{ at: 10, sound: 'warSwing' }] });
for (const [name, damage] of [['airPunch', 8], ['airKick', 10], ['airHeavy', 12]]) anim(`war_${name}`, W(9, 26, 34, 11), [4, 5, 6, 9], { air: true, hits: [hit(damage, box(210, 120, 170, 170), { from: 1, until: 2, heavy: name === 'airHeavy' })], events: [{ at: 4, sound: 'warSwing' }] });
anim('war_axeThrow', W(48, 49, 50, 51), [7, 6, 9, 15], { cooldown: 65, events: [{ at: 13, sound: 'axeThrow' }, spawn(13, 'warAxe', 140, 185)] });
anim('war_frostSlam', W(32, 33, 34, 35), [7, 7, 12, 15], { cooldown: 100, events: [{ at: 14, sound: 'frost' }, spawn(14, 'warFrost', 150, 0)] });
anim('war_chaosBlades', W(40, 41, 42, 43), [7, 6, 23, 13], { cooldown: 95, events: [{ at: 13, sound: 'chaos' }, spawn(13, 'warChaos', 100, 185)] });
anim('war_chaosAscension', W(40, 41, 42, 43), [6, 6, 22, 14], { cooldown: 100, events: [{ at: 12, sound: 'chaos' }, spawn(12, 'warChaosRise', 80, 185)] });
anim('war_olympus', W(44, 45, 46, 47), [12, 12, 14, 20], { cooldown: 600, perRound: 2, events: [spawn(1, 'warCharge', 0, 145), { at: 24, sound: 'olympus' }, spawn(24, 'warOlympus', 150, 170)] });
anim('war_throw', W(68, 69, 0), [4, 6, 18], { hits: [hit(10, box(192, 0, (c.hurtbox.width / 2 + 26 / c.spriteScale) * 1.6, baseline), { from: 1, until: 1, hitstun: 30, heavy: true, unblockable: true, throw: true, launch: { vx: 6, vy: 7 } })] });
Object.assign(modeAnimations, { special1: 'war_axeThrow', special2: 'war_chaosBlades', special3: 'war_olympus', universalThrow: 'war_throw' });
c.awakening = { mode: 'godOfWar', label: 'DEUS DA GUERRA', manualInput: '↓↓ + ESPECIAL', transform: 'godWarTransform', gauge: 900, onHit: 0, onAttackHit: 0, drain: 1, damageScale: 1.15, aura: 'warAura', auraOffsetY: 145 };
c.modes = { godOfWar: { animations: modeAnimations, buttons: { ground: { punch: 'war_punch', kick: 'war_kick', special: 'war_axeThrow' }, air: { punch: 'war_airPunch', kick: 'war_airKick', special: 'war_airHeavy' } } } };
anim('godWarTransform', [48, 49, ...W(52, 53, 54, 55)], [6, 6, 8, 8, 8, 8], { cooldown: 1200, perRound: 1, events: [{ at: 0, sound: 'warTransform' }, spawn(0, 'warCharge', 0, 150), { at: 42, awaken: true }] });

// A bola nasce no pé no instante exato de contato da animação do chute.
anim('footballShot', F(0, 1, 2, 3), [6, 6, 7, 13], { cooldown: 60, events: [spawn(1, 'footballCharge', 85, 30), { at: 12, sound: 'footballKick' }, spawn(12, 'footballBall', 90, 40)] });
anim('footballCurve', F(4, 5, 6, 7), [6, 6, 8, 14], { cooldown: 80, events: [spawn(1, 'footballCharge', 80, 30), { at: 12, sound: 'footballKick' }, spawn(12, 'footballCurve', 70, 60)] });
anim('footballBicycle', F(8, 9, 10, 11), [5, 4, 9, 16], { cooldown: 110, air: true, onLand: 'footballLand', events: [{ at: 0, vy: -14 }, { at: 9, sound: 'footballKick' }, spawn(9, 'footballBicycle', 65, 180)] });
anim('footballLand', [64, 65, 66, 67], [4, 4, 5, 5]);
anim('footballGoal', F(0, 1, 2, 3, 14, 15), [10, 12, 9, 10, 12, 16], { cooldown: 600, perRound: 2, events: [spawn(4, 'footballCharge', 85, 30), { at: 22, sound: 'footballGoal' }, spawn(22, 'footballGoal', 70, 50)] });
c.combos.push(
  { id: 'godWarTransform', input: '↓↓S', animation: 'godWarTransform' },
  { id: 'footballGoal', input: '↓→↓→K', animation: 'footballGoal' },
  { id: 'footballShotMotion', input: '↓→K', animation: 'footballShot' },
  { id: 'footballBicycle', input: '↓←K', animation: 'footballBicycle' },
  { id: 'footballShot', input: 'K', hold: '→', animation: 'footballShot' },
  { id: 'footballCurve', input: 'S', hold: '←', animation: 'footballCurve' },
  { id: 'war_olympus', input: '↓→S', animation: 'war_olympus', mode: 'godOfWar' },
  { id: 'war_chaosBlades', input: 'S', hold: '→', animation: 'war_chaosBlades', mode: 'godOfWar' },
  { id: 'war_chaosAscension', input: 'S', hold: '←', animation: 'war_chaosAscension', mode: 'godOfWar' },
  { id: 'war_frostSlam', input: 'S', hold: '↓', animation: 'war_frostSlam', mode: 'godOfWar' },
  { id: 'war_uppercut', input: 'P', hold: '→', animation: 'war_uppercut', mode: 'godOfWar' },
  { id: 'war_crouchPunch', input: 'P', hold: '↓', animation: 'war_crouchPunch', mode: 'godOfWar' },
  { id: 'war_sweep', input: 'K', hold: '↓', animation: 'war_sweep', mode: 'godOfWar' },
  { id: 'war_axeThrow', input: 'S', animation: 'war_axeThrow', mode: 'godOfWar' },
);
c.moveList.push(
  { section: 'Futebol', name: 'Chute de potência', input: 'K', hold: '→', note: 'Também: ↓→K. Bola com energia azul' },
  { section: 'Futebol', name: 'Chute com curva', input: 'S', hold: '←', note: 'Bola em arco com gravidade' },
  { section: 'Futebol', name: 'Bicicleta', input: '↓←K', note: 'Salto e chute acrobático com bola dourada' },
  { section: 'Futebol', name: 'Golaço', input: '↓→↓→K', note: 'Superchute de energia. Dois usos por round' },
  { section: 'Transformação', name: 'Deus da Guerra', input: '↓↓S', note: 'Uma vez por round. Dura 15 segundos; dano +15%' },
  { section: 'Deus da Guerra', name: 'Combo de machado', input: 'PPP', note: 'Somente transformado' },
  { section: 'Deus da Guerra', name: 'Machadada e rasteira', input: 'KK', note: 'Somente transformado' },
  { section: 'Deus da Guerra', name: 'Arremesso do Leviatã', input: 'S' },
  { section: 'Deus da Guerra', name: 'Impacto Glacial', input: 'S', hold: '↓' },
  { section: 'Deus da Guerra', name: 'Lâminas do Caos', input: 'S', hold: '→' },
  { section: 'Deus da Guerra', name: 'Ascensão do Caos', input: 'S', hold: '←' },
  { section: 'Deus da Guerra', name: 'Lâmina do Olimpo', input: '↓→S', note: 'Dois usos por round; recarga de 10 segundos' },
);
Object.assign(c.sounds, { footballKick: 'football-kick.wav', footballGoal: 'football-goal.wav', warSwing: 'war-swing.wav', axeThrow: 'axe-throw.wav', frost: 'frost.wav', chaos: 'chaos.wav', olympus: 'olympus.wav', warTransform: 'war-transform.wav' });
for (const [key, seconds, base, noiseMix] of [['footballKick', 0.16, 85, 0.7], ['footballGoal', 0.65, 420, 0.3], ['warSwing', 0.2, 180, 0.65], ['axeThrow', 0.35, 260, 0.45], ['frost', 0.4, 800, 0.65], ['chaos', 0.5, 135, 0.75], ['olympus', 0.7, 330, 0.2], ['warTransform', 0.8, 110, 0.4]]) {
  const rate = 22050, count = Math.round(rate * seconds), wav = Buffer.alloc(44 + count * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(count * 2, 40);
  let seed = 41;
  for (let i = 0; i < count; i += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const t = i / rate, p = i / count, env = Math.sin(Math.PI * p) * Math.exp(-p * 3);
    const tone = Math.sin(2 * Math.PI * base * t * (1 + p)) + 0.25 * Math.sin(2 * Math.PI * base * t * 2.73);
    const sample = (tone * (1 - noiseMix) + (seed / 0x80000000 - 1) * noiseMix) * env * 0.4;
    wav.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(sample * 32767))), 44 + i * 2);
  }
  await writeFile(new URL(c.sounds[key], output), wav);
}
c.description = 'Código, futebol e a fúria do Deus da Guerra.';
c.assetVersion = 'professor-web-war-v2';
await writeFile(configPath, `${JSON.stringify(c, null, 2)}\n`);
console.log(`Professor Web: ${c.atlas.length} poses, modo Deus da Guerra, futebol e ${Object.keys(c.effects).length} efeitos.`);
