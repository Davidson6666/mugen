import { supabase } from '../../utils/supabaseClient.js';

// Lockstep com atraso fixo: os dois computadores rodam a luta inteira
// localmente e trocam SO o input, nunca o estado do jogo. O que eu aperto no
// tick T so entra em cena no tick T + NET_INPUT_DELAY, o que da tempo do
// pacote atravessar a internet. Se mesmo assim o input do adversario nao
// chegou na hora, o jogo espera (engasga) em vez de adivinhar - e por isso que
// o motor precisou virar deterministico na fase anterior: com o mesmo input,
// os dois lados chegam exatamente no mesmo resultado sem trocar nada alem
// disso.

// Quantos ticks de antecedencia o input viaja (8 ticks = ~133ms).
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
// Ticks antigos sao jogados fora: uma luta longa encheria a memoria a 60/s.
const KEEP_TICKS = 600;

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
  constructor({ matchId }) {
    this.matchId = matchId;
    this.channel = null;
    this.localByTick = new Map();
    this.remoteByTick = new Map();
    this.pending = [];
    this.lastFlush = 0;
    this.lastRemoteAt = null;
    this.joinedAt = Date.now();
  }

  async join() {
    if (!supabase) throw new Error('Supabase nao configurado.');
    this.channel = supabase.channel(`match:${this.matchId}:play`, {
      config: { broadcast: { self: false } },
    });
    this.channel.on('broadcast', { event: 'input' }, ({ payload }) => {
      this.lastRemoteAt = Date.now();
      for (const frame of payload.frames ?? []) {
        this.remoteByTick.set(frame.t, decodeCommand(frame.m));
      }
    });
    await new Promise((resolve, reject) => {
      this.channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(new Error(`canal: ${status}`));
      });
    });
  }

  // Guarda o que eu apertei e enfileira pro adversario.
  schedule(tick, command) {
    this.localByTick.set(tick, command);
    this.pending.push({ t: tick, m: encodeCommand(command) });
    if (this.pending.length >= SEND_EVERY) this.flush();
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
    if (tick <= NET_INPUT_DELAY) return true;
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
    if (!this.channel) return;
    supabase.removeChannel(this.channel);
    this.channel = null;
  }
}
