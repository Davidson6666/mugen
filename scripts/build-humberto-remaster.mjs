import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// ImageGen desenha as poses. Este script apenas extrai, alinha e empacota os
// pixels; a escala da luta, as caixas, os eventos e os tempos de ataque ficam
// no config existente. Pode ser executado novamente sem acumular páginas.
const root = new URL('../', import.meta.url);
const source = new URL('assets-src/humberto/remaster/', root);
const output = new URL('public/assets/characters/humberto/', root);
const configPath = new URL('humberto_config.json', output);
const config = JSON.parse(await readFile(configPath, 'utf8'));
const grid = { frameWidth: 320, frameHeight: 350, baseline: 330 };
const names = ['movement', 'combat', 'reactions', 'specials'];
const normalPages = [0, 4, 6, 8];
const legendaryPages = [1, 10, 11, 12];
const sheets = [
  'humberto_movement.png', 'humberto_legendary_movement.png',
  'chemistry_fx.png', 'legendary_fx.png', 'humberto_combat.png',
  'judgement_fx.svg', 'humberto_reactions.png', 'fireball_fx.png',
  'humberto_specials.png', 'combat_fx_v2.png', 'humberto_legendary_combat.png',
  'humberto_legendary_reactions.png', 'humberto_legendary_specials.png',
];
const atlas = [];
const extracted = [];

// As poses podem passar alguns pixels da grade original. Componentes conexos
// mantêm pés, cabelos, espadas e corpos deitados inteiros, sem recorte por célula.
function silhouettes(data, width, height) {
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(seen.length);
  const figures = new Map();
  for (let start = 0; start < seen.length; start += 1) {
    if (seen[start] || data[start * 4 + 3] < 96) continue;
    let head = 0, tail = 1, left = width, top = height, right = 0, bottom = 0;
    seen[start] = 1;
    queue[0] = start;
    while (head < tail) {
      const at = queue[head++], x = at % width, y = Math.floor(at / width);
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
      for (const next of [x ? at - 1 : -1, x < width - 1 ? at + 1 : -1, at - width, at + width]) {
        if (next < 0 || next >= seen.length || seen[next] || data[next * 4 + 3] < 96) continue;
        seen[next] = 1; queue[tail++] = next;
      }
    }
    if (tail < 1000) continue;
    const col = Math.min(3, Math.floor((left + right) / 2 / (width / 4)));
    const row = Math.min(5, Math.floor((top + bottom) / 2 / (height / 6)));
    const index = row * 4 + col;
    if (figures.has(index)) throw new Error(`Duas figuras na célula ${index}`);
    figures.set(index, { left, top, right, bottom });
  }
  if (figures.size !== 24) throw new Error(`Esperava 24 poses, encontrei ${figures.size}: ${[...figures.keys()]}`);
  return Array.from({ length: 24 }, (_, index) => figures.get(index));
}

// Escala medida do rosto ao solado, ignorando o cabelo verde mais alto. Assim,
// a transformação conserva o tamanho do corpo e só acrescenta as mechas.
function bodyScale(data, width, figure) {
  const { left, top, right, bottom } = figure;
  let faceTop = bottom;
  for (let y = top; y <= bottom; y += 1) {
    let skin = 0;
    for (let x = left; x <= right; x += 1) {
      const at = (y * width + x) * 4;
      const [r, g, b, a] = data.subarray(at, at + 4);
      if (a > 160 && r > 170 && g > 110 && b > 75 && r - g > 18 && r - b > 35 && g > b * 1.03) skin += 1;
    }
    if (skin >= 8) { faceTop = y; break; }
  }
  if (faceTop === bottom) throw new Error('Não encontrei o rosto para calibrar a escala');
  return 220 / (bottom - faceTop + 1);
}

