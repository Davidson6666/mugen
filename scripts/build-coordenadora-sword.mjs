import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Executado depois do pacote base e do domínio. Mantém o ID das partidas salvas.
const root = new URL('../', import.meta.url);
const output = new URL('public/assets/characters/coordenadora/', root);
const configPath = new URL('coordenadora_config.json', output);
const c = JSON.parse(await readFile(configPath, 'utf8'));
if (c.animations.executionerSword) throw new Error('Reconstrua pelo comando npm run assets:coordenadora');

// Mais espaço transparente permite a espada inteira sem aumentar o corpo ou
// mudar a posição física, o alcance dos golpes antigos e a caixa de vulnerabilidade.
const paddingX = 192, paddingY = 192;
c.spriteGridSize = { frameWidth: 768, frameHeight: 512, baseline: 492 };
for (const frame of c.atlas) { frame[5] += paddingX; frame[6] += paddingY; }
const translate = (box) => { box.offsetX += paddingX; box.offsetY += paddingY; };
translate(c.hurtbox); translate(c.hitbox);
for (const animation of Object.values(c.animations)) {
  for (const hit of animation.hits ?? []) translate(hit.box);
}

const { data, info } = await sharp(fileURLToPath(new URL('assets-src/coordenadora/executioner-source.png', root))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const labels = new Int32Array(info.width * info.height), queue = new Int32Array(labels.length), figures = new Map();
for (let start = 0; start < labels.length; start += 1) {
  if (labels[start] || data[start * 4 + 3] < 100) continue;
  const component = start + 1;
  let head = 0, tail = 1, left = info.width, top = info.height, right = 0, bottom = 0;
  let pantsX = 0, pantsCount = 0;
  queue[0] = start; labels[start] = component;
  while (head < tail) {
    const at = queue[head++], x = at % info.width, y = Math.floor(at / info.width), p = at * 4;
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
    // A calça rosa dá o eixo do corpo; o centro da espada varia muito no corte.
    if (data[p] > data[p + 1] * 1.12 && data[p + 2] > data[p + 1] * 1.05 && data[p] > 75 && data[p + 1] > 45) { pantsX += x; pantsCount += 1; }
    for (const next of [x ? at - 1 : -1, x < info.width - 1 ? at + 1 : -1, at - info.width, at + info.width]) {
      if (next < 0 || next >= labels.length || labels[next] || data[next * 4 + 3] < 100) continue;
      labels[next] = component; queue[tail++] = next;
    }
  }
  if (tail < 3000) continue;
  const col = Math.min(3, Math.floor((left + right) / 2 / (info.width / 4)));
  const row = Math.min(2, Math.floor((top + bottom) / 2 / (info.height / 3)));
  const index = row * 4 + col;
  if ((figures.get(index)?.area ?? 0) < tail) figures.set(index, { left, top, right, bottom, component, area: tail, pivot: pantsX / pantsCount });
}
if (figures.size !== 12) throw new Error(`Espada: esperava 12 poses, encontrei ${figures.size}`);
const page = c.sheets.length, first = c.atlas.length, layers = [];
const { frameWidth: fw, frameHeight: fh, baseline } = c.spriteGridSize;
for (let i = 0; i < 12; i += 1) {
  const f = figures.get(i), left = Math.max(0, f.left - 2), top = Math.max(0, f.top - 2);
  const width = Math.min(info.width, f.right + 3) - left, height = Math.min(info.height, f.bottom + 3) - top;
  const crop = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const at = (top + y) * info.width + left + x;
    if (labels[at] === f.component) data.copy(crop, (y * width + x) * 4, at * 4, at * 4 + 4);
  }
  for (let at = 3; at < crop.length; at += 4) if (crop[at] > 224) crop[at] = 255;
  // O último grupo da arte tem o corpo um pouco maior. Compensa no empacotamento.
  const scale = i < 8 ? 240 / 251 : 240 / 268;
  const w = Math.round(width * scale), h = Math.round(height * scale);
  const dx = Math.round(fw / 2 + (left - f.pivot) * scale), dy = baseline - h;
  if (dx < 0 || dy < 0 || dx + w > fw || dy + h > fh) throw new Error(`Espada: pose ${i} fora da célula`);
  const png = await sharp(crop, { raw: { width, height, channels: 4 } }).resize(w, h, { kernel: 'nearest' }).png().toBuffer();
  const x = i % 4 * fw + dx, y = Math.floor(i / 4) * fh + dy;
  layers.push({ input: png, left: x, top: y }); c.atlas.push([page, x, y, w, h, dx, dy]);
}
await sharp({ create: { width: fw * 4, height: fh * 3, channels: 4, background: '#00000000' } }).composite(layers).webp({ lossless: true }).toFile(fileURLToPath(new URL('flavia_executioner.webp', output)));
c.sheets.push('flavia_executioner.webp');

