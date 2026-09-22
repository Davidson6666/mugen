// Importa o Itachi a partir da folha original (assets-src/itachi/itachi_source.jpg)
// e gera o sprite sheet em grade, o retrato e o character config que o motor le.
//
// A folha original e uma colagem: sprites de tamanhos diferentes, soltos sobre
// fundo branco, em JPG. O script remove o fundo, recorta cada frame, corrige a
// escala entre as fileiras, alinha todos pelo mesmo eixo do corpo e remonta
// numa grade uniforme. Rodar de novo sempre que a arte de origem mudar:
//   node scripts/import-itachi.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = 'assets-src/itachi/itachi_source.jpg';
const OUT_DIR = 'public/assets/characters/itachi';
const TEMPLATE = 'public/assets/characters/dummy/dummy_config.json';

/* ------------------------------------------------------ mapa da folha --- */

// Retangulos [x0, y0, x1, y1] (inclusivos) de cada sprite na folha original,
// e a fileira de onde ele vem. Levantados com uma folha de conferencia
// numerada; os nomes dizem a pose, nao a animacao, porque um frame pode servir
// a mais de uma.
const SPRITES = {
  handSeal1: { rect: [579, 5, 634, 104], row: 'A' },
  handSeal2: { rect: [653, 5, 698, 104], row: 'A' },
  idle1: { rect: [21, 72, 65, 181], row: 'B' },
  idle2: { rect: [84, 72, 129, 181], row: 'B' },
  idle3: { rect: [142, 72, 187, 180], row: 'B' },
  idle4: { rect: [198, 72, 240, 180], row: 'B' },
  idle5: { rect: [251, 72, 294, 180], row: 'B' },
  crouch: { rect: [305, 111, 356, 180], row: 'B' },
  crouchGuard: { rect: [606, 112, 673, 181], row: 'B' },
  kneel1: { rect: [684, 111, 751, 181], row: 'B' },
  kneel2: { rect: [762, 113, 826, 182], row: 'B' },
  walk1: { rect: [8, 189, 64, 279], row: 'C' },
  walk2: { rect: [78, 189, 127, 279], row: 'C' },
  walk3: { rect: [141, 189, 193, 279], row: 'C' },
  walk4: { rect: [204, 189, 252, 279], row: 'C' },
  walk5: { rect: [267, 189, 322, 277], row: 'C' },
  hurt: { rect: [341, 189, 399, 277], row: 'C' },
  lungePrep: { rect: [562, 193, 620, 277], row: 'C' },
  airTuck: { rect: [684, 193, 749, 277], row: 'C' },
  throwWindup: { rect: [134, 287, 196, 389], row: 'D' },
  throwRelease: { rect: [204, 287, 272, 390], row: 'D' },
  throwRecover: { rect: [282, 287, 330, 389], row: 'D' },
  knee: { rect: [423, 285, 496, 393], row: 'D' },
  kneeRaise: { rect: [511, 289, 567, 391], row: 'D' },
  lunge: { rect: [646, 290, 713, 388], row: 'D' },
  castFlare: { rect: [729, 289, 794, 388], row: 'D' },
  taunt1: { rect: [206, 408, 252, 511], row: 'E' },
  taunt2: { rect: [260, 407, 309, 511], row: 'E' },
  taunt3: { rect: [310, 407, 353, 511], row: 'E' },
  point: { rect: [363, 407, 415, 511], row: 'E' },
  crowBurst: { rect: [422, 406, 502, 511], row: 'E' },
  crowDissolve: { rect: [509, 406, 585, 498], row: 'E' },
  jumpKnee: { rect: [602, 407, 650, 507], row: 'E' },
  jumpKick: { rect: [662, 406, 724, 509], row: 'E' },
  flyingKick: { rect: [734, 406, 811, 508], row: 'E' },
};

const PORTRAIT = [11, 5, 60, 60];

// A colagem juntou fileiras de fontes diferentes, e elas nao estao na mesma
// escala: sem corrigir, o Itachi encolhe ao comecar a andar. Fatores tirados
// da largura da cabeca e da altura em pe de cada fileira.
const ROW_SCALE = { A: 1.05, B: 0.95, C: 1.1, D: 1.03, E: 1.01 };

/* ------------------------------------------------------- animacoes ------ */

