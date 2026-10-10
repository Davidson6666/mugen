import { useEffect, useRef, useState } from 'react';
import { Application, Assets, Container, Graphics, Sprite, Text, Texture, Rectangle } from 'pixi.js';
import { assetManager } from '../systems/SpriteSheetManager.js';
import { Fighter } from '../systems/Fighter.js';
import { ComboDetector } from '../systems/ComboDetector.js';
import { AIController } from '../systems/AIController.js';
import { GameStateManager } from '../systems/GameStateManager.js';
import { Hud } from '../systems/Hud.js';
import { PlayerMarkers } from '../systems/PlayerMarker.js';
import { EffectManager } from '../systems/EffectManager.js';
import { HitFeedback, kindOf } from '../systems/HitFeedback.js';
import { Camera } from '../systems/Camera.js';
import { AudioManager } from '../systems/AudioManager.js';
import { resolveAttack, resolveBodyCollision } from '../systems/CollisionDetector.js';
import { InputHandler } from '../utils/InputHandler.js';
import { buildCommand, PRESS_ACTIONS } from '../utils/combatInput.js';
import { createRandom, randomSeed } from '../utils/rng.js';
import { roundEndAnnounce } from '../utils/roundAnnounce.js';
import { LockstepClient, NET_INPUT_DELAY } from '../systems/net/LockstepClient.js';
import { PALETTE, PALETTE_HEX } from '../utils/palette.js';
import characters from '../data/characters.json';
import maps from '../data/maps.json';

export const STAGE_WIDTH = 1280;
export const STAGE_HEIGHT = 720;

const START_GAP = 220;

// Passo fixo da logica: 60 ticks por segundo, cada um com delta = 1 (o mesmo
// valor que os testes usam). O desenho continua acompanhando a taxa do
// monitor; so a simulacao anda em fatias iguais, que e o que permite os dois
// lados de uma partida online chegarem exatamente no mesmo resultado.
const MS_PER_TICK = 1000 / 60;
// Depois de um engasgo grande (aba em segundo plano, por exemplo) o jogo nao
// tenta recuperar todo o tempo perdido de uma vez - o excesso e descartado.
const MAX_CATCHUP_TICKS = 5;

// Variantes da Barlow Condensed que o HUD usa.
const HUD_FONTS = ['400 40px "Dela Gothic One"', 'italic 900 40px "Barlow Condensed"', 'italic 800 28px "Barlow Condensed"', 'italic 600 22px "Barlow Condensed"'];

// Abertura do round: "ROUND N" com os lutadores parados; depois "FIGHT!" e o
// controle e liberado, como nos Street Fighter de fliperama.
const ROUND_INTRO_FRAMES = 80;
const FIGHT_ANNOUNCE_FRAMES = 45;

const NEUTRAL_COMMAND = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  punch: false,
  kick: false,
  special: false,
};

// Traduz o estado bruto do InputHandler no comando que o Fighter consome.
// A IA produz esse mesmo formato, entao o Fighter nao precisa saber quem esta
// no controle.
// Sombra no chao: ancora o personagem no cenario e mostra a altura do pulo.
function groundShadow() {
  const shadow = new Graphics();
  shadow.ellipse(0, 0, 22, 5).fill({ color: PALETTE_HEX.ink, alpha: 0.5 });
  return shadow;
}

// Quanto mais alto no pulo, menor e mais fraca a sombra.
const SHADOW_FADE_HEIGHT = 160;
// K.O.: quantos ticks a tela fica em camera lenta, e a que velocidade.
const SLOW_TICKS = 42;
const SLOW_TICKS_FINAL = 70;
const SLOW_FACTOR = 0.3;

// Quanto tempo o boneco de treino fica sem apanhar antes da vida voltar ao
// topo (90 ticks = 1,5 segundo).
const TRAINING_REFILL_TICKS = 90;

const STATUS_MESSAGE = {
  loading: 'Carregando assets...',
  waiting: 'Esperando o adversario entrar na luta...',
  error: 'Erro ao carregar. Veja o console.',
};

