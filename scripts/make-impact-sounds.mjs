// Sons de impacto compartilhados por todo o elenco (o "baque" do golpe que
// acerta). Os pacotes MUGEN tocam esses sons pelo fight.snd comum, que o jogo
// nao tem; aqui saem do .snd do Killua (grupo 5, os sons de acerto do pacote):
//   impact_hit_a  = 5,58  acerto leve (soco, rasteira)
//   impact_hit_b  = 5,76  acerto medio (chute)
//   impact_heavy  = 5,77  acerto forte (lancador, fim de sequencia)
// O bloqueio e o nocaute usam esses mesmos sons com outra altura e volume,
// ajustados no AudioManager. Precisa do pacote em assets-src/killua/mugen/ e
// do ffmpeg. Para regerar: npm run assets:impact
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openSnd } from './lib/snd.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'public/assets/sfx');
const SOURCES = { impact_hit_a: [5, 58], impact_hit_b: [5, 76], impact_heavy: [5, 77] };

const snd = openSnd(resolve(ROOT, 'assets-src/killua/mugen/Killua.snd'));
mkdirSync(OUT, { recursive: true });
for (const [name, [group, item]] of Object.entries(SOURCES)) {
  const wav = snd.get(group, item);
  if (!wav) throw new Error(`som ${group},${item} (${name}) nao existe no .snd`);
  const mp3 = resolve(OUT, `${name}.mp3`);
  const converted = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', 'pipe:0', '-b:a', '112k', mp3], { input: wav });
  if (converted.status !== 0) {
    // Sem ffmpeg o WAV serve do mesmo jeito (sao sons curtos).
    writeFileSync(resolve(OUT, `${name}.wav`), wav);
    console.log(`  ${name}.wav (sem ffmpeg)`);
  } else {
    console.log(`  ${name}.mp3`);
  }
}
console.log('Pronto: public/assets/sfx');
