import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Originais gerados a partir das fotos enviadas pelo usuário. O empacotamento
// preserva as poses; só recorta transparência, aplica escala uniforme e alinha o chão.
const root = new URL('../', import.meta.url);
const source = new URL('assets-src/coordenadora/', root);
const output = new URL('public/assets/characters/coordenadora/', root);
await mkdir(output, { recursive: true });
const grid = { frameWidth: 384, frameHeight: 320, baseline: 300 };
const atlas = [];
const sheets = [];
const extracted = [];

// Componentes conectados evitam cortar mãos, sapatos e corpos deitados que
// atravessam levemente a grade do original. Cada figura é extraída inteira.
function silhouettes(data, width, height) {
  const seen = new Int32Array(width * height);
  const queue = new Int32Array(width * height);
  const figures = new Map();
  for (let start = 0; start < seen.length; start += 1) {
    if (seen[start] || data[start * 4 + 3] < 100) continue;
    let head = 0, tail = 1, left = width, top = height, right = 0, bottom = 0;
    queue[0] = start;
    const component = start + 1;
    seen[start] = component;
    while (head < tail) {
      const at = queue[head++], x = at % width, y = Math.floor(at / width);
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
      for (const next of [x ? at - 1 : -1, x < width - 1 ? at + 1 : -1, at - width, at + width]) {
        if (next < 0 || next >= seen.length || seen[next] || data[next * 4 + 3] < 100) continue;
        seen[next] = component; queue[tail++] = next;
      }
    }
    if (tail < 1000) continue;
    const col = Math.min(3, Math.floor((left + right) / 2 / (width / 4)));
    const row = Math.min(5, Math.floor((top + bottom) / 2 / (height / 6)));
    const index = row * 4 + col;
    if ((figures.get(index)?.area ?? 0) < tail) figures.set(index, { left, top, right, bottom, area: tail, component });
  }
  if (figures.size !== 24) throw new Error(`Esperava 24 figuras, encontrei ${figures.size}: ${[...figures.keys()]}`);
  return { figures: Array.from({ length: 24 }, (_, i) => figures.get(i)), labels: seen };
}

