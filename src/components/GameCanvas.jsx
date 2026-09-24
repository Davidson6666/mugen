import { useEffect, useRef, useState } from 'react';
import { Application, Assets, Container, Graphics, Sprite, Text } from 'pixi.js';
import { assetManager } from '../systems/SpriteSheetManager.js';
import { Fighter } from '../systems/Fighter.js';
import { ComboDetector } from '../systems/ComboDetector.js';
import { AIController } from '../systems/AIController.js';
import { GameStateManager } from '../systems/GameStateManager.js';
import { Hud } from '../systems/Hud.js';
import { EffectManager } from '../systems/EffectManager.js';
import { HitFeedback } from '../systems/HitFeedback.js';
import { resolveAttack, resolveBodyCollision } from '../systems/CollisionDetector.js';
import { InputHandler } from '../utils/InputHandler.js';
import { PALETTE, PALETTE_HEX } from '../utils/palette.js';
import characters from '../data/characters.json';
import maps from '../data/maps.json';

export const STAGE_WIDTH = 1280;
export const STAGE_HEIGHT = 720;

const START_GAP = 220;

// Camera: zoom na arena para o personagem nao ficar minusculo. Com 1.5x, os
// 700px da arena mais os pilares ocupam a largura da tela, e o chao fica em
// CAMERA_GROUND_Y na tela.
const CAMERA_ZOOM = 1.5;
const CAMERA_GROUND_Y = 630;

// Variantes da Barlow Condensed que o HUD usa.
const HUD_FONTS = ['italic 900 40px "Barlow Condensed"', 'italic 800 28px "Barlow Condensed"', 'italic 600 22px "Barlow Condensed"'];

const ROUND_END_MESSAGE = {
  ko: 'K.O.',
  timeout: 'TEMPO ESGOTADO',
  doubleKo: 'EMPATE',
  timeDraw: 'EMPATE',
};

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
function buildCommand(input, player) {
  const held = input.state(player);
  return {
    left: held.left,
    right: held.right,
    up: held.up,
    down: held.down,
    jump: input.pressed(player, 'up'),
    punch: input.pressed(player, 'punch'),
    kick: input.pressed(player, 'kick'),
    special: input.pressed(player, 'special'),
    // Botoes seguros (golpes de carregar).
    holding: { punch: held.punch, kick: held.kick, special: held.special },
  };
}

// Botoes que valem por toque (e nao por tecla segurada).
const PRESS_ACTIONS = ['jump', 'punch', 'kick', 'special'];

// Sombra no chao: ancora o personagem no cenario e mostra a altura do pulo.
function groundShadow() {
  const shadow = new Graphics();
  shadow.ellipse(0, 0, 22, 5).fill({ color: PALETTE_HEX.ink, alpha: 0.5 });
  return shadow;
}

