// Geometria do HUD de luta no padrao Capcom vs SNK 2, em coordenadas da arena
// (1280x720). Medida sobre docs/referencias-ui/cvs2/capcomvssnk2-s16.jpg
// (640x448) ampliado x2. Tudo e descrito para o lado do P1; o P2 e o espelho
// em torno do centro da tela (mirrorX).
//
// A mesma lista de pontos serve ao SVG da prancha de estilo e ao Graphics.poly
// do Pixi no HUD de verdade.

export const HUD_WIDTH = 1280;

export const mirrorX = (points) => points.map(([x, y]) => [HUD_WIDTH - x, y]);

// Faixa da vida: comprida, com as duas pontas cortadas a 45 graus.
export const LIFE_BAR = [[44, 86], [590, 86], [566, 120], [70, 120]];
export const LIFE_TOP = 86;
export const LIFE_HEIGHT = 34;
// Extremos horizontais usados para medir quanto da faixa a vida ocupa. A vida
// fica ancorada no lado de dentro (perto do timer) e o dano come a faixa a
// partir da ponta de fora, como em Street Fighter e CvS2.
export const LIFE_OUTER_X = 44;
export const LIFE_INNER_X = 590;

// Emblema central: triangulo invertido com a faixa de titulo em cima.
export const EMBLEM = [[488, 48], [792, 48], [640, 194]];
export const EMBLEM_TITLE_BAND = [[488, 48], [792, 48], [761, 78], [519, 78]];
export const EMBLEM_TITLE_Y = 70;
export const TIMER_Y = 146;

// Retrato em losango, montado por cima da ponta de fora da faixa. O retrato do
// personagem (50x55) entra no tamanho nativo, recortado pelo losango.
export const PORTRAIT_CENTER = [108, 52];
export const PORTRAIT_RADIUS = 42;
export const PORTRAIT = [
  [PORTRAIT_CENTER[0], PORTRAIT_CENTER[1] - PORTRAIT_RADIUS],
  [PORTRAIT_CENTER[0] + PORTRAIT_RADIUS, PORTRAIT_CENTER[1]],
  [PORTRAIT_CENTER[0], PORTRAIT_CENTER[1] + PORTRAIT_RADIUS],
  [PORTRAIT_CENTER[0] - PORTRAIT_RADIUS, PORTRAIT_CENTER[1]],
];

export const NAME_POSITION = [74, 164];

// Vitorias de round: losangos pequenos embaixo da ponta de dentro da faixa.
export const ROUND_MARKERS = [[508, 142], [482, 142]];
export const ROUND_MARKER_RADIUS = 10;

export const diamond = ([cx, cy], radius) => [
  [cx, cy - radius], [cx + radius, cy], [cx, cy + radius], [cx - radius, cy],
];

// Contorno em camadas do CvS2 (preto, fio branco, preto), desenhado como
// tracos sobrepostos do mais largo para o mais estreito.
export const OUTLINE_LAYERS = [
  { color: 'ink', width: 16 },
  { color: 'textPrimary', width: 10 },
  { color: 'ink', width: 5 },
];


// Medidor de despertar (Origin Mode do Gojo): texto pequeno embaixo do nome.
export const AWAKENING_POSITION = [74, 196];