// Duracao total de cada animacao igual a do config base (frames / speed), para
// o ritmo de combate continuar o mesmo que o resto do elenco usa.
const ANIMATIONS = {
  idle: { frames: ['idle1', 'idle2', 'idle3', 'idle4', 'idle5', 'idle4', 'idle3', 'idle2'], speed: 0.1, loop: true },
  walkForward: { frames: ['walk1', 'walk2', 'walk3', 'walk4', 'walk5'], speed: 0.12, loop: true },
  walkBackward: { frames: ['walk5', 'walk4', 'walk3', 'walk2', 'walk1'], speed: 0.12, loop: true },
  jump: { frames: ['jumpKnee', 'airTuck'], speed: 0.075, loop: false },
  crouch: { frames: ['crouch'], speed: 0.1, loop: true },
  blockStanding: { frames: ['handSeal1'], speed: 0.08, loop: true },
  blockCrouching: { frames: ['crouchGuard'], speed: 0.08, loop: true },
  punch: { frames: ['throwWindup', 'throwRelease', 'throwRelease', 'throwRecover'], speed: 0.1, loop: false, hitboxFrame: 1 },
  kick: { frames: ['kneeRaise', 'knee', 'knee', 'kneeRaise'], speed: 0.1, loop: false, hitboxFrame: 1 },
  special1: { frames: ['handSeal1', 'handSeal2', 'castFlare', 'point', 'point', 'point', 'throwRecover'], speed: 0.13, loop: false, hitboxFrame: 3 },
  special2: { frames: ['lungePrep', 'lunge', 'lunge', 'lunge', 'lungePrep'], speed: 0.094, loop: false, hitboxFrame: 1 },
  special3: { frames: ['crouch', 'jumpKnee', 'jumpKick', 'flyingKick', 'flyingKick', 'airTuck'], speed: 0.113, loop: false, hitboxFrame: 3 },
  hitReaction: { frames: ['hurt', 'hurt', 'hurt'], speed: 0.2, loop: false },
  ko: { frames: ['hurt', 'crowBurst', 'crowDissolve', 'crowDissolve', 'crowDissolve'], speed: 0.1, loop: false },
  victoryPose: { frames: ['taunt1', 'taunt2', 'taunt3'], speed: 0.1, loop: false },
  defeatPose: { frames: ['kneel1', 'kneel2', 'kneel2'], speed: 0.1, loop: false },
};

const GRID_COLS = 8;
const HURTBOX_WIDTH = 32;
const HURTBOX_HEIGHT = 100;
// A hitbox precisa passar da borda da hurtbox do oponente quando os corpos
// estao encostados; senao o golpe nunca conecta.
const MIN_REACH = HURTBOX_WIDTH + 8;

/* ---------------------------------------------------- remocao de fundo --- */

function loadSource() {
  const { width, height, data } = jpeg.decode(readFileSync(resolve(ROOT, SOURCE)), { useTArray: true });
  const rgba = new Float32Array(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    rgba[i * 4] = data[i * 4];
    rgba[i * 4 + 1] = data[i * 4 + 1];
    rgba[i * 4 + 2] = data[i * 4 + 2];
    rgba[i * 4 + 3] = 255;
  }
  return { width, height, rgba };
}

function channelStats(rgba, i) {
  const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
  return { min: Math.min(r, g, b), max: Math.max(r, g, b) };
}

function isBackground(rgba, i) {
  const { min, max } = channelStats(rgba, i);
  return min > 205 && max - min < 30;
}

function removeBackground({ width, height, rgba }) {
  const bg = new Uint8Array(width * height);
  for (let p = 0; p < width * height; p += 1) bg[p] = isBackground(rgba, p * 4) ? 1 : 0;

  const nearBackground = (x, y, radius) => {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (bg[ny * width + nx]) return true;
      }
    }
    return false;
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const p = y * width + x, i = p * 4;
      if (bg[p]) {
        rgba[i + 3] = 0;
        continue;
      }
      // O JPG mistura a borda do desenho com o branco do fundo. Pixels claros e
      // sem cor colados ao fundo viram semitransparentes, e a cor e "desmisturada"
      // do branco, para nao sobrar um contorno claro em volta do personagem.
      const { min, max } = channelStats(rgba, i);
      if (max - min >= 40) continue;
      const touching = (min > 120 && nearBackground(x, y, 1)) || (min > 170 && nearBackground(x, y, 2));
      if (!touching) continue;
      const whiteness = Math.min(1, Math.max(0, (min - 110) / (205 - 110)));
      const alpha = 1 - whiteness;
      if (alpha <= 0.05) {
        rgba[i + 3] = 0;
        continue;
      }
      for (let c = 0; c < 3; c += 1) {
        rgba[i + c] = Math.min(255, Math.max(0, (rgba[i + c] - (1 - alpha) * 255) / alpha));
      }
      rgba[i + 3] = alpha * 255;
    }
  }

  removeSpecks({ width, height, rgba });
}

