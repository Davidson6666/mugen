import { Container, Graphics } from 'pixi.js';
import { PALETTE } from '../utils/palette.js';
import { label } from './Hud.js';
import { markerPositions } from '../utils/markerLayout.js';

// Setinha com "1P" / "2P" sobre a cabeca de cada lutador, na cor do jogador (a
// mesma do HUD e dos cursores da selecao). Serve para quem joga contra outra
// pessoa saber quem e quem, principalmente no espelho (os dois com o mesmo
// lutador). So desenho: le a posicao dos lutadores e nao muda nada da luta.

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

export class PlayerMarkers {
  constructor(labels) {
    this.view = new Container();
    this.time = 0;
    this.markers = labels.map((text, index) => {
      const color = index === 0 ? PALETTE.cursorP1 : PALETTE.cursorP2;
      const marker = arrow(color);
      const name = label(text, 24, { fill: color, stroke: 5 });
      name.anchor.set(0.5, 1);
      name.position.set(0, -12);
      marker.addChild(name);
      this.view.addChild(marker);
      return marker;
    });
  }

  update(fighters, frameDelta) {
    this.time += frameDelta;
    const spots = markerPositions(fighters.map((fighter) => fighter.hurtRect));
    this.markers.forEach((marker, index) => {
      const bob = Math.sin(this.time * BOB_SPEED + index * Math.PI) * BOB_PIXELS;
      marker.position.set(spots[index].x, spots[index].y + bob);
      marker.visible = fighters[index].sprite.visible;
    });
  }
}