for (const legendary of [false, true]) {
  for (const [kind, name] of names.entries()) {
    const filename = `${legendary ? 'legendary-' : ''}${name}-source.png`;
    const { data, info } = await sharp(fileURLToPath(new URL(filename, source))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const figures = silhouettes(data, info.width, info.height);
    const factor = bodyScale(data, info.width, figures[0]);
    const page = (legendary ? legendaryPages : normalPages)[kind];
    const layers = [];
    for (let index = 0; index < figures.length; index += 1) {
      const fig = figures[index];
      const left = Math.max(0, fig.left - 2), top = Math.max(0, fig.top - 2);
      const width = Math.min(info.width, fig.right + 3) - left;
      const height = Math.min(info.height, fig.bottom + 3) - top;
      const w = Math.round(width * factor), h = Math.round(height * factor);
      const pixels = await sharp(data, { raw: info }).extract({ left, top, width, height }).resize(w, h, { kernel: 'nearest' }).raw().toBuffer();
      for (let at = 0; at < pixels.length; at += 4) {
        if (pixels[at + 3] < 32) pixels.fill(0, at, at + 4);
        else if (pixels[at + 3] > 224) pixels[at + 3] = 255;
      }
      const dx = Math.round((grid.frameWidth - w) / 2), dy = grid.baseline - h;
      if (dx < 2 || dy < 2 || dx + w > grid.frameWidth - 2) throw new Error(`Pose fora da célula: ${filename}/${index} (${w}x${h})`);
      const png = await sharp(pixels, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
      const x = index % 4 * grid.frameWidth + dx, y = Math.floor(index / 4) * grid.frameHeight + dy;
      layers.push({ input: png, left: x, top: y });
      atlas.push([page, x, y, w, h, dx, dy]);
      extracted.push({ png, w, h });
    }
    await sharp({ create: { width: grid.frameWidth * 4, height: grid.frameHeight * 6, channels: 4, background: '#00000000' } })
      .composite(layers).png().toFile(fileURLToPath(new URL(sheets[page], output)));
    console.log(`${filename}: 24 poses, escala ${factor.toFixed(3)}`);
  }
}

const pose = (sheet, indices) => indices.map(index => names.indexOf(sheet) * 24 + index);
const visuals = {
  idle: pose('movement', [0, 1, 2, 3]),
  walkForward: pose('movement', [4, 5, 6, 7]),
  walkBackward: pose('movement', [7, 6, 5, 4]),
  jump: pose('movement', [9, 10]), jumpStart: pose('movement', [8, 9]),
  jumpUp: pose('movement', [10]), falling: pose('movement', [11]),
  land: pose('movement', [8, 0]), turn: pose('movement', [20, 21]),
  crouch: pose('movement', [17]), blockStanding: pose('movement', [18]),
  blockCrouching: pose('movement', [19]),
  hitReaction: pose('reactions', [4]), hitCrouching: pose('reactions', [6, 6]),
  hitAir: pose('reactions', [7, 7]), launched: pose('movement', [22, 23]),
  knockdown: pose('reactions', [11]), getUp: pose('reactions', [12, 13, 14, 15]),
  ko: pose('reactions', [9, 11]), victoryPose: pose('reactions', [16, 17, 19]),
  defeatPose: pose('reactions', [11]),
  // O quadro de extensão acompanha os índices de acerto já existentes.
  punch: pose('combat', [1, 2, 2, 3]), punch2: pose('combat', [4, 6, 6, 7]),
  punch3: pose('combat', [5, 6, 6, 7]), kick: pose('combat', [9, 10, 11, 8]),
  kick2: pose('combat', [8, 9, 10, 10, 11]), sweep: pose('combat', [12, 14, 15]),
  uppercut: pose('combat', [16, 18, 18, 19]),
  dashForward: pose('movement', [12, 13, 14]), dashBackward: pose('movement', [15, 14, 12]),
  neutralize: pose('specials', [20, 21, 23]),
  neutralizeHit: pose('specials', [20, 22, 22, 23]),
  sixSeven: pose('reactions', [23, 20, 20, 21, 21, 22]),
  ionicPalm: pose('combat', [20, 22, 22, 23]),
  special1: pose('reactions', [0, 1, 2, 3]),
  special2: pose('specials', [20, 22, 22, 23]),
  kiBlast: pose('combat', [20, 22, 22, 23]),
  medusa: pose('specials', [12, 14, 14, 15]),
  legendaryTransform: pose('specials', [16, 18, 19]),
  judgementCutEnd: pose('specials', [0, 1, 2, 3, 4, 5, 6, 7]),
  greatFireball: pose('specials', [8, 9, 10, 11]),
  cannon: pose('combat', [20, 22, 22, 23]),
};

const smooth = new Set(['idle', 'walkForward', 'walkBackward', 'getUp']);
for (const [name, animation] of Object.entries(config.animations)) {
  const legendary = name.startsWith('legend_');
  const base = legendary ? name.slice(7) : name;
  let frames = visuals[base];
  if (!frames) throw new Error(`Falta direção visual para ${name}`);
  if (smooth.has(base)) {
    const total = animation.durations.reduce((sum, value) => sum + value, 0);
    animation.durations = frames.map((_, index) => Math.floor(total / frames.length) + (index < total % frames.length ? 1 : 0));
  } else if (frames.length !== animation.frames.length) {
    // Algumas animações lendárias tinham três quadros em vez de quatro.
    // Mantém o impacto no segundo quadro e soma nenhuma duração nova.
    if (animation.frames.length !== 3 || frames.length !== 4) throw new Error(`Cadência inesperada: ${name}`);
    frames = [frames[0], frames[1], frames[3]];
  }
  animation.frames = frames.map(frame => frame + (legendary ? 96 : 0));
}

config.assetVersion = 'humberto-photo-remaster-v8';
config.sheets = sheets;
config.atlas = atlas;
config.spriteGridSize = grid;
config.textureScaleMode = 'nearest';
// Supers compartilhados continuam com a mesma identidade, recarga e limite
// por round. Só sua textura muda enquanto o modo lendário estiver ativo.
config.modes.legendary.frameMap = Array.from({ length: 96 }, (_, frame) => frame + 96);
await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);

// Retrato derivado do mesmo rosto do personagem em pose de vitória.
const portrait = extracted[48 + 16];
await sharp(portrait.png).extract({ left: Math.round(portrait.w * 0.12), top: 0, width: Math.round(portrait.w * 0.76), height: Math.round(portrait.h * 0.48) })
  .resize(96, 112, { fit: 'contain', position: 'top', background: '#00000000', kernel: 'nearest' })
  .png().toFile(fileURLToPath(new URL('humberto_portrait.png', output)));
console.log(`Humberto: ${atlas.length} poses; ${Object.keys(config.animations).length} animações. Física e efeitos preservados.`);