// Ruido de compressao solto no fundo vira pontinhos isolados; descarta.
function removeSpecks({ width, height, rgba }, minSize = 10) {
  const seen = new Uint8Array(width * height);
  for (let start = 0; start < width * height; start += 1) {
    if (seen[start] || rgba[start * 4 + 3] === 0) continue;
    const stack = [start], members = [];
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop();
      members.push(p);
      const x = p % width, y = (p - x) / width;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const n = ny * width + nx;
          if (!seen[n] && rgba[n * 4 + 3] > 0) {
            seen[n] = 1;
            stack.push(n);
          }
        }
      }
    }
    if (members.length < minSize) for (const p of members) rgba[p * 4 + 3] = 0;
  }
}

/* ------------------------------------------------------- recorte -------- */

function crop(source, [x0, y0, x1, y1]) {
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      if (source.rgba[(y * source.width + x) * 4 + 3] === 0) continue;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
  const width = maxX - minX + 1, height = maxY - minY + 1;
  const rgba = new Float32Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const s = ((minY + y) * source.width + minX + x) * 4, d = (y * width + x) * 4;
      for (let c = 0; c < 4; c += 1) rgba[d + c] = source.rgba[s + c];
    }
  }
  return { width, height, rgba };
}

// Bilinear em alfa pre-multiplicado: sem isso, reescalar puxaria a cor do
// fundo transparente para dentro da borda.
function rescale(image, scale) {
  if (scale === 1) return image;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const rgba = new Float32Array(width * height * 4);
  const sample = (x, y, c) => {
    const cx = Math.min(image.width - 1, Math.max(0, x));
    const cy = Math.min(image.height - 1, Math.max(0, y));
    const i = (cy * image.width + cx) * 4;
    const a = image.rgba[i + 3] / 255;
    return c === 3 ? image.rgba[i + 3] : image.rgba[i + c] * a;
  };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const fx = (x + 0.5) / scale - 0.5, fy = (y + 0.5) / scale - 0.5;
      const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const d = (y * width + x) * 4;
      const value = [0, 0, 0, 0];
      for (let c = 0; c < 4; c += 1) {
        value[c] =
          sample(ix, iy, c) * (1 - tx) * (1 - ty) +
          sample(ix + 1, iy, c) * tx * (1 - ty) +
          sample(ix, iy + 1, c) * (1 - tx) * ty +
          sample(ix + 1, iy + 1, c) * tx * ty;
      }
      const alpha = value[3] / 255;
      rgba[d + 3] = value[3] < 8 ? 0 : value[3];
      for (let c = 0; c < 3; c += 1) rgba[d + c] = alpha > 0 ? value[c] / alpha : 0;
    }
  }
  return { width, height, rgba };
}

// Eixo do corpo: e por ele que todos os frames sao alinhados na celula, para
// o personagem nao "escorregar" de um frame para o outro. Mediana horizontal
// da cabeca e do tronco: aparecem em todos os frames, e a mediana ignora o
// braco esticado. Os pes nao servem: o manto cobre a perna de tras e o eixo
// cairia na perna da frente, que muda de lugar a cada passo.
function bodyAxis(image) {
  const xs = [];
  for (let y = Math.floor(image.height * 0.12); y < Math.floor(image.height * 0.55); y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (image.rgba[(y * image.width + x) * 4 + 3] > 128) xs.push(x);
    }
  }
  xs.sort((a, b) => a - b);
  return xs[Math.floor(xs.length / 2)];
}

/* ------------------------------------------------------- hitboxes ------- */

// Hitbox tirada do proprio desenho: o membro que avanca mais para a frente no
// frame ativo (braco esticado, joelho, perna). Parte da linha com a ponta mais
// distante e desce/sobe enquanto a linha ainda avanca pelo menos metade disso,
// para pegar so o membro e nao a frente inteira do corpo.
function hitboxFromFrame(frame, cell) {
  const front = cell.frameWidth / 2 + 14;
  const reachByRow = [];
  for (let y = 0; y < frame.height; y += 1) {
    let rightmost = -1;
    for (let x = 0; x < frame.width; x += 1) {
      if (frame.rgba[(y * frame.width + x) * 4 + 3] >= 128) rightmost = frame.left + x;
    }
    reachByRow.push(rightmost);
  }
  let tipRow = 0;
  reachByRow.forEach((reach, y) => {
    if (reach > reachByRow[tipRow]) tipRow = y;
  });
  const tip = reachByRow[tipRow];
  const threshold = front + (tip - front) / 2;
  let top = tipRow, bottom = tipRow;
  while (top > 0 && reachByRow[top - 1] >= threshold) top -= 1;
  while (bottom < frame.height - 1 && reachByRow[bottom + 1] >= threshold) bottom += 1;

  const height = Math.max(16, bottom - top + 1);
  const offsetY = Math.min(frame.top + top, cell.frameHeight - height);
  const box = { width: tip - front + 1, height, offsetX: front, offsetY };
  const reach = box.offsetX + box.width - cell.frameWidth / 2;
  if (reach < MIN_REACH) {
    console.warn(`  hitbox curta (${reach}px), estendida para ${MIN_REACH}px`);
    box.width += MIN_REACH - reach;
  }
  return box;
}

