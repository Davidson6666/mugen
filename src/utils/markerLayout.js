// Posicao das setas 1P / 2P sobre os lutadores (src/systems/PlayerMarker.js),
// separada do Pixi para dar para testar.
const GAP_ABOVE_HEAD = 6;
// Quando os dois estao colados, o 2P sobe para as setas nao se cobrirem.
const OVERLAP_DISTANCE = 56;
const OVERLAP_LIFT = 34;

// Onde cada seta fica, em coordenadas do mundo: no meio do corpo, acima da
// cabeca. Recebe os retangulos do corpo (hurtRect) dos dois.
export function markerPositions(rects) {
  const spots = rects.map((rect) => ({ x: rect.x + rect.width / 2, y: rect.y - GAP_ABOVE_HEAD }));
  if (spots.length === 2 && Math.abs(spots[0].x - spots[1].x) < OVERLAP_DISTANCE) {
    spots[1].y = Math.min(spots[1].y, spots[0].y) - OVERLAP_LIFT;
  }
  return spots;
}
