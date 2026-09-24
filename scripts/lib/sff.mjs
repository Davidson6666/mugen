// Leitor de SFF v2 (arquivo de sprites do MUGEN 1.x). Cobre o que os pacotes
// de personagem usam na pratica: PNG paletizado (8 bits), PNG 24/32 bits, LZ5
// e sprites ligados (que reaproveitam a imagem de outro). Formato documentado em
// https://www.elecbyte.com/mugendocs-11b1/formats-sffv2.html
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { PNG } from 'pngjs';

const FORMAT_LZ5 = 4;
const FORMAT_PNG8 = 10;
const FORMAT_PNG24 = 11;
const FORMAT_PNG32 = 12;

// PNG paletizado lido so ate os indices: as cores vem da tabela de paletas do
// SFF, nao do PLTE do proprio PNG.
function readIndexedPng(data) {
  let pointer = 8;
  let width = 0, height = 0, depth = 8;
  const idat = [];
  while (pointer < data.length) {
    const length = data.readUInt32BE(pointer);
    const type = data.toString('latin1', pointer + 4, pointer + 8);
    const body = data.subarray(pointer + 8, pointer + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      depth = body[8];
    }
    if (type === 'IDAT') idat.push(body);
    if (type === 'IEND') break;
    pointer += 12 + length;
  }
  if (depth !== 8) throw new Error(`PNG paletizado com ${depth} bits nao suportado`);

  const raw = inflateSync(Buffer.concat(idat));
  const indices = new Uint8Array(width * height);
  let previous = new Uint8Array(width);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (width + 1)];
    const line = raw.subarray(y * (width + 1) + 1, (y + 1) * (width + 1));
    const current = new Uint8Array(width);
    for (let x = 0; x < width; x += 1) {
      const a = x > 0 ? current[x - 1] : 0, b = previous[x], c = x > 0 ? previous[x - 1] : 0;
      let value = line[x];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) {
        const estimate = a + b - c;
        const pa = Math.abs(estimate - a), pb = Math.abs(estimate - b), pc = Math.abs(estimate - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      current[x] = value & 255;
    }
    indices.set(current, y * width);
    previous = current;
  }
  return { width, height, indices };
}

// LZ5: compressao propria do MUGEN, usada nos sprites pequenos (shuriken,
// faiscas). Produz indices de paleta; o 0 e transparente. Mesmo algoritmo do
// Ikemen GO (src/image.go, lz5Decode).
function decodeLz5(src, width, height) {
  const out = new Uint8Array(width * height);
  if (src.length === 0) return out;
  let i = 0, j = 0;
  const next = () => {
    const value = src[i];
    if (i < src.length - 1) i += 1;
    return value;
  };
  let control = next(), controlBit = 0, recycled = 0, recycledBits = 0;
  while (j < out.length) {
    let d = next();
    if (control & (1 << controlBit)) {
      let count;
      if ((d & 0x3f) === 0) {
        d = ((d << 2) | next()) + 1;
        count = next() + 2;
      } else {
        recycled |= (d & 0xc0) >> recycledBits;
        recycledBits += 2;
        count = d & 0x3f;
        if (recycledBits < 8) {
          d = next() + 1;
        } else {
          d = recycled + 1;
          recycled = 0;
          recycledBits = 0;
        }
      }
      for (; count >= 0; count -= 1) {
        if (j < out.length) {
          out[j] = out[j - d];
          j += 1;
        }
      }
    } else {
      let count;
      if ((d & 0xe0) === 0) {
        count = next() + 8;
      } else {
        count = d >> 5;
        d &= 0x1f;
      }
      for (; count > 0 && j < out.length; count -= 1) {
        out[j] = d;
        j += 1;
      }
    }
    controlBit += 1;
    if (controlBit >= 8) {
      control = next();
      controlBit = 0;
    }
  }
  return out;
}

