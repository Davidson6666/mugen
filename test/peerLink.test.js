import test from 'node:test';
import assert from 'node:assert/strict';
import { PeerLink, peerSupported } from '../src/systems/net/PeerLink.js';
import { LockstepClient, decodeCommand, encodeCommand } from '../src/systems/net/LockstepClient.js';
import { proposeDelay } from '../src/systems/net/inputDelay.js';

// ---- Conexao WebRTC falsa, em memoria, so o que o PeerLink usa ----
// Cada instancia tem um "par": quando os dois lados trocam oferta e resposta, o
// canal de dados abre nos dois.
function makeFakeRTC() {
  const peers = [];
  class FakeChannel {
    constructor(owner) { this.owner = owner; this.readyState = 'connecting'; this.sent = []; }
    send(text) { if (this.readyState !== 'open') throw new Error('canal fechado'); this.sent.push(text); this.twin?.onmessage?.({ data: text }); }
    close() { this.readyState = 'closed'; this.onclose?.(); }
  }
  class FakeRTC {
    constructor() {
      peers.push(this);
      this.remote = null;
      this.iceAdded = [];
      this.connectionState = 'new';
    }
    createDataChannel() { this.local = new FakeChannel(this); return this.local; }
    async createOffer() { return { type: 'offer', sdp: `offer-${peers.indexOf(this)}` }; }
    async createAnswer() { return { type: 'answer', sdp: `answer-${peers.indexOf(this)}` }; }
    async setLocalDescription(desc) {
      this.localDescription = { ...desc, toJSON: () => desc };
      // Candidato ICE saindo logo depois da descricao local, como no navegador.
      setTimeout(() => this.onicecandidate?.({ candidate: { toJSON: () => ({ candidate: `cand-${peers.indexOf(this)}` }) } }), 0);
    }
    async setRemoteDescription(desc) {
      this.remote = desc;
      if (desc.type === 'offer') return;
      // Resposta recebida pelo iniciador: abre o canal dos dois lados.
      const other = peers.find((peer) => peer !== this && peer.remote?.type === 'offer');
      assert.ok(other, 'a resposta chegou sem oferta do outro lado');
      const mine = this.local;
      const theirs = new FakeChannel(other);
      mine.twin = theirs; theirs.twin = mine;
      other.ondatachannel?.({ channel: theirs });
      mine.readyState = 'open'; theirs.readyState = 'open';
      mine.onopen?.(); theirs.onopen?.();
    }
    async addIceCandidate(candidate) {
      if (!this.remote) throw new Error('candidato antes da descricao remota');
      this.iceAdded.push(candidate);
    }
    close() { this.connectionState = 'closed'; this.onconnectionstatechange?.(); }
  }
  return FakeRTC;
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

function pair() {
  const RTC = makeFakeRTC();
  const received = { a: [], b: [] };
  const changes = { a: [], b: [] };
  let a; let b;
  a = new PeerLink({ initiator: true, RTC, signal: (kind, data) => b.handleSignal(kind, data), onMessage: (t) => received.a.push(t), onChange: (o) => changes.a.push(o) });
  b = new PeerLink({ initiator: false, RTC, signal: (kind, data) => a.handleSignal(kind, data), onMessage: (t) => received.b.push(t), onChange: (o) => changes.b.push(o) });
  return { a, b, received, changes };
}

test('peer: oferta, resposta e candidatos abrem o canal nos dois lados', async () => {
  const { a, b, changes } = pair();
  await a.start();
  await tick();
  assert.ok(a.open && b.open);
  assert.deepEqual(changes.a, [true]);
  assert.deepEqual(changes.b, [true]);
});

test('peer: mensagens passam nos dois sentidos', async () => {
  const { a, b, received } = pair();
  await a.start();
  await tick();
  assert.ok(a.send('de a'));
  assert.ok(b.send('de b'));
  assert.deepEqual(received.b, ['de a']);
  assert.deepEqual(received.a, ['de b']);
});

test('peer: candidato que chega antes da descricao remota espera e entra depois', async () => {
  const { a, b } = pair();
  await b.handleSignal('ice', { candidate: 'cedo' });
  assert.deepEqual(b.queuedIce, [{ candidate: 'cedo' }]);
  await a.start();
  await tick();
  assert.ok(b.pc.iceAdded.some((candidate) => candidate.candidate === 'cedo'));
  assert.equal(b.queuedIce.length, 0);
});

test('peer: fechado, nao envia e avisa', async () => {
  const { a, changes } = pair();
  await a.start();
  await tick();
  a.close();
  assert.equal(a.send('x'), false);
  assert.equal(a.open, false);
  assert.ok(changes.a.length >= 1);
});

test('peer: sem WebRTC no navegador, nao tenta', () => {
  assert.equal(peerSupported(undefined), false);
  assert.equal(peerSupported(makeFakeRTC()), true);
});

// ---- LockstepClient com canal e conexao direta falsos ----
function client({ withPeer = true } = {}) {
  const sent = [];
  const peerSent = [];
  const instance = new LockstepClient({ matchId: 'm', initiator: true, RTC: undefined });
  instance.channel = { send: (message) => sent.push(message) };
  if (withPeer) instance.peer = { open: true, send: (text) => { peerSent.push(JSON.parse(text)); return true; }, close() {} };
  return { instance, sent, peerSent };
}
const NEUTRAL = { left: false, right: false, up: false, down: false, guard: false, jump: false, punch: false, kick: false, special: false, holding: { punch: false, kick: false, special: false } };

test('direto: todo tick sai na hora pela conexao direta, repetindo os ultimos quadros', () => {
  const { instance, peerSent, sent } = client();
  for (let tickNumber = 1; tickNumber <= 10; tickNumber += 1) instance.schedule(tickNumber, tickNumber === 5 ? { ...NEUTRAL, punch: true } : NEUTRAL);
  assert.equal(peerSent.length, 10, 'um pacote por tick');
  assert.equal(peerSent.at(-1).frames.length, 6, 'ultimos 6 quadros em cada pacote');
  assert.deepEqual(peerSent.at(-1).frames.map((frame) => frame.t), [5, 6, 7, 8, 9, 10]);
  // O servidor continua recebendo em lotes (reserva).
  assert.equal(sent.filter((message) => message.event === 'input').length, 3);
});

test('direto: sem conexao aberta, so o servidor (como antes)', () => {
  const { instance, sent } = client({ withPeer: false });
  for (let tickNumber = 1; tickNumber <= 6; tickNumber += 1) instance.schedule(tickNumber, NEUTRAL);
  assert.equal(sent.filter((message) => message.event === 'input').length, 2);
});

test('direto: quadros recebidos pela conexao direta liberam o tick, e repetidos nao atrapalham', () => {
  const { instance } = client();
  instance.inputDelay = 4;
  assert.equal(instance.canStep(9), false);
  const frames = [6, 7, 8, 9].map((t) => ({ t, m: encodeCommand({ ...NEUTRAL, punch: t === 9 }) }));
  instance.ingest(frames);
  instance.ingest(frames);
  assert.equal(instance.canStep(9), true);
  assert.equal(instance.remoteCommand(9).punch, true);
  assert.equal(instance.remoteCommand(8).punch, false);
  assert.deepEqual(decodeCommand(frames[0].m).holding, { punch: false, kick: false, special: false });
});

test('direto: ping ao vivo usa a primeira resposta (que vem pelos dois caminhos)', () => {
  const { instance } = client();
  instance.pings.set(1, performance.now() - 40);
  instance.control('lq', { id: 1 });
  const first = instance.rtt;
  assert.ok(first >= 39 && first < 80, `rtt ${first}`);
  instance.control('lq', { id: 1 }); // a copia que veio pelo outro caminho
  assert.equal(instance.rtt, first);
  assert.equal(instance.stats.transport, 'p2p');
});

test('direto: controle sai pelos dois caminhos', () => {
  const { instance, sent, peerSent } = client();
  instance.sendControl('lp', { id: 3 });
  assert.equal(sent.at(-1).event, 'delay:lp');
  assert.deepEqual(peerSent.at(-1), { c: 'lp', p: { id: 3 } });
});

test('direto: com a conexao direta o atraso proposto e menor', () => {
  for (const rtt of [30, 60, 100, 180]) {
    const relay = proposeDelay([rtt, rtt, rtt]);
    const direct = proposeDelay([rtt, rtt, rtt], { direct: true });
    assert.ok(direct <= relay, `${rtt} ms: ${direct} vs ${relay}`);
  }
  assert.ok(proposeDelay([30, 30, 30], { direct: true }) <= 4, 'LAN/boa conexao chega no minimo');
  assert.equal(proposeDelay([100, 100, 100]), 8, 'pelo servidor nada muda: continua 8');
});

import { netLabelColor, netLabelText } from '../src/utils/netLabel.js';

test('indicador: mostra o caminho e o ping, e some o ping enquanto nao mediu', () => {
  assert.equal(netLabelText({ transport: 'p2p', rtt: 38.4 }), 'ONLINE · DIRETO · 38 MS');
  assert.equal(netLabelText({ transport: 'relay', rtt: 104.6 }), 'ONLINE · SERVIDOR · 105 MS');
  assert.equal(netLabelText({ transport: 'relay', rtt: null }), 'ONLINE · SERVIDOR');
  assert.equal(netLabelColor(30), 0x4be37a);
  assert.equal(netLabelColor(100), 0xffd400);
  assert.equal(netLabelColor(200), 0xff5a4a);
});
