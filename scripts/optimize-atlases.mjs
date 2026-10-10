// Converte as paginas de atlas dos personagens importados do MUGEN de PNG para
// WebP sem perda: os pixels saem identicos e o arquivo pesa cerca da metade
// (o jogo baixa dois lutadores a cada partida, uns 20 MB; assim cai para ~11).
//
// So mexe nas paginas "<id>_atlas_N.png" que os scripts import-*.mjs geram. O
// Ensina GOD e o Humberto tem sprites montados a mao, com nomes que outros
// scripts e testes leem, e ficam como estao.
//
// Reimportar um personagem recria os PNG: depois dele, rode
//   npm run assets:optimize
// Pode rodar de novo sem problema (o que ja e WebP e ignorado).
import { readdirSync, readFileSync, statSync, unlinkSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHARACTERS = join(ROOT, 'public/assets/characters');
const ATLAS = /^(.+)_atlas_\d+\.png$/;

let before = 0;
let after = 0;
let converted = 0;

for (const id of readdirSync(CHARACTERS)) {
  const configPath = join(CHARACTERS, id, `${id}_config.json`);
  if (!existsSync(configPath)) continue;
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  if (!Array.isArray(config.sheets)) continue;

  let changed = false;
  const sheets = [];
  for (const file of config.sheets) {
    const match = ATLAS.exec(file);
    const source = join(CHARACTERS, id, file);
    if (!match || match[1] !== id || !existsSync(source)) {
      sheets.push(file);
      continue;
    }
    const target = file.replace(/\.png$/, '.webp');
    await sharp(source).webp({ lossless: true, effort: 6 }).toFile(join(CHARACTERS, id, target));
    before += statSync(source).size;
    after += statSync(join(CHARACTERS, id, target)).size;
    unlinkSync(source);
    sheets.push(target);
    changed = true;
    converted += 1;
  }

  if (changed) {
    config.sheets = sheets;
    // Novo nome, nova versao: o navegador nao reaproveita a pagina antiga.
    config.assetVersion = createHash('sha1').update(sheets.join('|') + after).digest('hex').slice(0, 8);
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
    console.log(`  ${id}: ${sheets.length} pagina(s)`);
  }
}

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);
console.log(converted === 0
  ? 'Nada a converter: todas as paginas ja estao em WebP.'
  : `${converted} paginas: ${mb(before)} MB -> ${mb(after)} MB (${Math.round((after / before) * 100)}%).`);
