// Geometria das telas de menu no padrao Capcom vs SNK 2, em coordenadas da
// arena (1280x720). Referencia: docs/referencias-ui/cvs2/capcomvssnk2-s4.jpg.

export const toPoints = (points) => points.map(([x, y]) => `${x},${y}`).join(' ');

// Faixa a 45 graus que corta a tela: campo laranja do P1 em cima, azul do P2
// embaixo, grade de losangos no meio.
export const BAND = [[788, 0], [1212, 0], [492, 720], [68, 720]];
export const CELL_RADIUS = 48;
const CELL_STEP = CELL_RADIUS + 5;

// Posicao de uma casa da grade: i anda ao longo da faixa, j atravessa.
export const cellAt = (i, j) => [640 + (i + j) * CELL_STEP, 360 + (j - i) * CELL_STEP];
