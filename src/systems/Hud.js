import { Container, Graphics, Text } from 'pixi.js';
import { PALETTE, PALETTE_HEX, healthBarColor } from '../utils/palette.js';

// HUD no formato do Street Fighter II: barra de vida grossa com contorno preto,
// nome do personagem logo abaixo dela, marcadores de round vencido, cronometro
// central em caixa com relevo e anuncios em tipografia bitmap contornada.

const BAR_WIDTH = 470;
const BAR_HEIGHT = 30;
const BAR_MARGIN = 30;
const BAR_Y = 44;
const OUTLINE = 4;
const PIP_SIZE = 16;
const PIP_GAP = 6;

const INK = 0x05040c;
const PIXEL_FONT = '"Press Start 2P", monospace';

function pixelText(text, size, color, extra = {}) {
  return new Text({
    text,
    style: {
      fontFamily: PIXEL_FONT,
      fontSize: size,
      fill: color,
      // O contorno preto e o que faz o texto ler por cima do cenario.
      stroke: { color: PALETTE.bgPrimary, width: Math.max(3, Math.round(size / 5)) },
      ...extra,
    },
  });
}

export class Hud {
  constructor({ width, names = ['P1', 'P2'], labels = ['1P', '2P'] }) {
    this.width = width;
    this.view = new Container();
    this.announcementTimer = 0;

    const chrome = new Graphics();
    this.view.addChild(chrome);

    this.barFills = [];
    this.pips = [];
    this.comboLabels = [];

    names.forEach((name, index) => {
      const onLeft = index === 0;
      const barX = onLeft ? BAR_MARGIN : width - BAR_MARGIN - BAR_WIDTH;

      // Moldura da barra: contorno preto por fora, relevo por dentro.
      chrome
        .rect(barX - OUTLINE, BAR_Y - OUTLINE, BAR_WIDTH + OUTLINE * 2, BAR_HEIGHT + OUTLINE * 2)
        .fill({ color: INK })
        .rect(barX - 2, BAR_Y - 2, BAR_WIDTH + 4, BAR_HEIGHT + 4)
        .fill({ color: PALETTE_HEX.accent })
        .rect(barX, BAR_Y, BAR_WIDTH, BAR_HEIGHT)
        .fill({ color: 0x1a1020 });

      const fill = new Graphics();
      this.view.addChild(fill);
      this.barFills.push(fill);

      const pips = new Graphics();
      this.view.addChild(pips);
      this.pips.push(pips);

      const tag = pixelText(labels[index], 16, onLeft ? PALETTE.player1 : PALETTE.player2);
      tag.y = BAR_Y - OUTLINE - 22;
      tag.x = onLeft ? barX - OUTLINE : barX + BAR_WIDTH + OUTLINE - tag.width;
      this.view.addChild(tag);

      // Nome do personagem embaixo da barra, como no SF2.
      const nameLabel = pixelText(name.toUpperCase(), 13, PALETTE.textPrimary);
      nameLabel.y = BAR_Y + BAR_HEIGHT + OUTLINE + 8;
      nameLabel.x = onLeft ? barX - OUTLINE : barX + BAR_WIDTH + OUTLINE - nameLabel.width;
      this.view.addChild(nameLabel);

      const combo = pixelText('', 18, PALETTE.accent);
      combo.y = BAR_Y + BAR_HEIGHT + OUTLINE + 34;
      combo.visible = false;
      this.view.addChild(combo);
      this.comboLabels.push({ text: combo, onLeft, barX });
    });

    // Caixa do cronometro no centro, com relevo.
    const timerBoxWidth = 108;
    const timerBoxHeight = 74;
    const timerX = width / 2 - timerBoxWidth / 2;
    chrome
      .rect(timerX - OUTLINE, BAR_Y - 24, timerBoxWidth + OUTLINE * 2, timerBoxHeight + OUTLINE * 2)
      .fill({ color: INK })
      .rect(timerX, BAR_Y - 20, timerBoxWidth, timerBoxHeight)
      .fill({ color: PALETTE_HEX.bgSecondary })
      .rect(timerX, BAR_Y - 20, timerBoxWidth, 4)
      .fill({ color: 0x4a4266 })
      .rect(timerX, BAR_Y - 20 + timerBoxHeight - 4, timerBoxWidth, 4)
      .fill({ color: 0x000000 });

    this.timer = pixelText('90', 38, PALETTE.textPrimary);
    this.timer.anchor.set(0.5, 0);
    this.timer.x = width / 2;
    this.timer.y = BAR_Y - 2;
    this.view.addChild(this.timer);

    this.roundLabel = pixelText('ROUND 1', 10, PALETTE.accent);
    this.roundLabel.anchor.set(0.5, 0);
    this.roundLabel.x = width / 2;
    this.roundLabel.y = BAR_Y + 44;
    this.view.addChild(this.roundLabel);

    this.announcement = pixelText('', 54, PALETTE.accent, {
      dropShadow: { color: PALETTE.player1, distance: 6, angle: Math.PI / 4, blur: 0, alpha: 1 },
    });
    this.announcement.anchor.set(0.5);
    this.announcement.x = width / 2;
    this.announcement.y = 268;
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
      const filled = Math.round(BAR_WIDTH * ratio);
      // As duas barras esvaziam em direcao ao centro da tela.
      const fillX = onLeft ? barX : barX + BAR_WIDTH - filled;
      const color = healthBarColor(ratio);

      this.barFills[index]
        .clear()
        .rect(fillX, BAR_Y, filled, BAR_HEIGHT)
        .fill({ color })
        // Faixa clara no topo e escura embaixo: o volume que a barra chapada
        // nao tinha.
        .rect(fillX, BAR_Y, filled, 5)
        .fill({ color: 0xffffff, alpha: 0.35 })
        .rect(fillX, BAR_Y + BAR_HEIGHT - 6, filled, 6)
        .fill({ color: 0x000000, alpha: 0.3 });

      this.drawPips(this.pips[index], wins[index], roundsToWin, barX, onLeft);

      const combo = this.comboLabels[index];
      const visible = fighter.comboCount > 1;
      combo.text.visible = visible;
      if (visible) {
        combo.text.text = `${fighter.comboCount} HITS`;
        combo.text.x = combo.onLeft
          ? combo.barX - OUTLINE
          : combo.barX + BAR_WIDTH + OUTLINE - combo.text.width;
      }
    });

    this.timer.text = suddenDeath ? '--' : String(Math.ceil(timeRemaining)).padStart(2, '0');
    this.roundLabel.text = suddenDeath ? 'FINAL' : `ROUND ${roundNumber}`;

    if (this.announcementTimer > 0) {
      this.announcementTimer -= delta;
      if (this.announcementTimer <= 0) this.announcement.visible = false;
    }
  }

  // Marcadores de round vencido, crescendo a partir do centro da tela.
  drawPips(graphics, won, roundsToWin, barX, onLeft) {
    graphics.clear();
    for (let index = 0; index < roundsToWin; index += 1) {
      const offset = index * (PIP_SIZE + PIP_GAP);
      const x = onLeft
        ? barX + BAR_WIDTH - PIP_SIZE - offset
        : barX + offset;
      const y = BAR_Y + BAR_HEIGHT + OUTLINE + 6;

      graphics.rect(x - 2, y - 2, PIP_SIZE + 4, PIP_SIZE + 4).fill({ color: INK });
      graphics
        .rect(x, y, PIP_SIZE, PIP_SIZE)
        .fill({ color: index < won ? PALETTE_HEX.accent : 0x2a2340 });
      if (index < won) {
        graphics.rect(x, y, PIP_SIZE, 4).fill({ color: 0xffe9a8 });
      }
    }
  }
}