function debugText() {
  return new Text({
    text: '',
    style: {
      fontFamily: 'monospace',
      fontSize: 13,
      fill: PALETTE.textSecondary,
      lineHeight: 17,
    },
  });
}

// Desenha hurtbox (sempre) e hitbox (so no frame ativo do golpe ou do efeito).
// Ferramenta de debug, separada do HUD de jogo.
function drawBoxes(layer, fighters, effects) {
  layer.clear();
  for (const fighter of fighters) {
    const hurt = fighter.hurtRect;
    layer
      .rect(hurt.x, hurt.y, hurt.width, hurt.height)
      .stroke({ color: PALETTE_HEX.player2, width: 1, alpha: 0.8 });
    if (fighter.activeAttack) {
      const hit = fighter.hitRect;
      layer
        .rect(hit.x, hit.y, hit.width, hit.height)
        .fill({ color: PALETTE_HEX.player1, alpha: 0.35 })
        .stroke({ color: PALETTE_HEX.player1, width: 1 });
    }
  }
  for (const effect of effects) {
    const hit = effect.hitRect;
    if (!hit) continue;
    layer
      .rect(hit.x, hit.y, hit.width, hit.height)
      .fill({ color: PALETTE_HEX.accent, alpha: 0.35 })
      .stroke({ color: PALETTE_HEX.accent, width: 1 });
  }
}

