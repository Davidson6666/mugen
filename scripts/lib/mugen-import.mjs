// Converte um personagem do MUGEN (.sff + .air) para o formato do jogo: um
// atlas de sprites recortados (corpo e efeitos juntos) e o character config.
//
// Do pacote vem tudo o que da cadencia de jogo de luta: a duracao de cada
// quadro (durations) e as caixas desenhadas pelo autor (clsn1 = onde o golpe
// acerta, clsn2 = onde o personagem apanha). Cada trecho seguido de quadros com
// clsn1 vira um acerto do golpe (hits).
//
// O que o importador NAO traz sozinho: a logica dos golpes, que no MUGEN fica
// nos scripts .cns. Ela e descrita a mao na especificacao de cada personagem
// (scripts/import-*.mjs) com o vocabulario do motor: events (o que acontece em
// cada tick: impulso, teleporte, efeito), cancels (encadear no botao), onHit,
// next. Os tempos da especificacao seguem os do .cns, em ticks de 60/s.
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { PNG } from 'pngjs';
import { openSff, readAct } from './sff.mjs';
import { readAir } from './air.mjs';

// Quadro com duracao -1 no MUGEN fica parado para sempre.
const HOLD_TICKS = 600;
const GRID_COLS = 8;
// Paginas do atlas: 2048 cabe em qualquer GPU; o espaco entre recortes evita
// que o filtro linear puxe cor do vizinho.
const PAGE_SIZE = 2048;
const PADDING = 2;

