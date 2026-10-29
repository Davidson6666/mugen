// Teste de fumaca das telas: abre o jogo num Chrome de verdade, passa por cada
// tela e falha se aparecer erro de console ou a tela nao carregar. Os testes de
// `npm test` cobrem a simulacao; este cobre a interface.
//
//   npm run smoke                     sobe o servidor sozinho (porta 5198)
//   npm run smoke -- http://localhost:5199/   usa um servidor que ja esta rodando
//   CHROME_PATH=... npm run smoke     se o Chrome nao for achado
import { spawn } from 'node:child_process';
import { abrir } from './lib/cdp.mjs';

const externo = process.argv[2];
const port = 5198;
const url = externo ?? `http://localhost:${port}/`;
let servidor = null;

async function esperarServidor() {
  for (let i = 0; i < 60; i += 1) {
    try { if ((await fetch(url)).ok) return; } catch { /* ainda subindo */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`servidor nao respondeu em ${url}`);
}

if (!externo) {
  servidor = spawn('npx', ['vite', '--port', String(port), '--strictPort'], { stdio: 'ignore', shell: true });
}

// Ruido conhecido que nao e do jogo (o Supabase fora do ar, extensoes).
const IGNORAR = [/supabase/i, /Failed to fetch/i, /ERR_NAME_NOT_RESOLVED/i, /favicon/i];

const TELAS = [
  { nome: 'abertura', espera: 1200, teclas: [] },
  { nome: 'menu principal', espera: 4500, teclas: [] },
  { nome: 'selecao de personagem', espera: 1500, teclas: [['Enter', 'Enter']] },
  { nome: 'selecao de cenario', espera: 1500, teclas: [['Enter', 'Enter']] },
  { nome: 'versus e luta', espera: 9000, teclas: [['Enter', 'Enter'], ['Enter', 'Enter'], ['Enter', 'Enter']] },
  { nome: 'pausa', espera: 700, teclas: [['Escape', 'Escape']] },
  { nome: 'lista de golpes', espera: 800, teclas: [['s', 'KeyS'], ['Enter', 'Enter']] },
];
const DO_MENU = [['ranking', 3], ['conquistas', 4], ['configuracoes', 7], ['login', 1], ['area de treino', 6], ['modo historia', 5]];

let falhas = 0;
function conferir(nome, pagina, desde) {
  const erros = pagina.erros.slice(desde).filter((erro) => !IGNORAR.some((padrao) => padrao.test(String(erro))));
  const corpo = erros.length ? `FALHOU (${erros.length}): ${String(erros[0]).slice(0, 140)}` : 'ok';
  if (erros.length) falhas += 1;
  console.log(`${nome.padEnd(24)} ${corpo}`);
}

try {
  if (servidor) await esperarServidor();
  // Fluxo da luta: uma sessao so, tela apos tela.
  const luta = await abrir(url);
  await luta.enviar('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await luta.enviar('Page.navigate', { url });
  for (const tela of TELAS) {
    const desde = luta.erros.length;
    for (const [key, code] of tela.teclas) { await luta.tecla(key, code, 60); await luta.esperar(500); }
    await luta.esperar(tela.espera);
    conferir(tela.nome, luta, desde);
  }
  await luta.fechar();
  // Telas do menu: uma sessao nova para cada.
  for (const [nome, baixo] of DO_MENU) {
    const pagina = await abrir(url);
    await pagina.enviar('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
    await pagina.enviar('Page.navigate', { url });
    await pagina.esperar(5500);
    const desde = pagina.erros.length;
    for (let i = 0; i < baixo; i += 1) { await pagina.tecla('s', 'KeyS', 1); await pagina.esperar(110); }
    await pagina.tecla('Enter', 'Enter');
    await pagina.esperar(2500);
    conferir(nome, pagina, desde);
    await pagina.fechar();
  }
} finally {
  servidor?.kill();
  if (process.platform === 'win32' && servidor) spawn('taskkill', ['/pid', String(servidor.pid), '/T', '/F'], { stdio: 'ignore' });
}
console.log(falhas ? `\n${falhas} tela(s) com erro` : '\nTodas as telas abriram sem erro de console.');
process.exit(falhas ? 1 : 0);
