import { supabase } from '../../utils/supabaseClient.js';
import { DelayAgreement } from './inputDelay.js';
import { PeerLink, peerSupported } from './PeerLink.js';

// Lockstep com atraso fixo: os dois computadores rodam a luta inteira
// localmente e trocam SO o input, nunca o estado do jogo. O que eu aperto no
// tick T so entra em cena no tick T + NET_INPUT_DELAY, o que da tempo do
// pacote atravessar a internet. Se mesmo assim o input do adversario nao
// chegou na hora, o jogo espera (engasga) em vez de adivinhar - e por isso que
// o motor precisou virar deterministico na fase anterior: com o mesmo input,
// os dois lados chegam exatamente no mesmo resultado sem trocar nada alem
// disso.

// Quantos ticks de antecedencia o input viaja, se a medicao da conexao nao der
// resultado (8 ticks = ~133ms). Normalmente os dois lados combinam um numero
// pela conexao de verdade (src/systems/net/inputDelay.js).
export const NET_INPUT_DELAY = 8;
// Ticks acumulados antes de mandar o lote (3 = 20 pacotes por segundo, em vez
// de 60: o Realtime do Supabase tem limite de mensagens por segundo).
const SEND_EVERY = 3;
// Lote incompleto tambem sai, se ficar parado tempo demais.
const FLUSH_AFTER_MS = 45;
// Sem noticia do adversario por esse tempo, a partida e dada como abandonada.
const SILENCE_TIMEOUT_MS = 10000;
// Antes da primeira mensagem dele a espera e maior: pode estar carregando os
// sprites ainda.
const JOIN_TIMEOUT_MS = 40000;
// Quanto tempo esperar o adversario ficar pronto antes de desistir dele, e de
// quanto em quanto tempo reavisar que eu ja estou.
const READY_TIMEOUT_MS = 90000;
const READY_RETRY_MS = 250;
// Ticks antigos sao jogados fora: uma luta longa encheria a memoria a 60/s.
const KEEP_TICKS = 600;
// Pela conexao direta cada tick sai na hora, com os ultimos quadros de novo (a
// conexao e sem reenvio: um pacote perdido e coberto pelo seguinte).
const DIRECT_REDUNDANCY = 6;
// Quanto esperar a conexao direta abrir antes de combinar o atraso. Se nao
// abrir, a partida segue pelo servidor.
const PEER_OPEN_TIMEOUT_MS = 3500;
const LIVE_PING_EVERY_MS = 1000;

// O comando e so um punhado de booleanos, entao cabe todo num inteiro.
const FLAGS = [
  ['left'], ['right'], ['up'], ['down'], ['guard'],
  ['holding', 'punch'], ['holding', 'kick'], ['holding', 'special'],
  ['jump'], ['punch'], ['kick'], ['special'],
];

export function encodeCommand(command) {
  let mask = 0;
  FLAGS.forEach((path, bit) => {
    const value = path.length === 1 ? command[path[0]] : command[path[0]]?.[path[1]];
    if (value) mask |= 1 << bit;
  });
  return mask;
}

export function decodeCommand(mask) {
  const command = { holding: {} };
  FLAGS.forEach((path, bit) => {
    const on = Boolean(mask & (1 << bit));
    if (path.length === 1) command[path[0]] = on;
    else command[path[0]][path[1]] = on;
  });
  return command;
}

export class LockstepClient {
  // initiator: o lado que abre a conexao direta (o jogador 0 da partida).
  constructor({ matchId, initiator = false, RTC = globalThis.RTCPeerConnection }) {
    this.matchId = matchId;
    this.initiator = initiator;
    this.RTC = RTC;
    this.peer = null;
    this.recent = [];
    this.rtt = null;
    this.pings = new Map();
    this.pingTimer = null;
    this.channel = null;
    this.localByTick = new Map();
    this.remoteByTick = new Map();
    this.pending = [];
    this.lastFlush = 0;
    this.lastRemoteAt = null;
    this.joinedAt = Date.now();
    this.opponentReady = false;
    this.disposed = false;
    this.inputDelay = NET_INPUT_DELAY;
    this.agreement = new DelayAgreement({
      fallback: NET_INPUT_DELAY,
      isDirect: () => Boolean(this.peer?.open),
      send: (event, payload) => this.sendControl(event, payload),
    });
  }