/* ------------------------------------------------------- escrita -------- */

function toPng({ width, height, rgba }) {
  const png = new PNG({ width, height });
  for (let i = 0; i < rgba.length; i += 1) png.data[i] = Math.round(Math.min(255, Math.max(0, rgba[i])));
  return PNG.sync.write(png);
}

function write(relativePath, buffer) {
  const target = resolve(ROOT, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, buffer);
  console.log(`  ${relativePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

/* ------------------------------------------------------- execucao ------- */

console.log('Removendo fundo da folha original...');
const source = loadSource();
removeBackground(source);

console.log('Recortando e normalizando frames...');
const names = Object.keys(SPRITES);
const frames = names.map((name) => {
  const { rect, row } = SPRITES[name];
  const image = rescale(crop(source, rect), ROW_SCALE[row]);
  return { name, ...image, axis: bodyAxis(image) };
});

const halfWidth = Math.max(...frames.map((f) => Math.max(f.axis, f.width - f.axis)));
const cell = {
  frameWidth: Math.ceil((halfWidth * 2 + 2) / 8) * 8,
  frameHeight: Math.ceil((Math.max(...frames.map((f) => f.height)) + 2) / 8) * 8,
};
const rows = Math.ceil(frames.length / GRID_COLS);
const sheet = {
  width: cell.frameWidth * GRID_COLS,
  height: cell.frameHeight * rows,
  rgba: new Float32Array(cell.frameWidth * GRID_COLS * cell.frameHeight * rows * 4),
};

frames.forEach((frame, index) => {
  // Eixo do corpo no centro da celula e pes na base: e onde o motor ancora o
  // sprite (anchor 0.5, 1).
  frame.left = cell.frameWidth / 2 - frame.axis;
  frame.top = cell.frameHeight - frame.height;
  const originX = (index % GRID_COLS) * cell.frameWidth + frame.left;
  const originY = Math.floor(index / GRID_COLS) * cell.frameHeight + frame.top;
  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const s = (y * frame.width + x) * 4, d = ((originY + y) * sheet.width + originX + x) * 4;
      for (let c = 0; c < 4; c += 1) sheet.rgba[d + c] = frame.rgba[s + c];
    }
  }
});

console.log(`  ${frames.length} frames, celula ${cell.frameWidth}x${cell.frameHeight}, grade ${GRID_COLS}x${rows}`);

const indexOf = (name) => {
  const index = names.indexOf(name);
  if (index < 0) throw new Error(`frame desconhecido: ${name}`);
  return index;
};
const frameByName = Object.fromEntries(frames.map((f) => [f.name, f]));

const template = JSON.parse(readFileSync(resolve(ROOT, TEMPLATE), 'utf8'));
const animations = {};
for (const [id, spec] of Object.entries(ANIMATIONS)) {
  const base = template.animations[id] ?? {};
  const animation = { ...base, ...spec, frames: spec.frames.map(indexOf) };
  if (spec.hitboxFrame !== undefined) {
    animation.hitbox = hitboxFromFrame(frameByName[spec.frames[spec.hitboxFrame]], cell);
  }
  animations[id] = animation;
}

const config = {
  ...template,
  id: 'itachi',
  name: 'Itachi',
  description: 'Sombra do cla Uchiha',
  spriteSheet: 'itachi_spritesheet.png',
  spriteGridSize: { cols: GRID_COLS, rows, ...cell },
  animations,
  // Hitbox base = a do soco; e ela que a IA usa para medir o alcance.
  hitbox: animations.punch.hitbox,
  hurtbox: {
    width: HURTBOX_WIDTH,
    height: HURTBOX_HEIGHT,
    offsetX: cell.frameWidth / 2 - HURTBOX_WIDTH / 2,
    offsetY: cell.frameHeight - HURTBOX_HEIGHT,
  },
};

console.log('Gravando...');
write(`${OUT_DIR}/itachi_spritesheet.png`, toPng(sheet));
write(`${OUT_DIR}/itachi_portrait.png`, toPng(crop(source, PORTRAIT)));
write(`${OUT_DIR}/itachi_config.json`, Buffer.from(`${JSON.stringify(config, null, 2)}\n`, 'utf8'));
console.log('Pronto.');
