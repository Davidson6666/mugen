import test from 'node:test';
import assert from 'node:assert/strict';
import { Container } from 'pixi.js';
import { Camera, CAMERA_DEFAULTS, cameraTarget } from '../src/systems/Camera.js';
import { map } from './helpers/world.js';

const view = { width: 1280, height: 720 };
const BODY = 95;
// Lutador de mentira: a camera so le posicao dos pes e altura do corpo.
const fighter = (x, lift = 0) => ({ x, y: map.groundLevel - lift, bodyHeight: BODY });
const target = (fighters, options = CAMERA_DEFAULTS) => cameraTarget({ fighters, map, view, options });

const visible = ({ zoom, x, y }) => ({
  left: x - view.width / (2 * zoom),
  right: x + view.width / (2 * zoom),
  top: y - view.height / (2 * zoom),
  bottom: y + view.height / (2 * zoom),
});

test('camera: com os dois perto fica no zoom maximo, no meio deles', () => {
  const { zoom, x } = target([fighter(540), fighter(760)]);
  assert.equal(zoom, CAMERA_DEFAULTS.zoomMax);
  assert.equal(x, 650);
});

test('camera: afasta quando os dois se separam, e os dois continuam na tela', () => {
  const near = target([fighter(540), fighter(760)]);
  const far = target([fighter(290), fighter(990)]);
  assert.ok(far.zoom < near.zoom, `${far.zoom} < ${near.zoom}`);
  assert.ok(far.zoom >= CAMERA_DEFAULTS.zoomMin);
  const view2 = visible(far);
  // A folga (tension) vale dos dois lados: o lutador nunca encosta na borda.
  assert.ok(290 - view2.left >= CAMERA_DEFAULTS.marginX - 1, `esquerda ${290 - view2.left}`);
  assert.ok(view2.right - 990 >= CAMERA_DEFAULTS.marginX - 1, `direita ${view2.right - 990}`);
});

test('camera: um pulo muito alto afasta, e o topo da cabeca continua visivel', () => {
  const ground = target([fighter(600), fighter(700)]);
  const high = target([fighter(600, 380), fighter(700)]);
  assert.ok(high.zoom < ground.zoom, `${high.zoom} < ${ground.zoom}`);
  const top = visible(high).top;
  const head = map.groundLevel - 380 - BODY;
  assert.ok(head >= top, `cabeca em ${head}, topo da tela em ${top}`);
});

test('camera: pulo normal nao mexe no zoom', () => {
  const ground = target([fighter(600), fighter(700)]);
  const jump = target([fighter(600, 120), fighter(700)]);
  assert.equal(jump.zoom, ground.zoom);
});

test('camera: nunca mostra o que esta fora da imagem do mapa', () => {
  let seed = 7;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (let i = 0; i < 400; i += 1) {
    const a = fighter(290 + random() * 700, random() * 700);
    const b = fighter(290 + random() * 700, random() * 700);
    const box = visible(target([a, b]));
    assert.ok(box.left >= -1e-6 && box.right <= map.width + 1e-6, `largura ${box.left}..${box.right}`);
    assert.ok(box.top >= -1e-6 && box.bottom <= map.height + 1e-6, `altura ${box.top}..${box.bottom}`);
  }
});

test('camera: o mapa pode trazer os proprios limites', () => {
  const { zoom } = target([fighter(540), fighter(760)], { ...CAMERA_DEFAULTS, zoomMax: 1.2 });
  assert.equal(zoom, 1.2);
});

test('camera: afasta mais depressa do que aproxima', () => {
  const scene = new Container();
  const out = new Camera({ scene, map, view });
  const wide = [fighter(290), fighter(990)];
  const close = [fighter(540), fighter(760)];
  out.snap(close);
  const start = out.zoom;
  for (let tick = 0; tick < 12; tick += 1) out.update(wide, 1);
  const goneOut = start - out.zoom;

  const back = new Camera({ scene: new Container(), map, view });
  back.snap(wide);
  const low = back.zoom;
  for (let tick = 0; tick < 12; tick += 1) back.update(close, 1);
  const comeBack = back.zoom - low;
  assert.ok(goneOut > comeBack, `afastou ${goneOut}, voltou ${comeBack}`);
});

test('camera: o snap vai direto ao alvo e a cena fica no centro da tela', () => {
  const scene = new Container();
  const camera = new Camera({ scene, map, view });
  const fighters = [fighter(290), fighter(990)];
  camera.snap(fighters);
  const goal = camera.target(fighters);
  assert.equal(camera.zoom, goal.zoom);
  assert.equal(scene.scale.x, goal.zoom);
  assert.equal(scene.pivot.x, goal.x);
  // O tremor de impacto desloca a partir daqui: a posicao nao pode se mexer.
  assert.deepEqual([scene.position.x, scene.position.y], [view.width / 2, view.height / 2]);
});

test('camera: o foco do K.O. aproxima no ponto, solta sozinho e o snap cancela', () => {
  const camera = new Camera({ scene: new Container(), map, view });
  const fighters = [fighter(540), fighter(760)];
  camera.snap(fighters);
  const normal = camera.zoom;
  camera.focus({ x: 700, y: map.groundLevel - 70, zoom: 2.1, ticks: 40 });
  for (let tick = 0; tick < 30; tick += 1) camera.update(fighters, 1);
  assert.ok(camera.zoom > normal + 0.15, `zoom ${camera.zoom} contra ${normal}`);
  // Mesmo no foco, a janela nunca sai da imagem do mapa.
  const box = visible({ zoom: camera.zoom, x: camera.x, y: camera.y });
  assert.ok(box.left >= -1e-6 && box.right <= map.width + 1e-6 && box.top >= -1e-6 && box.bottom <= map.height + 1e-6);
  for (let tick = 0; tick < 120; tick += 1) camera.update(fighters, 1);
  assert.equal(camera.spot, null);
  assert.ok(Math.abs(camera.zoom - normal) < 0.05, `voltou para ${camera.zoom}`);

  camera.focus({ x: 700, y: map.groundLevel, zoom: 2, ticks: 99 });
  camera.snap(fighters);
  assert.equal(camera.spot, null);
});
