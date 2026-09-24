import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { PALETTE, PALETTE_HEX } from '../utils/palette.js';
import {
  EMBLEM, EMBLEM_TITLE_BAND, EMBLEM_TITLE_Y, LIFE_BAR, LIFE_HEIGHT, LIFE_INNER_X, LIFE_OUTER_X,
  LIFE_TOP, NAME_POSITION, OUTLINE_LAYERS, PORTRAIT, PORTRAIT_CENTER, ROUND_MARKERS,
  ROUND_MARKER_RADIUS, TIMER_Y, diamond, mirrorX,
} from '../utils/hudGeometry.js';

// HUD no padrao Capcom vs SNK 2 (docs/referencias-ui/cvs2/capcomvssnk2-s16.jpg):
// barras amarelas com ponta cortada, retrato em losango, emblema central com o
// timer, nomes em italico pesado e anuncios sobre faixa amarela. A geometria
// e a mesma da prancha de estilo (src/utils/hudGeometry.js).

const FONT = '"Barlow Condensed", sans-serif';

// A trilha vermelha segura o dano recente por um instante e depois desce.
const TRAIL_HOLD_FRAMES = 30;
const TRAIL_DRAIN_PER_FRAME = 0.012;

// Distancia entre os losangos de vitoria quando o placar pede mais de dois.
const ROUND_MARKER_STEP = 26;

const flat = (points) => points.flat();

function label(text, size, { fill = PALETTE.textPrimary, weight = '900', stroke = Math.round(size / 5) } = {}) {
  return new Text({
    text,
    style: {
      fontFamily: FONT,
      fontStyle: 'italic',
      fontWeight: weight,
      fontSize: size,
      fill,
      stroke: stroke ? { color: PALETTE.ink, width: stroke, join: 'round' } : undefined,
    },
  });
}

// Poligono com o contorno em camadas do CvS2 (preto, fio branco, preto).
function outlined(graphics, points, fill) {
  for (const layer of OUTLINE_LAYERS) {
    graphics.poly(flat(points)).stroke({ color: PALETTE_HEX[layer.color], width: layer.width, join: 'miter' });
  }
  return graphics.poly(flat(points)).fill({ color: fill });
}

export class Hud {
  constructor({ width, names = ['P1', 'P2'], labels = ['1P', '2P'], portraits = [] }) {
    this.width = width;
    this.view = new Container();
    this.announcementTimer = 0;
    this.sides = [];

    names.forEach((name, index) => this.buildSide(index, name, labels[index], portraits[index]));

    const emblem = new Graphics();
    outlined(emblem, EMBLEM, PALETTE_HEX.emblem);
    emblem.poly(flat(EMBLEM_TITLE_BAND)).fill({ color: PALETTE_HEX.ink });
    this.view.addChild(emblem);

    this.roundLabel = label('ROUND 1', 22, { weight: '600', stroke: 0 });
    this.roundLabel.anchor.set(0.5, 1);
    this.roundLabel.position.set(width / 2, EMBLEM_TITLE_Y + 2);
    this.view.addChild(this.roundLabel);

    this.timer = label('90', 78, { stroke: 10 });
    this.timer.anchor.set(0.5, 1);
    this.timer.position.set(width / 2, TIMER_Y + 8);
    this.view.addChild(this.timer);

    this.buildAnnouncement();
  }

  buildSide(index, name, tag, portrait) {
    const mirror = index === 1 ? mirrorX : (points) => points;
    const side = { mirror, trail: 1, shown: 1, hold: 0 };

    const frame = new Graphics();
    outlined(frame, mirror(LIFE_BAR), PALETTE_HEX.ink);
    this.view.addChild(frame);

    // Trilha e vida sao desenhadas em retangulos e recortadas pelo formato da
    // faixa, entao as pontas cortadas continuam certas com qualquer valor.
    side.fill = new Graphics();
    const barMask = new Graphics().poly(flat(mirror(LIFE_BAR))).fill({ color: 0xffffff });
    side.fill.mask = barMask;
    this.view.addChild(barMask, side.fill);

    const portraitFrame = new Graphics();
    outlined(portraitFrame, mirror(PORTRAIT), PALETTE_HEX.portraitBg);
    this.view.addChild(portraitFrame);
    if (portrait) {
      const [cx, cy] = mirror([PORTRAIT_CENTER])[0];
      const picture = new Sprite(portrait);
      picture.anchor.set(0.5);
      picture.position.set(cx, cy + 2);
      // Retrato no tamanho nativo, olhando para o centro da tela.
      picture.scale.x = index === 1 ? -1 : 1;
      const portraitMask = new Graphics().poly(flat(mirror(PORTRAIT))).fill({ color: 0xffffff });
      picture.mask = portraitMask;
      this.view.addChild(portraitMask, picture);
    }

    const nameLabel = label(name.toUpperCase(), 40);
    const [nameX, nameY] = mirror([NAME_POSITION])[0];
    nameLabel.anchor.set(index === 1 ? 1 : 0, 1);
    nameLabel.position.set(nameX, nameY);
    this.view.addChild(nameLabel);

    const tagLabel = label(tag, 26, { fill: index === 0 ? PALETTE.cursorP1 : PALETTE.cursorP2, stroke: 6 });
    const [tagX] = mirror([[PORTRAIT_CENTER[0] + 52, 0]])[0];
    tagLabel.anchor.set(index === 1 ? 1 : 0, 1);
    tagLabel.position.set(tagX, LIFE_TOP - 8);
    this.view.addChild(tagLabel);

    side.markers = new Graphics();
    this.view.addChild(side.markers);

    side.combo = new Container();
    const capsule = new Graphics()
      .roundRect(0, 0, 236, 40, 20)
      .fill({ color: PALETTE_HEX.fieldYellow })
      .stroke({ color: PALETTE_HEX.ink, width: 5 });
    side.comboCount = label('2', 36, { fill: PALETTE.cursorP1, stroke: 6 });
    side.comboCount.anchor.set(0, 1);
    side.comboCount.position.set(20, 36);
    const comboText = label('HIT COMBO', 28, { fill: PALETTE.ink, weight: '800', stroke: 0 });
    comboText.anchor.set(0, 1);
    comboText.position.set(52, 35);
    side.comboText = comboText;
    side.combo.addChild(capsule, side.comboCount, comboText);
    side.combo.position.set(index === 1 ? this.width - 40 - 236 : 40, 214);
    side.combo.visible = false;
    this.view.addChild(side.combo);

    this.sides.push(side);
  }

