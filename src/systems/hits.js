// Janelas de acerto, comuns a golpe de corpo e a efeito. Cada janela e um
// trecho de quadros (from..until) com caixa e dados proprios:
//   { from, until, box, damage?, hitstun?, push?, heavy?, every?, count? }
// Sem "every" a janela acerta uma vez so. Com "every" ela volta a acertar a
// cada N ticks enquanto durar, ate "count" vezes (rajada de corvos, chama que
// queima parada).

const legacyCache = new WeakMap();

// Config antigo (hitboxFrame/hitboxLastFrame/hitbox, activeFrom/activeUntil)
// vira uma janela so, para os dois formatos funcionarem igual.
export function hitsOf(definition, { lastFrame } = {}) {
  if (!definition) return [];
  if (definition.hits) return definition.hits;
  if (legacyCache.has(definition)) return legacyCache.get(definition);
  let hits = [];
  if (definition.hitboxFrame !== undefined) {
    hits = [{
      from: definition.hitboxFrame,
      until: definition.hitboxLastFrame ?? definition.hitboxFrame,
      box: definition.hitbox,
    }];
  } else if (definition.activeFrom !== undefined || definition.activeUntil !== undefined || definition.hitbox) {
    if (definition.hitbox) {
      hits = [{ from: definition.activeFrom ?? 0, until: definition.activeUntil ?? lastFrame ?? Infinity, box: definition.hitbox }];
    }
  }
  legacyCache.set(definition, hits);
  return hits;
}

function canLand(hit, landed, clock) {
  if (!landed) return true;
  if (!hit.every) return false;
  if (landed.count >= (hit.count ?? Infinity)) return false;
  return clock - landed.clock >= hit.every;
}

// Janela aberta neste quadro. ready diz se ela ainda pode acertar agora (log
// guarda, por janela, quantas vezes ela ja acertou e em que tick). Se houver
// mais de uma aberta, a que pode acertar tem preferencia.
export function pickActiveHit(hits, frame, clock, log) {
  let open = null;
  for (let index = 0; index < hits.length; index += 1) {
    const hit = hits[index];
    if (frame < hit.from || frame > hit.until) continue;
    if (canLand(hit, log.get(index), clock)) return { hit, index, ready: true };
    open ??= { hit, index, ready: false };
  }
  return open;
}

// Lancamento da janela. Numa janela que repete (rajada, feixe) so o ultimo
// acerto derruba; senao o oponente sairia voando no primeiro e os outros
// acertos nunca chegariam. recorded: o acerto atual ja esta no log.
export function launchOf(hit, log, index, recorded = false) {
  if (!hit.launch) return undefined;
  if (!hit.every) return hit.launch;
  const done = (log.get(index)?.count ?? 0) + (recorded ? 0 : 1);
  return done >= (hit.count ?? Infinity) ? hit.launch : undefined;
}

export function recordHit(log, index, clock) {
  const landed = log.get(index);
  log.set(index, { count: (landed?.count ?? 0) + 1, clock });
}