for (const [page, name] of ['movement', 'combat', 'reactions'].entries()) {
  const { data, info } = await sharp(fileURLToPath(new URL(`${name}-source.png`, source))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { figures, labels } = silhouettes(data, info.width, info.height);
  const factor = 240 / (figures[0].bottom - figures[0].top + 1);
  const layers = [];
  for (let index = 0; index < 24; index += 1) {
    const fig = figures[index];
    const left = Math.max(0, fig.left - 2), top = Math.max(0, fig.top - 2);
    const width = Math.min(info.width, fig.right + 3) - left;
    const height = Math.min(info.height, fig.bottom + 3) - top;
    const w = Math.round(width * factor), h = Math.round(height * factor);
    // Copia só esta figura: um sapato da célula vizinha não pode aparecer
    // dentro do retângulo de um uppercut ou de uma personagem deitada.
    const crop = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const at = (top + y) * info.width + left + x;
      if (labels[at] !== fig.component) continue;
      data.copy(crop, (y * width + x) * 4, at * 4, at * 4 + 4);
    }
    const pixels = await sharp(crop, { raw: { width, height, channels: 4 } }).resize(w, h, { kernel: 'nearest' }).raw().toBuffer();
    for (let at = 0; at < pixels.length; at += 4) {
      const alpha = pixels[at + 3];
      if (alpha < 100) pixels.fill(0, at, at + 4);
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
  const filename = `coordenadora_${name}.webp`;
  await sharp({ create: { width: grid.frameWidth * 4, height: grid.frameHeight * 6, channels: 4, background: '#00000000' } }).composite(layers).webp({ lossless: true }).toFile(fileURLToPath(new URL(filename, output)));
  sheets.push(filename);
}

// Símbolos matemáticos desenhados em geometria exata; não dependem de fontes.
const fxColors = [['#ffd577', '#fff8c8'], ['#68e5bc', '#d5fff2'], ['#ee789e', '#ffe1ed'], ['#7bcdf4', '#e0f9ff'], ['#ffefa9', '#ffffff']];
let fxSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="640" shape-rendering="crispEdges">';
for (let row = 0; row < 5; row += 1) for (let frame = 0; frame < 4; frame += 1) {
  const [color, light] = fxColors[row], pulse = [0, 3, 6, 2][frame];
  fxSvg += `<g transform="translate(${frame * 128} ${row * 128})">`;
  if (row === 0) {
    fxSvg += `<circle cx="64" cy="64" r="${37 + pulse}" fill="${color}" opacity=".2"/><path d="M30 48H98M46 50L42 88M80 50V86H92" fill="none" stroke="${light}" stroke-width="9"/><path d="M8 60H24M12 74H28M99 40H112M102 84H118" stroke="${color}" stroke-width="4"/>`;
  } else if (row === 1) {
    fxSvg += `<circle cx="64" cy="64" r="${34 + pulse}" fill="${color}" opacity=".25"/><path d="M30 84H100M64 98V28" stroke="${color}" stroke-width="3"/><path d="M32 38Q64 132 96 38" fill="none" stroke="${light}" stroke-width="6"/><rect x="${31 + frame * 16}" y="${[39, 70, 70, 39][frame]}" width="8" height="8" fill="${light}"/>`;
  } else if (row === 2) {
    if (frame === 0) {
      fxSvg += `<path d="M32 28H16V44M96 28H112V44M16 96V112H32M112 96V112H96M64 42V98M36 70H92" fill="none" stroke="${color}" stroke-width="4"/><ellipse cx="64" cy="112" rx="42" ry="8" fill="none" stroke="${light}" stroke-width="3"/>`;
    } else {
      fxSvg += `<path d="M20 20H108V112H20Z" fill="#48263b" fill-opacity=".55" stroke="${color}" stroke-width="5"/><path d="M26 12H102M26 120H102" stroke="${light}" stroke-width="4"/><ellipse cx="64" cy="66" rx="${22 + pulse}" ry="${34 + pulse}" fill="none" stroke="${light}" stroke-width="9"/><path d="M8 36H16M112 92H120M10 68H18M110 52H118" stroke="${color}" stroke-width="4"/>`;
    }
  } else if (row === 3) {
    fxSvg += `<rect x="26" y="10" width="76" height="108" fill="#173650" fill-opacity=".5" stroke="${color}" stroke-width="4"/>`;
    for (let x = 38; x < 100; x += 13) fxSvg += `<path d="M${x} 12V116" stroke="${color}" stroke-width="1" opacity=".65"/>`;
    for (let y = 24; y < 114; y += 13) fxSvg += `<path d="M28 ${y}H100" stroke="${color}" stroke-width="1" opacity=".65"/>`;
    fxSvg += `<path d="M64 112V18M32 75H96M58 26L64 18L70 26M88 69L96 75L88 81" fill="none" stroke="${light}" stroke-width="4"/><path d="M32 104Q64 ${30 - pulse} 96 104" fill="none" stroke="#ffd577" stroke-width="4"/>`;
  } else {
    for (let arm = 0; arm < 8; arm += 1) fxSvg += `<path transform="rotate(${arm * 45} 64 64)" d="M60 ${16 - pulse}H68L66 52H62Z" fill="${arm % 2 ? color : light}"/>`;
    fxSvg += `<rect x="${54 - pulse}" y="${54 - pulse}" width="${20 + pulse * 2}" height="${20 + pulse * 2}" fill="${light}"/>`;
  }
  fxSvg += '</g>';
}
fxSvg += '</svg>';
await sharp(Buffer.from(fxSvg)).webp({ lossless: true }).toFile(fileURLToPath(new URL('coordenadora_fx.webp', output)));
sheets.push('coordenadora_fx.webp');
const fxGrid = { frameWidth: 128, frameHeight: 128, baseline: 64 };
const effect = (row, extra = {}) => ({ spriteGridSize: fxGrid, atlas: Array.from({ length: 4 }, (_, i) => [3, i * 128, row * 128, 128, 128, 0, 0]), animation: { frames: [0, 1, 2, 3], durations: [3, 3, 3, 3], loop: false }, ...extra });
const impact = { id: 'mathImpact' };
const effects = {
  equation: effect(0, { animation: { frames: [0, 1, 2, 3], durations: [3, 3, 3, 3], loop: true }, renderScale: 0.85, velocityX: 15, lifetime: 135, destroyOnHit: true, onHitSpawn: impact, hits: [{ from: 0, until: 3, damage: 10, hitstun: 18, push: 4, box: { offsetX: 28, offsetY: 32, width: 80, height: 64 } }] }),
  parabola: effect(1, { animation: { frames: [0, 1, 2, 3], durations: [3, 3, 3, 3], loop: true }, renderScale: 0.85, velocityX: 14, velocityY: -9, gravity: 0.44, lifetime: 110, endOnGround: true, destroyOnHit: true, onHitSpawn: impact, hits: [{ from: 0, until: 3, damage: 12, hitstun: 20, push: 5, heavy: true, launch: { vx: 4, vy: 5 }, box: { offsetX: 30, offsetY: 30, width: 72, height: 72 } }] }),
  council: effect(2, { spriteGridSize: { ...fxGrid, baseline: 120 }, renderScale: 2, animation: { frames: [0, 1, 2, 3], durations: [12, 6, 6, 6], loop: false }, lifetime: 30, onHitSpawn: impact, hits: [{ from: 1, until: 3, damage: 10, hitstun: 20, push: 1, heavy: true, every: 8, count: 3, launch: { vx: 5, vy: 6 }, box: { offsetX: 34, offsetY: 10, width: 60, height: 110 } }] }),
  cartesian: effect(3, { spriteGridSize: { ...fxGrid, baseline: 120 }, renderScale: 2, lifetime: 44, follow: 'owner', endWithMove: true, shield: [-42, -235, 42, 0], animation: { frames: [0, 1, 2, 3], durations: [5, 5, 5, 5], loop: true } }),
  mathImpact: effect(4, { renderScale: 1, lifetime: 12 }),
  mathCharge: effect(0, { renderScale: 0.5, lifetime: 13, follow: 'owner', endWithMove: true }),
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
anim('special1', [48, 49, 50, 51], [5, 5, 7, 13], { cooldown: 48, events: [spawn(1, 'mathCharge', 50, 160), { at: 10, sound: 'equation' }, spawn(10, 'equation', 130, 165)] });
anim('special2', [48, 49, 50, 51], [6, 6, 7, 16], { cooldown: 75, events: [spawn(1, 'mathCharge', 50, 160), { at: 12, sound: 'parabola' }, spawn(12, 'parabola', 80, 160)] });
anim('special3', [52, 53, 54, 55], [8, 12, 32, 20], { cooldown: 600, perRound: 2, events: [spawn(0, 'mathCharge', 0, 160), { at: 20, sound: 'council' }, { at: 20, effect: { id: 'council', target: 'opponent', offsetX: 0, offsetY: 0 } }] });
anim('special4', [48, 49, 50, 51], [5, 6, 36, 9], { cooldown: 105, events: [{ at: 11, sound: 'cartesian' }, spawn(11, 'cartesian', 92, 0)] });

const config = {
  id: 'coordenadora', name: 'Flavia', description: 'Matemática na ponta dos dedos. A coordenação entrou na arena.', assetVersion: 'coordenadora-v1',
  sheets, atlas, spriteGridSize: grid, spriteScale: 0.5, textureScaleMode: 'nearest',
  stats: { maxHealth: 100, walkSpeed: 3.2, jumpForce: 9.4, jumpGravity: 0.55, airJumps: 1 },
  hurtbox: box(142, 60, 100, 240), hitbox: high, animations, effects,
  buttons: { ground: { punch: 'punch', kick: 'kick', special: 'special1' }, air: { punch: 'airPunch', kick: 'airKick', special: 'airHeavy' } },
  combos: [
    { id: 'council', input: '↓→S', animation: 'special3' },
    { id: 'equation', input: '↓→P', animation: 'special1' },
    { id: 'parabola', input: 'S', hold: '↓', animation: 'special2' },
    { id: 'cartesian', input: 'S', hold: '←', animation: 'special4' },
    { id: 'councilShortcut', input: 'S', hold: '→', animation: 'special3' },
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
    { section: 'Especiais', name: 'Equação Direta', input: 'S', note: 'Símbolo de pi em linha reta. Também: ↓→ + soco' },
    { section: 'Especiais', name: 'Parábola', input: 'S', hold: '↓', note: 'Projétil em arco que derruba ao acertar' },
    { section: 'Especiais', name: 'Plano Cartesiano', input: 'S', hold: '←', note: 'Barreira defensiva que intercepta projéteis' },
    { section: 'Super', name: 'Conselho de Classe', input: '↓→S', note: 'Marca o local do adversário. Dois usos por round' },
  ],
  sounds: { swing: 'swing.wav', equation: 'equation.wav', parabola: 'parabola.wav', cartesian: 'cartesian.wav', council: 'council.wav' },
  balance: { damage: 1 },
};
await writeFile(new URL('coordenadora_config.json', output), `${JSON.stringify(config, null, 2)}\n`);

// Retrato da própria sprite, com o mesmo rosto, cabelo e casaco da lutadora.
const portrait = extracted[0];
const portraitLeft = Math.max(0, Math.round(portrait.w * 0.26));
await sharp(portrait.png).extract({ left: portraitLeft, top: 0, width: Math.min(105, portrait.w - portraitLeft), height: Math.min(125, portrait.h) }).resize(96, 112, { fit: 'contain', position: 'top', background: '#00000000', kernel: 'nearest' }).png().toFile(fileURLToPath(new URL('coordenadora_portrait.png', output)));

// Sons sintéticos próprios, sem reutilizar vozes de outro personagem.
for (const [name, seconds, base] of [['swing', 0.12, 210], ['equation', 0.24, 880], ['parabola', 0.35, 540], ['cartesian', 0.4, 330], ['council', 0.65, 165]]) {
  const rate = 22050, count = Math.round(seconds * rate), wav = Buffer.alloc(44 + count * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(count * 2, 40);
  let seed = 17;
  for (let i = 0; i < count; i += 1) {
    const t = i / rate, p = i / count, envelope = Math.sin(Math.PI * p) * Math.exp(-p * 3);
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 0x80000000 - 1;
    const tone = Math.sin(2 * Math.PI * (base * t + base * t * t * (name === 'parabola' ? -0.8 : 2)));
    const sample = (name === 'swing' ? noise : tone * 0.75 + noise * 0.25) * envelope * 0.38;
    wav.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(sample * 32767))), 44 + i * 2);
  }
  await writeFile(new URL(`${name}.wav`, output), wav);
}
console.log(`Coordenadora: ${atlas.length} poses, ${Object.keys(animations).length} animações, ${Object.keys(effects).length} efeitos.`);
await import('./build-coordenadora-domain.mjs');
await import('./build-coordenadora-sword.mjs');
