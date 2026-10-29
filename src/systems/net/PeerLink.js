// Conexao direta entre os dois jogadores (WebRTC DataChannel). O Supabase so
// serve para eles se acharem (troca de oferta, resposta e candidatos ICE pelo
// mesmo canal da partida): os comandos passam direto, sem dar a volta pelo
// servidor, que media 100 ms de ida e volta.
//
// E um atalho, nunca a unica via: se a conexao direta nao abrir (alguns roteadores
// nao deixam) ou cair, o LockstepClient continua pelo servidor como antes.

const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function peerSupported(RTC = globalThis.RTCPeerConnection) {
  return typeof RTC === 'function';
}

export class PeerLink {
  // initiator: quem abre o canal e manda a oferta (o lado 0 da partida).
  // signal(kind, data): entrega uma mensagem de sinalizacao ao outro lado.
  // onMessage(text): chegou texto pelo canal direto.
  // onChange(open): o canal abriu ou fechou.
  constructor({ initiator, signal, onMessage, onChange = () => {}, RTC = globalThis.RTCPeerConnection, iceServers = DEFAULT_ICE_SERVERS }) {
    this.initiator = initiator;
    this.signal = signal;
    this.onMessage = onMessage;
    this.onChange = onChange;
    this.RTC = RTC;
    this.iceServers = iceServers;
    this.pc = null;
    this.channel = null;
    this.queuedIce = [];
    this.remoteSet = false;
    this.closed = false;
    this.started = false;
  }

  get open() {
    return this.channel?.readyState === 'open';
  }

  // Cria a conexao. O iniciador abre o canal e manda a oferta; o outro espera.
  async start() {
    if (this.started || this.closed) return;
    this.started = true;
    this.pc = new this.RTC({ iceServers: this.iceServers });
    this.pc.onicecandidate = (event) => {
      if (event.candidate) this.signal('ice', event.candidate.toJSON ? event.candidate.toJSON() : event.candidate);
    };
    this.pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(this.pc?.connectionState)) this.onChange(false);
    };
    this.pc.ondatachannel = (event) => this.attach(event.channel);
    if (!this.initiator) return;
    // Sem ordem e sem reenvio: um comando atrasado nao vale esperar, o
    // LockstepClient manda os ultimos quadros de novo a cada tick.
    this.attach(this.pc.createDataChannel('lockstep', { ordered: false, maxRetransmits: 0 }));
    await this.pc.setLocalDescription(await this.pc.createOffer());
    this.signal('offer', this.pc.localDescription.toJSON ? this.pc.localDescription.toJSON() : this.pc.localDescription);
  }

  attach(channel) {
    this.channel = channel;
    channel.onopen = () => this.onChange(true);
    channel.onclose = () => this.onChange(false);
    channel.onmessage = (event) => this.onMessage(typeof event.data === 'string' ? event.data : '');
    if (channel.readyState === 'open') this.onChange(true);
  }

  // Mensagem de sinalizacao vinda do outro lado.
  async handleSignal(kind, data) {
    if (this.closed) return;
    await this.start();
    if (kind === 'offer' && !this.initiator) {
      await this.pc.setRemoteDescription(data);
      this.remoteSet = true;
      await this.flushIce();
      await this.pc.setLocalDescription(await this.pc.createAnswer());
      this.signal('answer', this.pc.localDescription.toJSON ? this.pc.localDescription.toJSON() : this.pc.localDescription);
    } else if (kind === 'answer' && this.initiator) {
      await this.pc.setRemoteDescription(data);
      this.remoteSet = true;
      await this.flushIce();
    } else if (kind === 'ice') {
      if (this.remoteSet) await this.pc.addIceCandidate(data).catch(() => {});
      else this.queuedIce.push(data);
    }
  }

  async flushIce() {
    const queued = this.queuedIce;
    this.queuedIce = [];
    for (const candidate of queued) await this.pc.addIceCandidate(candidate).catch(() => {});
  }

  send(text) {
    if (!this.open) return false;
    try {
      this.channel.send(text);
      return true;
    } catch {
      return false;
    }
  }

  close() {
    this.closed = true;
    try { this.channel?.close(); } catch { /* ja fechado */ }
    try { this.pc?.close(); } catch { /* ja fechado */ }
    this.channel = null;
    this.pc = null;
  }
}
