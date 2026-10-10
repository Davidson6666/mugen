// Camera dinamica, no estilo dos mapas do MUGEN/IKEMEN: acompanha o meio dos
// dois lutadores e afasta (zoom out) quando eles se separam ou quando um sobe
// alto demais, para os dois continuarem na tela; volta a aproximar quando
// voltam a ficar perto.
//
// Os nomes do .def do MUGEN que isto imita:
//   tension      -> marginX: folga entre o lutador e a borda da tela antes de
//                   a camera comecar a se afastar;
//   floortension -> marginTop: folga acima da cabeca do mais alto;
//   zoomin / zoomout -> zoomMax / zoomMin.
//
// E so desenho: nada aqui entra na simulacao, entao nao muda o resultado da
// luta nem a sincronia do online. Cada mapa pode trazer um bloco "camera" no
// config para ajustar qualquer um dos valores.
export const CAMERA_DEFAULTS = {
  // Zoom com os dois perto (o mesmo de antes da camera dinamica).
  zoomMax: 1.5,
  // 1 = o fundo inteiro na tela. Abaixo disso apareceria o vazio fora da
  // imagem do mapa, entao e o piso, mesmo que um pulo altissimo queira mais.
  zoomMin: 1,
  marginX: 190,
  // O pulo comum chega a ~130 px (cabeca a ~225); isto so deixa a camera
  // afastar quando alguem passa de uns 150 px do chao (lancamento, super pulo).
  marginTop: 170,
  // Onde o chao fica na tela (px) enquanto o zoom permite; em zoom 1 o chao
  // cai na posicao natural da imagem.
  groundScreenY: 630,
  // Fracao do caminho ate o alvo que a camera anda por tick. Afasta rapido (nao
  // pode deixar ninguem sair da tela) e aproxima devagar.
  zoomOutRate: 0.14,
  zoomInRate: 0.045,
  panRate: 0.12,
};

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export function resolveCameraOptions(map) {
  return { ...CAMERA_DEFAULTS, ...(map.camera ?? {}) };
}

// Onde a camera quer estar agora: zoom e o ponto do mundo no centro da tela.
// Pura (sem Pixi), para testar sem desenhar.
export function cameraTarget({ fighters, map, view, options = CAMERA_DEFAULTS }) {
  const { zoomMax, zoomMin, marginX, marginTop, groundScreenY } = options;
  const xs = fighters.map((fighter) => fighter.x);
  const left = Math.min(...xs);
  const right = Math.max(...xs);

  // Cabe os dois na largura, com a folga de cada lado.
  const zoomForWidth = view.width / (right - left + 2 * marginX);
  // Cabe o mais alto: do chao (na tela) ate o topo, com a folga em cima.
  const rise = Math.max(...fighters.map((fighter) => map.groundLevel - fighter.y + fighter.bodyHeight)) + marginTop;
  const zoomForHeight = groundScreenY / rise;

  const zoom = clamp(Math.min(zoomForWidth, zoomForHeight), zoomMin, zoomMax);

  // Sem sair da imagem do mapa: a janela visivel tem meia largura/altura de
  // view / (2 * zoom) em volta do centro.
  const halfWidth = view.width / (2 * zoom);
  const halfHeight = view.height / (2 * zoom);
  const x = clamp((left + right) / 2, halfWidth, map.width - halfWidth);
  // O chao fica em groundScreenY na tela; o centro da tela e o ponto do mundo
  // que fica a (groundScreenY - meia altura) / zoom acima do chao.
  const y = clamp(map.groundLevel - (groundScreenY - view.height / 2) / zoom, halfHeight, map.height - halfHeight);
  return { zoom, x, y };
}

export class Camera {
  // scene: o Container que carrega cenario e lutadores. A posicao dele fica
  // fixa no centro da tela (o tremor de impacto desloca a partir dela); quem
  // mexe e o pivo (o ponto do mundo no centro) e a escala.
  constructor({ scene, map, view }) {
    this.scene = scene;
    this.map = map;
    this.view = view;
    this.options = resolveCameraOptions(map);
    this.zoom = this.options.zoomMax;
    this.x = view.width / 2;
    this.y = map.groundLevel;
    // Foco temporario (o K.O.): aproxima no ponto e solta sozinho quando acaba.
    this.spot = null;
    scene.position.set(view.width / 2, view.height / 2);
  }

  // Aproxima em { x, y } (mundo) ate "zoom" por "ticks" quadros do monitor.
  // So desenho: nada da simulacao le a camera.
  focus({ x, y, zoom, ticks }) {
    this.spot = { x, y, zoom: Math.min(zoom, this.options.zoomMax * 1.4), ticks };
  }

  target(fighters) {
    return cameraTarget({ fighters, map: this.map, view: this.view, options: this.options });
  }

  apply() {
    this.scene.scale.set(this.zoom);
    this.scene.pivot.set(this.x, this.y);
  }

  // Vai direto para onde a camera quer estar (comeco do round).
  snap(fighters) {
    const target = this.target(fighters);
    this.spot = null;
    this.zoom = target.zoom;
    this.x = target.x;
    this.y = target.y;
    this.apply();
  }

  // delta: o do monitor (1 = um quadro a 60 Hz).
  update(fighters, delta = 1) {
    let target = this.target(fighters);
    const { zoomOutRate, zoomInRate, panRate } = this.options;
    const ease = (rate) => 1 - (1 - rate) ** delta;
    let zoomRate = target.zoom < this.zoom ? zoomOutRate : zoomInRate;
    let moveRate = panRate;
    if (this.spot) {
      this.spot.ticks -= delta;
      if (this.spot.ticks <= 0) {
        this.spot = null;
      } else {
        target = { zoom: this.spot.zoom, x: this.spot.x, y: this.spot.y };
        zoomRate = 0.1;
        moveRate = 0.1;
      }
    }
    this.zoom += (target.zoom - this.zoom) * ease(zoomRate);
    this.x += (target.x - this.x) * ease(moveRate);
    this.y += (target.y - this.y) * ease(moveRate);
    // O suavizado nunca mostra o que o alvo nao mostraria: se o zoom atual e
    // maior que o do alvo a janela e menor, e o pivo do alvo ainda e valido; no
    // outro sentido a janela cresce e o pivo precisa ser reenquadrado.
    const halfWidth = this.view.width / (2 * this.zoom);
    const halfHeight = this.view.height / (2 * this.zoom);
    this.x = clamp(this.x, halfWidth, this.map.width - halfWidth);
    this.y = clamp(this.y, halfHeight, this.map.height - halfHeight);
    this.apply();
  }
}
