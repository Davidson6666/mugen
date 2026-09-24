import { Sprite } from 'pixi.js';
import { AnimationStateMachine } from './AnimationStateMachine.js';

// O que faz o golpe "pesar": a luta congela alguns ticks no impacto (hitstop),
// a faisca aparece no ponto exato e a tela treme nos golpes fortes. Nada disso
// muda dano nem regra; e so resposta visual ao resultado de applyHit.

// Ticks de congelamento por tipo de impacto.
const HITSTOP = { block: 5, hit: 7, heavy: 11, ko: 28 };
// Tremor: duracao em ticks e deslocamento maximo em px.
const SHAKE = {
  block: null,
  hit: { ticks: 5, amplitude: 2 },
  heavy: { ticks: 12, amplitude: 6 },
  ko: { ticks: 24, amplitude: 9 },
};
const SPARK_BY_KIND = { block: 'block', hit: 'hit', heavy: 'heavy', ko: 'heavy' };
// A partir desse dano o golpe conta como forte (os especiais do template).
const HEAVY_DAMAGE = 30;

// Golpe marcado como forte (animtype Hard/Heavy no pacote MUGEN) pesa mesmo
// com pouco dano: o fim de uma sequencia precisa "fechar" com mais impacto.
function kindOf({ outcome, damage, heavy }) {
  if (outcome === 'block') return 'block';
  if (outcome === 'ko') return 'ko';
  return heavy || damage >= HEAVY_DAMAGE ? 'heavy' : 'hit';
}

export class HitFeedback {
  // layer: onde as faiscas sao desenhadas; scene: o que treme (cenario +
  // lutadores, nunca o HUD); sparks: saida de assetManager.loadFightFx().
  constructor({ layer, scene, sparks = {} }) {
    this.layer = layer;
    this.scene = scene;
    this.sparks = sparks;
    this.active = [];
    this.hitstop = 0;
    this.shake = null;
    // O tremor desloca a cena a partir de onde a camera a deixou.
    this.origin = { x: scene.position.x, y: scene.position.y };
  }

  onResult(result) {
    // Esquiva nao tem impacto: nada congela nem treme.
    if (result.outcome === 'evade') return;
    const kind = kindOf(result);
    this.hitstop = Math.max(this.hitstop, HITSTOP[kind]);
    if (SHAKE[kind] && (!this.shake || SHAKE[kind].amplitude >= this.shake.amplitude)) {
      this.shake = { ...SHAKE[kind], remaining: SHAKE[kind].ticks };
    }
    if (result.point) this.spawnSpark(SPARK_BY_KIND[kind], result.point);
  }

  spawnSpark(id, { x, y }) {
    const spark = this.sparks[id];
    if (!spark) return;
    const { definition, frames } = spark;
    const animation = new AnimationStateMachine({ main: definition.animation });
    animation.play('main');
    const sprite = new Sprite(frames[animation.sheetFrame]);
    const { frameHeight, baseline = frameHeight } = definition.spriteGridSize;
    sprite.anchor.set(0.5, baseline / frameHeight);
    sprite.position.set(Math.round(x), Math.round(y));
    // Espelhamento aleatorio: a mesma faisca nao parece repetida.
    sprite.scale.x = Math.random() < 0.5 ? -1 : 1;
    if (definition.blend) sprite.blendMode = definition.blend;
    this.layer.addChild(sprite);
    this.active.push({ sprite, animation, frames });
  }

  // Devolve true enquanto o impacto segura a luta. As faiscas e o tremor
  // continuam andando durante o congelamento: e nesse instante que aparecem.
  update(delta) {
    this.active = this.active.filter((spark) => {
      spark.animation.update(delta);
      if (spark.animation.finished) {
        spark.sprite.destroy();
        return false;
      }
      spark.sprite.texture = spark.frames[spark.animation.sheetFrame];
      return true;
    });

    if (this.shake) {
      this.shake.remaining -= delta;
      const strength = Math.max(0, this.shake.remaining / this.shake.ticks) * this.shake.amplitude;
      this.scene.position.set(
        this.origin.x + Math.round((Math.random() * 2 - 1) * strength),
        this.origin.y + Math.round((Math.random() * 2 - 1) * strength),
      );
      if (this.shake.remaining <= 0) {
        this.shake = null;
        this.scene.position.set(this.origin.x, this.origin.y);
      }
    }

    if (this.hitstop > 0) {
      this.hitstop -= delta;
      return true;
    }
    return false;
  }

  clear() {
    for (const spark of this.active) spark.sprite.destroy();
    this.active = [];
    this.hitstop = 0;
    this.shake = null;
    this.scene.position.set(this.origin.x, this.origin.y);
  }
}
