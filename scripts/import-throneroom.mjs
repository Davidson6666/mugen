// Importa o cenario "The King's Throne Room" (xWagnerPlaguesx; creditos em
// CREDITS.md) do pacote MUGEN em assets-src/throneroom/ (fora do git).
// Para regerar: npm run assets:throneroom
//
// O pacote guarda a arte em tres imagens de 1664x816 (Hires: 2 px por
// unidade), uma por canal de cor: a primeira normal e as outras duas somadas
// (trans = add). Somadas, dao a imagem colorida.
//
// Enquadramento: a luta mostra 853x480 px em volta do chao (y = 580), com o
// chao 420 px abaixo do topo visivel. O chao da arte fica 335 unidades abaixo
// do topo da imagem (start = 0,-335), ou 670 px; em 65% a sala cobre a area
// visivel inteira, com o chao da arte no chao da luta.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { openSff } from './lib/sff.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = resolve(ROOT, 'assets-src/throneroom');
const OUT = 'public/assets/maps/throneroom';

const WIDTH = 1280;
const HEIGHT = 720;
const GROUND = 580;
const SCALE = 0.65;
// Linha do chao na imagem do pacote (px), pelo start = 0,-335 em Hires.
const IMAGE_GROUND = 670;

const sff = openSff(resolve(PACK, 'throneroom(normal).sff'));
const layers = [0, 1, 2].map((item) => sff.decode(0, item));
const { width, height } = layers[0];

// Soma dos tres canais (o primeiro normal, os outros aditivos).
const full = new Float32Array(width * height * 3);
for (const layer of layers) {
  for (let index = 0; index < width * height; index += 1) {
    const alpha = layer.rgba[index * 4 + 3] / 255;
    for (let channel = 0; channel < 3; channel += 1) {
      full[index * 3 + channel] = Math.min(255, full[index * 3 + channel] + layer.rgba[index * 4 + channel] * alpha);
    }
  }
}

// Reducao por media de area (sem serrilhado), direto na tela de 1280x720.
const out = new PNG({ width: WIDTH, height: HEIGHT });
const left = (WIDTH - width * SCALE) / 2;
const top = GROUND - IMAGE_GROUND * SCALE;
for (let y = 0; y < HEIGHT; y += 1) {
  for (let x = 0; x < WIDTH; x += 1) {
    const x0 = (x - left) / SCALE, x1 = (x + 1 - left) / SCALE;
    const y0 = (y - top) / SCALE, y1 = (y + 1 - top) / SCALE;
    const sum = [0, 0, 0];
    let weight = 0;
    for (let sy = Math.max(0, Math.floor(y0)); sy < Math.min(height, Math.ceil(y1)); sy += 1) {
      const wy = Math.min(y1, sy + 1) - Math.max(y0, sy);
      for (let sx = Math.max(0, Math.floor(x0)); sx < Math.min(width, Math.ceil(x1)); sx += 1) {
        const w = wy * (Math.min(x1, sx + 1) - Math.max(x0, sx));
        for (let channel = 0; channel < 3; channel += 1) sum[channel] += full[(sy * width + sx) * 3 + channel] * w;
        weight += w;
      }
    }
    const target = (y * WIDTH + x) * 4;
    // Fora da imagem: preto (a sala ja e escura nas bordas).
    for (let channel = 0; channel < 3; channel += 1) out.data[target + channel] = weight ? Math.round(sum[channel] / weight) : 0;
    out.data[target + 3] = 255;
  }
}

mkdirSync(resolve(ROOT, OUT), { recursive: true });
writeFileSync(resolve(ROOT, OUT, 'throneroom_bg.png'), PNG.sync.write(out));
writeFileSync(resolve(ROOT, OUT, 'throneroom_config.json'), `${JSON.stringify({
  id: 'throneroom',
  name: 'Sala do Trono',
  backgroundImage: 'throneroom_bg.png',
  width: WIDTH,
  height: HEIGHT,
  groundLevel: GROUND,
  leftBound: 290,
  rightBound: 990,
  cameraZoomDefault: 1,
  parallaxLayers: [],
}, null, 2)}\n`);
console.log(`Pronto: ${OUT}/throneroom_bg.png`);
