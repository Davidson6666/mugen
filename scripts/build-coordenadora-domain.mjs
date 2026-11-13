import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const source = new URL('assets-src/coordenadora/', root);
const output = new URL('public/assets/characters/coordenadora/', root);
const path = new URL('coordenadora_config.json', output);
const c = JSON.parse(await readFile(path, 'utf8'));
c.atlas = c.atlas.slice(0, 72); c.sheets = c.sheets.slice(0, 4);
delete c.animations.domainTrial;
for (const key of Object.keys(c.effects)) if (key.startsWith('domain')) delete c.effects[key];
c.combos = c.combos.filter((combo) => combo.id !== 'domainTrial');
c.moveList = c.moveList.filter((move) => !['Passiva', 'Domínio'].includes(move.section));

const { data, info } = await sharp(fileURLToPath(new URL('domain-poses-source.png', source))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const labels = new Int32Array(info.width * info.height), queue = new Int32Array(labels.length), figures = new Map();
for (let start = 0; start < labels.length; start += 1) {
  if (labels[start] || data[start * 4 + 3] < 100) continue;
  const component = start + 1;
  let head = 0, tail = 1, left = info.width, top = info.height, right = 0, bottom = 0;
  queue[0] = start; labels[start] = component;
  while (head < tail) {
    const at = queue[head++], x = at % info.width, y = Math.floor(at / info.width);
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
    for (const next of [x ? at - 1 : -1, x < info.width - 1 ? at + 1 : -1, at - info.width, at + info.width]) {
      if (next < 0 || next >= labels.length || labels[next] || data[next * 4 + 3] < 100) continue;
      labels[next] = component; queue[tail++] = next;
    }
  }
  if (tail < 1000) continue;
  const col = Math.min(3, Math.floor((left + right) / 2 / (info.width / 4))), row = Math.min(3, Math.floor((top + bottom) / 2 / (info.height / 4)));
  const index = row * 4 + col;
  if ((figures.get(index)?.area ?? 0) < tail) figures.set(index, { left, top, right, bottom, component, area: tail });
}
if (figures.size !== 16) throw new Error(`Domínio: esperava 16 poses, encontrei ${figures.size}`);
const factor = 240 / (figures.get(0).bottom - figures.get(0).top + 1);
const page = c.sheets.length, first = c.atlas.length, layers = [];
const { frameWidth: fw, frameHeight: fh, baseline } = c.spriteGridSize;
for (let i = 0; i < 16; i += 1) {
  const f = figures.get(i), left = Math.max(0, f.left - 2), top = Math.max(0, f.top - 2);
  const width = Math.min(info.width, f.right + 3) - left, height = Math.min(info.height, f.bottom + 3) - top;
  const crop = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const at = (top + y) * info.width + left + x;
    if (labels[at] === f.component) data.copy(crop, (y * width + x) * 4, at * 4, at * 4 + 4);
  }
  for (let at = 3; at < crop.length; at += 4) if (crop[at] > 224) crop[at] = 255;
  const w = Math.round(width * factor), h = Math.round(height * factor);
  const dx = fw / 2 + Math.round((left - (i % 4 + 0.5) * info.width / 4) * factor), dy = baseline - h;
  if (dx < 0 || dy < 0 || dx + w > fw || dy + h > fh) throw new Error(`Domínio: pose ${i} fora da célula`);
  const png = await sharp(crop, { raw: { width, height, channels: 4 } }).resize(w, h, { kernel: 'nearest' }).png().toBuffer();
  const x = i % 4 * fw + dx, y = Math.floor(i / 4) * fh + dy;
  layers.push({ input: png, left: x, top: y }); c.atlas.push([page, x, y, w, h, dx, dy]);
}
await sharp({ create: { width: fw * 4, height: fh * 4, channels: 4, background: '#00000000' } }).composite(layers).webp({ lossless: true }).toFile(fileURLToPath(new URL('coordenadora_domain-poses.webp', output)));
c.sheets.push('coordenadora_domain-poses.webp');
const courtPage = c.sheets.length;
await sharp(fileURLToPath(new URL('domain-court-source.png', source))).resize(1024, 576, { fit: 'fill', kernel: 'nearest' }).webp({ lossless: true }).toFile(fileURLToPath(new URL('coordenadora_domain-court.webp', output)));
c.sheets.push('coordenadora_domain-court.webp');

