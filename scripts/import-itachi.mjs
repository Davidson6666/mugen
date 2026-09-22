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
  punch: { frames: ['lungePrep', 'lunge', 'lunge', 'lungePrep'], speed: 0.1, loop: false, hitboxFrame: 1 },
  kick: { frames: ['kneeRaise', 'knee', 'knee', 'kneeRaise'], speed: 0.1, loop: false, hitboxFrame: 1 },
  // Os tres especiais nao tem hitbox de corpo a corpo: o dano vem do efeito.
  // Amaterasu: as chamas surgem onde o oponente esta.
  special1: {
    frames: ['handSeal1', 'handSeal2', 'castFlare', 'point', 'point', 'point', 'throwRecover'], speed: 0.13, loop: false,
    effect: { id: 'amaterasu', spawnFrame: 3, target: 'opponent' },
  },
  // Shuriken: sai da ponta da mao no frame em que o braco estica.
  special2: {
    frames: ['throwWindup', 'throwRelease', 'throwRelease', 'throwRecover', 'throwRecover'], speed: 0.094, loop: false,
    effect: { id: 'shuriken', spawnFrame: 1, fromHandOf: 'throwRelease' },
  },
  // Susanoo: surge ao redor do Itachi enquanto ele sustenta o selo.
  special3: {
    frames: ['castFlare', 'handSeal1', 'handSeal2', 'handSeal2', 'handSeal2', 'handSeal1'], speed: 0.113, loop: false,
    effect: { id: 'susanoo', spawnFrame: 0 },
  },
  hitReaction: { frames: ['hurt', 'hurt', 'hurt'], speed: 0.2, loop: false },
  ko: { frames: ['hurt', 'crowBurst', 'crowDissolve', 'crowDissolve', 'crowDissolve'], speed: 0.1, loop: false },
  victoryPose: { frames: ['taunt1', 'taunt2', 'taunt3'], speed: 0.1, loop: false },
  defeatPose: { frames: ['kneel1', 'kneel2', 'kneel2'], speed: 0.1, loop: false },
};

/* --------------------------------------------------------- efeitos ------ */

