// Leitor de .air (animacoes do MUGEN). Cada acao vira uma lista de quadros com
// sprite, deslocamento, duracao em ticks (60/s), espelhamento e as caixas:
// clsn1 = onde o golpe acerta, clsn2 = onde o personagem pode ser acertado.
// Coordenadas das caixas relativas ao eixo do sprite (pe), y negativo para cima.
import { readFileSync } from 'node:fs';

const BOX = /=\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)/;

function readBoxes(lines, start, count) {
  const boxes = [];
  for (let k = 0; k < count; k += 1) {
    const match = lines[start + k]?.match(BOX);
    if (!match) continue;
    const [x1, y1, x2, y2] = match.slice(1).map(Number);
    boxes.push({ x1: Math.min(x1, x2), y1: Math.min(y1, y2), x2: Math.max(x1, x2), y2: Math.max(y1, y2) });
  }
  return boxes;
}

export function readAir(path) {
  const lines = readFileSync(path, 'latin1')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/;.*/, '').trim());

  const actions = new Map();
  let action = null;
  let defaultClsn1 = [], defaultClsn2 = [];
  let nextClsn1 = null, nextClsn2 = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) continue;

    const header = line.match(/^\[\s*begin\s+action\s+(-?\d+)\s*\]/i);
    if (header) {
      action = { id: Number(header[1]), frames: [], loopStart: 0 };
      actions.set(action.id, action);
      defaultClsn1 = [];
      defaultClsn2 = [];
      nextClsn1 = null;
      nextClsn2 = null;
      continue;
    }
    if (!action) continue;

    // "Clsn2Default: n" vale para os quadros seguintes; "Clsn1: n" so para o
    // proximo quadro.
    const clsn = line.match(/^clsn([12])(default)?\s*:\s*(\d+)/i);
    if (clsn) {
      const count = Number(clsn[3]);
      const boxes = readBoxes(lines, index + 1, count);
      index += count;
      if (clsn[1] === '1') {
        if (clsn[2]) defaultClsn1 = boxes;
        else nextClsn1 = boxes;
      } else if (clsn[2]) {
        defaultClsn2 = boxes;
      } else {
        nextClsn2 = boxes;
      }
      continue;
    }

    if (/^loopstart/i.test(line)) {
      action.loopStart = action.frames.length;
      continue;
    }

    const fields = line.split(',').map((field) => field.trim());
    if (fields.length >= 5 && /^-?\d+$/.test(fields[0])) {
      action.frames.push({
        group: Number(fields[0]),
        item: Number(fields[1]),
        x: Number(fields[2]) || 0,
        y: Number(fields[3]) || 0,
        time: Number(fields[4]),
        flip: (fields[5] ?? '').toUpperCase(),
        // "A"/"A1"/"AS...D..." = mistura aditiva (brilho sobre fundo preto).
        blend: (fields[6] ?? '').toUpperCase(),
        // MUGEN 1.1: escala e rotacao por quadro (efeitos desenhados grandes e
        // reduzidos na animacao, como nos pacotes estilo J-Stars).
        xscale: fields[7] ? Number(fields[7]) || 1 : 1,
        yscale: fields[8] ? Number(fields[8]) || 1 : 1,
        angle: fields[9] ? Number(fields[9]) || 0 : 0,
        clsn1: nextClsn1 ?? defaultClsn1,
        clsn2: nextClsn2 ?? defaultClsn2,
      });
      nextClsn1 = null;
      nextClsn2 = null;
    }
  }
  return actions;
}