function write(root, relativePath, buffer) {
  const target = resolve(root, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, buffer);
  console.log(`  ${relativePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

function toPng(width, height, rgba) {
  const png = new PNG({ width, height });
  png.data = Buffer.from(rgba);
  return PNG.sync.write(png);
}

// Um trecho da animacao do jogo: uma acao do .air, opcionalmente so alguns
// quadros (pick), com duracoes trocadas (times), esticadas (durationScale) ou
// com o laco desenrolado ate um total de ticks (lengthTicks, para estados do
// .cns que duram mais que a animacao e ficam repetindo a partir do loopstart).
function normalizeSegments(spec) {
  return spec.actions.map((entry) => {
    const segment = typeof entry === 'number' ? { id: entry } : { ...entry };
    // pick/times/durationScale da especificacao valem para uma acao unica.
    if (spec.actions.length === 1) {
      segment.pick ??= spec.pick;
      segment.times ??= spec.times;
      segment.durationScale ??= spec.durationScale;
      segment.lengthTicks ??= spec.lengthTicks;
    }
    return segment;
  });
}

function collectFrames(air, spec) {
  const frames = [];
  const starts = new Map();
  let clock = 0;
  for (const segment of normalizeSegments(spec)) {
    const action = air.get(segment.id);
    if (!action) throw new Error(`acao ${segment.id} nao existe no .air`);
    let list = segment.pick ? segment.pick.map((index) => action.frames[index]) : [...action.frames];
    let durations = list.map((frame, index) => {
      if (segment.times?.[index] !== undefined) return segment.times[index];
      return frame.time < 0 ? HOLD_TICKS : Math.max(1, frame.time) * (segment.durationScale ?? 1);
    });
    if (segment.lengthTicks) {
      const loopFrom = segment.pick ? 0 : action.loopStart;
      const loopFrames = list.slice(loopFrom);
      const loopDurations = durations.slice(loopFrom);
      let total = durations.reduce((sum, ticks) => sum + ticks, 0);
      for (let index = 0; total < segment.lengthTicks && loopFrames.length > 0; index += 1) {
        const k = index % loopFrames.length;
        list.push(loopFrames[k]);
        durations.push(loopDurations[k]);
        total += loopDurations[k];
      }
      // Corta no tick exato em que o estado do .cns termina.
      while (total > segment.lengthTicks && list.length > 1) {
        const excess = total - segment.lengthTicks;
        const last = durations.length - 1;
        if (durations[last] > excess) {
          durations[last] -= excess;
          total = segment.lengthTicks;
        } else {
          total -= durations.pop();
          list.pop();
        }
      }
      list = list.slice(0, durations.length);
    }
    if (!starts.has(segment.id)) starts.set(segment.id, { tick: clock, frame: frames.length, durations });
    list.forEach((frame, index) => {
      frames.push({ ...frame, duration: durations[index] });
      clock += durations[index];
    });
  }
  starts.total = clock;
  return { frames, starts };
}

const durationsOf = (frames) => frames.map((frame) => frame.duration);

// Cada combinacao sprite + deslocamento + espelhamento vira uma celula. O eixo
// do sprite (o pe, no MUGEN) cai no centro da celula, na linha do chao.
class CellPacker {
  // scale: reducao aplicada a todos os quadros (efeitos grandes guardados em
  // meia resolucao, faiscas que o autor exibe a 14%-50%).
  // opaque: fundo transparente vira preto (ceu que cobre a tela sem frestas).
  // remap: paleta [grupo, item] no lugar da 3,0 (remappal das Explod).
  constructor(sff, scale = 1, { opaque = false, remap } = {}) {
    this.sff = sff;
    this.scale = scale;
    this.opaque = opaque;
    this.remap = remap;
    this.cells = [];
    this.byKey = new Map();
  }

  cellFor(frame) {
    const key = `${frame.group},${frame.item},${frame.x},${frame.y},${frame.flip}`;
    if (!this.byKey.has(key)) {
      let decoded = this.sff.decode(frame.group, frame.item, this.remap ? { remap: this.remap } : {});
      if (!decoded) {
        const sprite = this.sff.sprites.find((entry) => entry.group === frame.group && entry.item === frame.item);
        if (sprite && sprite.width > 1 && sprite.height > 1) {
          throw new Error(`sprite ${frame.group},${frame.item} num formato sem suporte`);
        }
        // Sprite inexistente ou vazio no MUGEN e quadro vazio de proposito
        // (o instante em que o personagem some, a caixa invisivel de um golpe).
        decoded = { width: 1, height: 1, axisX: 0, axisY: 0, rgba: new Uint8Array(4) };
      }
      let image = this.scale === 1 ? decoded : scaleDown(decoded, this.scale);
      if (this.opaque) image = flatten(image);
      const x = Math.round(frame.x * this.scale), y = Math.round(frame.y * this.scale);
      const flipX = frame.flip.includes('H');
      const flipY = frame.flip.includes('V');
      // Pontos do desenho relativos ao pe: x para a direita, y para baixo.
      const left = x + (flipX ? image.axisX - image.width + 1 : -image.axisX);
      const top = y + (flipY ? image.axisY - image.height + 1 : -image.axisY);
      this.byKey.set(key, this.cells.length);
      this.cells.push({ image, flipX, flipY, left, top });
    }
    return this.byKey.get(key);
  }

  // Geometria da celula: meia largura = o maior alcance para qualquer lado,
  // altura = do ponto mais alto ao mais baixo. baseline e a linha do chao.
  get grid() {
    let reach = 1, up = 1, down = 0;
    for (const { image, left, top } of this.cells) {
      reach = Math.max(reach, -left, left + image.width);
      up = Math.max(up, -top);
      down = Math.max(down, top + image.height);
    }
    return { frameWidth: Math.ceil(reach) * 2, frameHeight: up + down, baseline: up };
  }

  // Pixel (x, y) do desenho ja espelhado.
  static pixelIndex(cell, x, y) {
    const { image, flipX, flipY } = cell;
    const sourceX = flipX ? image.width - 1 - x : x;
    const sourceY = flipY ? image.height - 1 - y : y;
    return (sourceY * image.width + sourceX) * 4;
  }

  // Folha em grade (faiscas compartilhadas): todas as celulas do mesmo tamanho.
  buildGrid() {
    const grid = this.grid;
    const { frameWidth, frameHeight, baseline } = grid;
    const cols = Math.min(GRID_COLS, this.cells.length);
    const rows = Math.ceil(this.cells.length / cols);
    const width = frameWidth * cols, height = frameHeight * rows;
    const rgba = new Uint8Array(width * height * 4);
    this.cells.forEach((cell, index) => {
      const originX = (index % cols) * frameWidth + frameWidth / 2 + cell.left;
      const originY = Math.floor(index / cols) * frameHeight + baseline + cell.top;
      for (let y = 0; y < cell.image.height; y += 1) {
        for (let x = 0; x < cell.image.width; x += 1) {
          const s = CellPacker.pixelIndex(cell, x, y);
          if (cell.image.rgba[s + 3] === 0) continue;
          const d = ((originY + y) * width + originX + x) * 4;
          for (let c = 0; c < 4; c += 1) rgba[d + c] = cell.image.rgba[s + c];
        }
      }
    });
    return { grid: { cols, rows, ...grid }, width, height, rgba };
  }

  // Recortes para o atlas: so a parte opaca de cada celula, com a posicao
  // (dx, dy) em que ela fica dentro da celula.
  trimmed() {
    const { frameWidth, baseline } = this.grid;
    return this.cells.map((cell) => {
      const { image } = cell;
      let x1 = Infinity, y1 = Infinity, x2 = -1, y2 = -1;
      for (let y = 0; y < image.height; y += 1) {
        for (let x = 0; x < image.width; x += 1) {
          if (image.rgba[CellPacker.pixelIndex(cell, x, y) + 3] === 0) continue;
          if (x < x1) x1 = x;
          if (x > x2) x2 = x;
          if (y < y1) y1 = y;
          if (y > y2) y2 = y;
        }
      }
      if (x2 < 0) return { width: 1, height: 1, dx: 0, dy: 0, rgba: new Uint8Array(4) };
      const width = x2 - x1 + 1, height = y2 - y1 + 1;
      const rgba = new Uint8Array(width * height * 4);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const s = CellPacker.pixelIndex(cell, x1 + x, y1 + y);
          const d = (y * width + x) * 4;
          for (let c = 0; c < 4; c += 1) rgba[d + c] = image.rgba[s + c];
        }
      }
      return {
        width,
        height,
        dx: frameWidth / 2 + cell.left + x1,
        dy: baseline + cell.top + y1,
        rgba,
      };
    });
  }
}

// Recortes com os mesmos pixels (o mesmo corvo em cinco efeitos diferentes)
// ocupam um lugar so no atlas; cada um guarda o proprio dx/dy.
function dedupe(pieces) {
  const unique = [];
  const byContent = new Map();
  const indexOf = pieces.map((piece) => {
    const key = `${piece.width}x${piece.height}:${createHash('sha1').update(piece.rgba).digest('hex')}`;
    if (!byContent.has(key)) {
      byContent.set(key, unique.length);
      unique.push(piece);
    }
    return byContent.get(key);
  });
  return { unique, indexOf };
}

// Empacota os recortes em paginas por prateleiras (mais altos primeiro).
// Devolve as paginas (rgba) e, para cada recorte, [pagina, x, y, w, h, dx, dy].
function packAtlas(allPieces) {
  const { unique: pieces, indexOf } = dedupe(allPieces);
  const order = pieces.map((_, index) => index).sort((a, b) => pieces[b].height - pieces[a].height);
  const placements = new Array(pieces.length);
  const pages = [];
  let page = null;
  const newPage = () => {
    page = { index: pages.length, x: 0, y: 0, shelf: 0, height: 0, items: [] };
    pages.push(page);
  };
  newPage();
  for (const index of order) {
    const piece = pieces[index];
    const w = piece.width + PADDING, h = piece.height + PADDING;
    if (w > PAGE_SIZE || h > PAGE_SIZE) throw new Error(`recorte ${piece.width}x${piece.height} maior que a pagina`);
    if (page.x + w > PAGE_SIZE) {
      page.x = 0;
      page.y += page.shelf;
      page.shelf = 0;
    }
    if (page.y + h > PAGE_SIZE) newPage();
    placements[index] = [page.index, page.x, page.y, piece.width, piece.height, piece.dx, piece.dy];
    page.items.push(index);
    page.x += w;
    page.shelf = Math.max(page.shelf, h);
    page.height = Math.max(page.height, page.y + page.shelf);
  }
  const images = pages.map((sheet) => {
    // Largura justa na ultima pagina: sem faixa vazia no PNG.
    const width = sheet.index === pages.length - 1 && sheet.y === 0 ? Math.max(1, sheet.x) : PAGE_SIZE;
    const height = Math.max(1, sheet.height);
    const rgba = new Uint8Array(width * height * 4);
    for (const index of sheet.items) {
      const [, px, py, w, h] = placements[index];
      const piece = pieces[index];
      for (let y = 0; y < h; y += 1) {
        rgba.set(piece.rgba.subarray(y * w * 4, (y + 1) * w * 4), ((py + y) * width + px) * 4);
      }
    }
    return { width, height, rgba };
  });
  const shared = allPieces.map((piece, index) => {
    const [page, x, y, w, h] = placements[indexOf[index]];
    return [page, x, y, w, h, piece.dx, piece.dy];
  });
  console.log(`  ${allPieces.length} recortes, ${pieces.length} unicos`);
  return { images, placements: shared };
}

// Caixa (coordenadas do MUGEN, relativas ao pe) no espaco da celula.
function boxInCell({ x1, y1, x2, y2 }, grid, scale = 1) {
  return {
    width: Math.round((x2 - x1) * scale),
    height: Math.round((y2 - y1) * scale),
    offsetX: Math.round(grid.frameWidth / 2 + x1 * scale),
    offsetY: Math.round(grid.baseline + y1 * scale),
  };
}

function union(boxes) {
  return boxes.reduce((acc, box) => ({
    x1: Math.min(acc.x1, box.x1), y1: Math.min(acc.y1, box.y1),
    x2: Math.max(acc.x2, box.x2), y2: Math.max(acc.y2, box.y2),
  }));
}

// Trechos seguidos de quadros com clsn1: cada um e um acerto, com a uniao das
// caixas dos quadros do trecho.
function hitRuns(frames) {
  const runs = [];
  let run = null;
  frames.forEach((frame, index) => {
    if (frame.clsn1.length > 0) {
      if (!run) run = { from: index, boxes: [] };
      run.until = index;
      run.boxes.push(...frame.clsn1);
    } else if (run) {
      runs.push(run);
      run = null;
    }
  });
  if (run) runs.push(run);
  return runs.map(({ from, until, boxes }) => ({ from, until, box: union(boxes) }));
}

// Acertos do golpe/efeito: a geometria vem do .air, o resto (dano, hitstun,
// empurrao, repeticao) da especificacao, um item por trecho ou um so para
// todos.
function buildHits(frames, spec, grid, scale = 1) {
  const runs = hitRuns(frames);
  if (runs.length === 0) return null;
  const data = spec.hits ?? spec.hit;
  if (!data) return null;
  const list = Array.isArray(data) ? data : runs.map(() => data);
  if (list.length !== runs.length) {
    throw new Error(`especificacao tem ${list.length} acertos, o .air tem ${runs.length} trechos com clsn1`);
  }
  return runs.map((run, index) => ({
    from: run.from,
    until: run.until,
    box: boxInCell(run.box, grid, scale),
    ...list[index],
  }));
}

// Caixa pelo desenho (efeito sem clsn1): area opaca do quadro, encolhida pelas
// proporcoes pedidas (pontas de chama sao fumaca, nao queimam).
function opaqueBox(cell, widthRatio = 1, heightRatio = 1) {
  const { image, left, top } = cell;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (image.rgba[(y * image.width + x) * 4 + 3] < 128) continue;
      x1 = Math.min(x1, x); x2 = Math.max(x2, x);
      y1 = Math.min(y1, y); y2 = Math.max(y2, y);
    }
  }
  const width = (x2 - x1) * widthRatio, height = (y2 - y1) * heightRatio;
  const centerX = left + (x1 + x2) / 2;
  const bottom = top + y2;
  return { x1: Math.round(centerX - width / 2), y1: Math.round(bottom - height), x2: Math.round(centerX + width / 2), y2: bottom };
}

// Pixels transparentes viram preto, os semitransparentes misturam com preto.
function flatten(image) {
  const rgba = new Uint8Array(image.rgba);
  for (let k = 0; k < rgba.length; k += 4) {
    const alpha = rgba[k + 3] / 255;
    for (let c = 0; c < 3; c += 1) rgba[k + c] = Math.round(rgba[k + c] * alpha);
    rgba[k + 3] = 255;
  }
  return { ...image, rgba };
}

// Sprite reduzido por media de area, com o eixo acompanhando.
function scaleDown(image, scale) {
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  return {
    width,
    height,
    axisX: Math.round(image.axisX * scale),
    axisY: Math.round(image.axisY * scale),
    rgba: downsample(image, width, height),
  };
}

// Reducao por media de area (retrato do HUD).
function downsample(image, width, height) {
  const rgba = new Uint8Array(width * height * 4);
  const scale = Math.max(image.width / width, image.height / height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const acc = [0, 0, 0, 0];
      let count = 0;
      for (let sy = Math.floor(y * scale); sy < Math.floor((y + 1) * scale); sy += 1) {
        for (let sx = Math.floor(x * scale); sx < Math.floor((x + 1) * scale); sx += 1) {
          if (sx >= image.width || sy >= image.height) continue;
          const s = (sy * image.width + sx) * 4;
          const alpha = image.rgba[s + 3] / 255;
          for (let c = 0; c < 3; c += 1) acc[c] += image.rgba[s + c] * alpha;
          acc[3] += alpha;
          count += 1;
        }
      }
      const d = (y * width + x) * 4;
      if (!count || acc[3] === 0) continue;
      for (let c = 0; c < 3; c += 1) rgba[d + c] = Math.round(acc[c] / acc[3]);
      rgba[d + 3] = Math.round((acc[3] / count) * 255);
    }
  }
  return rgba;
}

// Retrato da grade de selecao e do HUD: recorte (crop = [x, y, w, h]) do
// retrato grande do pacote, reduzido e sobre um fundo opaco, para ficar
// enquadrado na casa como os retratos do resto do elenco.
function buildPortrait(sff, { sprite, width, height, crop, background }) {
  let image = sff.decode(...sprite);
  if (crop) {
    const [cx, cy, cw, ch] = crop;
    const rgba = new Uint8Array(cw * ch * 4);
    for (let y = 0; y < ch; y += 1) {
      for (let x = 0; x < cw; x += 1) {
        const sx = cx + x, sy = cy + y;
        if (sx < 0 || sy < 0 || sx >= image.width || sy >= image.height) continue;
        rgba.set(image.rgba.subarray((sy * image.width + sx) * 4, (sy * image.width + sx) * 4 + 4), (y * cw + x) * 4);
      }
    }
    image = { width: cw, height: ch, rgba };
  }
  const rgba = downsample(image, width, height);
  if (background) {
    const bg = [1, 3, 5].map((k) => Number.parseInt(background.slice(k, k + 2), 16));
    for (let k = 0; k < rgba.length; k += 4) {
      const alpha = rgba[k + 3] / 255;
      for (let c = 0; c < 3; c += 1) rgba[k + c] = Math.round(rgba[k + c] * alpha + bg[c] * (1 - alpha));
      rgba[k + 3] = 255;
    }
  }
  return toPng(width, height, rgba);
}

// Posicao no estilo do .cns (pos = x, y com y negativo para cima) para o
// deslocamento do motor (offsetY positivo para cima).
function toOffset(spawn) {
  if (!spawn) return spawn;
  const { pos, ...rest } = spawn;
  if (!pos) return rest;
  return { ...rest, offsetX: pos[0], offsetY: -pos[1] };
}

// Tick de um evento: "at" em ticks desde o inicio do trecho (acao) indicado,
// "frame" (animelem do MUGEN, 1 = primeiro quadro do trecho) ou "atEnd"
// (ultimo tick: o PosAdd de AnimTime = 0, que alinha o corpo com a pose
// seguinte).
function eventTick(event, starts) {
  if (event.atEnd) return starts.total - 1;
  const segment = event.action !== undefined ? starts.get(event.action) : { tick: 0, durations: null };
  if (!segment) throw new Error(`evento aponta para a acao ${event.action}, que nao faz parte do golpe`);
  if (event.frame !== undefined) {
    const durations = segment.durations ?? [...starts.values()][0].durations;
    return segment.tick + durations.slice(0, event.frame - 1).reduce((sum, ticks) => sum + ticks, 0);
  }
  return segment.tick + (event.at ?? 0);
}

// Eventos da especificacao para o config: tick absoluto, posicoes convertidas
// e repeticoes (timemod do .cns) desenroladas.
function buildEvents(events = [], starts) {
  const built = [];
  for (const event of events) {
    const { action: _action, frame: _frame, at, atEnd: _atEnd, repeat, effect, ...payload } = event;
    const first = eventTick(event, starts);
    const ticks = repeat
      ? Array.from({ length: Math.floor((repeat.until - (at ?? 0)) / repeat.every) + 1 }, (_, k) => first + k * repeat.every)
      : [first];
    for (const tick of ticks) {
      built.push({ at: tick, ...payload, ...(effect ? { effect: toOffset(effect) } : {}) });
    }
  }
  return built.sort((a, b) => a.at - b.at);
}

// Campos do efeito que passam direto da especificacao para o config.
const EFFECT_FIELDS = [
  'velocityX', 'velocityY', 'gravity', 'lifetime', 'destroyOnHit', 'attached', 'follow', 'layer', 'blend',
  'activeFrom', 'activeUntil', 'maxHits', 'hitInterval', 'damage', 'hitstun', 'push', 'heavy', 'endOnGround',
  'seal', 'alpha', 'endAtWall', 'tag', 'endWithMove', 'motion', 'hitDelay', 'unblockable', 'cover', 'endOnOwnerHit', 'angle',
];
// Campos do golpe que passam direto (os tempos ja estao em ticks).
const MOVE_FIELDS = [
  'cancels', 'onHit', 'next', 'air', 'float', 'invulnerable', 'cooldown', 'damage', 'hitstun', 'friction',
  'keepMomentum', 'requires', 'onHitBuff', 'noPush', 'charge', 'specialCancel', 'counter',
];

// Efeitos compartilhados por todo o elenco (faiscas de impacto): uma folha por
// efeito e um indice fightfx.json com grade e duracoes.
export function exportFightFx({ root, sffPath, airPath, outDir, effects }) {
  console.log('Faiscas de impacto...');
  const sff = openSff(sffPath);
  const air = readAir(airPath);
  const index = {};
  for (const [fxId, spec] of Object.entries(effects)) {
    const packer = new CellPacker(sff, spec.scale ?? 1);
    const { frames } = collectFrames(air, spec);
    const cells = frames.map((frame) => packer.cellFor(frame));
    const sheet = packer.buildGrid();
    const file = `fightfx_${fxId}.png`;
    write(root, `${outDir}/${file}`, toPng(sheet.width, sheet.height, sheet.rgba));
    index[fxId] = {
      spriteSheet: file,
      spriteGridSize: sheet.grid,
      animation: { frames: cells, durations: durationsOf(frames), loop: false },
      ...(spec.blend ? { blend: spec.blend } : {}),
    };
  }
  write(root, `${outDir}/fightfx.json`, Buffer.from(`${JSON.stringify(index, null, 2)}\n`, 'utf8'));
}

export function importMugenCharacter({
  root, sffPath, airPath, outDir, id, name, description, template,
  animations, effects = {}, combos, buttons, moveList, airJumpEffect, modes, sffOptions, portrait, hurtboxFrom = 'idle',
}) {
  console.log('Lendo o pacote MUGEN...');
  // SFF v1 (MUGEN antigo): as cores do personagem vem da paleta .act.
  const sff = openSff(sffPath, sffOptions?.actPath ? { act: readAct(sffOptions.actPath) } : {});
  const air = readAir(airPath);
  const base = JSON.parse(readFileSync(resolve(root, template), 'utf8'));

  // Todos os recortes (corpo e efeitos) vao para o mesmo atlas; cada grupo
  // lembra onde comecam os seus.
  const pieces = [];
  const addGroup = (packer) => {
    const start = pieces.length;
    pieces.push(...packer.trimmed());
    return start;
  };

  console.log('Personagem...');
  const body = new CellPacker(sff);
  const sources = {};
  for (const [animationId, spec] of Object.entries(animations)) {
    const collected = collectFrames(air, spec);
    sources[animationId] = { ...collected, cells: collected.frames.map((frame) => body.cellFor(frame)) };
  }
  const grid = body.grid;
  const bodyStart = addGroup(body);
  console.log(`  ${body.cells.length} quadros, celula ${grid.frameWidth}x${grid.frameHeight} (chao em ${grid.baseline})`);

  console.log('Efeitos...');
  const effectSources = {};
  for (const [effectId, spec] of Object.entries(effects)) {
    // scale: resolucao guardada (reampliada na tela); size: tamanho na tela
    // (corvos menores que no pacote).
    const scale = spec.scale ?? 1;
    const packer = new CellPacker(sff, scale * (spec.size ?? 1), { opaque: spec.opaque, remap: spec.remap });
    const collected = collectFrames(air, spec);
    const cells = collected.frames.map((frame) => packer.cellFor(frame));
    effectSources[effectId] = { ...collected, cells, packer, scale, size: spec.size ?? 1, grid: packer.grid, start: addGroup(packer) };
  }

  const { images, placements } = packAtlas(pieces);
  // Folhas geradas por importacoes anteriores (outro numero de paginas, o
  // formato antigo em grade) nao podem sobrar na pasta publica.
  const generated = new RegExp(`^${id}_(atlas_\\d+|fx_.+|spritesheet)\\.png$`);
  mkdirSync(resolve(root, outDir), { recursive: true });
  for (const file of readdirSync(resolve(root, outDir))) {
    if (generated.test(file)) rmSync(resolve(root, outDir, file));
  }
  const sheets = images.map((image, index) => {
    const file = `${id}_atlas_${index}.png`;
    write(root, `${outDir}/${file}`, toPng(image.width, image.height, image.rgba));
    return file;
  });

  const builtEffects = {};
  for (const [effectId, spec] of Object.entries(effects)) {
    const { frames, cells, packer, scale, size, grid: effectGrid, start, starts } = effectSources[effectId];
    // Caixas do .air vao para a escala guardada (a tela reamplia por renderScale).
    let hits = spec.harmless ? null : buildHits(frames, spec, effectGrid, scale * size);
    if (!hits && !spec.harmless && spec.area) {
      // Sem clsn1 no pacote: a caixa sai do desenho, ativa no intervalo pedido.
      // Ou uma caixa declarada (rect = x1, y1, x2, y2 do .cns, relativos ao pe).
      const { fromFrame = 0, widthRatio, heightRatio, rect, from = 0, until = frames.length - 1, ...data } = spec.area;
      const box = rect
        ? { x1: rect[0] * scale, y1: rect[1] * scale, x2: rect[2] * scale, y2: rect[3] * scale }
        : opaqueBox(packer.cells[cells[fromFrame]], widthRatio, heightRatio);
      hits = [{ from, until, box: boxInCell(box, effectGrid, 1), ...data }];
    }
    const blend = spec.blend ?? (frames.some((frame) => frame.blend.startsWith('A')) ? 'add' : undefined);
    builtEffects[effectId] = {
      spriteGridSize: effectGrid,
      atlas: packer.cells.map((_, index) => placements[start + index]),
      ...(scale !== 1 ? { renderScale: Math.round((1 / scale) * 1000) / 1000 } : {}),
      animation: { frames: cells, durations: durationsOf(frames), loop: Boolean(spec.loop) },
      ...(hits ? { hits } : {}),
      ...(spec.spawns ? { spawns: buildEvents(spec.spawns, starts).map(({ at, effect }) => ({ at, ...effect })) } : {}),
      ...(spec.onHitSpawn ? { onHitSpawn: toOffset(spec.onHitSpawn) } : {}),
      ...(spec.onDeathSpawn ? { onDeathSpawn: toOffset(spec.onDeathSpawn) } : {}),
      ...Object.fromEntries(EFFECT_FIELDS.filter((key) => spec[key] !== undefined).map((key) => [key, spec[key]])),
      ...(blend && spec.blend === undefined ? { blend } : {}),
    };
  }

  const built = {};
  for (const [animationId, spec] of Object.entries(animations)) {
    const { frames, cells, starts } = sources[animationId];
    // Golpes sem dano na especificacao herdam o do template (mesmo nome).
    const { damage, hitstun, cooldown } = base.animations[animationId] ?? {};
    const animation = {
      frames: cells,
      durations: durationsOf(frames),
      loop: Boolean(spec.loop),
      ...(damage !== undefined ? { damage } : {}),
      ...(hitstun !== undefined ? { hitstun } : {}),
      ...(cooldown !== undefined ? { cooldown } : {}),
    };
    if (spec.dash) {
      // A distancia vira velocidade pela duracao real dos quadros em movimento.
      const { distance, moveFrom, moveUntil, invulnerableFrom, invulnerableUntil, cancel } = spec.dash;
      const moveTicks = animation.durations.slice(moveFrom, moveUntil + 1).reduce((sum, ticks) => sum + ticks, 0);
      animation.dash = {
        speed: Math.round((distance / moveTicks) * 100) / 100,
        moveFrom, moveUntil, invulnerableFrom, invulnerableUntil,
        ...(cancel ? { cancel } : {}),
      };
    }
    if (spec.effect) animation.effect = toOffset(spec.effect);
    const hits = buildHits(frames, spec, grid, 1);
    if (hits) animation.hits = hits;
    if (spec.events) animation.events = buildEvents(spec.events, starts);
    for (const key of MOVE_FIELDS) if (spec[key] !== undefined) animation[key] = spec[key];
    built[animationId] = animation;
  }

  // Hurtbox unica do personagem: as caixas clsn2 do primeiro quadro parado.
  const hurt = union(sources[hurtboxFrom].frames[0].clsn2);
  write(root, `${outDir}/${id}_portrait.png`, buildPortrait(sff, portrait));

  const { spriteSheet: _unused, ...rest } = base;
  const config = {
    ...rest,
    id,
    name,
    description,
    sheets,
    spriteGridSize: grid,
    atlas: body.cells.map((_, index) => placements[bodyStart + index]),
    animations: built,
    effects: builtEffects,
    ...(combos ? { combos } : {}),
    ...(buttons ? { buttons } : {}),
    ...(moveList ? { moveList } : {}),
    ...(airJumpEffect ? { airJumpEffect: toOffset(airJumpEffect) } : {}),
    ...(modes ? { modes } : {}),
    // Hitbox base = o primeiro acerto do soco; e ela que a IA usa para medir
    // o alcance.
    hitbox: built.punch.hits?.[0]?.box ?? built.punch.hitbox,
    hurtbox: boxInCell(hurt, grid),
  };
  write(root, `${outDir}/${id}_config.json`, Buffer.from(`${JSON.stringify(config, null, 2)}\n`, 'utf8'));
  console.log(`Pronto: ${pieces.length} recortes em ${sheets.length} pagina(s).`);
}