// Quanto mais alto no pulo, menor e mais fraca a sombra.
const SHADOW_FADE_HEIGHT = 160;

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
  const onMatchEndRef = useRef(onMatchEnd);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    onMatchEndRef.current = onMatchEnd;
  }, [onMatchEnd]);

  useEffect(() => {
    let disposed = false;
    let app = null;
    const input = new InputHandler();
    let onDebugKey = null;

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

      const map = mapRecord.config;
      // Os lutadores comecam a uns dois corpos de distancia, no meio do
      // cenario: com o sprite no tamanho nativo a arena e larga, e comecar
      // nas pontas deixaria o inicio do round so de caminhada.
      const center = (map.leftBound + map.rightBound) / 2;
      const spawns = [center - START_GAP / 2, center + START_GAP / 2];

      // Cenario e lutadores ficam juntos para tremerem juntos; o HUD, fora.
      const scene = new Container();
      instance.stage.addChild(scene);
      scene.pivot.set((map.leftBound + map.rightBound) / 2, map.groundLevel);
      scene.scale.set(CAMERA_ZOOM);
      scene.position.set(STAGE_WIDTH / 2, CAMERA_GROUND_Y);

      const background = new Sprite(mapRecord.texture);
      background.width = map.width;
      background.height = map.height;
      scene.addChild(background);

      const world = new Container();
      scene.addChild(world);

      const fighters = spawns.map((x, index) => new Fighter({
        record: characterRecords[index],
        map,
        x,
        facing: index === 0 ? 1 : -1,
      }));
      // Teleportes e golpes que surgem no oponente precisam saber onde ele esta.
      fighters[0].opponent = fighters[1];
      fighters[1].opponent = fighters[0];
      const detectors = characterRecords.map(
        (record) => new ComboDetector(record.config.combos),
      );
      // A IA recebe os combos ja interpretados pelo detector, com tokens e
      // animacao resolvidos.
      const ai = new AIController(detectors[1].combos, matchSetup.difficulty);
      const match = new GameStateManager();
      const cpuEnabled = matchSetup.mode !== 'versusPlayer';
      let matchEndTimer = 0;

      const shadows = [groundShadow(), groundShadow()];
      for (const shadow of shadows) world.addChild(shadow);
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
        Promise.all(characterEntries.map((entry) => Assets.load(`${entry.dir}/${entry.portrait}`))),
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

      const debugLayer = new Graphics();
      debugLayer.visible = false;
      // Caixas de debug em coordenadas do mundo: acompanham o zoom da camera.
      scene.addChild(debugLayer);

      const overlay = debugText();
      overlay.position.set(16, STAGE_HEIGHT - 60);
      instance.stage.addChild(overlay);

      function startRound(round) {
        fighters.forEach((fighter, index) => {
          fighter.resetForRound(spawns[index], index === 0 ? 1 : -1);
        });
        for (const detector of detectors) detector.reset();
        effects.clear();
        feedback.clear();
        ai.reset();
        hud.announce(`ROUND ${round} — FIGHT!`, 110);
      }

      function handleMatchEvent(event) {
        if (event.type === 'roundEnd') {
          hud.announce(ROUND_END_MESSAGE[event.reason], 140);
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
        if (event.code === 'Backquote') debugLayer.visible = !debugLayer.visible;
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
      instance.ticker.add((ticker) => {
        if (pausedRef.current) return;

        const delta = ticker.deltaTime;
        input.poll();

        if (matchEndTimer > 0) {
          matchEndTimer -= delta;
          if (matchEndTimer <= 0) {
            onMatchEndRef.current?.({ winner: match.matchWinner, wins: [...match.wins] });
          }
        }

        const fighting = match.phase === 'fighting';
        const now = performance.now();

        // Durante a pausa de impacto a luta inteira congela; so faisca,
        // tremor e HUD continuam.
        const frozen = feedback.update(delta);
        if (frozen && fighting) {
          for (const index of [0, 1]) {
            if (index === 1 && cpuEnabled) continue;
            const pressed = buildCommand(input, index);
            for (const action of PRESS_ACTIONS) if (pressed[action]) latched[index][action] = true;
          }
        }
        if (!frozen) {
          fighters[0].faceTowards(fighters[1].x);
          fighters[1].faceTowards(fighters[0].x);

          fighters.forEach((fighter, index) => {
            let command = { ...NEUTRAL_COMMAND };
            if (fighting) {
              command = index === 1 && cpuEnabled
                ? ai.update(fighter, fighters[0], delta)
                : { ...buildCommand(input, index), ...latched[index] };
              latched[index] = {};
              // O buffer le a direcao ja relativa ao lado que o personagem
              // encara, por isso o flip precisa acontecer antes.
              command.combo = detectors[index].feed(command, fighter.facing, now, fighter.mode);
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
          for (const result of results) if (result) feedback.onResult(result);
        }

        const event = match.update(fighters, delta);
        if (event) handleMatchEvent(event);

        fighters.forEach((fighter, index) => {
          fighter.syncSprite();
          const lift = Math.min(1, (map.groundLevel - fighter.y) / SHADOW_FADE_HEIGHT);
          shadows[index].position.set(fighter.x, map.groundLevel);
          shadows[index].scale.set(1 - lift * 0.5);
          shadows[index].alpha = 1 - lift * 0.6;
        });

        hud.update(
          {
            fighters,
            timeRemaining: match.timeRemaining,
            roundNumber: match.roundNumber,
            wins: match.wins,
            suddenDeath: match.isSuddenDeath,
            roundsToWin: match.roundsToWin,
          },
          delta,
        );

        if (debugLayer.visible) drawBoxes(debugLayer, fighters, effects.effects);

        elapsed += ticker.deltaMS;
        if (elapsed >= 250) {
          elapsed = 0;
          const cpu = cpuEnabled ? `cpu ${ai.difficulty}` : 'dois jogadores';
          overlay.text = [
            `fps ${ticker.FPS.toFixed(0)}   ${cpu}   \` caixas   R reiniciar`,
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
          {status === 'loading' ? 'Carregando assets...' : 'Erro ao carregar. Veja o console.'}
        </p>
      )}
    </div>
  );
}
