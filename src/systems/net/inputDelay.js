// Atraso de input combinado entre os dois computadores de uma partida online.
//
// No lockstep, o que eu aperto no tick T so vale no tick T + atraso. Atraso
// pequeno deixa os controles leves, mas se o pacote demora mais que ele o jogo
// engasga esperando; atraso grande nunca engasga, mas o controle fica pesado.
// Em vez de um numero fixo, cada lado mede o tempo de ida e volta das
// mensagens, propoe um atraso, e os dois usam o MAIOR dos dois - os dois
// precisam usar exatamente o mesmo, senao um espera ticks que o outro nunca
// manda e a partida congela.

export const MIN_INPUT_DELAY = 4;
export const MAX_INPUT_DELAY = 14;
const TICK_MS = 1000 / 60;
// O lote de input sai a cada 3 ticks (ou 45 ms parado): soma no caminho.
const BATCH_MS = 50;
// Folga para a variacao da rede (um pacote que atrasa um pouco mais).
const JITTER_MS = 30;

// Atraso (em ticks) para uma conexao com essas medidas de ida e volta (ms).
// Usa a mediana: um pico isolado nao deve deixar a partida inteira pesada.
export function proposeDelay(rttSamples) {
  if (!rttSamples.length) return null;
  const sorted = [...rttSamples].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const ticks = Math.ceil((median / 2 + BATCH_MS + JITTER_MS) / TICK_MS);
  return Math.min(MAX_INPUT_DELAY, Math.max(MIN_INPUT_DELAY, ticks));
}

// Uma ponta da combinacao. send(event, payload) manda pelo canal; o canal
// entrega as mensagens do outro lado em receive(event, payload).
export class DelayAgreement {
  constructor({ send, now = () => Date.now(), fallback }) {
    this.send = send;
    this.now = now;
    this.fallback = fallback;
    this.samples = [];
    this.sentAt = new Map();
    this.mine = null;
    this.theirs = null;
  }

  receive(event, payload) {
    if (event === 'ping') this.send('pong', { id: payload.id });
    if (event === 'pong' && this.sentAt.has(payload.id)) {
      this.samples.push(this.now() - this.sentAt.get(payload.id));
      this.sentAt.delete(payload.id);
    }
    if (event === 'delay') {
      this.theirs = payload.ticks;
      // Responde sempre (a minha proposta pode ter se perdido ou saido antes
      // de ele estar ouvindo), mas resposta nao gera resposta: sem eco infinito.
      if (!payload.reply && this.mine !== null) this.send('delay', { ticks: this.mine, reply: true });
    }
  }

  get agreed() {
    return this.mine !== null && this.theirs !== null ? Math.max(this.mine, this.theirs) : null;
  }

  // Mede, propoe e espera a proposta do outro. Devolve o atraso combinado, ou
  // null se o outro nao respondeu a tempo (ai a partida nao deve comecar).
  async run({ pings = 5, interval = 80, timeoutMs = 8000, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
    for (let id = 0; id < pings; id += 1) {
      this.sentAt.set(id, this.now());
      this.send('ping', { id });
      await wait(interval);
    }
    // Ultimas respostas ainda a caminho.
    await wait(interval * 2);
    this.mine = proposeDelay(this.samples) ?? this.fallback;
    // Manda pelo menos uma vez: a dele pode ja ter chegado enquanto eu media.
    this.send('delay', { ticks: this.mine });
    const started = this.now();
    while (this.agreed === null) {
      if (this.now() - started > timeoutMs) return null;
      this.send('delay', { ticks: this.mine });
      await wait(interval * 2);
    }
    return this.agreed;
  }
}
