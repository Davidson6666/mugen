// Mede a rede da partida online: abre dois Chromes na mesma partida (com o
// Supabase de verdade) e compara o tempo que um comando leva de um para o outro
// so pelo servidor e com a conexao direta. Na mesma maquina a conexao direta e
// quase instantanea; para o numero real, rode a luta online entre dois
// computadores e olhe o indicador "ONLINE · DIRETO · xx MS" no canto da tela.
//
//   npm run dev        (em outro terminal, porta 5199: npm run dev -- --port 5199)
//   npm run net:check [-- http://localhost:5199/]
import { abrir } from './lib/cdp.mjs';

const URL = process.argv[2] ?? 'http://localhost:5199/';

async function rodar(modo) {
  const matchId = `teste-${modo}-${Date.now()}`;
  const [pa, pb] = await Promise.all([abrir(URL), abrir(URL)]);
  await Promise.all([pa.esperar(3500), pb.esperar(3500)]);
  const codigo = (lado) => `(async () => {
    const { LockstepClient } = await import('/src/systems/net/LockstepClient.js');
    const rtc = ${modo === 'direto'} ? globalThis.RTCPeerConnection : null;
    const net = new LockstepClient({ matchId: ${JSON.stringify(matchId)}, initiator: ${lado === 'a'}, RTC: rtc });
    await net.join();
    const pronto = await net.waitForOpponent(20000);
    const acordo = pronto && await net.agreeDelay();
    const marca = () => performance.timeOrigin + performance.now();
    const info = { pronto, acordo, atraso: net.inputDelay, transporte: net.stats.transport };
    const T0 = 5000;
    if ('${lado}' === 'a') {
      // A manda um comando por tick (16,7 ms), anotando a hora de cada um.
      const enviados = {};
      for (let t = T0; t < T0 + 90; t += 1) {
        enviados[t] = marca();
        net.schedule(t, { left: false, right: false, up: false, down: false, guard: false, jump: false, punch: t % 2 === 0, kick: false, special: false, holding: {} });
        await new Promise((r) => setTimeout(r, 16));
      }
      net.flush();
      await new Promise((r) => setTimeout(r, 1500));
      info.enviados = enviados;
    } else {
      // B anota a hora em que cada tick de A fica conhecido.
      const vistos = {};
      const fim = marca() + 4500;
      while (marca() < fim) {
        for (let t = T0; t < T0 + 90; t += 1) if (vistos[t] === undefined && net.remoteByTick.has(t)) vistos[t] = marca();
        await new Promise((r) => setTimeout(r, 1));
      }
      info.vistos = vistos;
    }
    await new Promise((r) => setTimeout(r, 2200));
    info.pingAoVivo = net.rtt === null ? null : Math.round(net.rtt);
    net.dispose();
    return info;
  })()`;
  const roda = (pagina, lado) => pagina.enviar('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: codigo(lado) });
  const [ra, rb] = await Promise.all([roda(pa, 'a'), roda(pb, 'b')]);
  const a = ra.result.result?.value; const b = rb.result.result?.value;
  const erro = ra.result.exceptionDetails ?? rb.result.exceptionDetails;
  await Promise.all([pa.fechar(), pb.fechar()]);
  if (!a || !b) return { modo, erro: JSON.stringify(erro ?? ra.result).slice(0, 400) };
  const lat = Object.keys(a.enviados).filter((t) => b.vistos[t] !== undefined).map((t) => b.vistos[t] - a.enviados[t]).sort((x, y) => x - y);
  return {
    modo, atraso: [a.atraso, b.atraso], transporte: [a.transporte, b.transporte], recebidos: `${lat.length}/90`,
    comandoMedianaMs: Math.round(lat[Math.floor(lat.length / 2)]), comandoP90Ms: Math.round(lat[Math.floor(lat.length * 0.9)]), comandoPiorMs: Math.round(lat.at(-1)),
    pingAoVivoMs: [a.pingAoVivo, b.pingAoVivo],
  };
}

console.log('--- so pelo servidor (como era)');
console.log(JSON.stringify(await rodar('servidor')));
console.log('--- com conexao direta');
console.log(JSON.stringify(await rodar('direto')));
