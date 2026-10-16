import { Container, Graphics } from 'pixi.js';
import { PALETTE } from '../utils/palette.js';
import { label } from './Hud.js';
import { markerPositions } from '../utils/markerLayout.js';

// Setinha com "1P" / "2P" (ou "CPU") sobre a cabeca de cada lutador, na cor do
// lado (a mesma do HUD e dos cursores da selecao). Serve para saber quem e quem,
// principalmente no espelho (os dois com o mesmo lutador). Rotulo null = sem
// seta naquele lado (o boneco do treino). So desenho: le a posicao dos lutadores e nao muda nada da luta.

const BOB_PIXELS = 3;
const BOB_SPEED = 0.09;

function arrow(color) {
  const marker = new Container();
  const tip = new Graphics()
    .poly([-11, -12, 11, -12, 0, 0])
    .fill({ color })
    .stroke({ color: PALETTE.ink, width: 3, join: 'round' });
  marker.addChild(tip);
  return marker;
}

// Topo do desenho do quadro atual, em coordenadas do mundo. O atlas guarda o
// recorte do desenho dentro da celula (trim); sem ele, o topo da celula.
export function visualTop(sprite) {
  const texture = sprite.texture;
  const cellHeight = texture?.orig?.height ?? texture?.height ?? 0;
  const trimTop = texture?.trim ? texture.trim.y : 0;
  return sprite.y + (trimTop - sprite.anchor.y * cellHeight) * Math.abs(sprite.scale.y);
}

// Subir para acompanhar um braco erguido e rapido; descer e devagar, senao a
// seta treme a cada quadro da animacao.
const RISE = 0.6;
const FALL = 0.12;
const FADE = 0.15;

export class PlayerMarkers {
  constructor(labels) {
    this.view = new Container();
    this.time = 0;
    this.labels = labels;
    this.heights = labels.map(() => null);
    this.markers = labels.map((text, index) => {
      const color = index === 0 ? PALETTE.cursorP1 : PALETTE.cursorP2;
      const marker = arrow(color);
      const name = label(text ?? '', 24, { fill: color, stroke: 5 });
      name.anchor.set(0.5, 1);
      name.position.set(0, -12);
      marker.addChild(name);
      marker.visible = text !== null;
      this.view.addChild(marker);
      return marker;
    });
  }

  // show: a luta esta valendo. Fora dela (K.O., pose de vitoria, troca de
  // round) as setas somem, para nao cobrir as animacoes.
  update(fighters, frameDelta, show = true) {
    this.time += frameDelta;
    // O ponto mais alto entre o corpo e o desenho do quadro.
    const rects = fighters.map((fighter) => {
      const rect = fighter.hurtRect;
      const top = Math.min(rect.y, visualTop(fighter.sprite));
      return { ...rect, y: top };
    });
    const spots = markerPositions(rects);
    this.markers.forEach((marker, index) => {
      const target = spots[index].y;
      const current = this.heights[index] ?? target;
      const rate = target < current ? RISE : FALL;
      this.heights[index] = current + (target - current) * Math.min(1, rate * frameDelta);
      const bob = Math.sin(this.time * BOB_SPEED + index * Math.PI) * BOB_PIXELS;
      marker.position.set(spots[index].x, this.heights[index] + bob);
      const wanted = show && fighters[index].sprite.visible ? 1 : 0;
      marker.alpha += Math.max(-FADE, Math.min(FADE, wanted - marker.alpha)) * frameDelta;
      marker.alpha = Math.max(0, Math.min(1, marker.alpha));
      marker.visible = this.labels[index] !== null && marker.alpha > 0.01;
    });
  }
}
