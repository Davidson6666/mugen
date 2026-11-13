import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Originais gerados a partir das fotos enviadas pelo usuário. O empacotamento
// preserva as poses; só recorta transparência, aplica escala uniforme e alinha o chão.
const root = new URL('../', import.meta.url);
const source = new URL('assets-src/professor-web/', root);
const output = new URL('public/assets/characters/professor_web/', root);
await mkdir(output, { recursive: true });
const grid = { frameWidth: 384, frameHeight: 320, baseline: 300 };
const atlas = [];
const sheets = [];
const extracted = [];

// Componentes conectados evitam cortar mãos, sapatos e corpos deitados que
// atravessam levemente a grade do original. Cada figura é extraída inteira.
function silhouettes(data, width, height) {
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const figures = new Map();
  for (let start = 0; start < seen.length; start += 1) {
    if (seen[start] || data[start * 4 + 3] < 100) continue;
    let head = 0, tail = 1, left = width, top = height, right = 0, bottom = 0;
    queue[0] = start;
    seen[start] = 1;
    while (head < tail) {
      const at = queue[head++], x = at % width, y = Math.floor(at / width);
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
      for (const next of [x ? at - 1 : -1, x < width - 1 ? at + 1 : -1, at - width, at + width]) {
        if (next < 0 || next >= seen.length || seen[next] || data[next * 4 + 3] < 100) continue;
        seen[next] = 1; queue[tail++] = next;
      }
    }
    if (tail < 1000) continue;
    const col = Math.min(3, Math.floor((left + right) / 2 / (width / 4)));
    const row = Math.min(5, Math.floor((top + bottom) / 2 / (height / 6)));
    const index = row * 4 + col;
    if ((figures.get(index)?.area ?? 0) < tail) figures.set(index, { left, top, right, bottom, area: tail });
  }
  if (figures.size !== 24) throw new Error(`Esperava 24 figuras, encontrei ${figures.size}: ${[...figures.keys()]}`);
  return Array.from({ length: 24 }, (_, i) => figures.get(i));
}

