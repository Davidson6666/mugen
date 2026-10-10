import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { PALETTE, PALETTE_HEX } from '../utils/palette.js';
import {
  AWAKENING_POSITION, EMBLEM, EMBLEM_TITLE_BAND, EMBLEM_TITLE_Y, LIFE_BAR, LIFE_HEIGHT, LIFE_INNER_X, LIFE_OUTER_X,
  LIFE_TOP, NAME_POSITION, OUTLINE_LAYERS, PORTRAIT, PORTRAIT_CENTER, ROUND_MARKERS,
  ROUND_MARKER_RADIUS, TIMER_Y, diamond, mirrorX,
} from '../utils/hudGeometry.js';

// HUD no padrao Capcom vs SNK 2 (docs/referencias-ui/cvs2/capcomvssnk2-s16.jpg):
// barras amarelas com ponta cortada, retrato em losango, emblema central com o
// timer, nomes em italico pesado e anuncios sobre faixa amarela. A geometria
// e a mesma da prancha de estilo (src/utils/hudGeometry.js).

const FONT = '"Barlow Condensed", sans-serif';
const DISPLAY_FONT = '"Dela Gothic One", "Barlow Condensed", sans-serif';

// A trilha vermelha segura o dano recente por um instante e depois desce.
const TRAIL_HOLD_FRAMES = 30;
const TRAIL_DRAIN_PER_FRAME = 0.012;

// Distancia entre os losangos de vitoria quando o placar pede mais de dois.
const ROUND_MARKER_STEP = 26;

const flat = (points) => points.flat();

