// Texto do indicador de rede da partida online: por onde os comandos passam
// (conexao direta ou servidor) e o ping medido ao vivo.
export function netLabelText({ transport, rtt }) {
  const way = transport === 'p2p' ? 'DIRETO' : 'SERVIDOR';
  return rtt === null ? `ONLINE · ${way}` : `ONLINE · ${way} · ${Math.round(rtt)} MS`;
}

// Verde bom, amarelo ok, vermelho ruim (a luta engasga acima de ~150 ms).
export function netLabelColor(rtt) {
  if (rtt === null) return 0xffffff;
  if (rtt < 70) return 0x4be37a;
  if (rtt < 150) return 0xffd400;
  return 0xff5a4a;
}