export default function GameCanvas({ setup, paused = false, onMatchEnd }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('loading');
  // A configuracao da partida e capturada na montagem: ela nao muda enquanto a
  // luta acontece, e reconstruir o canvas no meio do combate seria um desastre.
  const setupRef = useRef(setup);
  const pausedRef = useRef(paused);
  const audioRef = useRef(null);
  const onMatchEndRef = useRef(onMatchEnd);

  useEffect(() => {
    pausedRef.current = paused;
    // Pausa congela tambem o som (a musica do super continua de onde parou).
    if (paused) audioRef.current?.pause();
    else audioRef.current?.resume();
  }, [paused]);

  useEffect(() => {
    onMatchEndRef.current = onMatchEnd;
  }, [onMatchEnd]);

  useEffect(() => {
    let disposed = false;
    let app = null;
    const input = new InputHandler();
    const audio = new AudioManager();
    audioRef.current = audio;
    let onDebugKey = null;
    let net = null;

    async function boot() {
      const instance = new Application();
      await instance.init({
        width: STAGE_WIDTH,
        height: STAGE_HEIGHT,
        background: PALETTE.bgPrimary,
        antialias: false,
      });
      // O StrictMode monta e desmonta o efeito: sem esta guarda, o canvas do
      // primeiro boot fica orfao no DOM.
      if (disposed) {
        instance.destroy(true, { children: true });
        return;
      }
      app = instance;
      instance.canvas.style.display = 'block';
      containerRef.current.appendChild(instance.canvas);

      const matchSetup = setupRef.current;
      const stageEntry = maps.find((entry) => entry.id === matchSetup.mapId) ?? maps[0];
      const characterEntries = matchSetup.characters.map(
        (id) => characters.find((entry) => entry.id === id) ?? characters[0],
      );

      const [mapRecord, sparks, ...characterRecords] = await Promise.all([
        assetManager.loadMap(stageEntry),
        assetManager.loadFightFx(),
        ...characterEntries.map((entry) => assetManager.loadCharacter(entry)),
      ]);
      if (disposed) return;
      // Os sons carregam em paralelo; a luta nao espera por eles.
      characterEntries.forEach((entry, index) => audio.preload(entry.dir, characterRecords[index].config.sounds));
      audio.preloadImpacts();

      const map = mapRecord.config;
      // Os lutadores comecam a uns dois corpos de distancia, no meio do
      // cenario: com o sprite no tamanho nativo a arena e larga, e comecar
      // nas pontas deixaria o inicio do round so de caminhada.
      const center = (map.leftBound + map.rightBound) / 2;
      const spawns = [center - START_GAP / 2, center + START_GAP / 2];

      // Cenario e lutadores ficam juntos para tremerem juntos; o HUD, fora.
      const scene = new Container();
      instance.stage.addChild(scene);
      // A camera acompanha os dois lutadores e afasta quando se separam ou um
      // sobe alto (src/systems/Camera.js); a posicao da cena fica fixa no
      // centro da tela, que e de onde o tremor de impacto desloca.
      const camera = new Camera({ scene, map, view: { width: STAGE_WIDTH, height: STAGE_HEIGHT } });

      const background = new Sprite(mapRecord.texture);
      background.width = map.width;
      background.height = map.height;
      scene.addChild(background);

      const world = new Container();
      scene.addChild(world);

      // Um sorteio so para a luta inteira (lutadores, efeitos e IA bebem
      // dele). Numa partida online a semente vem do servidor, igual para os
      // dois; aqui, sem semente combinada, sorteia uma.
      const random = createRandom(matchSetup.seed ?? randomSeed());

      // Quem move cada lado. Precisa vir antes dos lutadores: o boneco da
      // area de treino nasce com piso de vida.
      //  - treino: o lado 2 e um boneco, nao e movido por nada e nao cai;
      //  - online: os dois lados sao gente, a IA fica de fora e o adversario
      //    e movido pelo input que chega pela rede.
      const training = matchSetup.mode === 'training';
      const online = matchSetup.mode === 'online';
      const localIndex = online ? (matchSetup.localPlayerIndex ?? 0) : 0;
      const cpuEnabled = !online && !training && matchSetup.mode !== 'versusPlayer';

      const fighters = spawns.map((x, index) => new Fighter({
        record: characterRecords[index],
        map,
        x,
        facing: index === 0 ? 1 : -1,
        random,
        minHealth: training && index === 1 ? 1 : 0,
      }));
      // Teleportes e golpes que surgem no oponente precisam saber onde ele esta.
      fighters[0].opponent = fighters[1];
      fighters[1].opponent = fighters[0];
      camera.snap(fighters);
      const detectors = characterRecords.map(
        (record) => new ComboDetector(record.config.combos),
      );
      // A IA recebe os combos ja interpretados pelo detector, com tokens e
      // animacao resolvidos.
      const ai = new AIController(detectors[1].combos, matchSetup.difficulty, { random });
      const match = new GameStateManager({ introFrames: ROUND_INTRO_FRAMES, training });
      let matchEndTimer = 0;
      let walkoverSent = false;
      // Camera lenta no K.O.: so afrouxa o relogio da tela (o acumulador), nunca
      // a conta dos ticks, entao a simulacao e a sincronia online nao mudam.
      let slowTicks = 0;

      // Numeros que as conquistas precisam saber no fim da partida. O maior
      // combo precisa ser guardado porque o contador do lutador zera sozinho,
      // e a menor vida e por round: ter chegado perto da morte num round que
      // se perdeu nao e virada nenhuma.
      let bestCombo = [0, 0];
      let roundLowHealth = [1, 1];
      // A menor vida da partida inteira (esta nao zera na virada de round): e
      // o que decide o PERFECT da conquista, que pede os dois rounds limpos.
      let matchLowHealth = [1, 1];
      let comeback = false;
      const healthPct = (fighter) => fighter.health / fighter.config.stats.maxHealth;

      if (online) {
        net = new LockstepClient({ matchId: matchSetup.matchId });
        await net.join();
        if (disposed) return;
        // Um computador carrega muito mais rapido que o outro. Quem chega
        // primeiro espera aqui, no canal ja aberto: comecar a simular antes
        // do outro entrar jogaria o input dos primeiros ticks no vazio (o
        // Realtime nao guarda mensagem pra quem chega depois), e os dois
        // acabariam travados esperando ticks que nunca chegam.
        setStatus('waiting');
        const ready = await net.waitForOpponent();
        if (disposed) return;
        if (!ready) {
          // Nunca apareceu: nem comeca a partida.
          onMatchEndRef.current?.({ winner: localIndex, wins: [0, 0], walkover: true });
          return;
        }
      }

      const shadows = [groundShadow(), groundShadow()];
      for (const shadow of shadows) world.addChild(shadow);
      // Reflexo no chao: o proprio sprite espelhado abaixo dos pes, fraco e
      // azulado, sumindo quando o lutador sobe.
      const reflections = fighters.map(() => {
        const reflection = new Sprite();
        reflection.tint = 0x8fa6d0;
        world.addChild(reflection);
        return reflection;
      });
      const effectsBehind = new Container();
      world.addChild(effectsBehind);
      for (const fighter of fighters) world.addChild(fighter.sprite);
      const effectsInFront = new Container();
      world.addChild(effectsInFront);
      const effects = new EffectManager({
        back: effectsBehind,
        front: effectsInFront,
        bounds: { left: 0, right: STAGE_WIDTH },
      });
      const sparkLayer = new Container();
      world.addChild(sparkLayer);
      const feedback = new HitFeedback({ layer: sparkLayer, scene, sparks });

      // O Pixi rasteriza o texto na hora de criar: sem a fonte carregada, o HUD
      // sairia com a de fallback. document.fonts.ready nao basta, porque o
      // navegador so baixa uma variante quando a pagina a usa; aqui ela e pedida.
      const [portraits] = await Promise.all([
        Promise.all(characterEntries.map(async (entry) => {
          const texture = await Assets.load(`${entry.dir}/${entry.portrait}`);
          return entry.portraitRect ? new Texture({ source: texture.source, frame: new Rectangle(...entry.portraitRect), orig: new Rectangle(0, 0, 50, 55) }) : texture;
        })),
        ...HUD_FONTS.map((font) => document.fonts.load(font)),
      ]);
      if (disposed) return;
      for (const portrait of portraits) portrait.source.scaleMode = 'nearest';

      const hud = new Hud({
        width: STAGE_WIDTH,
        names: fighters.map((fighter) => fighter.config.name),
        labels: ['1P', cpuEnabled ? 'CPU' : '2P'],
        portraits,
      });
      instance.stage.addChild(hud.view);

      // Setinhas 1P / 2P sobre as cabecas quando os dois lados sao gente.
      const markers = matchSetup.mode === 'versusPlayer' || online ? new PlayerMarkers(['1P', '2P']) : null;
      if (markers) world.addChild(markers.view);

      const debugLayer = new Graphics();
      debugLayer.visible = false;
      // Caixas de debug em coordenadas do mundo: acompanham o zoom da camera.
      scene.addChild(debugLayer);

      const overlay = debugText();
      overlay.position.set(16, STAGE_HEIGHT - 60);
      // Texto de desenvolvimento (fps, estados): so aparece com a tecla ` das caixas.
      overlay.visible = false;
      instance.stage.addChild(overlay);

      function startRound(round) {
        roundLowHealth = [1, 1];
        fighters.forEach((fighter, index) => {
          fighter.resetForRound(spawns[index], index === 0 ? 1 : -1);
        });
        for (const detector of detectors) detector.reset();
        camera.snap(fighters);
        audio.stopAll();
        effects.clear();
        feedback.clear();
        ai.reset();
        hud.announce(match.isSuddenDeath ? 'FINAL ROUND' : `ROUND ${round}`, ROUND_INTRO_FRAMES);
      }

      function handleMatchEvent(event) {
        if (event.type === 'roundEnd') {
          // Virada: ganhou o round depois de ter estado a menos de 10% de vida.
          if (event.winner !== null && roundLowHealth[event.winner] < 0.1) comeback = true;
          hud.announce(roundEndAnnounce(event.reason, event.winner, roundLowHealth), 140);
          if (event.reason === 'ko' || event.reason === 'doubleKo') {
            slowTicks = event.reason === 'ko' && match.matchWinner !== null ? SLOW_TICKS_FINAL : SLOW_TICKS;
            hud.impact(1);
            if (event.winner !== null) {
              const loser = fighters[1 - event.winner];
              camera.focus({ x: loser.x, y: map.groundLevel - 70, zoom: 2.1, ticks: 150 });
            }
          }
          if (event.winner !== null) {
            fighters[event.winner].playRoundEndPose(true);
            fighters[1 - event.winner].playRoundEndPose(false);
          }
          return;
        }
        if (event.type === 'roundStart') {
          startRound(event.round);
          return;
        }
        if (event.type === 'fight') {
          hud.announce('FIGHT!', FIGHT_ANNOUNCE_FRAMES);
          return;
        }
        if (event.type === 'matchEnd') {
          const label = event.winner === 1 && cpuEnabled ? 'CPU' : `PLAYER ${event.winner + 1}`;
          hud.announce(`${label} VENCE`, 600);
          // Deixa o anuncio na tela antes de entregar o resultado para a UI.
          matchEndTimer = 150;
        }
      }

      function restartMatch() {
        match.reset();
        startRound(1);
      }

      // Atalhos de desenvolvimento, fora do input map do jogo. A selecao de
      // modo e dificuldade sai daqui quando os menus existirem.
      onDebugKey = (event) => {
        if (event.code === 'Backquote') {
          debugLayer.visible = !debugLayer.visible;
          overlay.visible = debugLayer.visible;
        }
        if (event.code === 'KeyR') restartMatch();
      };
      window.addEventListener('keydown', onDebugKey);

      input.attach();
      setStatus('ready');
      startRound(1);

      let elapsed = 0;
      // Toques durante a pausa de impacto: a luta esta congelada, mas quem
      // martela para encadear aperta justamente nessa hora. O toque fica
      // guardado e vale no primeiro tick depois da pausa.
      const latched = [{}, {}];
      let accumulator = 0;
      let tick = 0;

      // Boneco de treino: a vida desce normalmente, pra dar pra ver o quanto
      // um combo tirou, e volta a encher sozinha depois de um tempo sem
      // apanhar. Quem segura ela acima de zero e o proprio lutador
      // (minHealth), porque o nocaute dispara dentro do dano - travar por
      // aqui chegaria tarde demais.
      let dummyHealth = fighters[1].health;
      let dummyIdle = 0;

      function keepDummyAlive(delta) {
        const dummy = fighters[1];
        dummyIdle = dummy.health < dummyHealth ? 0 : dummyIdle + delta;
        if (dummyIdle >= TRAINING_REFILL_TICKS) dummy.health = dummy.config.stats.maxHealth;
        dummyHealth = dummy.health;
      }

      // Um tick de logica. Sempre delta = 1: nada aqui dentro pode depender do
      // relogio real, senao a mesma partida daria resultados diferentes em
      // dois computadores.
      function stepLogic() {
        const delta = 1;
        // Le o teclado/controle uma vez por TICK, nao por quadro. "Apertou
        // agora" e detectado comparando com a leitura anterior (InputHandler.
        // pressed), entao um poll que acontece sem um tick atras dele engole o
        // toque: num monitor de 144Hz a maioria dos quadros nao roda tick
        // nenhum, e mais da metade dos golpes sumia antes de chegar no jogo.
        input.poll();

        // Relogio da logica em ms, contado por tick em vez de performance.now():
        // o reconhecedor de combos mede janelas de 500ms/250ms e precisa
        // enxergar o mesmo tempo dos dois lados.
        const now = tick * MS_PER_TICK;

        if (matchEndTimer > 0) {
          matchEndTimer -= delta;
          if (matchEndTimer <= 0) {
            onMatchEndRef.current?.({
              winner: match.matchWinner,
              wins: [...match.wins],
              bestCombo: [...bestCombo],
              perfect: matchLowHealth.map((low) => low === 1),
              comeback,
            });
          }
        }

        const fighting = match.phase === 'fighting';

        // Online: o que estou apertando agora so vale daqui a alguns ticks, e
        // ja sai para o adversario. O agendamento acontece em todo tick (mesmo
        // congelado ou fora do combate), senao abriria buraco na sequencia e o
        // outro lado ficaria esperando para sempre.
        if (online) {
          // Sempre o teclado principal (WASD + J/K/L), nao importa se eu sou o
          // lado esquerdo ou o direito da partida.
          const pressed = { ...buildCommand(input, 0), ...latched[localIndex] };
          latched[localIndex] = {};
          net.schedule(tick + NET_INPUT_DELAY, pressed);
        }

        // Durante a pausa de impacto a luta inteira congela; so faisca,
        // tremor e HUD continuam.
        const frozen = feedback.update(delta);
        if (frozen && fighting) {
          for (const index of [0, 1]) {
            if (index === 1 && (cpuEnabled || training)) continue;
            if (online && index !== localIndex) continue;
            const pressed = buildCommand(input, online ? 0 : index);
            for (const action of PRESS_ACTIONS) if (pressed[action]) latched[index][action] = true;
          }
        }
        if (!frozen) {
          fighters[0].faceTowards(fighters[1].x);
          fighters[1].faceTowards(fighters[0].x);

          fighters.forEach((fighter, index) => {
            let command = { ...NEUTRAL_COMMAND };
            if (fighting) {
              if (online) {
                // Os dois lados leem da mesma sequencia agendada: o meu input
                // de alguns ticks atras e o dele que chegou pela rede.
                const scheduled = index === localIndex ? net.localCommand(tick) : net.remoteCommand(tick);
                command = scheduled ?? { ...NEUTRAL_COMMAND };
              } else if (index === 1 && training) {
                // O boneco fica parado: nem IA, nem o teclado do jogador 2.
                command = { ...NEUTRAL_COMMAND };
              } else {
                command = index === 1 && cpuEnabled
                  ? ai.update(fighter, fighters[0], delta)
                  : { ...buildCommand(input, index), ...latched[index] };
                latched[index] = {};
              }
              // O buffer le a direcao ja relativa ao lado que o personagem
              // encara, por isso o flip precisa acontecer antes.
              command = { ...command, combo: detectors[index].feed(command, fighter.facing, now, fighter.comboModes) };
            }
            fighter.update(command, delta);
          });

          effects.collect(fighters);

          const results = [];
          if (fighting) {
            resolveBodyCollision(fighters[0], fighters[1]);
            results.push(resolveAttack(fighters[0], fighters[1]), resolveAttack(fighters[1], fighters[0]));
          }
          // Fora do combate os efeitos terminam a animacao, mas nao acertam
          // mais ninguem: o round ja foi decidido.
          results.push(...effects.update(delta, fighting ? fighters : []));
          for (const result of results) {
            if (!result) continue;
            feedback.onResult(result);
            // Esquiva atravessa sem impacto (nem faisca, nem som).
            if (result.outcome !== 'evade') audio.playImpact(kindOf(result));
          }
        }

        if (fighting) {
          fighters.forEach((fighter, index) => {
            bestCombo[index] = Math.max(bestCombo[index], fighter.comboCount);
            const pct = healthPct(fighter);
            roundLowHealth[index] = Math.min(roundLowHealth[index], pct);
            matchLowHealth[index] = Math.min(matchLowHealth[index], pct);
          });
        }

        if (training) keepDummyAlive(delta);

        fighters.forEach((fighter, index) => audio.update(index, fighter, characterEntries[index].dir));

        const event = match.update(fighters, delta);
        if (event) handleMatchEvent(event);
      }

      // Desenho: acontece uma vez por quadro, com o delta real do monitor.
      // Nada aqui muda o resultado da luta.
      function renderFrame(frameDelta) {
        camera.update(fighters, frameDelta);
        fighters.forEach((fighter, index) => {
          fighter.syncSprite();
          const body = fighter.sprite;
          const mirror = reflections[index];
          const height = Math.min(1, (map.groundLevel - fighter.y) / SHADOW_FADE_HEIGHT);
          mirror.texture = body.texture;
          mirror.anchor.copyFrom(body.anchor);
          mirror.position.set(body.x, 2 * map.groundLevel - body.y);
          mirror.scale.set(body.scale.x, -Math.abs(body.scale.y));
          mirror.visible = body.visible;
          mirror.alpha = 0.24 * (1 - height * 0.75) * body.alpha;
          const lift = Math.min(1, (map.groundLevel - fighter.y) / SHADOW_FADE_HEIGHT);
          shadows[index].position.set(fighter.x, map.groundLevel);
          shadows[index].scale.set(1 - lift * 0.5);
          shadows[index].alpha = 1 - lift * 0.6;
        });

        markers?.update(fighters, frameDelta);
        hud.update(
          {
            fighters,
            timeRemaining: match.timeRemaining,
            roundNumber: match.roundNumber,
            wins: match.wins,
            suddenDeath: match.isSuddenDeath,
            roundsToWin: match.roundsToWin,
          },
          frameDelta,
        );

        if (debugLayer.visible) drawBoxes(debugLayer, fighters, effects.effects);
      }

      instance.ticker.add((ticker) => {
        if (pausedRef.current) return;

        accumulator += ticker.deltaMS * (slowTicks > 0 ? SLOW_FACTOR : 1);
        let steps = Math.floor(accumulator / MS_PER_TICK);
        accumulator -= steps * MS_PER_TICK;
        if (steps > MAX_CATCHUP_TICKS) steps = MAX_CATCHUP_TICKS;
        for (let step = 0; step < steps; step += 1) {
          // Online: sem o input do adversario para o proximo tick, a luta
          // espera nele em vez de adivinhar (e o preco do lockstep). O tempo
          // parado nao fica guardado, senao o jogo dispararia em camera
          // rapida quando o pacote chegasse.
          //
          // Depois que a partida ja tem vencedor, os ticks que faltam sao so
          // a pose de vitoria e o anuncio: ai nao da mais pra esperar input
          // nenhum, porque quem termina primeiro sai da tela e para de
          // mandar - e quem ficou atras travaria aqui para sempre.
          if (online && match.matchWinner === null && !net.canStep(tick + 1)) {
            accumulator = 0;
            break;
          }
          tick += 1;
          if (slowTicks > 0) slowTicks -= 1;
          stepLogic();
        }

        if (online) {
          net.flushIfStale();
          net.forget(tick);
          // Adversario sumiu no meio da luta: vitoria por W.O. Com a partida
          // ja decidida isso nao vale mais - o resultado de verdade ja existe.
          if (net.abandoned && !walkoverSent && match.matchWinner === null) {
            walkoverSent = true;
            onMatchEndRef.current?.({ winner: localIndex, wins: [...match.wins], walkover: true });
          }
        }

        renderFrame(ticker.deltaTime);

        elapsed += ticker.deltaMS;
        if (elapsed >= 250) {
          elapsed = 0;
          const cpu = cpuEnabled ? `cpu ${ai.difficulty}` : 'dois jogadores';
          overlay.text = [
            `fps ${ticker.FPS.toFixed(0)}   ${cpu}   zoom ${camera.zoom.toFixed(2)}   \` caixas   R reiniciar`,
            fighters.map((fighter, index) => `p${index + 1} ${fighter.state}`).join('   '),
          ].join('\n');
        }
      });
    }

    boot().catch((error) => {
      console.error('Falha ao iniciar o jogo:', error);
      if (!disposed) setStatus('error');
    });

    return () => {
      disposed = true;
      input.detach();
      audio.dispose();
      audioRef.current = null;
      net?.dispose();
      net = null;
      if (onDebugKey) window.removeEventListener('keydown', onDebugKey);
      if (app) {
        app.destroy(true, { children: true });
        app = null;
      }
    };
  }, []);

  return (
    <div className="game-canvas">
      <div ref={containerRef} className="game-canvas__surface" />
      {status !== 'ready' && (
        <p className="game-canvas__status">
          {STATUS_MESSAGE[status] ?? STATUS_MESSAGE.error}
        </p>
      )}
    </div>
  );
}