// Cada efeito vira um sprite sheet proprio. "axis" e a coordenada x, na folha
// original, que fica no ponto onde o efeito nasce (no Susanoo, o peito, que
// precisa ficar sobre o Itachi); sem ela vale o centro do desenho.
const EFFECTS = {
  amaterasu: {
    scale: 0.55,
    sprites: {
      tiny: { rect: [1235, 598, 1278, 645] },
      small: { rect: [1085, 586, 1164, 645] },
      rising: { rect: [876, 526, 978, 616] },
      wide: { rect: [960, 428, 1082, 537] },
      tall: { rect: [1098, 443, 1264, 584] },
      blaze: { rect: [1278, 483, 1442, 643] },
      burnOut: { rect: [980, 540, 1086, 638] },
    },
    animation: {
      frames: ['tiny', 'small', 'rising', 'wide', 'tall', 'blaze', 'tall', 'blaze', 'burnOut', 'small'],
      speed: 0.2,
      loop: false,
    },
    // So queima depois de crescer: da tempo de ver o selo e sair de baixo.
    activeFrom: 3,
    activeUntil: 7,
    hitbox: { frame: 'blaze', widthRatio: 0.7, heightRatio: 0.8 },
    glow: { color: [170, 30, 70], radius: 3, strength: 0.85 },
    layer: 'front',
  },
  shuriken: {
    scale: 0.8,
    sprites: {
      spinA: { rect: [1195, 263, 1224, 288] },
      spinB: { rect: [1197, 298, 1235, 333] },
      spinC: { rect: [1232, 259, 1261, 288] },
      spinD: { rect: [1307, 301, 1336, 328] },
    },
    animation: { frames: ['spinA', 'spinB', 'spinC', 'spinD'], speed: 0.5, loop: true },
    hitbox: { frame: 'spinB', widthRatio: 1, heightRatio: 1 },
    glow: { color: [210, 215, 235], radius: 2, strength: 0.9 },
    velocityX: 11,
    lifetime: 150,
    destroyOnHit: true,
    layer: 'front',
  },
  susanoo: {
    scale: 0.75,
    sprites: {
      stand: { rect: [10, 640, 306, 824], axis: 110 },
      grip: { rect: [852, 645, 1196, 834], axis: 960 },
      draw: { rect: [1202, 645, 1512, 834], axis: 1305 },
      slash: { rect: [10, 822, 408, 1010], axis: 105 },
    },
    animation: { frames: ['stand', 'grip', 'draw', 'slash', 'slash', 'slash', 'stand'], speed: 0.132, loop: false },
    activeFrom: 3,
    activeUntil: 5,
    // O arco da espada atravessa quase a tela toda; o alcance que machuca e
    // limitado para o golpe continuar podendo ser evitado de longe.
    hitbox: { frame: 'slash', frontOf: 20, maxReach: 150 },
    attached: true,
    layer: 'back',
  },
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

// Chama, corvo e Susanoo sao desenhos translucidos pintados sobre branco. Em
// vez de recortar pelo fundo, calcula quanto de "tinta" cada pixel tem e
// desfaz a mistura com o branco: a borda esfumada da chama e o vermelho
// translucido do Susanoo ficam certos sobre o cenario escuro.
const INK_FLOOR = 14;

function keyInk({ width, height, rgba: raw }) {
  const rgba = new Float32Array(raw);
  for (let i = 0; i < rgba.length; i += 4) {
    const min = Math.min(rgba[i], rgba[i + 1], rgba[i + 2]);
    const alpha = Math.min(1, Math.max(0, (255 - min - INK_FLOOR) / (255 - INK_FLOOR)));
    if (alpha < 0.04) {
      rgba[i + 3] = 0;
      continue;
    }
    for (let c = 0; c < 3; c += 1) {
      rgba[i + c] = Math.min(255, Math.max(0, (rgba[i + c] - (1 - alpha) * 255) / alpha));
    }
    rgba[i + 3] = alpha * 255;
  }
  return { width, height, rgba };
}

/* ------------------------------------------------------- recorte -------- */

// Na area dos efeitos os desenhos se sobrepoem na folha: pedacos do vizinho
// entram no retangulo. Eles aparecem como manchas encostadas na borda do
// recorte, separadas do desenho principal; essas saem.
function isolateMain(image) {
  const { width, height, rgba } = image;
  const label = new Int32Array(width * height).fill(-1);
  const groups = [];
  for (let start = 0; start < width * height; start += 1) {
    if (label[start] >= 0 || rgba[start * 4 + 3] < 26) continue;
    const id = groups.length, members = [start];
    let touchesEdge = false;
    label[start] = id;
    for (let k = 0; k < members.length; k += 1) {
      const p = members[k], x = p % width, y = (p - x) / width;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesEdge = true;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const n = ny * width + nx;
          if (label[n] < 0 && rgba[n * 4 + 3] >= 26) {
            label[n] = id;
            members.push(n);
          }
        }
      }
    }
    groups.push({ members, touchesEdge });
  }
  const largest = groups.reduce((best, g) => (g.members.length > (best?.members.length ?? 0) ? g : best), null);
  for (const group of groups) {
    if (group === largest || !group.touchesEdge) continue;
    for (const p of group.members) rgba[p * 4 + 3] = 0;
  }
  // Resto de tinta fraca que nao pertence a nenhum desenho.
  for (let p = 0; p < width * height; p += 1) if (label[p] < 0) rgba[p * 4 + 3] = 0;
}

function crop(source, [x0, y0, x1, y1], { isolate = false } = {}) {
  const regionWidth = x1 - x0 + 1, regionHeight = y1 - y0 + 1;
  const region = { width: regionWidth, height: regionHeight, rgba: new Float32Array(regionWidth * regionHeight * 4) };
  for (let y = 0; y < regionHeight; y += 1) {
    for (let x = 0; x < regionWidth; x += 1) {
      const s = ((y0 + y) * source.width + x0 + x) * 4, d = (y * regionWidth + x) * 4;
      for (let c = 0; c < 4; c += 1) region.rgba[d + c] = source.rgba[s + c];
    }
  }
  if (isolate) isolateMain(region);

  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let y = 0; y < regionHeight; y += 1) {
    for (let x = 0; x < regionWidth; x += 1) {
      if (region.rgba[(y * regionWidth + x) * 4 + 3] === 0) continue;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
  const width = maxX - minX + 1, height = maxY - minY + 1;
  const rgba = new Float32Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const s = ((minY + y) * regionWidth + minX + x) * 4, d = (y * width + x) * 4;
      for (let c = 0; c < 4; c += 1) rgba[d + c] = region.rgba[s + c];
    }
  }
  // Origem na folha original: e contra ela que o "axis" dos efeitos e medido.
  return { width, height, rgba, originX: x0 + minX, originY: y0 + minY };
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

