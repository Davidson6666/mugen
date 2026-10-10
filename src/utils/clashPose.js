// Cena de confronto da abertura: um lutador acerta o soco no outro, numa imagem
// parada. Tudo sai das proprias configs dos dois: o quadro em que o soco esta
// esticado (o primeiro acerto da animacao), onde a caixa de acerto termina (de
// ate onde o punho chega) e o corpo do outro (a caixa de dano). Assim cada par
// se encosta no lugar certo sem ninguem posicionar na mao.
//
// Medidas em pixels da celula do sprite: x a partir da esquerda, y a partir do
// topo; o pe fica na linha "baseline" e o corpo, no centro da celula.
const DEFAULT_REACH = 40;

function frameOf(config, name, index) {
  const clip = config.animations[name] ?? config.animations.idle;
  const at = Math.max(0, Math.min(index, clip.frames.length - 1));
  return { clip: config.animations[name] ? name : 'idle', index: at, sheetFrame: clip.frames[at] };
}

// Pagina do atlas em que o quadro mora (para pre-carregar so o que aparece).
export function sheetPageOf(config, sheetFrame) {
  return config.atlas?.[sheetFrame]?.[0] ?? 0;
}

// factor: quantas vezes maior que na luta cada um aparece (o tamanho relativo
// entre os dois se mantem, porque ele multiplica o spriteScale de cada um).
export function clashLayout(attacker, defender, { factor = 3.1, centerX = 640, feetY = 590, minGap = 300, maxGap = 700 } = {}) {
  const attackScale = (attacker.spriteScale ?? 1) * factor;
  const defendScale = (defender.spriteScale ?? 1) * factor;
  const strike = attacker.animations.punch?.hits?.[0];
  const box = strike?.box ?? attacker.hitbox;
  const cellCenter = attacker.spriteGridSize.frameWidth / 2;

  // Do centro do corpo de quem bate ate a ponta do punho, e a que altura ela fica.
  const reach = box ? (box.offsetX + box.width - cellCenter) * attackScale : DEFAULT_REACH * attackScale;
  const fistUp = box ? (attacker.spriteGridSize.baseline - (box.offsetY + box.height / 2)) * attackScale : 55 * attackScale;

  // O corpo de quem apanha comeca perto da ponta do punho (um pouco dentro dele).
  const bodyHalf = ((defender.hurtbox?.width ?? 30) / 2) * defendScale;
  const gap = Math.max(minGap, Math.min(maxGap, reach + bodyHalf * 0.55));

  const attackerX = centerX - gap / 2;
  return {
    attacker: {
      x: attackerX,
      feetY,
      scale: factor,
      ...frameOf(attacker, 'punch', strike?.from ?? 1),
    },
    defender: {
      x: attackerX + gap,
      feetY,
      scale: factor,
      ...frameOf(defender, 'hitReaction', 0),
    },
    contact: { x: attackerX + Math.min(reach, gap), y: feetY - fistUp },
  };
}