// Textos exatos de advertência e expulsão; a arte do tribunal é independente.
const fxPage = c.sheets.length;
const titles = ['TRIBUNAL', '1ª ADVERTÊNCIA', '2ª ADVERTÊNCIA', 'ADVERTIDO', 'EXPULSO'];
let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="480">';
for (let row = 0; row < 5; row += 1) for (let frame = 0; frame < 4; frame += 1) {
  const color = row === 4 ? '#ff586b' : row === 0 ? '#d3a8ff' : '#ffdd86';
  const size = row === 4 ? 32 : row === 0 ? 30 : 23;
  svg += `<g transform="translate(${frame * 256} ${row * 96})"><g transform="rotate(${[-4, -2, 0, 0][frame]} 128 48)"><path d="M14 14H242V82H14Z" fill="#171126" fill-opacity=".92" stroke="${color}" stroke-width="4"/><path d="M24 23H232M24 73H232" stroke="${color}" stroke-width="2"/><text x="128" y="58" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="${size}" fill="${color}">${titles[row]}</text></g></g>`;
}
svg += '</svg>';
await sharp(Buffer.from(svg)).webp({ lossless: true }).toFile(fileURLToPath(new URL('coordenadora_domain-fx.webp', output)));
c.sheets.push('coordenadora_domain-fx.webp');
const effect = (row, extra = {}) => ({ spriteGridSize: { frameWidth: 256, frameHeight: 96, baseline: 48 }, atlas: Array.from({ length: 4 }, (_, i) => [fxPage, i * 256, row * 96, 256, 96, 0, 0]), animation: { frames: [0, 1, 2, 3], durations: [4, 4, 4, 8], loop: false }, ...extra });
const hit = (damage, extra = {}) => ({ from: 0, until: 3, damage, hitstun: 10, push: 0, box: { offsetX: 0, offsetY: 0, width: 256, height: 96 }, ...extra });
Object.assign(c.effects, {
  domainCourt: { spriteGridSize: { frameWidth: 1024, frameHeight: 576, baseline: 288 }, atlas: [[courtPage, 0, 0, 1024, 576, 0, 0]], animation: { frames: [0], durations: [132], loop: false }, cover: [1280, 720], layer: 'back', lifetime: 132, endOnOwnerHit: true },
  domainOpening: effect(0, { renderScale: 1.5, lifetime: 26, endWithMove: true }),
  domainWarning1: effect(1, { renderScale: 1.4, lifetime: 20, guaranteed: true, hits: [hit(6, { nonLethal: true })] }),
  domainWarning2: effect(2, { renderScale: 1.4, lifetime: 20, guaranteed: true, hits: [hit(6, { nonLethal: true })] }),
  domainWarningFinal: effect(3, { renderScale: 1.5, lifetime: 32, guaranteed: true, hits: [hit(12, { hitstun: 20, push: 5, heavy: true })] }),
  domainExpulsion: effect(4, { renderScale: 1.8, lifetime: 55, guaranteed: true, hits: [hit(0, { instantKill: true, expel: true, heavy: true })] }),
});
const spawn = (at, id, target, offsetY) => ({ at, effect: { id, target, offsetY } });
c.animations.domainTrial = {
  frames: Array.from({ length: 16 }, (_, i) => first + i),
  durations: [5, 5, 5, 9, 8, 8, 8, 8, 10, 10, 12, 8, 8, 10, 12, 18],
  loop: false, cooldown: 900, perRound: 1, invulnerable: [24, 143],
  events: [
    { at: 0, sound: 'domainOpen' }, spawn(0, 'domainOpening', 'stage', 410),
    { at: 24, standAt: -300, pinOpponent: { dx: 300, ticks: 120, disableActions: true, releaseOnInterrupt: true } },
    spawn(24, 'domainCourt', 'stage', 208),
    { at: 40, sound: 'gavel' },
    spawn(52, 'domainWarning1', 'opponent', 290), { at: 52, sound: 'gavel' },
    spawn(78, 'domainWarning2', 'opponent', 290), { at: 78, sound: 'gavel' },
    { at: 112, verdict: { threshold: 0.3, expel: 'domainExpulsion', warning: 'domainWarningFinal', offsetY: 290, expelSound: 'expulsion', warningSound: 'verdict' } },
  ],
};
c.damagePassive = { label: 'RIGOR', minScale: 0.6, maxScale: 1.8, fullAt: 0.8 };
c.combos.push({ id: 'domainTrial', input: '↓↓S', animation: 'domainTrial' });
c.moveList.push(
  { section: 'Passiva', name: 'Rigor Crescente', input: '', note: 'Dano começa em 60% e sobe até 180% ao receber 80 de dano. Reinicia por round' },
  { section: 'Domínio', name: 'Expansão: Tribunal da Coordenação', input: '↓↓S', note: 'Uma tentativa por round. Duas advertências; expulsa por K.O. se o alvo estiver com até 30% de vida no veredito' },
);
Object.assign(c.sounds, { domainOpen: 'domain-open.wav', gavel: 'gavel.wav', verdict: 'verdict.wav', expulsion: 'expulsion.wav' });
for (const [key, seconds, frequency] of [['domainOpen', 0.8, 110], ['gavel', 0.2, 80], ['verdict', 0.5, 330], ['expulsion', 0.7, 165]]) {
  const rate = 22050, count = Math.round(rate * seconds), wav = Buffer.alloc(44 + count * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(count * 2, 40);
  let seed = 37;
  for (let i = 0; i < count; i += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const t = i / rate, p = i / count;
    const envelope = key === 'gavel' ? Math.exp(-p * 9) : Math.sin(Math.PI * p) * Math.exp(-p * 2);
    const tone = Math.sin(2 * Math.PI * frequency * t * (1 + p * 0.3));
    const noise = seed / 0x80000000 - 1;
    const value = (tone * 0.65 + noise * 0.35) * envelope * 0.4;
    wav.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(value * 32767))), 44 + i * 2);
  }
  await writeFile(new URL(c.sounds[key], output), wav);
}
c.description = 'Rigor Crescente e o Tribunal da Coordenação. O veredito é final.';
c.assetVersion = 'coordenadora-domain-v2';
await writeFile(path, `${JSON.stringify(c, null, 2)}\n`);
console.log(`Coordenadora: ${c.atlas.length} poses, domínio de julgamento e passiva de dano.`);