// Halo colorido em volta do desenho. Chama preta e shuriken escura sumiriam
// num cenario noturno; o contorno de luz as separa do fundo.
function addGlow(image, { color, radius, strength }) {
  const width = image.width + radius * 2, height = image.height + radius * 2;
  const rgba = new Float32Array(width * height * 4);
  const alphaAt = (x, y) => {
    const sx = x - radius, sy = y - radius;
    if (sx < 0 || sy < 0 || sx >= image.width || sy >= image.height) return 0;
    return image.rgba[(sy * image.width + sx) * 4 + 3] / 255;
  };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let glow = 0;
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const distance = Math.hypot(dx, dy);
          if (distance > radius) continue;
          glow = Math.max(glow, alphaAt(x + dx, y + dy) * (1 - distance / (radius + 1)));
        }
      }
      glow *= strength;
      const own = alphaAt(x, y);
      const d = (y * width + x) * 4;
      // Desenho por cima do halo (composicao "over").
      const outAlpha = own + glow * (1 - own);
      if (outAlpha <= 0) continue;
      const s = ((y - radius) * image.width + (x - radius)) * 4;
      for (let c = 0; c < 3; c += 1) {
        const mine = own > 0 ? image.rgba[s + c] : 0;
        rgba[d + c] = (mine * own + color[c] * glow * (1 - own)) / outAlpha;
      }
      rgba[d + 3] = outAlpha * 255;
    }
  }
  return { width, height, rgba };
}

// Ponta da mao (pixel mais a frente) no espaco da celula: e dali que a
// shuriken sai.
function handPosition(frame) {
  let tip = { x: -1, y: 0 };
  for (let y = 0; y < frame.height; y += 1) {
    for (let x = frame.width - 1; x >= 0; x -= 1) {
      if (frame.rgba[(y * frame.width + x) * 4 + 3] < 128) continue;
      if (frame.left + x > tip.x) tip = { x: frame.left + x, y: frame.top + y };
      break;
    }
  }
  return tip;
}

// Hitbox de efeito no espaco da celula dele. Ou a area opaca do frame,
// reduzida (pontas de chama sao fumaca, nao queimam), ou so a parte que fica
// a frente de quem lancou, com alcance maximo.
function effectHitbox(spec, frame, cell) {
  const axis = cell.frameWidth / 2;
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      if (frame.rgba[(y * frame.width + x) * 4 + 3] < 128) continue;
      const cx = frame.left + x, cy = frame.top + y;
      if (spec.frontOf !== undefined && (cx < axis + spec.frontOf || cx > axis + spec.maxReach)) continue;
      minX = Math.min(minX, cx); maxX = Math.max(maxX, cx);
      minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
    }
  }
  let width = maxX - minX + 1, height = maxY - minY + 1;
  let offsetX = minX, offsetY = minY;
  if (spec.widthRatio) {
    const shrunk = Math.round(width * spec.widthRatio);
    offsetX += Math.round((width - shrunk) / 2);
    width = shrunk;
  }
  if (spec.heightRatio) {
    const shrunk = Math.round(height * spec.heightRatio);
    offsetY += height - shrunk;
    height = shrunk;
  }
  return { width, height, offsetX, offsetY };
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

/* ------------------------------------------------------- montagem ------- */

// Monta os frames numa grade uniforme: eixo no centro da celula e base do
// desenho na base da celula, que e onde o motor ancora o sprite (0.5, 1).
function assemble(frames, cols) {
  const halfWidth = Math.max(...frames.map((f) => Math.max(f.axis, f.width - f.axis)));
  const cell = {
    frameWidth: Math.ceil((halfWidth * 2 + 2) / 8) * 8,
    frameHeight: Math.ceil((Math.max(...frames.map((f) => f.height)) + 2) / 8) * 8,
  };
  const rows = Math.ceil(frames.length / cols);
  const sheet = {
    width: cell.frameWidth * cols,
    height: cell.frameHeight * rows,
    rgba: new Float32Array(cell.frameWidth * cols * cell.frameHeight * rows * 4),
  };
  frames.forEach((frame, index) => {
    frame.left = cell.frameWidth / 2 - frame.axis;
    frame.top = cell.frameHeight - frame.height;
    const originX = (index % cols) * cell.frameWidth + frame.left;
    const originY = Math.floor(index / cols) * cell.frameHeight + frame.top;
    for (let y = 0; y < frame.height; y += 1) {
      for (let x = 0; x < frame.width; x += 1) {
        const px = originX + x;
        if (px < 0 || px >= sheet.width) continue;
        const s = (y * frame.width + x) * 4, d = ((originY + y) * sheet.width + px) * 4;
        for (let c = 0; c < 4; c += 1) sheet.rgba[d + c] = frame.rgba[s + c];
      }
    }
  });
  return { sheet, cell, rows };
}

const pick = (object, keys) =>
  Object.fromEntries(keys.filter((key) => object[key] !== undefined).map((key) => [key, object[key]]));

/* ------------------------------------------------------- execucao ------- */

