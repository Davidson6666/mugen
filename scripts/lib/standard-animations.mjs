// As animacoes comuns do MUGEN que todo pacote traz e o motor do MUGEN usa nos
// estados padrao (common1.cns): virar, agachar, as fases do pulo, o pulo duplo,
// a aterrissagem, apanhar em pe / agachado / no ar, ser lancado, cair, deitar e
// levantar. O importador de cada personagem so lista os golpes; estas entram
// sozinhas, para os que o .air tiver e que o personagem nao tenha definido.
//
// Cada nome aceita alternativas (a primeira acao que existir no .air vale):
// alguns pacotes so trazem o pulo duplo em 45/46, outros em 44.
export const STANDARD_ANIMATIONS = {
  // Movimento
  turn: { actions: [[5]] },
  crouchDown: { actions: [[10]] },
  crouchUp: { actions: [[12]] },
  jumpUp: { actions: [[41]] },
  jumpForward: { actions: [[42]] },
  jumpBack: { actions: [[43]] },
  airJump: { actions: [[44, 45, 46]] },
  airJumpForward: { actions: [[45, 44]] },
  airJumpBack: { actions: [[46, 44]] },
  landing: { actions: [[47]] },
  guardEndStanding: { actions: [[140]], durationScale: 0.6 },
  guardEndCrouching: { actions: [[141]], durationScale: 0.6 },
  // Apanhar
  hitStanding: { actions: [[5000]] },
  hitStanding2: { actions: [[5001]] },
  hitStanding3: { actions: [[5002]] },
  hitHeavy: { actions: [[5005]] },
  hitHeavy2: { actions: [[5006]] },
  hitCrouching: { actions: [[5010]] },
  hitCrouching2: { actions: [[5011]] },
  hitAir: { actions: [[5020]] },
  // Ser lancado: sobe, cai, bate no chao, fica deitado e se levanta
  launched: { actions: [[5030]] },
  falling: { actions: [[5050]], loop: true },
  knockdown: { actions: [[5100], [5110]] },
  getUp: { actions: [[5120]] },
};

// Especificacoes (formato do importador) das que o pacote tem e o personagem
// ainda nao definiu.
export function standardAnimationsFor(air, defined) {
  const specs = {};
  for (const [name, { actions, loop, durationScale }] of Object.entries(STANDARD_ANIMATIONS)) {
    if (defined[name]) continue;
    const chosen = actions.map((options) => options.find((id) => air.get(id)));
    if (chosen.some((id) => id === undefined)) continue;
    specs[name] = { actions: chosen, ...(loop ? { loop } : {}), ...(durationScale ? { durationScale } : {}) };
  }
  return specs;
}