for (const [page, name] of ['movement', 'combat', 'reactions'].entries()) {
  const { data, info } = await sharp(fileURLToPath(new URL(`${name}-source.png`, source))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const figures = silhouettes(data, info.width, info.height);
  const factor = 240 / (figures[0].bottom - figures[0].top + 1);
  const layers = [];
  for (let index = 0; index < 24; index += 1) {
    const fig = figures[index];
    const left = Math.max(0, fig.left - 2), top = Math.max(0, fig.top - 2);
    const width = Math.min(info.width, fig.right + 3) - left;
    const height = Math.min(info.height, fig.bottom + 3) - top;
    const w = Math.round(width * factor), h = Math.round(height * factor);
    const pixels = await sharp(data, { raw: info }).extract({ left, top, width, height }).resize(w, h, { kernel: 'nearest' }).raw().toBuffer();
    for (let at = 0; at < pixels.length; at += 4) {
      const alpha = pixels[at + 3];
      if (alpha < 32) pixels.fill(0, at, at + 4);
      else if (alpha > 224) pixels[at + 3] = 255;
    }
    // O pé de apoio do chute e do uppercut fica atrás do centro da célula.
    const pivot = page === 1 && [10, 18].includes(index) ? 96 : 128;
    const dx = 192 + Math.round((left - index % 4 * info.width / 4 - pivot) * factor);
    const dy = grid.baseline - h;
    if (dx < 0 || dy < 0 || dx + w > grid.frameWidth || dy + h > grid.frameHeight) throw new Error(`Pose fora da célula: ${name}/${index} (${dx},${dy},${w},${h})`);
    const x = index % 4 * grid.frameWidth + dx, y = Math.floor(index / 4) * grid.frameHeight + dy;
    const png = await sharp(pixels, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    layers.push({ input: png, left: x, top: y });
    atlas.push([page, x, y, w, h, dx, dy]);
    extracted.push({ png, w, h, dx, dy });
  }
  const filename = `professor_web_${name}.webp`;
  await sharp({ create: { width: grid.frameWidth * 4, height: grid.frameHeight * 6, channels: 4, background: '#00000000' } }).composite(layers).webp({ lossless: true }).toFile(fileURLToPath(new URL(filename, output)));
  sheets.push(filename);
}

// Efeitos geométricos de código: atlas pequeno, sem fontes ou recursos externos.
const fxColors = [['#31bfff', '#c0f6ff'], ['#ff8c32', '#fff1a9'], ['#b07bff', '#f2dcff'], ['#62eaff', '#ffffff']];
let fxSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" shape-rendering="crispEdges">';
for (let row = 0; row < 4; row += 1) for (let frame = 0; frame < 4; frame += 1) {
  const [color, light] = fxColors[row], pulse = [0, 3, 6, 2][frame];
  fxSvg += `<g transform="translate(${frame * 128} ${row * 128})">`;
  if (row === 1) {
    fxSvg += `<path d="M36 118V24L48 12H80L92 24V118H80V32H48V118Z" fill="${color}" opacity=".8"/><path d="M48 110V32H80V110" fill="#502523" fill-opacity=".8" stroke="${light}" stroke-width="4"/>`;
    for (let y = 42; y < 108; y += 14) fxSvg += `<rect x="${50 + (frame % 2) * 4}" y="${y}" width="24" height="4" fill="${light}" opacity="${(y + frame) % 3 ? '.9' : '.3'}"/>`;
  } else if (row === 3) {
    for (let arm = 0; arm < 8; arm += 1) fxSvg += `<path transform="rotate(${arm * 45} 64 64)" d="M60 ${16 - pulse}H68L66 52H62Z" fill="${arm % 2 ? color : light}"/>`;
    fxSvg += `<rect x="${54 - pulse}" y="${54 - pulse}" width="${20 + pulse * 2}" height="${20 + pulse * 2}" fill="${light}"/>`;
  } else {
    fxSvg += `<path d="M8 48H32V40H44V30H86L110 54V76L86 100H44V90H24V80H4V72H32V58H8Z" fill="${color}" opacity=".28"/><rect x="${34 - pulse}" y="${32 - pulse}" width="${64 + pulse * 2}" height="${64 + pulse * 2}" rx="4" fill="${color}"/><rect x="40" y="38" width="52" height="52" fill="#12283f"/><path d="M57 50L45 64L57 78M75 50L87 64L75 78M70 47L62 81" fill="none" stroke="${light}" stroke-width="5"/>`;
  }
  fxSvg += '</g>';
}
fxSvg += '</svg>';
await sharp(Buffer.from(fxSvg)).webp({ lossless: true }).toFile(fileURLToPath(new URL('professor_web_fx.webp', output)));
sheets.push('professor_web_fx.webp');
const fxGrid = { frameWidth: 128, frameHeight: 128, baseline: 64 };
const effect = (row, extra = {}) => ({ spriteGridSize: fxGrid, atlas: Array.from({ length: 4 }, (_, i) => [3, i * 128, row * 128, 128, 128, 0, 0]), animation: { frames: [0, 1, 2, 3], durations: [3, 3, 3, 3], loop: false }, ...extra });
const impact = { id: 'codeImpact' };
const effects = {
  httpPacket: effect(0, { animation: { frames: [0, 1, 2, 3], durations: [3, 3, 3, 3], loop: true }, renderScale: 0.8, velocityX: 15, lifetime: 135, destroyOnHit: true, onHitSpawn: impact, hits: [{ from: 0, until: 3, damage: 10, hitstun: 18, push: 5, box: { offsetX: 32, offsetY: 32, width: 72, height: 64 } }] }),
  firewall: effect(1, { spriteGridSize: { ...fxGrid, baseline: 120 }, renderScale: 2, lifetime: 48, follow: 'owner', endWithMove: true, shield: [-42, -235, 42, 0], animation: { frames: [0, 1, 2, 3], durations: [5, 5, 5, 5], loop: true }, hits: [{ from: 0, until: 3, damage: 6, hitstun: 15, push: 2, every: 11, count: 3, launch: { vx: 5, vy: 6 }, box: { offsetX: 40, offsetY: 10, width: 48, height: 110 } }] }),
  deployPacket: effect(2, { renderScale: 1.1, animation: { frames: [0, 1, 2, 3], durations: [3, 3, 3, 3], loop: true }, velocityX: 19, lifetime: 120, destroyOnHit: true, onHitSpawn: impact, hits: [{ from: 0, until: 3, damage: 11, hitstun: 21, push: 2, box: { offsetX: 28, offsetY: 28, width: 80, height: 72 } }] }),
  codeImpact: effect(3, { renderScale: 1, lifetime: 12 }),
  codeCharge: effect(0, { renderScale: 0.5, lifetime: 13, follow: 'owner', endWithMove: true }),
};

const animations = {};
const anim = (name, frames, durations, extra = {}) => {
  animations[name] = { frames, durations, loop: false, ...extra };
};
anim('idle', [0, 1, 2, 3], [11, 9, 11, 9], { loop: true });
anim('walkForward', [4, 5, 6, 7], [6, 6, 6, 6], { loop: true });
anim('walkBackward', [7, 6, 5, 4], [7, 7, 7, 7], { loop: true });
for (const name of ['jump', 'jumpUp', 'jumpForward', 'jumpBack', 'airJump', 'airJumpForward', 'airJumpBack']) anim(name, [9, 10], [7, 14]);
anim('jumpStart', [8, 9], [3, 4]);
anim('jumpFall', [10, 11], [5, 9]);
anim('landing', [8, 16, 0], [3, 3, 3]);
anim('crouchDown', [16, 17], [3, 4]);
anim('crouch', [17], [10], { loop: true });
anim('crouchUp', [17, 16, 0], [3, 3, 3]);
anim('blockStanding', [18], [8], { loop: true });
anim('blockCrouching', [19], [8], { loop: true });
anim('guardEndStanding', [18, 0], [3, 3]);
anim('guardEndCrouching', [19, 17], [3, 3]);
anim('turn', [20, 21, 0], [3, 3, 3]);
anim('dashForward', [12, 13, 14, 15], [3, 5, 5, 4], { dash: { speed: 40, moveFrom: 1, moveUntil: 2 } });
anim('dashBackward', [15, 12, 22, 0], [3, 5, 5, 4], { dash: { speed: 32, moveFrom: 1, moveUntil: 2 } });
anim('airDashForward', [9, 22, 22, 11], [3, 4, 4, 3], { dash: { speed: 40, moveFrom: 1, moveUntil: 2 } });
anim('airDashBackward', [10, 23, 23, 11], [3, 4, 4, 3], { dash: { speed: 32, moveFrom: 1, moveUntil: 2 } });
for (const name of ['hitReaction', 'hitStanding', 'hitHeavy']) anim(name, [56, 56], [5, 9]);
anim('hitCrouching', [57, 57], [5, 9]);
anim('hitAir', [58, 59], [6, 8]);
anim('launched', [58, 59], [6, 10]);
anim('falling', [59, 60], [5, 7]);
anim('knockdown', [60, 61, 62, 63], [3, 4, 5, 12]);
anim('getUp', [64, 65, 66, 67], [5, 5, 6, 5]);
anim('ko', [60, 61, 62, 63], [4, 5, 6, 18]);
anim('defeatPose', [63], [15]);
anim('victoryPose', [67, 70, 71], [8, 24, 30]);
anim('grab', [68, 69, 0], [4, 6, 18]);

const box = (offsetX, offsetY, width, height) => ({ offsetX, offsetY, width, height });
const high = box(222, 110, 124, 90), mid = box(218, 135, 150, 95), low = box(210, 235, 166, 62);
const hit = (damage, hitbox, extra = {}) => ({ from: 2, until: 2, damage, hitstun: 17, push: 3, box: hitbox, ...extra });
const swing = (at) => [{ at, sound: 'swing' }];
anim('punch', [24, 25, 26, 27], [3, 3, 5, 7], { hits: [hit(6, high)], events: swing(6), cancels: [{ on: 'punch', to: 'punch2', after: 7 }, { on: 'kick', to: 'kick', after: 7 }] });
anim('punch2', [28, 29, 30, 31], [3, 3, 5, 7], { hits: [hit(7, high)], events: swing(6), cancels: [{ on: 'punch', to: 'punch3', after: 7 }, { on: 'kick', to: 'kick2', after: 7 }] });
anim('punch3', [40, 41, 42, 43], [4, 4, 7, 12], { hits: [hit(10, box(210, 60, 130, 175), { heavy: true, launch: { vx: 5, vy: 6 } })], events: swing(8) });
anim('kick', [32, 33, 34, 35, 0], [4, 3, 6, 5, 5], { hits: [hit(9, mid)], events: swing(7), cancels: [{ on: 'kick', to: 'kick2', after: 8 }, { on: 'punch', to: 'punch3', after: 8 }] });
anim('kick2', [36, 37, 38, 39, 0], [4, 4, 7, 7, 5], { hits: [hit(11, low, { heavy: true, launch: { vx: 6, vy: 3 } })], events: swing(8) });
anim('sweep', [36, 37, 38, 39], [5, 4, 7, 13], { hits: [hit(10, low, { heavy: true, launch: { vx: 4, vy: 3 } })], events: swing(9) });
anim('crouchPunch', [17, 40, 41, 17], [3, 3, 5, 9], { hits: [hit(6, box(215, 165, 108, 83))], events: swing(6) });
anim('crouchKick', [36, 37, 38, 39], [4, 4, 6, 10], { hits: [hit(8, low)], events: swing(8) });
anim('uppercut', [40, 41, 42, 43], [5, 4, 8, 13], { cooldown: 55, hits: [hit(12, box(208, 42, 132, 210), { heavy: true, launch: { vx: 4, vy: 8 } })], events: swing(9) });
anim('airPunch', [44, 45, 45, 44], [3, 3, 5, 8], { air: true, hits: [hit(7, high, { from: 1, until: 2 })], events: swing(3) });
anim('airKick', [44, 46, 46, 47], [4, 4, 6, 9], { air: true, hits: [hit(9, mid, { from: 1, until: 2 })], events: swing(4) });
anim('airHeavy', [45, 46, 46, 47], [5, 5, 7, 10], { air: true, hits: [hit(11, mid, { from: 1, until: 2, heavy: true, launch: { vx: 4, vy: 3 } })], events: swing(5) });
const spawn = (at, id, offsetX, offsetY) => ({ at, effect: { id, offsetX, offsetY } });
anim('special1', [48, 49, 50, 51], [6, 5, 7, 13], { cooldown: 50, events: [spawn(1, 'codeCharge', 50, 160), { at: 11, sound: 'packet' }, spawn(11, 'httpPacket', 130, 165)] });
anim('special2', [52, 53, 54, 55], [6, 6, 32, 12], { cooldown: 110, events: [{ at: 12, sound: 'firewall' }, spawn(12, 'firewall', 92, 0)] });
anim('special3', [52, 53, 54, 54, 54, 55], [10, 12, 9, 9, 9, 18], { cooldown: 600, perRound: 2, events: [spawn(0, 'codeCharge', 0, 160), { at: 22, sound: 'deploy' }, spawn(22, 'deployPacket', 125, 170), spawn(31, 'deployPacket', 125, 130), spawn(40, 'deployPacket', 125, 190)] });

const config = {
  id: 'professor_web', name: 'Professor Web', description: 'Do código à arena. Pacotes HTTP, Firewall e Deploy Final.', assetVersion: 'professor-web-v1',
  sheets, atlas, spriteGridSize: grid, spriteScale: 0.5, textureScaleMode: 'nearest',
  stats: { maxHealth: 100, walkSpeed: 3.35, jumpForce: 9.6, jumpGravity: 0.55, airJumps: 1 },
  hurtbox: box(142, 60, 100, 240), hitbox: high, animations, effects,
  buttons: { ground: { punch: 'punch', kick: 'kick', special: 'special1' }, air: { punch: 'airPunch', kick: 'airKick', special: 'airHeavy' } },
  combos: [
    { id: 'deploy', input: '↓→S', animation: 'special3' },
    { id: 'packet', input: '↓→P', animation: 'special1' },
    { id: 'firewall', input: 'S', hold: '↓', animation: 'special2' },
    { id: 'deployShortcut', input: 'S', hold: '→', animation: 'special3' },
    { id: 'uppercut', input: 'P', hold: '→', animation: 'uppercut' },
    { id: 'crouchPunch', input: 'P', hold: '↓', animation: 'crouchPunch' },
    { id: 'sweep', input: 'K', hold: '↓', animation: 'sweep' },
  ],
  moveList: [
    { section: 'Movimento', name: 'Andar / recuar', input: '←→' },
    { section: 'Movimento', name: 'Pulo e pulo duplo', input: '↑↑' },
    { section: 'Movimento', name: 'Dash / recuo rápido', input: '→→ / ←←', note: 'Também funciona no ar' },
    { section: 'Movimento', name: 'Agachar', input: '↓' },
    { section: 'Defesa', name: 'Defesa em pé', input: '←', note: 'Segure para trás ou o botão de defesa' },
    { section: 'Defesa', name: 'Defesa agachada', input: '↓←' },
    { section: 'Básicos', name: 'Soco → cruzado → uppercut', input: 'PPP' },
    { section: 'Básicos', name: 'Chute → rasteira', input: 'KK' },
    { section: 'Básicos', name: 'Sequência mista', input: 'PPK' },
    { section: 'Básicos', name: 'Soco agachado', input: 'P', hold: '↓' },
    { section: 'Básicos', name: 'Rasteira', input: 'K', hold: '↓' },
    { section: 'Básicos', name: 'Uppercut', input: 'P', hold: '→' },
    { section: 'No ar', name: 'Soco aéreo', input: 'P', note: 'Durante o pulo' },
    { section: 'No ar', name: 'Chute aéreo', input: 'K', note: 'Durante o pulo' },
    { section: 'No ar', name: 'Chute aéreo pesado', input: 'S', note: 'Durante o pulo' },
    { section: 'Especiais', name: 'Pacote HTTP', input: 'S', note: 'Também: ↓→ + soco' },
    { section: 'Especiais', name: 'Firewall', input: 'S', hold: '↓', note: 'Barreira que acerta de perto e bloqueia projéteis' },
    { section: 'Super', name: 'Deploy Final', input: '↓→S', note: 'Também: frente + especial. Dois usos por round' },
  ],
  sounds: { swing: 'swing.wav', packet: 'packet.wav', firewall: 'firewall.wav', deploy: 'deploy.wav' },
  balance: { damage: 1 },
};
await writeFile(new URL('professor_web_config.json', output), `${JSON.stringify(config, null, 2)}\n`);

// Retrato do mesmo sprite: rosto e camisa correspondem exatamente ao lutador.
const portrait = extracted[0];
await sharp(portrait.png).extract({ left: Math.max(0, Math.round(portrait.w * 0.26)), top: 0, width: Math.min(105, portrait.w), height: Math.min(125, portrait.h) }).resize(96, 112, { fit: 'contain', position: 'top', background: '#00000000', kernel: 'nearest' }).png().toFile(fileURLToPath(new URL('professor_web_portrait.png', output)));

// Sons sintéticos próprios, sem reutilizar vozes de outro personagem.
for (const [name, seconds, base] of [['swing', 0.12, 190], ['packet', 0.24, 620], ['firewall', 0.45, 125], ['deploy', 0.7, 220]]) {
  const rate = 22050, count = Math.round(seconds * rate), wav = Buffer.alloc(44 + count * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(count * 2, 40);
  let seed = 17;
  for (let i = 0; i < count; i += 1) {
    const t = i / rate, p = i / count, envelope = Math.sin(Math.PI * p) * Math.exp(-p * 3);
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 0x80000000 - 1;
    const tone = Math.sin(2 * Math.PI * (base * t + base * t * t * (name === 'packet' ? 5 : 1.5)));
    const sample = (name === 'swing' ? noise : tone * 0.75 + noise * 0.25) * envelope * 0.38;
    wav.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(sample * 32767))), 44 + i * 2);
  }
  await writeFile(new URL(`${name}.wav`, output), wav);
}
console.log(`Professor Web: ${atlas.length} poses, ${Object.keys(animations).length} animações, ${Object.keys(effects).length} efeitos.`);
await import('./build-professor-web-war.mjs');
