import { readFileSync } from 'node:fs';

// SND do MUGEN (v1, "ElecbyteSnd"): lista encadeada de sons, cada um um WAV
// inteiro. Devolve { sounds: [{ group, item, wav }], get(group, item) }.
export function openSnd(path) {
  const buffer = readFileSync(path);
  const signature = buffer.toString('latin1', 0, 11);
  if (signature !== 'ElecbyteSnd') throw new Error(`${path}: nao e um SND do MUGEN`);
  const count = buffer.readUInt32LE(16);
  const sounds = [];
  let offset = buffer.readUInt32LE(20);
  for (let index = 0; index < count && offset > 0 && offset < buffer.length; index += 1) {
    const next = buffer.readUInt32LE(offset);
    const length = buffer.readUInt32LE(offset + 4);
    const group = buffer.readUInt32LE(offset + 8);
    const item = buffer.readUInt32LE(offset + 12);
    const start = offset + 16;
    sounds.push({ group, item, wav: buffer.subarray(start, start + length) });
    if (next <= offset) break;
    offset = next;
  }
  const byKey = new Map(sounds.map((sound) => [`${sound.group},${sound.item}`, sound]));
  return { sounds, get: (group, item) => byKey.get(`${group},${item}`)?.wav ?? null };
}

// Duracao aproximada de um WAV PCM (segundos), pelo cabecalho.
export function wavSeconds(wav) {
  if (wav.toString('latin1', 0, 4) !== 'RIFF') return 0;
  let offset = 12;
  let byteRate = 0;
  while (offset + 8 <= wav.length) {
    const id = wav.toString('latin1', offset, offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    if (id === 'fmt ') byteRate = wav.readUInt32LE(offset + 16);
    if (id === 'data') return byteRate ? size / byteRate : 0;
    offset += 8 + size + (size % 2);
  }
  return 0;
}
