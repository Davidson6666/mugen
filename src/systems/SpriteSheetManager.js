import { Assets, Rectangle, Texture } from 'pixi.js';

// Carrega personagens e mapas a partir dos JSONs em /public/assets. Nada aqui
// conhece nome de personagem: trocar o arquivo troca o conteudo do jogo.

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Falha ao carregar config: ${url} (${response.status})`);
  return response.json();
}

function sliceGrid(texture, grid) {
  const { cols, rows, frameWidth, frameHeight } = grid;
  const frames = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      frames.push(
        new Texture({
          source: texture.source,
          frame: new Rectangle(col * frameWidth, row * frameHeight, frameWidth, frameHeight),
        }),
      );
    }
  }
  return frames;
}

// Atlas recortado (personagens importados do MUGEN): cada quadro guarda so a
// parte desenhada, [pagina, x, y, w, h, dx, dy], e o tamanho cheio da celula
// fica em "orig". Para o Sprite nada muda: a ancora continua no pe.
function sliceAtlas(pages, atlas, grid) {
  const orig = new Rectangle(0, 0, grid.frameWidth, grid.frameHeight);
  return atlas.map(([page, x, y, width, height, dx, dy]) => new Texture({
    source: pages[page].source,
    frame: new Rectangle(x, y, width, height),
    orig,
    trim: new Rectangle(dx, dy, width, height),
  }));
}

// Config vem de arquivo externo: vale avisar cedo quando uma animacao aponta
// para um frame que nao existe na grade declarada.
function validateAnimations(config, frameCount) {
  for (const [name, animation] of Object.entries(config.animations ?? {})) {
    const invalid = animation.frames.filter((index) => index < 0 || index >= frameCount);
    if (invalid.length > 0) {
      console.warn(
        `[${config.id}] animacao "${name}" referencia frames fora da grade (${invalid.join(', ')}); grade tem ${frameCount} frames.`,
      );
    }
  }
}

export class SpriteSheetManager {
  constructor() {
    this.characters = new Map();
    this.maps = new Map();
  }

  async loadCharacter(entry) {
    const cached = this.characters.get(entry.id);
    if (cached) return cached;

    const config = await fetchJson(`${entry.dir}/${entry.config}`);
    let frames;
    let effectFrames;
    if (config.atlas) {
      const pages = await Promise.all(config.sheets.map((file) => Assets.load(`${entry.dir}/${file}`)));
      // A camera da luta amplia 1.5x: com "nearest" cada pixel sairia com 1 ou
      // 2 px de largura e o contorno serrilharia. Suavizado fica liso.
      for (const page of pages) page.source.scaleMode = 'linear';
      frames = sliceAtlas(pages, config.atlas, config.spriteGridSize);
      effectFrames = {};
      for (const [id, effect] of Object.entries(config.effects ?? {})) {
        effectFrames[id] = sliceAtlas(pages, effect.atlas, effect.spriteGridSize);
        validateAnimations({ id: `${config.id}/${id}`, animations: { [id]: effect.animation } }, effectFrames[id].length);
      }
    } else {
      const texture = await Assets.load(`${entry.dir}/${config.spriteSheet}`);
      texture.source.scaleMode = 'linear';
      frames = sliceGrid(texture, config.spriteGridSize);
      effectFrames = await this.loadEffects(entry, config);
    }
    validateAnimations(config, frames.length);
    const record = { config, frames, effectFrames };
    this.characters.set(entry.id, record);
    return record;
  }

  // Cada efeito tem sprite sheet e grade proprios: um projetil pequeno e um
  // Susanoo que ocupa meia tela nao cabem bem na mesma celula.
  async loadEffects(entry, config) {
    const effectFrames = {};
    await Promise.all(
      Object.entries(config.effects ?? {}).map(async ([id, effect]) => {
        const texture = await Assets.load(`${entry.dir}/${effect.spriteSheet}`);
        texture.source.scaleMode = 'linear';
        effectFrames[id] = sliceGrid(texture, effect.spriteGridSize);
        validateAnimations(
          { id: `${config.id}/${id}`, animations: { [id]: effect.animation } },
          effectFrames[id].length,
        );
      }),
    );
    return effectFrames;
  }

  // Faiscas de impacto compartilhadas pelo elenco (public/assets/fx), geradas
  // por scripts/import-itachi.mjs a partir do pacote MUGEN.
  async loadFightFx(dir = '/assets/fx') {
    if (!this.fightFx) {
      this.fightFx = (async () => {
        const index = await fetchJson(`${dir}/fightfx.json`);
        const sparks = {};
        await Promise.all(Object.entries(index).map(async ([id, definition]) => {
          const texture = await Assets.load(`${dir}/${definition.spriteSheet}`);
          texture.source.scaleMode = 'linear';
          sparks[id] = { definition, frames: sliceGrid(texture, definition.spriteGridSize) };
        }));
        return sparks;
      })();
    }
    return this.fightFx;
  }

  async loadMap(entry) {
    const cached = this.maps.get(entry.id);
    if (cached) return cached;

    const config = await fetchJson(`${entry.dir}/${entry.config}`);
    const texture = await Assets.load(`${entry.dir}/${config.backgroundImage}`);
    texture.source.scaleMode = 'nearest';

    const record = { config, texture };
    this.maps.set(entry.id, record);
    return record;
  }

  unload() {
    this.characters.clear();
    this.maps.clear();
  }
}

// Instancia unica do jogo: a tela de confronto pre-carrega o que a luta vai
// precisar e a arena reaproveita o mesmo cache, sem baixar duas vezes.
export const assetManager = new SpriteSheetManager();
