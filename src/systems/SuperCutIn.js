import { Container, Graphics, Sprite } from 'pixi.js';
import { PALETTE, PALETTE_HEX } from '../utils/palette.js';
import { label } from './Hud.js';

// Corte de super, como no CvS2: quando um lutador solta um super, a tela
// escurece, uma faixa diagonal entra pelo lado dele com o retrato grande e o
// nome, e tudo some. So desenho: a luta nao congela (congelar mudaria o ritmo
// e a sincronia do online).

const SLIDE_IN = 8;
const HOLD = 26;
const SLIDE_OUT = 10;
const TOTAL = SLIDE_IN + HOLD + SLIDE_OUT;
const BAND_Y = 330;
const BAND_HEIGHT = 120;
const SLANT = 60;
const DIM = 0.38;
const PORTRAIT_SCALE = 3.2;

const easeOut = (t) => 1 - (1 - t) ** 3;

export class SuperCutIn {
  constructor({ width, height, portraits, names }) {
    this.width = width;
    this.view = new Container();
    this.view.visible = false;
    this.dim = new Graphics().rect(0, 0, width, height).fill({ color: PALETTE_HEX.ink });
    this.flash = new Graphics().rect(0, 0, width, height).fill({ color: 0xffffff });
    this.band = new Container();
    this.view.addChild(this.dim, this.band, this.flash);
    this.panels = portraits.map((texture, side) => this.buildPanel(texture, names[side], side));
    this.age = TOTAL;
    this.side = 0;
  }

  buildPanel(texture, name, side) {
    const panel = new Container();
    const accent = side === 0 ? PALETTE_HEX.cursorP1 : PALETTE_HEX.cursorP2;
    const top = BAND_Y - BAND_HEIGHT / 2;
    const shape = new Graphics()
      .poly([0, top + SLANT, this.width, top - SLANT, this.width, top - SLANT + BAND_HEIGHT, 0, top + SLANT + BAND_HEIGHT])
      .fill({ color: PALETTE_HEX.fieldYellow })
      .stroke({ color: PALETTE_HEX.ink, width: 8 });
    const stripe = new Graphics()
      .poly([0, top + SLANT + BAND_HEIGHT - 16, this.width, top - SLANT + BAND_HEIGHT - 16, this.width, top - SLANT + BAND_HEIGHT, 0, top + SLANT + BAND_HEIGHT])
      .fill({ color: accent });
    panel.addChild(shape, stripe);

    // O retrato fica recortado no formato da faixa.
    const frame = new Graphics()
      .poly([0, top + SLANT, this.width, top - SLANT, this.width, top - SLANT + BAND_HEIGHT - 16, 0, top + SLANT + BAND_HEIGHT - 16])
      .fill({ color: 0xffffff });
    const portrait = new Sprite(texture);
    portrait.mask = frame;
    portrait.anchor.set(0.5);
    portrait.scale.set(side === 0 ? PORTRAIT_SCALE : -PORTRAIT_SCALE, PORTRAIT_SCALE);
    // Na faixa inclinada, a altura do meio muda com o x: o rosto (terco de
    // cima do retrato) vai para o meio da janela naquele ponto.
    const portraitX = side === 0 ? 260 : this.width - 260;
    const windowTop = top + SLANT - (2 * SLANT * portraitX) / this.width;
    const windowMiddle = windowTop + (BAND_HEIGHT - 16) / 2;
    const portraitHeight = texture.height * PORTRAIT_SCALE;
    portrait.position.set(portraitX, windowMiddle + portraitHeight * (0.5 - 0.3));
    const title = label(`${name.toUpperCase()}`, 46, { display: true, stroke: 10 });
    const tag = label('SUPER!', 34, { fill: side === 0 ? PALETTE.cursorP1 : PALETTE.cursorP2, stroke: 7 });
    title.anchor.set(side === 0 ? 0 : 1, 0.5);
    tag.anchor.set(side === 0 ? 0 : 1, 0.5);
    title.position.set(side === 0 ? 420 : this.width - 420, BAND_Y - 6);
    tag.position.set(side === 0 ? 424 : this.width - 424, BAND_Y + 40);
    panel.addChild(frame, portrait, title, tag);
    panel.visible = false;
    this.band.addChild(panel);
    return panel;
  }

  play(side) {
    this.side = side;
    this.age = 0;
    this.view.visible = true;
    this.panels.forEach((panel, index) => { panel.visible = index === side; });
  }

  update(delta) {
    if (this.age >= TOTAL) {
      this.view.visible = false;
      return;
    }
    this.age += delta;
    const t = this.age;
    // Entra pelo lado de quem soltou, segura e sai pelo outro.
    const direction = this.side === 0 ? -1 : 1;
    let offset = 0;
    if (t < SLIDE_IN) offset = (1 - easeOut(t / SLIDE_IN)) * this.width * direction;
    else if (t > SLIDE_IN + HOLD) offset = -easeOut((t - SLIDE_IN - HOLD) / SLIDE_OUT) * this.width * direction;
    this.band.x = offset;
    const fade = t > SLIDE_IN + HOLD ? 1 - (t - SLIDE_IN - HOLD) / SLIDE_OUT : Math.min(1, t / 4);
    this.dim.alpha = DIM * Math.max(0, fade);
    this.flash.alpha = t < 6 ? 0.55 * (1 - t / 6) : 0;
  }
}
