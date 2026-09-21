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
    const texture = await Assets.load(`${entry.dir}/${config.spriteSheet}`);
    texture.source.scaleMode = 'nearest';

    const frames = sliceGrid(texture, config.spriteGridSize);
    validateAnimations(config, frames.length);

    const record = { config, frames };
    this.characters.set(entry.id, record);
    return record;
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
