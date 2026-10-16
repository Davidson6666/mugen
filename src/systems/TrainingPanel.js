import { Container, Graphics } from 'pixi.js';
import { PALETTE, PALETTE_HEX } from '../utils/palette.js';
import { label } from './Hud.js';

// Paineis da area de treino: as ultimas teclas apertadas (a esquerda) e o dano
// do combo no boneco (a direita), abaixo das barras de vida.

const TOP = 290;
const LINE = 28;

export class TrainingPanel {
  constructor({ width, historySize = 12 }) {
    this.view = new Container();
    this.width = width;

    this.inputs = new Container();
    const inputsBack = new Graphics().roundRect(16, TOP - 8, 120, historySize * LINE + 40, 10).fill({ color: PALETTE_HEX.ink, alpha: 0.55 });
    const inputsTitle = label('TECLAS', 18, { fill: PALETTE.fieldYellow, stroke: 4 });
    inputsTitle.position.set(28, TOP - 4);
    this.inputLines = Array.from({ length: historySize }, (_, index) => {
      const line = label('', 24, { stroke: 5 });
      line.position.set(28, TOP + 22 + index * LINE);
      line.alpha = 1 - index * (0.6 / historySize);
      return line;
    });
    this.inputs.addChild(inputsBack, inputsTitle, ...this.inputLines);

    this.damage = new Container();
    const damageBack = new Graphics().roundRect(width - 286, TOP - 8, 270, 132, 10).fill({ color: PALETTE_HEX.ink, alpha: 0.55 });
    const damageTitle = label('DANO', 18, { fill: PALETTE.fieldYellow, stroke: 4 });
    damageTitle.position.set(width - 274, TOP - 4);
    this.comboText = label('', 30, { stroke: 6 });
    this.lastText = label('', 22, { stroke: 5 });
    this.bestText = label('', 22, { stroke: 5 });
    this.comboText.position.set(width - 274, TOP + 20);
    this.lastText.position.set(width - 274, TOP + 58);
    this.bestText.position.set(width - 274, TOP + 86);
    this.damage.addChild(damageBack, damageTitle, this.comboText, this.lastText, this.bestText);

    this.view.addChild(this.inputs, this.damage);
  }

  update(history, damage) {
    this.inputLines.forEach((line, index) => {
      const text = history.entries[index] ?? '';
      if (line.text !== text) line.text = text;
    });
    const round = (value) => (Math.round(value * 10) / 10).toString().replace('.', ',');
    const combo = `COMBO  ${round(damage.current)}`;
    const last = `ÚLTIMO GOLPE  ${round(damage.last)}`;
    const best = `MAIOR COMBO  ${round(damage.best)}`;
    if (this.comboText.text !== combo) this.comboText.text = combo;
    if (this.lastText.text !== last) this.lastText.text = last;
    if (this.bestText.text !== best) this.bestText.text = best;
  }
}