  async join() {
    if (!supabase) throw new Error('Supabase nao configurado.');
    this.channel = supabase.channel(`match:${this.matchId}:play`, {
      config: { broadcast: { self: false } },
    });
    this.bind();
    await new Promise((resolve, reject) => {
      this.channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(new Error(`canal: ${status}`));
      });
    });
  }

  // Registra o que o canal da partida escuta. Separado do join para dar para
  // ligar o cliente a um canal simulado nos testes.
  bind() {
    this.channel.on('broadcast', { event: 'input' }, ({ payload }) => this.ingest(payload.frames));
    for (const event of ['ping', 'pong', 'delay', 'lp', 'lq']) {
      this.channel.on('broadcast', { event: `delay:${event}` }, ({ payload }) => this.control(event, payload));
    }
    // Sinalizacao da conexao direta: oferta, resposta e candidatos ICE.
    this.channel.on('broadcast', { event: 'rtc' }, ({ payload }) => {
      this.lastRemoteAt = Date.now();
      this.ensurePeer()?.handleSignal(payload.kind, payload.data).catch(() => {});
    });
    this.channel.on('broadcast', { event: 'ready' }, () => {
      this.lastRemoteAt = Date.now();
      if (this.opponentReady) return;
      this.opponentReady = true;
      // Responde na hora: o meu "pronto" pode ter saido antes de ele entrar no
      // canal, e nesse caso ele nunca recebeu.
      this.sendReady();
    });
  }

  // Quadros de comando que chegaram (pelo servidor ou pela conexao direta). A
  // mesma tick pode chegar duas vezes: gravar de novo nao muda nada.
  ingest(frames) {
    this.lastRemoteAt = Date.now();
    for (const frame of frames ?? []) this.remoteByTick.set(frame.t, decodeCommand(frame.m));
  }

  // Mensagens de controle (medicao do atraso e ping ao vivo).
  control(event, payload) {
    this.lastRemoteAt = Date.now();
    if (event === 'lp') {
      this.sendControl('lq', payload);
    } else if (event === 'lq') {
      // A resposta chega pelos dois caminhos: vale a primeira.
      const sentAt = this.pings.get(payload.id);
      if (sentAt === undefined) return;
      this.pings.delete(payload.id);
      const sample = performance.now() - sentAt;
      this.rtt = this.rtt === null ? sample : this.rtt * 0.7 + sample * 0.3;
    } else {
      this.agreement.receive(event, payload);
    }
  }

  // Controle sai pelos dois caminhos: o que chegar primeiro vale.
  sendControl(event, payload) {
    this.channel?.send({ type: 'broadcast', event: `delay:${event}`, payload });
    this.peer?.send(JSON.stringify({ c: event, p: payload }));
  }

  ensurePeer() {
    if (this.peer || !peerSupported(this.RTC) || this.disposed) return this.peer;
    this.peer = new PeerLink({
      initiator: this.initiator,
      RTC: this.RTC,
      signal: (kind, data) => this.channel?.send({ type: 'broadcast', event: 'rtc', payload: { kind, data } }),
      onMessage: (text) => {
        let message;
        try { message = JSON.parse(text); } catch { return; }
        if (message.frames) this.ingest(message.frames);
        else if (message.c) this.control(message.c, message.p);
      },
    });
    return this.peer;
  }

  // Tenta abrir a conexao direta. Devolve true se abriu a tempo; senao a
  // partida segue pelo servidor, como sempre foi.
  async openPeer(timeoutMs = PEER_OPEN_TIMEOUT_MS) {
    const peer = this.ensurePeer();
    if (!peer) return false;
    if (this.initiator) peer.start().catch(() => {});
    const started = Date.now();
    while (!peer.open && !this.disposed && Date.now() - started < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return peer.open;
  }

  // 'p2p' (direto) ou 'relay' (pelo servidor), e o ping medido ao vivo (ms).
  get stats() {
    return { transport: this.peer?.open ? 'p2p' : 'relay', rtt: this.rtt };
  }

  startPingLoop() {
    if (this.pingTimer) return;
    let id = 0;
    this.pingTimer = setInterval(() => {
      id += 1;
      this.pings.set(id, performance.now());
      if (this.pings.size > 20) this.pings.delete(this.pings.keys().next().value);
      this.sendControl('lp', { id });
    }, LIVE_PING_EVERY_MS);
  }

  sendReady() {
    this.channel?.send({ type: 'broadcast', event: 'ready', payload: {} });
  }

  // Ninguem pode comecar a simular antes dos dois estarem no canal: o
  // Realtime nao guarda mensagem pra quem chega depois, entao o input que o
  // mais rapido mandasse enquanto o outro ainda carregava se perderia, e o
  // que chegasse depois travaria esperando ticks que nunca vem.
  //
  // Devolve false se o adversario nunca apareceu (fechou o jogo carregando).
  async waitForOpponent(timeoutMs = READY_TIMEOUT_MS) {
    if (this.opponentReady) return true;
    this.sendReady();
    const started = Date.now();
    return new Promise((resolve) => {
      const timer = setInterval(() => {
        if (this.opponentReady || this.disposed) {
          clearInterval(timer);
          resolve(this.opponentReady);
          return;
        }
        if (Date.now() - started > timeoutMs) {
          clearInterval(timer);
          resolve(false);
          return;
        }
        this.sendReady();
      }, READY_RETRY_MS);
    });
  }

  // Mede a conexao e combina o atraso com o outro lado (os dois ficam com o
  // mesmo numero). Chamar depois de waitForOpponent. Devolve false se o outro
  // parou de responder no meio.
  async agreeDelay() {
    // Primeiro tenta o caminho direto: as medicoes e o atraso saem dele.
    await this.openPeer();
    const agreed = await this.agreement.run();
    if (agreed === null) return false;
    this.inputDelay = agreed;
    this.startPingLoop();
    return true;
  }

  // Guarda o que eu apertei e enfileira pro adversario.
  schedule(tick, command) {
    this.localByTick.set(tick, command);
    const frame = { t: tick, m: encodeCommand(command) };
    this.pending.push(frame);
    if (this.pending.length >= SEND_EVERY) this.flush();
    // Conexao direta: todo tick sai na hora, repetindo os ultimos quadros.
    if (this.peer?.open) {
      this.recent.push(frame);
      if (this.recent.length > DIRECT_REDUNDANCY) this.recent.shift();
      this.peer.send(JSON.stringify({ frames: this.recent }));
    }
  }

  flush() {
    if (this.pending.length === 0 || !this.channel) return;
    this.channel.send({ type: 'broadcast', event: 'input', payload: { frames: this.pending } });
    this.pending = [];
    this.lastFlush = Date.now();
  }

  // Chamado uma vez por quadro: um lote incompleto nao pode ficar parado
  // esperando encher, senao o outro lado engasga a toa.
  flushIfStale() {
    if (this.pending.length > 0 && Date.now() - this.lastFlush >= FLUSH_AFTER_MS) this.flush();
  }

  localCommand(tick) {
    return this.localByTick.get(tick) ?? null;
  }

  remoteCommand(tick) {
    return this.remoteByTick.get(tick) ?? null;
  }

  // Da pra simular esse tick? Os primeiros ticks ninguem agendou (o input so
  // comeca a valer depois do atraso), entao rodam com comando neutro.
  canStep(tick) {
    if (tick <= this.inputDelay) return true;
    return this.remoteByTick.has(tick);
  }

  forget(beforeTick) {
    const cutoff = beforeTick - KEEP_TICKS;
    if (cutoff <= 0) return;
    for (const tick of this.localByTick.keys()) if (tick < cutoff) this.localByTick.delete(tick);
    for (const tick of this.remoteByTick.keys()) if (tick < cutoff) this.remoteByTick.delete(tick);
  }

  // Adversario sumiu (fechou o jogo, caiu a internet)?
  get abandoned() {
    const since = this.lastRemoteAt ?? this.joinedAt;
    const limit = this.lastRemoteAt ? SILENCE_TIMEOUT_MS : JOIN_TIMEOUT_MS;
    return Date.now() - since > limit;
  }

  dispose() {
    this.disposed = true;
    clearInterval(this.pingTimer);
    this.pingTimer = null;
    this.peer?.close();
    if (!this.channel) return;
    supabase.removeChannel(this.channel);
    this.channel = null;
  }
}
