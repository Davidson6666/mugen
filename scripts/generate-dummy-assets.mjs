// Gera os assets placeholder da Fase 1 (sprite sheet do personagem dummy e fundo
// do mapa dummy). Encoder PNG proprio via zlib para nao depender de Pillow/canvas.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* ---------------------------------------------------------------- PNG ---- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filtro "none"
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------- canvas ---- */

function hexToRgb(hex) {
  const v = parseInt(hex.replace('#', ''), 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

class Canvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = Buffer.alloc(width * height * 4);
  }

  // Composicao source-over: sem isso, pintar com alpha baixo abriria buracos no
  // que ja foi desenhado em vez de mesclar as duas cores.
  set(x, y, rgb, alpha = 255) {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= this.width || py >= this.height) return;
    const i = (py * this.width + px) * 4;
    const sa = alpha / 255;
    if (sa >= 1) {
      this.data[i] = rgb[0];
      this.data[i + 1] = rgb[1];
      this.data[i + 2] = rgb[2];
      this.data[i + 3] = 255;
      return;
    }
    const da = this.data[i + 3] / 255;
    const outA = sa + da * (1 - sa);
    if (outA <= 0) {
      this.data[i] = this.data[i + 1] = this.data[i + 2] = this.data[i + 3] = 0;
      return;
    }
    for (let c = 0; c < 3; c += 1) {
      this.data[i + c] = Math.round((rgb[c] * sa + this.data[i + c] * da * (1 - sa)) / outA);
    }
    this.data[i + 3] = Math.round(outA * 255);
  }

  rect(x, y, w, h, rgb, alpha = 255) {
    for (let dy = 0; dy < h; dy += 1) {
      for (let dx = 0; dx < w; dx += 1) this.set(x + dx, y + dy, rgb, alpha);
    }
  }

  outline(x, y, w, h, rgb, alpha = 255) {
    for (let dx = 0; dx < w; dx += 1) {
      this.set(x + dx, y, rgb, alpha);
      this.set(x + dx, y + h - 1, rgb, alpha);
    }
    for (let dy = 0; dy < h; dy += 1) {
      this.set(x, y + dy, rgb, alpha);
      this.set(x + w - 1, y + dy, rgb, alpha);
    }
  }

  toPng() {
    return encodePng(this.width, this.height, this.data);
  }
}

/* -------------------------------------------------------------- fonte ---- */
// Fonte 3x5 minima: so digitos, o suficiente para numerar os frames.
const DIGITS = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '001', '001', '001'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
};

function drawNumber(canvas, value, x, y, rgb, scale = 1) {
  let cursor = x;
  for (const char of String(value)) {
    const glyph = DIGITS[char];
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        if (glyph[row][col] !== '1') continue;
        canvas.rect(cursor + col * scale, y + row * scale, scale, scale, rgb);
      }
    }
    cursor += (3 + 1) * scale;
  }
}

/* -------------------------------------------------- sprite sheet dummy ---- */

const FRAME_W = 80;
const FRAME_H = 96;
const COLS = 14;
const ROWS = 6;

// Mesma faixa de frames usada no character config: cada animacao ganha uma cor
// propria para dar pra conferir a olho nu qual animacao esta tocando.
const ANIMATION_BANDS = [
  { name: 'idle', from: 0, to: 3, color: '#39FF14' },
  { name: 'walkForward', from: 4, to: 9, color: '#00D9FF' },
  { name: 'walkBackward', from: 10, to: 15, color: '#0090FF' },
  { name: 'jump', from: 16, to: 19, color: '#FFD700' },
  { name: 'crouch', from: 20, to: 23, color: '#FFB800' },
  { name: 'blockStanding', from: 24, to: 27, color: '#8B8698' },
  { name: 'blockCrouching', from: 28, to: 31, color: '#6B6878' },
  { name: 'punch', from: 32, to: 37, color: '#FF3D3D' },
  { name: 'kick', from: 38, to: 43, color: '#FF7B3D' },
  { name: 'special1', from: 44, to: 51, color: '#FF00D0' },
  { name: 'special2', from: 52, to: 59, color: '#B400FF' },
  { name: 'special3', from: 60, to: 67, color: '#7B00FF' },
  { name: 'hitReaction', from: 68, to: 70, color: '#FF4500' },
  { name: 'ko', from: 71, to: 75, color: '#8B0000' },
  { name: 'victoryPose', from: 76, to: 78, color: '#FFFFFF' },
  { name: 'defeatPose', from: 79, to: 81, color: '#4A4458' },
];

function bandFor(index) {
  return ANIMATION_BANDS.find((band) => index >= band.from && index <= band.to);
}

function shade(rgb, factor) {
  return rgb.map((c) => Math.max(0, Math.min(255, Math.round(c * factor))));
}

