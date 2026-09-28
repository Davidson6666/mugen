import { PALETTE } from '../utils/palette.js';
import { OUTLINE_LAYERS, diamond } from '../utils/hudGeometry.js';
import { BAND, CELL_RADIUS, cellAt, toPoints } from '../utils/cvs2Layout.js';
import '../styles/cvs2.css';

// Pecas de interface no padrao Capcom vs SNK 2, em SVG com coordenadas da
// arena (1280x720). Referencias em docs/referencias-ui/cvs2/.

// Poligono com o contorno em camadas do CvS2 (preto, fio branco, preto).
export function Shape({ points, fill, outline = true }) {
  const d = toPoints(points);
  return (
    <g strokeLinejoin="miter">
      {outline && OUTLINE_LAYERS.map((layer) => (
        <polygon key={layer.width} points={d} fill="none" stroke={PALETTE[layer.color]} strokeWidth={layer.width} />
      ))}
      <polygon points={d} fill={fill} />
    </g>
  );
}

// Texto em italico pesado com contorno preto por baixo do preenchimento.
export function Label({
  x, y, size, children, anchor = 'start', weight = 900, fill = PALETTE.textPrimary, stroke = 8,
}) {
  return (
    <text
      x={x} y={y} fontSize={size} textAnchor={anchor}
      fontFamily="'Barlow Condensed'" fontStyle="italic" fontWeight={weight}
      fill={fill} stroke={PALETTE.ink} strokeWidth={stroke} strokeLinejoin="round" paintOrder="stroke"
    >
      {children}
    </text>
  );
}

// Capsula amarela com texto preto, como o nome "YUN" da selecao do CvS2.
export function Capsule({ x, y, width = 260, children, align = 'start', size = 40 }) {
  const left = align === 'end' ? x - width : x;
  const height = Math.round(size * 1.15);
  return (
    <g>
      <rect
        x={left} y={y} width={width} height={height} rx={height / 2}
        fill={PALETTE.fieldYellow} stroke={PALETTE.ink} strokeWidth={5}
      />
      <Label
        x={align === 'end' ? x - height * 0.6 : x + height * 0.6} y={y + height * 0.83} size={size}
        anchor={align} fill={PALETTE.ink} stroke={0}
      >
        {children}
      </Label>
    </g>
  );
}

// Pedestal amarelo achatado onde o sprite pisa.
export function Pedestal({ x, y, halfWidth = 110 }) {
  return (
    <polygon
      points={toPoints([[x, y - 26], [x + halfWidth, y], [x, y + 26], [x - halfWidth, y]])}
      fill={PALETTE.fieldYellow} stroke={PALETTE.ink} strokeWidth={5}
    />
  );
}

/* ------------------------------------------------------- faixa diagonal -- */

const LATTICE = [];
for (let i = -9; i <= 9; i += 1) {
  for (let j = -2; j <= 2; j += 1) LATTICE.push(cellAt(i, j));
}

const SPEED_LINES = [
  { from: [520, 0], length: 260, width: 10 }, { from: [430, 0], length: 520, width: 4 },
  { from: [300, 0], length: 180, width: 6 }, { from: [1280, 330], length: 300, width: 10 },
  { from: [1280, 470], length: 420, width: 4 }, { from: [1280, 610], length: 200, width: 6 },
];