  // Anuncio no estilo do K.O. do CvS2: faixa amarela atravessando a tela com o
  // texto gigante por cima.
  buildAnnouncement() {
    this.announcement = new Container();
    this.announcement.visible = false;
    this.announcementBand = new Graphics();
    this.announcementText = label('', 96, { stroke: 14 });
    this.announcementText.anchor.set(0.5);
    this.announcementText.position.set(this.width / 2, 300);
    this.announcement.addChild(this.announcementBand, this.announcementText);
    this.view.addChild(this.announcement);
  }

  announce(text, durationFrames = 90) {
    // Texto curto (K.O.) sai enorme; frases longas cabem na largura da tela.
    const size = text.length <= 4 ? 190 : 88;
    const bandHeight = text.length <= 4 ? 170 : 116;
    this.announcementText.text = text;
    this.announcementText.style.fontSize = size;
    this.announcementText.style.stroke = { color: PALETTE.ink, width: Math.round(size / 8), join: 'round' };

    const top = 300 - bandHeight / 2;
    this.announcementBand
      .clear()
      .rect(-10, top, this.width + 20, bandHeight)
      .fill({ color: PALETTE_HEX.fieldYellow })
      .stroke({ color: PALETTE_HEX.ink, width: 8 });
    if (text.length <= 4) {
      this.announcementBand
        .poly(flat(diamond([this.width / 2, 300], bandHeight * 0.9)))
        .fill({ color: PALETTE_HEX.emblem })
        .stroke({ color: PALETTE_HEX.ink, width: 8 });
    }

    this.announcement.visible = true;
    this.announcementTimer = durationFrames;
  }

  update({ fighters, timeRemaining, roundNumber, wins, suddenDeath, roundsToWin }, delta) {
    fighters.forEach((fighter, index) => {
      const side = this.sides[index];
      const ratio = Math.max(0, fighter.health / fighter.config.stats.maxHealth);
      this.updateTrail(side, ratio, delta);
      this.drawLife(side, index, ratio);
      this.drawMarkers(side, index, wins[index], roundsToWin);

      const showCombo = fighter.comboCount > 1;
      side.combo.visible = showCombo;
      if (showCombo) side.comboCount.text = String(fighter.comboCount);
    });

    this.timer.text = suddenDeath ? '--' : String(Math.ceil(timeRemaining)).padStart(2, '0');
    this.roundLabel.text = suddenDeath ? 'FINAL ROUND' : `ROUND ${roundNumber}`;

    if (this.announcementTimer > 0) {
      this.announcementTimer -= delta;
      if (this.announcementTimer <= 0) this.announcement.visible = false;
    }
  }

  updateTrail(side, ratio, delta) {
    if (ratio > side.trail) {
      // Vida cheia de novo (round novo): a trilha acompanha na hora.
      side.trail = ratio;
      side.hold = 0;
    } else if (ratio < side.shown) {
      side.hold = TRAIL_HOLD_FRAMES;
    }
    side.shown = ratio;
    if (side.hold > 0) {
      side.hold -= delta;
    } else if (side.trail > ratio) {
      side.trail = Math.max(ratio, side.trail - TRAIL_DRAIN_PER_FRAME * delta);
    }
  }

  // A vida fica ancorada perto do timer; o dano come a faixa pela ponta de fora.
  drawLife(side, index, ratio) {
    const span = LIFE_INNER_X - LIFE_OUTER_X;
    const rect = (amount) => {
      const from = LIFE_INNER_X - span * amount;
      const x = index === 1 ? this.width - LIFE_INNER_X : from;
      return [x, LIFE_TOP, span * amount, LIFE_HEIGHT];
    };
    side.fill
      .clear()
      .rect(...rect(side.trail))
      .fill({ color: PALETTE_HEX.lifeTrail })
      .rect(...rect(ratio))
      .fill({ color: PALETTE_HEX.lifeFill });
  }

  drawMarkers(side, index, won, roundsToWin) {
    side.markers.clear();
    const [firstX, y] = ROUND_MARKERS[0];
    for (let marker = 0; marker < roundsToWin; marker += 1) {
      const x = firstX - marker * ROUND_MARKER_STEP;
      const center = index === 1 ? [this.width - x, y] : [x, y];
      outlined(side.markers, diamond(center, ROUND_MARKER_RADIUS), marker < won ? PALETTE_HEX.lifeFill : PALETTE_HEX.ink);
    }
  }
}