function drawFighterFrame(canvas, originX, originY, index) {
  const band = bandFor(index);
  const base = hexToRgb(band ? band.color : '#3A3550');
  const dark = shade(base, 0.45);
  const light = shade(base, 1.25);
  const phase = band ? index - band.from : 0;
  const span = band ? band.to - band.from + 1 : 1;

  // Moldura da celula: ajuda a enxergar o recorte do grid durante o debug.
  canvas.outline(originX, originY, FRAME_W, FRAME_H, hexToRgb('#1A1625'), 90);

  const crouching = band && (band.name === 'crouch' || band.name === 'blockCrouching');
  const down = band && (band.name === 'ko' || band.name === 'defeatPose');
  // Deslocamento vertical do corpo: da peso visual a pulo, agachamento e queda.
  let bodyDrop = 0;
  if (crouching) bodyDrop = 18;
  else if (down) bodyDrop = 30;
  else if (band && band.name === 'jump') bodyDrop = -6 + Math.abs(phase - (span - 1) / 2) * 3;
  else bodyDrop = phase % 2 === 0 ? 0 : 2;

  const feetY = originY + FRAME_H - 2;
  const legH = crouching ? 14 : 30;
  const torsoH = down ? 18 : 36 - (crouching ? 8 : 0);
  const torsoY = feetY - legH - torsoH + bodyDrop;
  const headSize = 20;
  const headY = torsoY - headSize + 2;

  // Pernas
  canvas.rect(originX + 28, feetY - legH + bodyDrop, 9, legH, dark);
  canvas.rect(originX + 43, feetY - legH + bodyDrop, 9, legH, dark);
  // Tronco
  canvas.rect(originX + 26, torsoY, 28, torsoH, base);
  canvas.outline(originX + 26, torsoY, 28, torsoH, dark);
  // Cabeca
  canvas.rect(originX + 30, headY, headSize, headSize, light);
  canvas.outline(originX + 30, headY, headSize, headSize, dark);
  // "Nariz": marca de qual lado o sprite esta virado (valida o flip horizontal).
  canvas.rect(originX + 50, headY + 9, 6, 4, hexToRgb('#FFB800'));

  // Braco da frente: estende conforme o frame avanca, deixando a animacao obvia.
  const reach = 6 + Math.round((phase / Math.max(1, span - 1)) * 18);
  canvas.rect(originX + 54, torsoY + 8, reach, 8, light);
  canvas.outline(originX + 54, torsoY + 8, reach, 8, dark);

  // Numero do frame no canto inferior esquerdo.
  drawNumber(canvas, index, originX + 3, originY + FRAME_H - 9, hexToRgb('#FFFFFF'), 1);
}

function buildSpriteSheet() {
  const canvas = new Canvas(COLS * FRAME_W, ROWS * FRAME_H);
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      drawFighterFrame(canvas, col * FRAME_W, row * FRAME_H, row * COLS + col);
    }
  }
  return canvas.toPng();
}

/* ----------------------------------------------------------- mapa dummy --- */

const MAP_W = 1280;
const MAP_H = 720;
const GROUND_LEVEL = 580;
const LEFT_BOUND = 100;
const RIGHT_BOUND = 1180;

function buildMapBackground() {
  const canvas = new Canvas(MAP_W, MAP_H);
  const top = hexToRgb('#0D0B1A');
  const bottom = hexToRgb('#1A1625');
  const accent = hexToRgb('#FFB800');

  for (let y = 0; y < MAP_H; y += 1) {
    const t = y / (MAP_H - 1);
    const rgb = [
      Math.round(top[0] + (bottom[0] - top[0]) * t),
      Math.round(top[1] + (bottom[1] - top[1]) * t),
      Math.round(top[2] + (bottom[2] - top[2]) * t),
    ];
    canvas.rect(0, y, MAP_W, 1, rgb);
  }

  // Brilho de horizonte logo acima do chao.
  for (let y = GROUND_LEVEL - 90; y < GROUND_LEVEL; y += 1) {
    const t = (y - (GROUND_LEVEL - 90)) / 90;
    canvas.rect(0, y, MAP_W, 1, hexToRgb('#2A1F45'), Math.round(t * 140));
  }

  // Chao com grade em perspectiva simples.
  canvas.rect(0, GROUND_LEVEL, MAP_W, MAP_H - GROUND_LEVEL, hexToRgb('#241C33'));
  canvas.rect(0, GROUND_LEVEL, MAP_W, 3, accent, 200);
  for (let x = 0; x < MAP_W; x += 64) {
    canvas.rect(x, GROUND_LEVEL, 1, MAP_H - GROUND_LEVEL, hexToRgb('#3A2E52'), 160);
  }
  for (let y = GROUND_LEVEL + 20; y < MAP_H; y += 28) {
    canvas.rect(0, y, MAP_W, 1, hexToRgb('#3A2E52'), 120);
  }

  // Marcadores dos limites de movimento declarados no map config.
  canvas.rect(LEFT_BOUND, GROUND_LEVEL - 60, 2, 60, hexToRgb('#FF3D3D'), 180);
  canvas.rect(RIGHT_BOUND, GROUND_LEVEL - 60, 2, 60, hexToRgb('#00D9FF'), 180);
  canvas.rect(MAP_W / 2, GROUND_LEVEL - 30, 1, 30, accent, 120);

  return canvas.toPng();
}

/* ------------------------------------------------------------- escrita --- */

function write(relativePath, buffer) {
  const target = resolve(ROOT, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, buffer);
  console.log(`  ${relativePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

console.log('Gerando assets dummy...');
write('public/assets/characters/dummy/dummy_spritesheet.png', buildSpriteSheet());
write('public/assets/maps/dummy/dummy_map_bg.png', buildMapBackground());
console.log('Pronto.');