// Nesse tipo de pacote o fundo do sprite nem sempre e o indice 0: e o indice
// do canto, apagado so onde e alcancavel pela borda (a mesma cor dentro do
// desenho continua).
function backgroundMask({ width, height, indices }) {
  const background = new Uint8Array(width * height);
  const target = indices[0];
  const stack = [];
  const seed = (x, y) => {
    const p = y * width + x;
    if (!background[p] && indices[p] === target) {
      background[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < width; x += 1) { seed(x, 0); seed(x, height - 1); }
  for (let y = 0; y < height; y += 1) { seed(0, y); seed(width - 1, y); }
  while (stack.length) {
    const p = stack.pop(), x = p % width, y = (p - x) / width;
    if (x > 0) seed(x - 1, y);
    if (x < width - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < height - 1) seed(x, y + 1);
  }
  return background;
}

// PCX de 8 bits (sprites do SFF v1): cabecalho de 128 bytes, linhas em RLE
// (byte >= 0xC0 = repeticao) e paleta de 256 cores no fim.
function readPcx(data) {
  const width = data.readUInt16LE(8) - data.readUInt16LE(4) + 1;
  const height = data.readUInt16LE(10) - data.readUInt16LE(6) + 1;
  const bytesPerLine = data.readUInt16LE(66) * data[65];
  const indices = new Uint8Array(width * height);
  let pointer = 128;
  for (let y = 0; y < height; y += 1) {
    let x = 0;
    while (x < bytesPerLine && pointer < data.length) {
      let value = data[pointer++];
      let count = 1;
      if (value >= 0xc0) {
        count = value & 0x3f;
        value = data[pointer++];
      }
      for (let k = 0; k < count && x < bytesPerLine; k += 1, x += 1) {
        if (x < width) indices[y * width + x] = value;
      }
    }
  }
  let palette = null;
  if (data.length >= 769 && data[data.length - 769] === 0x0c) {
    const start = data.length - 768;
    palette = Array.from({ length: 256 }, (_, c) => [data[start + c * 3], data[start + c * 3 + 1], data[start + c * 3 + 2]]);
  }
  return { width, height, indices, palette };
}

// Paleta .act (256 cores RGB). O MUGEN le as paletas de personagem do SFF v1
// na ordem inversa: a cor 0 do sprite e a ultima do arquivo.
export function readAct(path) {
  const data = readFileSync(path);
  return Array.from({ length: 256 }, (_, c) => {
    const k = (255 - c) * 3;
    return [data[k], data[k + 1], data[k + 2]];
  });
}

// SFF v1 (MUGEN antigo): lista encadeada de sprites PCX. Sprites com
// "mesma paleta" usam a paleta do personagem (o .act); os outros (retratos,
// efeitos) trazem a propria. A cor 0 e o transparente.
function openSffV1(buffer, { act } = {}) {
  const u16 = (o) => buffer.readUInt16LE(o);
  const s16 = (o) => buffer.readInt16LE(o);
  const u32 = (o) => buffer.readUInt32LE(o);
  const count = u32(20);
  const sprites = [];
  let o = u32(24);
  for (let index = 0; index < count && o > 0 && o < buffer.length; index += 1) {
    const length = u32(o + 4);
    sprites.push({
      group: u16(o + 12), item: u16(o + 14), axisX: s16(o + 8), axisY: s16(o + 10),
      link: u16(o + 16), samePalette: buffer[o + 18] === 1, offset: o + 32, length,
    });
    o = u32(o);
  }
  // Largura/altura para quem consulta o indice (sem decodificar tudo).
  for (const sprite of sprites) {
    let source = sprite;
    for (let hops = 0; source.length === 0 && hops < 16; hops += 1) source = sprites[source.link];
    if (source.length > 0) {
      const d = buffer.subarray(source.offset, source.offset + 12);
      sprite.width = d.readUInt16LE(8) - d.readUInt16LE(4) + 1;
      sprite.height = d.readUInt16LE(10) - d.readUInt16LE(6) + 1;
    } else {
      sprite.width = 0;
      sprite.height = 0;
    }
  }
  const byKey = new Map(sprites.map((sprite, index) => [`${sprite.group},${sprite.item}`, index]));
  // Paleta propria mais recente ate cada sprite (para "mesma paleta" sem .act).
  const ownPalette = [];
  let last = null;
  sprites.forEach((sprite, index) => {
    if (!sprite.samePalette && sprite.length > 0) {
      const pcx = buffer.subarray(sprite.offset, sprite.offset + sprite.length);
      if (pcx.length >= 769 && pcx[pcx.length - 769] === 0x0c) last = index;
    }
    ownPalette[index] = last;
  });

  function decode(group, item) {
    const index = byKey.get(`${group},${item}`);
    if (index === undefined) return null;
    const meta = sprites[index];
    let sourceIndex = index;
    for (let hops = 0; sprites[sourceIndex].length === 0 && hops < 16; hops += 1) sourceIndex = sprites[sourceIndex].link;
    const source = sprites[sourceIndex];
    if (source.length === 0) return null;
    const image = readPcx(buffer.subarray(source.offset, source.offset + source.length));
    let colors;
    if (source.samePalette || meta.samePalette) {
      const from = ownPalette[sourceIndex];
      colors = act ?? (from !== null ? readPcx(buffer.subarray(sprites[from].offset, sprites[from].offset + sprites[from].length)).palette : image.palette);
    } else {
      colors = image.palette ?? act;
    }
    const rgba = new Uint8Array(image.width * image.height * 4);
    for (let p = 0; p < image.indices.length; p += 1) {
      const color = image.indices[p];
      if (color === 0) continue;
      const [r, g, b] = colors?.[color] ?? [255, 0, 255];
      rgba[p * 4] = r;
      rgba[p * 4 + 1] = g;
      rgba[p * 4 + 2] = b;
      rgba[p * 4 + 3] = 255;
    }
    return { axisX: meta.axisX, axisY: meta.axisY, width: image.width, height: image.height, rgba };
  }

  return { sprites, decode };
}

// options.act: paleta do personagem para o SFF v1 (ver readAct).
export function openSff(path, options = {}) {
  const buffer = readFileSync(path);
  const u16 = (o) => buffer.readUInt16LE(o);
  const s16 = (o) => buffer.readInt16LE(o);
  const u32 = (o) => buffer.readUInt32LE(o);
  if (buffer.toString('latin1', 0, 11) !== 'ElecbyteSpr') throw new Error(`${path} nao e um SFF`);
  if (buffer[15] === 1) return openSffV1(buffer, options);
  if (buffer[15] !== 2) throw new Error(`${path}: versao de SFF sem suporte`);
  const spriteOffset = u32(36), spriteCount = u32(40), paletteOffset = u32(44), literalData = u32(52);

  const sprites = [];
  for (let index = 0; index < spriteCount; index += 1) {
    const o = spriteOffset + index * 28;
    sprites.push({
      group: u16(o), item: u16(o + 2), width: u16(o + 4), height: u16(o + 6),
      axisX: s16(o + 8), axisY: s16(o + 10), link: u16(o + 12), format: buffer[o + 14],
      offset: u32(o + 16), length: u32(o + 20), palette: u16(o + 24),
    });
  }
  const byKey = new Map(sprites.map((sprite) => [`${sprite.group},${sprite.item}`, sprite]));

  // Paleta pelo par grupo,item (a troca "remappal" das Explod do MUGEN).
  const paletteIndex = new Map();
  for (let index = 0; index < u32(48); index += 1) {
    const o = paletteOffset + index * 16;
    paletteIndex.set(`${u16(o)},${u16(o + 2)}`, index);
  }

  const paletteCache = new Map();
  function palette(index) {
    if (!paletteCache.has(index)) {
      let o = paletteOffset + index * 16;
      const count = u16(o + 4);
      // Paleta sem dados proprios reaproveita a de outra (link).
      if (u32(o + 12) === 0) o = paletteOffset + u16(o + 6) * 16;
      const start = literalData + u32(o + 8);
      const colors = [];
      for (let c = 0; c < count; c += 1) {
        colors.push([buffer[start + c * 4], buffer[start + c * 4 + 1], buffer[start + c * 4 + 2]]);
      }
      paletteCache.set(index, colors);
    }
    return paletteCache.get(index);
  }

  // Devolve { width, height, axisX, axisY, rgba } ou null se o sprite nao
  // existe ou usa um formato sem suporte (RLE8/RLE5 dos SFFs antigos).
  // options.remap = [grupo, item]: sprites de efeito (paleta 3,0) usam essa
  // paleta no lugar, como o remappal das Explod.
  function decode(group, item, options = {}) {
    const meta = byKey.get(`${group},${item}`);
    if (!meta) return null;
    let source = meta;
    for (let hops = 0; source.length === 0 && hops < 16; hops += 1) source = sprites[source.link];
    const start = literalData + source.offset;
    const data = Buffer.from(buffer.subarray(start + 4, start + source.length));
    const result = { axisX: meta.axisX, axisY: meta.axisY };

    const remapped = options.remap && source.palette === paletteIndex.get('3,0')
      ? paletteIndex.get(`${options.remap[0]},${options.remap[1]}`)
      : undefined;
    const paletteOf = (index) => palette(remapped ?? index);
    if (source.format === FORMAT_PNG8) {
      const image = readIndexedPng(data);
      const colors = paletteOf(source.palette);
      const background = backgroundMask(image);
      const rgba = new Uint8Array(image.width * image.height * 4);
      for (let p = 0; p < image.indices.length; p += 1) {
        const color = image.indices[p];
        if (color === 0 || background[p]) continue;
        const [r, g, b] = colors[color] ?? [255, 0, 255];
        rgba[p * 4] = r;
        rgba[p * 4 + 1] = g;
        rgba[p * 4 + 2] = b;
        rgba[p * 4 + 3] = 255;
      }
      return { ...result, width: image.width, height: image.height, rgba };
    }
    if (source.format === FORMAT_LZ5) {
      const indices = decodeLz5(data, source.width, source.height);
      const colors = paletteOf(source.palette);
      const background = backgroundMask({ width: source.width, height: source.height, indices });
      const rgba = new Uint8Array(source.width * source.height * 4);
      for (let p = 0; p < indices.length; p += 1) {
        if (indices[p] === 0 || background[p]) continue;
        const [r, g, b] = colors[indices[p]] ?? [255, 0, 255];
        rgba[p * 4] = r;
        rgba[p * 4 + 1] = g;
        rgba[p * 4 + 2] = b;
        rgba[p * 4 + 3] = 255;
      }
      return { ...result, width: source.width, height: source.height, rgba };
    }
    if (source.format === FORMAT_PNG24 || source.format === FORMAT_PNG32) {
      const png = PNG.sync.read(data);
      return { ...result, width: png.width, height: png.height, rgba: new Uint8Array(png.data) };
    }
    return null;
  }

  return { sprites, decode };
}
