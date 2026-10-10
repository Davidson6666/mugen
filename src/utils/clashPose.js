// Cena de confronto da abertura: um lutador acerta o soco no outro, numa imagem
// parada. Tudo sai das proprias configs dos dois: o quadro em que o soco esta
// esticado (o primeiro acerto da animacao) e o retangulo que cada quadro ocupa de
// verdade no atlas (o desenho sem a margem transparente). Com isso o punho entra
// no corpo de quem apanha e o par fica do tamanho certo, sem ninguem posicionar
// na mao.
//
// Medidas em pixels da celula do sprite: x a partir da esquerda, y a partir do
// topo; o pe fica na linha "baseline" e o corpo, no centro da celula.
function frameOf(config, name, index) {
  const clip = config.animations[name] ?? config.animations.idle;
  const at = Math.max(0, Math.min(index, clip.frames.length - 1));
  return { clip: config.animations[name] ? name : 'idle', index: at, sheetFrame: clip.frames[at] };
}

// Pagina do atlas em que o quadro mora (para pre-carregar so o que aparece).
export function sheetPageOf(config, sheetFrame) {
  return config.atlas?.[sheetFrame]?.[0] ?? 0;
}

// Parte visivel do quadro, em pixels da celula. Sem atlas, a celula inteira.
function visibleBounds(config, sheetFrame) {
  const { frameWidth, frameHeight, baseline = frameHeight } = config.spriteGridSize;
  const rect = config.atlas?.[sheetFrame];
  if (!rect) return { left: 0, right: frameWidth, top: 0, bottom: baseline };
  const [, , , width, height, dx, dy] = rect;
  return { left: dx, right: dx + width, top: dy, bottom: dy + height };
}

// targetHeight: altura (na tela) do mais alto dos dois; o tamanho relativo entre
// eles se mantem porque cada um segue o proprio spriteScale.
// overlapRatio: quanto do corpo de quem apanha o punho atravessa.
export function clashLayout(attacker, defender, {
  targetHeight = 400, feetY = 624, centerX = 640, maxWidth = 1160, maxFactor = 7, overlapRatio = 0.35,
} = {}) {
  const hit = frameOf(attacker, 'punch', attacker.animations.punch?.hits?.[0]?.from ?? 1);
  const hurt = frameOf(defender, 'hitReaction', 0);
  const boundsA = visibleBounds(attacker, hit.sheetFrame);
  const boundsD = visibleBounds(defender, hurt.sheetFrame);
  const gridA = attacker.spriteGridSize;
  const gridD = defender.spriteGridSize;
  const sizeA = attacker.spriteScale ?? 1;
  const sizeD = defender.spriteScale ?? 1;
  const centerA = gridA.frameWidth / 2;
  const centerD = gridD.frameWidth / 2;

  // Em unidades de "factor" = 1: da linha do pe ate o topo, e as distancias a
  // partir do centro do corpo (para a frente e para tras de cada um).
  const heightA = Math.max(1, (gridA.baseline ?? gridA.frameHeight) - boundsA.top) * sizeA;
  const heightD = Math.max(1, (gridD.baseline ?? gridD.frameHeight) - boundsD.top) * sizeD;
  const frontA = (boundsA.right - centerA) * sizeA;
  const backA = (centerA - boundsA.left) * sizeA;
  const frontD = (boundsD.right - centerD) * sizeD;
  const backD = (centerD - boundsD.left) * sizeD;
  const overlap = (boundsD.right - boundsD.left) * sizeD * overlapRatio;
  const gapUnits = frontA + frontD - overlap;
  const spanUnits = backA + gapUnits + backD;

  // Tudo e proporcional ao fator: ele sai da altura desejada e, se o par ficar
  // largo demais para a tela (golpe de espada comprida), diminui um pouco.
  const factor = Math.min(maxFactor, targetHeight / Math.max(heightA, heightD), maxWidth / spanUnits);
  const gap = gapUnits * factor;
  const attackerX = centerX - (gap + backD * factor - backA * factor) / 2;

  // A faisca fica na ponta do punho, na altura da caixa de acerto (ou no meio do
  // corpo se o golpe nao tiver uma).
  const strike = attacker.animations.punch?.hits?.[0]?.box ?? attacker.hitbox;
  const fistUp = strike
    ? ((gridA.baseline ?? gridA.frameHeight) - (strike.offsetY + strike.height / 2)) * sizeA * factor
    : heightA * factor * 0.55;
  const contactX = attackerX + frontA * factor - overlap * factor * 0.25;

  return {
    factor,
    left: attackerX - backA * factor,
    right: attackerX + gap + backD * factor,
    attacker: { x: attackerX, feetY, scale: factor, ...hit },
    defender: { x: attackerX + gap, feetY, scale: factor, ...hurt },
    contact: { x: contactX, y: feetY - fistUp },
  };
}
