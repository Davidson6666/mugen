import { Container, Graphics, Text } from 'pixi.js';
import { PALETTE, PALETTE_HEX, healthBarColor } from '../utils/palette.js';

// HUD de combate no estilo fliperama: barras de vida no topo (P1 a esquerda,
// P2 a direita), cronometro central, indicador de rounds e contador de combo.

const BAR_WIDTH = 470;
const BAR_HEIGHT = 28;
const BAR_MARGIN = 40;
const BAR_Y = 42;
const FRAME_THICKNESS = 3;
const PIP_SIZE = 12;
const PIP_GAP = 6;

const ARCADE_FONT = 'Impact, "Arial Black", sans-serif';

function label(text, size, color, extra = {}) {
  return new Text({
    text,
    style: {
      fontFamily: ARCADE_FONT,
      fontSize: size,
      fill: color,
      letterSpacing: 2,
      stroke: { color: PALETTE.bgPrimary, width: 4 },
      ...extra,
    },
  });
}

export class Hud {
  constructor({ width, names = ['P1', 'P2'] }) {
    this.width = width;
    this.view = new Container();
    this.announcementTimer = 0;

    this.barFills = [new Graphics(), new Graphics()];
    this.pips = [new Graphics(), new Graphics()];
    this.comboLabels = [];

    const frames = new Graphics();
    this.view.addChild(frames);

    names.forEach((name, index) => {
      const onLeft = index === 0;
      const barX = onLeft ? BAR_MARGIN : width - BAR_MARGIN - BAR_WIDTH;
      const playerColor = onLeft ? PALETTE_HEX.player1 : PALETTE_HEX.player2;

      frames
        .rect(
          barX - FRAME_THICKNESS,
          BAR_Y - FRAME_THICKNESS,
          BAR_WIDTH + FRAME_THICKNESS * 2,
          BAR_HEIGHT + FRAME_THICKNESS * 2,
        )
        .fill({ color: PALETTE_HEX.bgSecondary })
        .stroke({ color: PALETTE_HEX.accent, width: FRAME_THICKNESS });

      this.view.addChild(this.barFills[index]);
      this.view.addChild(this.pips[index]);

      const nameLabel = label(name.toUpperCase(), 20, playerColor);
      nameLabel.y = BAR_Y + BAR_HEIGHT + 12;
      nameLabel.x = onLeft ? barX : barX + BAR_WIDTH - nameLabel.width;
      this.view.addChild(nameLabel);

      const combo = label('', 26, PALETTE.accent);
      combo.y = BAR_Y + BAR_HEIGHT + 44;
      combo.visible = false;
      this.view.addChild(combo);
      this.comboLabels.push({ text: combo, onLeft, barX });
    });

    this.timer = label('90', 46, PALETTE.textPrimary);
    this.timer.anchor.set(0.5, 0);
    this.timer.x = width / 2;
    this.timer.y = BAR_Y - 8;
    this.view.addChild(this.timer);

    this.roundLabel = label('ROUND 1', 16, PALETTE.textSecondary);
    this.roundLabel.anchor.set(0.5, 0);
    this.roundLabel.x = width / 2;
    this.roundLabel.y = BAR_Y + BAR_HEIGHT + 10;
    this.view.addChild(this.roundLabel);

    this.announcement = label('', 72, PALETTE.accent);
    this.announcement.anchor.set(0.5);
    this.announcement.x = width / 2;
    this.announcement.y = 250;
    this.announcement.visible = false;
    this.view.addChild(this.announcement);
  }

  announce(text, durationFrames = 90) {
    this.announcement.text = text;
    this.announcement.visible = true;
    this.announcementTimer = durationFrames;
  }

  update({ fighters, timeRemaining, roundNumber, wins, suddenDeath, roundsToWin }, delta) {
    fighters.forEach((fighter, index) => {
      const ratio = Math.max(0, fighter.health / fighter.config.stats.maxHealth);
      const onLeft = index === 0;
      const barX = onLeft ? BAR_MARGIN : this.width - BAR_MARGIN - BAR_WIDTH;
      const filled = BAR_WIDTH * ratio;
      // As duas barras esvaziam em direcao ao centro da tela.
      const fillX = onLeft ? barX : barX + BAR_WIDTH - filled;

      this.barFills[index]
        .clear()
        .rect(barX, BAR_Y, BAR_WIDTH, BAR_HEIGHT)
        .fill({ color: PALETTE_HEX.bgPrimary })
        .rect(fillX, BAR_Y, filled, BAR_HEIGHT)
        .fill({ color: healthBarColor(ratio) });

      this.drawPips(this.pips[index], wins[index], roundsToWin, barX, onLeft);

      const { text, onLeft: comboOnLeft, barX: comboBarX } = this.comboLabels[index];
      const visible = fighter.comboCount > 1;
      text.visible = visible;
      if (visible) {
        text.text = `${fighter.comboCount} HITS`;
        text.x = comboOnLeft ? comboBarX : comboBarX + BAR_WIDTH - text.width;
      }
    });

    this.timer.text = suddenDeath ? '--' : String(Math.ceil(timeRemaining)).padStart(2, '0');
    this.roundLabel.text = suddenDeath ? 'MORTE SUBITA' : `ROUND ${roundNumber}`;

    if (this.announcementTimer > 0) {
      this.announcementTimer -= delta;
      if (this.announcementTimer <= 0) this.announcement.visible = false;
    }
  }

  drawPips(graphics, won, roundsToWin, barX, onLeft) {
    graphics.clear();
    for (let index = 0; index < roundsToWin; index += 1) {
      const offset = index * (PIP_SIZE + PIP_GAP);
      const x = onLeft
        ? barX + BAR_WIDTH - PIP_SIZE - offset
        : barX + offset;
      graphics.rect(x, BAR_Y + BAR_HEIGHT + 16, PIP_SIZE, PIP_SIZE);
      if (index < won) graphics.fill({ color: PALETTE_HEX.accent });
      else graphics.fill({ color: PALETTE_HEX.bgSecondary });
      graphics.stroke({ color: PALETTE_HEX.accent, width: 2 });
    }
  }
}