// Fundo das telas de menu: campos diagonais, letreiro gigante apagado, linhas
// de velocidade e a faixa preta, com a grade vazada quando a tela tem casas.
export function DiagonalBackdrop({ topWord = 'MUGEN', bottomWord = 'FIGHTER', lattice = true }) {
  return (
    <g>
      <rect width={1280} height={720} fill={PALETTE.fieldOrange} />
      <polygon points="0,380 0,720 360,720" fill={PALETTE.fieldRed} />
      <polygon points={toPoints([[1212, 0], [1280, 0], [1280, 720], [492, 720]])} fill={PALETTE.fieldBlue} />
      <Label x={40} y={420} size={260} fill={PALETTE.fieldOrangeLight} stroke={0}>{topWord}</Label>
      <Label x={1240} y={690} size={200} anchor="end" fill={PALETTE.fieldBlueLight} stroke={0}>{bottomWord}</Label>
      {SPEED_LINES.map(({ from: [x, y], length, width }) => (
        <line
          key={`${x}-${y}`} x1={x} y1={y} x2={x - length * Math.SQRT1_2} y2={y + length * Math.SQRT1_2}
          stroke={y === 0 ? PALETTE.fieldOrangeLight : PALETTE.fieldBlueLight} strokeWidth={width}
        />
      ))}
      <polygon points={toPoints(BAND)} fill={PALETTE.ink} />
      <defs><clipPath id="cvs2-band"><polygon points={toPoints(BAND)} /></clipPath></defs>
      <g clipPath="url(#cvs2-band)">
        {lattice && LATTICE.map((at) => (
          <polygon key={at.join()} points={toPoints(diamond(at, CELL_RADIUS))} fill="none" stroke={PALETTE.cellEmpty} strokeWidth={3} />
        ))}
      </g>
      <polyline points="788,0 68,720" stroke={PALETTE.fieldYellow} strokeWidth={10} fill="none" />
      <polyline points="1212,0 492,720" stroke={PALETTE.fieldYellow} strokeWidth={10} fill="none" />
    </g>
  );
}

const CURSOR_COLORS = [PALETTE.cursorP1, PALETTE.cursorP2];

// Casa da grade com retrato no tamanho nativo, recortado pelo losango. Os
// cursores sao molduras coloridas; "1P" fica a esquerda e "2P" a direita, para
// nunca se cobrirem em casas vizinhas.
export function PortraitCell({ at, image, id, cursors = [], onPointerEnter, onClick }) {
  const [cx, cy] = at;
  const clipId = `cell-${id}`;
  const shape = diamond(at, CELL_RADIUS);
  return (
    <g onPointerEnter={onPointerEnter} onClick={onClick} style={{ cursor: 'pointer' }}>
      <defs><clipPath id={clipId}><polygon points={toPoints(shape)} /></clipPath></defs>
      <Shape points={shape} fill={PALETTE.portraitBg} />
      {image && (
        <image
          href={image} x={cx - 25} y={cy - 27} width={50} height={55}
          clipPath={`url(#${clipId})`} style={{ imageRendering: 'pixelated' }}
        />
      )}
      {cursors.map((player, order) => (
        <g key={player}>
          <polygon
            points={toPoints(diamond(at, CELL_RADIUS + 4 + order * 7))} fill="none"
            stroke={CURSOR_COLORS[player]} strokeWidth={7}
          />
          <Label
            x={player === 0 ? cx - CELL_RADIUS - 14 : cx + CELL_RADIUS + 14} y={cy + 11} size={32}
            anchor={player === 0 ? 'end' : 'start'} fill={CURSOR_COLORS[player]} stroke={6}
          >
            {player + 1}P
          </Label>
        </g>
      ))}
    </g>
  );
}

// Opcao de menu: barra inclinada como a ponta da barra de vida. A ativa fica
// amarela com texto preto; as outras, pretas com o contorno em camadas.
export function MenuOption({ x, y, width = 380, label, active, disabled, marker = true, onPointerEnter, onClick }) {
  const height = 54;
  const skew = 18;
  const points = [[x + skew, y], [x + width + skew, y], [x + width, y + height], [x, y + height]];
  let fill = PALETTE.ink;
  let textColor = PALETTE.textPrimary;
  if (active) {
    fill = PALETTE.fieldYellow;
    textColor = PALETTE.ink;
  } else if (disabled) {
    fill = PALETTE.cellEmpty;
    textColor = PALETTE.textSecondary;
  }
  return (
    <g onPointerEnter={onPointerEnter} onClick={disabled ? undefined : onClick} style={{ cursor: disabled ? 'default' : 'pointer' }}>
      <Shape points={points} fill={fill} />
      <Label x={x + skew + 26} y={y + 42} size={38} fill={textColor} stroke={active ? 0 : 6}>{label}</Label>
      {active && marker && <Label x={x + width - 14} y={y + 42} size={38} anchor="end" fill={PALETTE.cursorP1} stroke={6}>◀</Label>}
    </g>
  );
}