// Rastros decorativos: o dano é somente da lâmina, uma vez por execução.
const fxPage = c.sheets.length, fxWidth = 600, fxHeight = 384;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${fxWidth * 4}" height="${fxHeight * 2}">`;
for (let frame = 0; frame < 4; frame += 1) {
  const opacity = [0.45, 0.8, 0.6, 0.2][frame];
  svg += `<g transform="translate(${frame * fxWidth} 0)" fill="none"><circle cx="300" cy="192" r="${25 + frame * 6}" stroke="#ffed35" stroke-width="5" opacity="${opacity}"/><path d="M300 142V166M300 218V242M250 192H274M326 192H350" stroke="#fffed1" stroke-width="5" opacity="${opacity}"/></g>`;
  svg += `<g transform="translate(${frame * fxWidth} ${fxHeight})" fill="none" opacity="${opacity}"><path d="M270 55Q570 35 586 180Q536 318 275 328Q470 269 525 180Q470 99 270 55Z" fill="#ffed35" fill-opacity=".24" stroke="#fff15c" stroke-width="5"/><path d="M310 74Q535 68 559 180Q503 286 312 312" stroke="#fffed1" stroke-width="9"/><path d="M386 175H584" stroke="#fffbea" stroke-width="4"/></g>`;
}
svg += '</svg>';
await sharp(Buffer.from(svg)).webp({ lossless: true }).toFile(fileURLToPath(new URL('flavia_sword-fx.webp', output)));
c.sheets.push('flavia_sword-fx.webp');
const effect = (row, durations) => ({
  spriteGridSize: { frameWidth: fxWidth, frameHeight: fxHeight, baseline: row === 0 ? fxHeight / 2 : 352 },
  atlas: Array.from({ length: 4 }, (_, i) => [fxPage, i * fxWidth, row * fxHeight, fxWidth, fxHeight, 0, 0]),
  animation: { frames: [0, 1, 2, 3], durations, loop: false }, follow: 'owner', endWithMove: true,
});
c.effects.swordSummon = effect(0, [4, 4, 4, 5]);
c.effects.swordTrail = effect(1, [3, 3, 3, 4]);
c.animations.executionerSword = {
  frames: Array.from({ length: 12 }, (_, i) => first + i),
  durations: [4, 4, 5, 6, 7, 3, 4, 5, 5, 5, 4, 6], loop: false, cooldown: 180,
  hits: [{ from: 5, until: 7, damage: 24, hitstun: 24, push: 6, heavy: true, launch: { vx: 7, vy: 5 }, box: { offsetX: fw / 2 + 24, offsetY: baseline - 222, width: 318, height: 200 } }],
  events: [
    { at: 0, sound: 'swordDraw' },
    { at: 4, effect: { id: 'swordSummon', offsetX: 30, offsetY: 160 } },
    { at: 26, sound: 'swordSlash' },
    { at: 26, effect: { id: 'swordTrail' } },
  ],
};
c.combos.push({ id: 'executionerSword', input: '↓←S', animation: 'executionerSword' });
c.moveList.push({ section: 'Especiais', name: 'Espada do Carrasco', input: '↓←S', note: 'Lâmina de luz gigante: corte pesado de médio alcance que derruba. Pode ser defendido; recarga de 3 s' });

for (const [key, seconds, frequency] of [['swordDraw', 0.44, 440], ['swordSlash', 0.3, 100]]) {
  c.sounds[key] = key === 'swordDraw' ? 'sword-draw.wav' : 'sword-slash.wav';
  const rate = 22050, count = Math.round(rate * seconds), wav = Buffer.alloc(44 + count * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(count * 2, 40);
  let seed = 67;
  for (let i = 0; i < count; i += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const t = i / rate, p = i / count, noise = seed / 0x80000000 - 1;
    const tone = Math.sin(2 * Math.PI * frequency * t * (1 + p * 1.6));
    const envelope = Math.sin(Math.PI * p) * Math.exp(-p * (key === 'swordSlash' ? 4 : 1.6));
    const sample = (key === 'swordSlash' ? noise * 0.7 + tone * 0.3 : tone * 0.85 + noise * 0.15) * envelope * 0.5;
    wav.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }
  await writeFile(new URL(c.sounds[key], output), wav);
}
c.name = 'Flavia';
c.description = 'Coordenadora: Rigor Crescente, Tribunal da Coordenação e a Espada do Carrasco.';
c.assetVersion = 'flavia-higuruma-v2';
await writeFile(configPath, `${JSON.stringify(c, null, 2)}\n`);
console.log(`Flavia: ${c.atlas.length} poses, Espada do Carrasco e efeitos de luz.`);