const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeOutBack = (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;

// Nome do efeito ativo (buff de dano) na barra; o que nao esta aqui aparece com
// o proprio identificador.
const BUFF_LABELS = { cursedPower: 'CURSED POWER', bombDevil: 'BOMB DEVIL' };
// So buff curto ganha a barrinha de tempo restante: os de ~10 minutos nao
// mostram nada que ajude.
const BUFF_BAR_MAX_TICKS = 1500;
const LOW_LIFE = 0.25;
const HIT_FLASH_FRAMES = 7;

function label(text, size, { fill = PALETTE.textPrimary, weight = '900', stroke = Math.round(size / 5), display = false } = {}) {
  return new Text({
    text,
    style: {
      fontFamily: display ? DISPLAY_FONT : FONT,
      fontStyle: display ? 'normal' : 'italic',
      fontWeight: display ? '400' : weight,
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

// Textura de gradiente desenhada num canvas: sombra no topo (a barra de vida
// continua legivel em cenario claro) e vinheta nos cantos (cinema, sem tapar a
// luta). Criadas uma vez por luta.
function paintedTexture(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  return Texture.from(canvas);
}

function buildScrim(width) {
  const container = new Container();
  const top = new Sprite(paintedTexture(4, 180, (context, w, h) => {
    const gradient = context.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, 'rgba(10, 10, 12, 0.62)');
    gradient.addColorStop(1, 'rgba(10, 10, 12, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, w, h);
  }));
  top.width = width;
  top.height = 180;
  const vignette = new Sprite(paintedTexture(256, 144, (context, w, h) => {
    const gradient = context.createRadialGradient(w / 2, h / 2, h * 0.45, w / 2, h / 2, w * 0.62);
    gradient.addColorStop(0, 'rgba(10, 10, 12, 0)');
    gradient.addColorStop(1, 'rgba(10, 10, 12, 0.42)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, w, h);
  }));
  vignette.width = width;
  vignette.height = 720;
  container.addChild(vignette, top);
  return container;
}

export class Hud {
  constructor({ width, names = ['P1', 'P2'], labels = ['1P', '2P'], portraits = [] }) {
    this.width = width;
    this.view = new Container();
    this.announcementTimer = 0;
    this.sides = [];

    this.view.addChild(buildScrim(width));

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
    const side = { mirror, trail: 1, shown: 1, hold: 0, flash: 0, flashFrom: 1, pulse: 0 };

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

    this.buildAwakening(side, index, mirror);
    this.buildStatus(side, index);
    this.sides.push(side);
  }

  // Chip do efeito ativo (Power Charge do Sukuna, Bomb Devil da Reze): um nome
  // em capsula e, se for curto, uma barra com o tempo que falta.
  buildStatus(side, index) {
    side.status = new Container();
    const capsule = new Graphics().roundRect(0, 0, 200, 30, 15).fill({ color: PALETTE_HEX.ink }).stroke({ color: PALETTE_HEX.fieldYellow, width: 3 });
    side.statusText = label('', 20, { fill: PALETTE.fieldYellow, stroke: 0 });
    side.statusText.anchor.set(0, 0.5);
    side.statusText.position.set(14, 15);
    side.statusBar = new Graphics();
    side.status.addChild(capsule, side.statusBar, side.statusText);
    const [x] = side.mirror([AWAKENING_POSITION])[0];
    side.status.position.set(index === 1 ? x - 200 : x, 176);
    side.status.visible = false;
    this.view.addChild(side.status);
  }

  drawStatus(side, fighter) {
    const buff = fighter.config.damageBuff;
    const ticks = buff ? (fighter.buffs?.[buff.kind] ?? 0) : 0;
    side.status.visible = ticks > 0;
    if (ticks <= 0) return;
    side.statusText.text = BUFF_LABELS[buff.kind] ?? buff.kind.toUpperCase();
    side.statusBar.clear();
    if (ticks <= BUFF_BAR_MAX_TICKS) {
      // Piscar rapido quando falta pouco (menos de 3 s).
      side.status.alpha = ticks < 180 && Math.floor(ticks / 6) % 2 === 0 ? 0.45 : 1;
      side.statusBar.roundRect(8, 24, 184 * Math.min(1, ticks / BUFF_BAR_MAX_TICKS), 4, 2).fill({ color: PALETTE_HEX.fieldYellow });
    } else {
      side.status.alpha = 1;
    }
  }

  // Medidor de despertar (Origin Mode do Gojo), embaixo do nome: percentual
  // enchendo; ligado, o nome do modo piscando.
  buildAwakening(side, index, mirror) {
    const [x, y] = mirror([AWAKENING_POSITION])[0];
    side.awake = label('', 20, { fill: PALETTE.textPrimary, stroke: 5 });
    side.awake.anchor.set(index === 1 ? 1 : 0, 1);
    side.awake.position.set(x, y);
    side.awake.visible = false;
    side.awakeBlink = 0;
    this.view.addChild(side.awake);
  }

  drawAwakening(side, fighter, delta) {
    const def = fighter.awakening;
    side.awake.visible = Boolean(def);
    if (!def) return;
    side.awakeBlink = (side.awakeBlink + delta) % 20;
    const name = (def.label ?? def.mode).toUpperCase();
    if (fighter.awakened) {
      side.awake.text = `${name} MODE`;
      side.awake.style.fill = side.awakeBlink < 10 ? PALETTE.lifeFill : PALETTE.textPrimary;
    } else {
      side.awake.text = `${name} ${Math.floor(((fighter.awakeGauge ?? 0) / def.gauge) * 100)}%`;
      side.awake.style.fill = PALETTE.textPrimary;
    }
  }

  // Anuncio no estilo do K.O. do CvS2: faixa amarela atravessando a tela com o
  // texto gigante por cima.
  buildAnnouncement() {
    this.announcement = new Container();
    this.announcement.visible = false;
    this.announcementBand = new Graphics();
    this.announcementBand.pivot.set(this.width / 2, 300);
    this.announcementBand.position.set(this.width / 2, 300);
    this.announcementText = label('', 96, { stroke: 14, display: true });
    this.announcementText.skew.x = -0.16;
    this.announcementText.anchor.set(0.5);
    this.announcementText.position.set(this.width / 2, 300);
    // Clarao branco que cobre a tela no instante do impacto (K.O., FIGHT!).
    this.announcementFlash = new Graphics().rect(0, 0, this.width, 720).fill({ color: 0xffffff });
    this.announcementFlash.alpha = 0;
    this.announcement.addChild(this.announcementFlash, this.announcementBand, this.announcementText);
    this.announcementAge = 0;
    this.announcementImpact = false;
    this.view.addChild(this.announcement);
  }

  announce(text, durationFrames = 90) {
    // Texto curto (K.O.) sai enorme; frases longas cabem na largura da tela.
    const size = text.length <= 4 ? 140 : 64;
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
    this.announcement.alpha = 1;
    this.announcementTimer = durationFrames;
    this.announcementAge = 0;
    this.announcementImpact = text.length <= 4 || text === 'PERFECT!' || text === 'FIGHT!';
  }

  // A faixa abre de dentro para fora, o texto bate de cima para baixo (grande
  // e encolhendo) e, no K.O./FIGHT!, a tela pisca; no fim tudo some de leve.
  animateAnnouncement(delta) {
    this.announcementAge += delta;
    this.announcementTimer -= delta;
    const age = this.announcementAge;
    this.announcementBand.scale.y = Math.max(0.001, easeOutCubic(Math.min(1, age / 9)));
    const slam = easeOutBack(Math.min(1, age / 13));
    this.announcementText.scale.set(1 + (1 - slam) * 1.5);
    this.announcementText.alpha = Math.min(1, age / 4);
    this.announcementFlash.alpha = this.announcementImpact ? Math.max(0, 0.75 - age * 0.055) : 0;
    this.announcement.alpha = this.announcementTimer < 10 ? Math.max(0, this.announcementTimer / 10) : 1;
    if (this.announcementTimer <= 0) {
      this.announcement.visible = false;
      this.announcementFlash.alpha = 0;
    }
  }

  update({ fighters, timeRemaining, roundNumber, wins, suddenDeath, roundsToWin }, delta) {
    fighters.forEach((fighter, index) => {
      const side = this.sides[index];
      const ratio = Math.max(0, fighter.health / fighter.config.stats.maxHealth);
      this.updateTrail(side, ratio, delta);
      this.drawLife(side, index, ratio, delta);
      this.drawMarkers(side, index, wins[index], roundsToWin);
      this.drawAwakening(side, fighter, delta);
      this.drawStatus(side, fighter);

      const showCombo = fighter.comboCount > 1;
      side.combo.visible = showCombo;
      if (showCombo) side.comboCount.text = String(fighter.comboCount);
    });

    // Morte subita e treino nao tem cronometro correndo.
    this.timer.text = suddenDeath || !Number.isFinite(timeRemaining)
      ? '--'
      : String(Math.ceil(timeRemaining)).padStart(2, '0');
    this.roundLabel.text = suddenDeath ? 'FINAL ROUND' : `ROUND ${roundNumber}`;

    if (this.announcementTimer > 0) this.animateAnnouncement(delta);
  }

  updateTrail(side, ratio, delta) {
    if (ratio > side.trail) {
      // Vida cheia de novo (round novo): a trilha acompanha na hora.
      side.trail = ratio;
      side.hold = 0;
    } else if (ratio < side.shown) {
      side.hold = TRAIL_HOLD_FRAMES;
      // O pedaco perdido pisca em branco por um instante.
      side.flashFrom = side.flash > 0 ? Math.max(side.flashFrom, side.shown) : side.shown;
      side.flash = HIT_FLASH_FRAMES;
    }
    if (side.flash > 0) side.flash -= delta;
    side.shown = ratio;
    if (side.hold > 0) {
      side.hold -= delta;
    } else if (side.trail > ratio) {
      side.trail = Math.max(ratio, side.trail - TRAIL_DRAIN_PER_FRAME * delta);
    }
  }

  // A vida fica ancorada perto do timer; o dano come a faixa pela ponta de fora.
  drawLife(side, index, ratio, delta = 1) {
    const span = LIFE_INNER_X - LIFE_OUTER_X;
    const rect = (amount) => {
      const from = LIFE_INNER_X - span * amount;
      const x = index === 1 ? this.width - LIFE_INNER_X : from;
      return [x, LIFE_TOP, span * amount, LIFE_HEIGHT];
    };
    // Vida baixa: a faixa alterna entre amarelo e laranja, cada vez mais rapido.
    side.pulse = (side.pulse + delta * (ratio < LOW_LIFE / 2 ? 2 : 1)) % 24;
    const low = ratio > 0 && ratio < LOW_LIFE;
    const lifeColor = low && side.pulse < 12 ? 0xff8a00 : PALETTE_HEX.lifeFill;
    side.fill
      .clear()
      .rect(...rect(side.trail))
      .fill({ color: PALETTE_HEX.lifeTrail })
      .rect(...rect(ratio))
      .fill({ color: lifeColor });
    if (side.flash > 0 && side.flashFrom > ratio) {
      // O pedaco entre a vida de antes e a de agora (nunca a barra inteira).
      const lost = span * (side.flashFrom - ratio);
      const left = index === 1 ? this.width - LIFE_INNER_X + span * ratio : LIFE_INNER_X - span * side.flashFrom;
      side.fill.rect(left, LIFE_TOP, lost, LIFE_HEIGHT).fill({ color: 0xffffff });
    }
    // Brilho fino no alto da barra: da volume sem mudar a cor.
    const [gx, gy, gw] = rect(ratio);
    side.fill.rect(gx, gy + 2, gw, 5).fill({ color: 0xffffff, alpha: 0.28 });
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