console.log('Removendo fundo da folha original...');
const source = loadSource();
// A chave por tinta precisa da folha crua: roda antes do recorte do fundo.
const inked = keyInk(source);
removeBackground(source);

console.log('Personagem...');
const names = Object.keys(SPRITES);
const frames = names.map((name) => {
  const { rect, row } = SPRITES[name];
  const image = rescale(crop(source, rect), ROW_SCALE[row]);
  return { name, ...image, axis: bodyAxis(image) };
});
const body = assemble(frames, GRID_COLS);
const { cell } = body;
console.log(`  ${frames.length} frames, celula ${cell.frameWidth}x${cell.frameHeight}, grade ${GRID_COLS}x${body.rows}`);
write(`${OUT_DIR}/itachi_spritesheet.png`, toPng(body.sheet));
write(`${OUT_DIR}/itachi_portrait.png`, toPng(crop(source, PORTRAIT)));

console.log('Efeitos...');
const effects = {};
for (const [id, spec] of Object.entries(EFFECTS)) {
  const spriteNames = Object.keys(spec.sprites);
  const effectFrames = spriteNames.map((name) => {
    const { rect, axis } = spec.sprites[name];
    const cropped = crop(inked, rect, { isolate: true });
    const image = rescale(cropped, spec.scale);
    const axisX = axis === undefined ? image.width / 2 : (axis - cropped.originX) * spec.scale;
    if (!spec.glow) return { name, ...image, axis: Math.round(axisX) };
    return { name, ...addGlow(image, spec.glow), axis: Math.round(axisX) + spec.glow.radius };
  });
  const cols = Math.min(effectFrames.length, 4);
  const built = assemble(effectFrames, cols);
  const frameIndex = (name) => {
    const index = spriteNames.indexOf(name);
    if (index < 0) throw new Error(`frame de efeito desconhecido: ${id}/${name}`);
    return index;
  };
  const file = `itachi_fx_${id}.png`;
  write(`${OUT_DIR}/${file}`, toPng(built.sheet));
  console.log(`  ${id}: celula ${built.cell.frameWidth}x${built.cell.frameHeight}`);
  effects[id] = {
    spriteSheet: file,
    spriteGridSize: { cols, rows: built.rows, ...built.cell },
    animation: { ...spec.animation, frames: spec.animation.frames.map(frameIndex) },
    hitbox: effectHitbox(spec.hitbox, effectFrames[frameIndex(spec.hitbox.frame)], built.cell),
    ...pick(spec, ['activeFrom', 'activeUntil', 'velocityX', 'lifetime', 'destroyOnHit', 'attached', 'layer']),
  };
}

const indexOf = (name) => {
  const index = names.indexOf(name);
  if (index < 0) throw new Error(`frame desconhecido: ${name}`);
  return index;
};
const frameByName = Object.fromEntries(frames.map((f) => [f.name, f]));

// Onde o efeito nasce, no espaco do lutador. A shuriken sai da ponta da mao,
// centrada na altura dela.
function effectSpawn({ fromHandOf, ...spawn }) {
  if (!fromHandOf) return spawn;
  const hand = handPosition(frameByName[fromHandOf]);
  const effectHeight = effects[spawn.id].spriteGridSize.frameHeight;
  return {
    ...spawn,
    offsetX: hand.x - cell.frameWidth / 2,
    offsetY: Math.round(cell.frameHeight - hand.y - effectHeight / 2),
  };
}

const template = JSON.parse(readFileSync(resolve(ROOT, TEMPLATE), 'utf8'));
const animations = {};
for (const [id, spec] of Object.entries(ANIMATIONS)) {
  const base = template.animations[id] ?? {};
  const animation = { ...base, ...spec, frames: spec.frames.map(indexOf) };
  if (spec.effect) {
    // O golpe do template tinha hitbox de corpo a corpo; aqui quem acerta e o efeito.
    delete animation.hitboxFrame;
    delete animation.hitbox;
    animation.effect = effectSpawn(spec.effect);
  } else if (spec.hitboxFrame !== undefined) {
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
  spriteGridSize: { cols: GRID_COLS, rows: body.rows, ...cell },
  animations,
  effects,
  // Hitbox base = a do soco; e ela que a IA usa para medir o alcance.
  hitbox: animations.punch.hitbox,
  hurtbox: {
    width: HURTBOX_WIDTH,
    height: HURTBOX_HEIGHT,
    offsetX: cell.frameWidth / 2 - HURTBOX_WIDTH / 2,
    offsetY: cell.frameHeight - HURTBOX_HEIGHT,
  },
};

write(`${OUT_DIR}/itachi_config.json`, Buffer.from(`${JSON.stringify(config, null, 2)}
`, 'utf8'));
console.log('Pronto.');
